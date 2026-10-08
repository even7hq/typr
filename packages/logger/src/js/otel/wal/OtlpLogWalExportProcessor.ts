import type { Context } from "@opentelemetry/api";
import { ExportResultCode, internal } from "@opentelemetry/core";
import type {
    LogRecordExporter,
    LogRecordProcessor,
    ReadableLogRecord
} from "@opentelemetry/sdk-logs";

import type { OtelCircuitBreakerOptions } from "../OtelCircuitBreakerOptions";
import {
    computeNextRetryAt,
    deserializeLogRecord,
    isSqliteBusyError,
    serializeLogRecord
} from "./BacklogLogRecordSerialization";
import type { ResolvedLogWalOptions } from "./LogWalConfig";
import { LogWalDatabase, type LogWalEntryRow } from "./LogWalDatabase";
import { LogWalStream } from "./LogWalStream";

/**
 * Kind stored for OTLP log backlog rows.
 */
const OTLP_LOG_KIND = "log.record";

/**
 * Default flush interval for in-memory export batches.
 */
const DEFAULT_FLUSH_INTERVAL_MS = 1000;

/**
 * Default in-memory queue cap before dropping records.
 */
const DEFAULT_MAX_PENDING_RECORDS = 2048;

/**
 * Default export batch size.
 */
const DEFAULT_BATCH_SIZE = 256;

/**
 * Default consecutive export failures before the circuit opens.
 */
const DEFAULT_CIRCUIT_FAILURE_THRESHOLD = 3;

/**
 * Default circuit open duration.
 */
const DEFAULT_CIRCUIT_OPEN_MS = 30_000;

/**
 * Options for {@link OtlpLogWalExportProcessor}.
 */
export interface OtlpLogWalExportProcessorOptions {
    flushIntervalMs?: number;
    maxPendingRecords?: number;
    batchSize?: number;
    circuitBreaker?: OtelCircuitBreakerOptions;
    wal: ResolvedLogWalOptions;
    nodeId?: string;
}

/**
 * OTLP log processor with SQLite WAL persistence (LuckyMaker backlog parity).
 * Uses `wal_entries` in the configured DB file; safe to share LuckyMaker `state.db`.
 */
export class OtlpLogWalExportProcessor implements LogRecordProcessor {
    private readonly flushIntervalMs: number;
    private readonly maxPendingRecords: number;
    private readonly batchSize: number;
    private readonly circuitFailureThreshold: number;
    private readonly circuitOpenMs: number;
    private readonly wal: ResolvedLogWalOptions;
    private readonly maxAttempts: number;
    private readonly backlogFlushIntervalMs: number;
    private readonly nodeId: string | null;
    private readonly store: LogWalDatabase;
    private readonly pending: ReadableLogRecord[] = [];
    private exportTimer: ReturnType<typeof setInterval> | null = null;
    private backlogTimer: ReturnType<typeof setInterval> | null = null;
    private exportInFlight: Promise<void> | null = null;
    private backlogInFlight: Promise<void> | null = null;
    private consecutiveFailures = 0;
    private circuitOpenUntil = 0;
    private shuttingDown = false;
    private knownBacklog: number | null = null;

    /**
     * Creates a WAL-backed OTLP log processor.
     *
     * @param exporter OTLP exporter.
     * @param options Processor and WAL options.
     */
    constructor(
        private readonly exporter: LogRecordExporter,
        options: OtlpLogWalExportProcessorOptions
    ) {
        this.flushIntervalMs = resolvePositiveInt(options.flushIntervalMs, DEFAULT_FLUSH_INTERVAL_MS);
        this.maxPendingRecords = resolvePositiveInt(options.maxPendingRecords, DEFAULT_MAX_PENDING_RECORDS);
        this.batchSize = resolvePositiveInt(options.batchSize, DEFAULT_BATCH_SIZE);
        this.circuitFailureThreshold = resolvePositiveInt(
            options.circuitBreaker?.failureThreshold,
            DEFAULT_CIRCUIT_FAILURE_THRESHOLD
        );

        this.circuitOpenMs = resolvePositiveInt(
            options.circuitBreaker?.openDurationMs,
            DEFAULT_CIRCUIT_OPEN_MS
        );

        this.wal = options.wal;
        this.maxAttempts = options.wal.maxAttempts;
        this.backlogFlushIntervalMs = options.wal.backlogFlushIntervalMs;
        this.nodeId = options.nodeId ?? null;
        this.store = LogWalDatabase.open(options.wal.dbPath);

        this.exportTimer = setInterval(() => {
            void this.flushPendingExport().catch(() => undefined);
        }, this.flushIntervalMs);

        this.exportTimer.unref?.();

        this.backlogTimer = setInterval(() => {
            void this.flushBacklog().catch(() => undefined);
        }, this.backlogFlushIntervalMs);

        this.backlogTimer.unref?.();

        this.refreshBacklogGauge();
    }

    /**
     * Enqueues a log record for batched export.
     *
     * @param logRecord Readable log record.
     * @param _context OTel context.
     * @returns Nothing.
     */
    onEmit(logRecord: ReadableLogRecord, _context: Context): void {
        if (this.shuttingDown) {
            return;
        }

        if (this.pending.length >= this.maxPendingRecords) {
            return;
        }

        this.pending.push(logRecord);

        if (this.pending.length >= this.batchSize) {
            void this.flushPendingExport().catch(() => undefined);
        }
    }

    /**
     * Flushes in-memory and SQLite backlog.
     *
     * @returns Resolved when work settles.
     */
    forceFlush(): Promise<void> {
        return this.flushPendingExport().then(() => this.flushBacklog());
    }

    /**
     * Stops timers and shuts down the exporter.
     *
     * @returns Resolved shutdown.
     */
    shutdown(): Promise<void> {
        this.shuttingDown = true;

        if (this.exportTimer) {
            clearInterval(this.exportTimer);
            this.exportTimer = null;
        }

        if (this.backlogTimer) {
            clearInterval(this.backlogTimer);
            this.backlogTimer = null;
        }

        return this.flushPendingExport()
            .then(() => this.flushBacklog())
            .then(() => this.exporter.shutdown());
    }

    /**
     * Whether the export circuit is open (tests).
     *
     * @returns True when exports are paused.
     */
    isCircuitOpenForTests(): boolean {
        return Date.now() < this.circuitOpenUntil;
    }

    /**
     * Returns SQLite backlog count (tests).
     *
     * @returns Pending WAL rows.
     */
    getBacklogCountForTests(): number {
        return this.store.countPending(LogWalStream.OTLP_LOGS);
    }

    /**
     * Flushes only the in-memory export queue (tests).
     *
     * @returns Resolved when the batch settles.
     */
    flushPendingForTests(): Promise<void> {
        return this.flushPendingExport();
    }

    /**
     * Retries due SQLite backlog rows (tests).
     *
     * @returns Resolved when the pass settles.
     */
    flushBacklogForTests(): Promise<void> {
        return this.flushBacklog();
    }

    /**
     * @returns Whether the export circuit is open.
     */
    private isCircuitOpen(): boolean {
        return Date.now() < this.circuitOpenUntil;
    }

    /**
     * Refreshes the in-memory backlog gauge from SQLite.
     *
     * @returns Nothing.
     */
    private refreshBacklogGauge(): void {
        this.knownBacklog = this.store.countPending(LogWalStream.OTLP_LOGS);
    }

    /**
     * @returns Whether the persisted backlog is at cap.
     */
    private isBacklogFull(): boolean {
        if (this.knownBacklog === null) {
            this.refreshBacklogGauge();
        }

        return this.knownBacklog !== null && this.knownBacklog >= this.wal.maxBacklogEntries;
    }

    /**
     * Exports the pending in-memory batch or persists on failure.
     *
     * @returns Nothing.
     */
    private async flushPendingExport(): Promise<void> {
        if (this.exportInFlight) {
            return this.exportInFlight;
        }

        if (this.pending.length === 0) {
            return;
        }

        const batch = this.pending.splice(0, this.batchSize);

        this.exportInFlight = (async () => {
            if (this.isCircuitOpen()) {
                await this.persistBatch(batch);
                return;
            }

            await this.waitForBatchAsyncAttributes(batch);

            try {
                const result = await internal._export(this.exporter, batch);

                if (result.code === ExportResultCode.SUCCESS) {
                    this.recordExportSuccess();
                    return;
                }

                this.recordExportFailure();
                await this.persistBatch(batch);
            } catch {
                this.recordExportFailure();
                await this.persistBatch(batch);
            }
        })();

        try {
            await this.exportInFlight;
        } finally {
            this.exportInFlight = null;
        }
    }

    /**
     * Waits for async resource attributes on each record.
     *
     * @param batch Log records being exported.
     * @returns Nothing.
     */
    private async waitForBatchAsyncAttributes(batch: ReadableLogRecord[]): Promise<void> {
        await Promise.all(batch.map(async (record) => {
            if (record.resource.asyncAttributesPending) {
                await record.resource.waitForAsyncAttributes?.();
            }
        }));
    }

    /**
     * Records a successful export.
     *
     * @returns Nothing.
     */
    private recordExportSuccess(): void {
        this.consecutiveFailures = 0;
        this.circuitOpenUntil = 0;
    }

    /**
     * Records a failed export and may open the circuit.
     *
     * @returns Nothing.
     */
    private recordExportFailure(): void {
        this.consecutiveFailures += 1;

        if (this.consecutiveFailures >= this.circuitFailureThreshold) {
            this.circuitOpenUntil = Date.now() + this.circuitOpenMs;
        }
    }

    /**
     * Persists failed exports to SQLite.
     *
     * @param batch Records that did not export.
     * @returns Nothing.
     */
    private async persistBatch(batch: ReadableLogRecord[]): Promise<void> {
        if (batch.length === 0) {
            return;
        }

        if (this.isBacklogFull()) {
            return;
        }

        const remaining = this.knownBacklog === null
            ? batch.length
            : Math.max(0, this.wal.maxBacklogEntries - this.knownBacklog);

        if (remaining === 0) {
            return;
        }

        const toPersist = batch.slice(0, remaining);
        const now = new Date().toISOString();
        const rows = toPersist.map((logRecord) => {
            return {
                stream: LogWalStream.OTLP_LOGS,
                kind: OTLP_LOG_KIND,
                at: now,
                nodeId: this.nodeId,
                payload: serializeLogRecord(logRecord),
                attempts: 0,
                maxAttempts: this.maxAttempts,
                nextRetryAt: now
            };
        });

        try {
            this.store.insertBatch(rows);

            if (this.knownBacklog !== null) {
                this.knownBacklog += rows.length;
            } else {
                this.refreshBacklogGauge();
            }
        } catch (err) {
            if (!isSqliteBusyError(err)) {
                throw err;
            }
        }
    }

    /**
     * Serializes concurrent backlog flush runs.
     *
     * @returns Nothing.
     */
    private async flushBacklog(): Promise<void> {
        if (this.backlogInFlight) {
            return this.backlogInFlight;
        }

        this.backlogInFlight = this.runFlushBacklog();

        try {
            await this.backlogInFlight;
        } finally {
            this.backlogInFlight = null;
        }
    }

    /**
     * Retries due SQLite backlog rows.
     *
     * @returns Nothing.
     */
    private async runFlushBacklog(): Promise<void> {
        const now = new Date().toISOString();
        const dueEntries = this.store.findDue(LogWalStream.OTLP_LOGS, now, 100);

        if (dueEntries.length === 0) {
            this.refreshBacklogGauge();
            return;
        }

        const retryBatch: Array<{ id: string; entry: LogWalEntryRow; record: ReadableLogRecord }> = [];

        for (const entry of dueEntries) {
            const attempts = entry.attempts ?? 0;
            const maxAttempts = entry.maxAttempts ?? this.maxAttempts;

            if (attempts >= maxAttempts) {
                this.store.deleteById(entry.id);

                if (this.knownBacklog !== null && this.knownBacklog > 0) {
                    this.knownBacklog -= 1;
                }

                continue;
            }

            try {
                const record = deserializeLogRecord(entry.payload);

                retryBatch.push({ id: entry.id, entry, record });
            } catch {
                this.store.deleteById(entry.id);

                if (this.knownBacklog !== null && this.knownBacklog > 0) {
                    this.knownBacklog -= 1;
                }
            }
        }

        if (retryBatch.length === 0) {
            this.refreshBacklogGauge();
            return;
        }

        if (this.isCircuitOpen()) {
            this.refreshBacklogGauge();
            return;
        }

        const readables = retryBatch.map((item) => item.record);

        try {
            const result = await internal._export(this.exporter, readables);

            if (result.code === ExportResultCode.SUCCESS) {
                this.recordExportSuccess();
                this.store.deleteByIds(retryBatch.map((item) => item.id));

                if (this.knownBacklog !== null) {
                    this.knownBacklog = Math.max(0, this.knownBacklog - retryBatch.length);
                }

                this.refreshBacklogGauge();
                return;
            }

            this.recordExportFailure();
        } catch {
            this.recordExportFailure();
        }

        for (const item of retryBatch) {
            const attempts = item.entry.attempts ?? 0;
            const maxAttempts = item.entry.maxAttempts ?? this.maxAttempts;
            const nextAttempts = attempts + 1;

            if (nextAttempts >= maxAttempts) {
                this.store.deleteById(item.id);

                if (this.knownBacklog !== null && this.knownBacklog > 0) {
                    this.knownBacklog -= 1;
                }

                continue;
            }

            this.store.updateRetry(item.id, nextAttempts, computeNextRetryAt(nextAttempts));
        }

        this.refreshBacklogGauge();
    }
}

/**
 * Resolves a positive integer option.
 *
 * @param raw Configured value.
 * @param defaultValue Fallback.
 * @returns Positive integer.
 */
function resolvePositiveInt(raw: number | undefined, defaultValue: number): number {
    if (raw === undefined || !Number.isFinite(raw) || raw <= 0) {
        return defaultValue;
    }

    return Math.floor(raw);
}
