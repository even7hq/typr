import type { Context } from "@opentelemetry/api";
import { ExportResultCode, type ExportResult } from "@opentelemetry/core";
import type {
    LogRecordExporter,
    LogRecordProcessor,
    ReadableLogRecord
} from "@opentelemetry/sdk-logs";

import type { OtelCircuitBreakerOptions } from "./OtelCircuitBreakerOptions";

/**
 * Default consecutive export failures before the circuit opens.
 */
const DEFAULT_CIRCUIT_FAILURE_THRESHOLD = 3;

/**
 * Default duration the export circuit stays open after tripping.
 */
const DEFAULT_CIRCUIT_OPEN_MS = 30_000;

/**
 * Default maximum queued log records retained in memory (drops oldest when exceeded).
 */
const DEFAULT_MAX_PENDING_RECORDS = 4096;

/**
 * Default interval between OTLP log export flushes.
 */
const DEFAULT_FLUSH_INTERVAL_MS = 1000;

/**
 * Default queue size that triggers an immediate flush.
 */
const DEFAULT_BATCH_SIZE = 256;

/**
 * Options for {@link OtlpLogExportProcessor}.
 */
export interface OtlpLogExportProcessorOptions {
    /**
     * How often to flush pending records when the queue is below the immediate batch cap.
     */
    flushIntervalMs?: number;
    /**
     * Maximum in-memory queue length (oldest records dropped when exceeded).
     */
    maxPendingRecords?: number;
    /**
     * Pending count that triggers an immediate flush (burst handling).
     */
    batchSize?: number;
    circuitBreaker?: OtelCircuitBreakerOptions;
}

/**
 * In-memory log processor with export batching and a simple circuit breaker.
 */
export class OtlpLogExportProcessor implements LogRecordProcessor {
    private consecutiveFailures = 0;
    private circuitOpenUntil = 0;
    private readonly pending: ReadableLogRecord[] = [];
    private readonly flushIntervalMs: number;
    private readonly maxPendingRecords: number;
    private readonly batchSize: number;
    private readonly circuitFailureThreshold: number;
    private readonly circuitOpenMs: number;
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private flushInFlight: Promise<void> | null = null;

    /**
     * Creates a processor that batches logs and trips a circuit on export failures.
     *
     * @param exporter OTLP log exporter.
     * @param options Flush, queue, batch, and circuit breaker options.
     */
    constructor(
        private readonly exporter: LogRecordExporter,
        options?: OtlpLogExportProcessorOptions
    ) {
        const intervalMs = options?.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;

        this.flushIntervalMs = intervalMs > 0 ? intervalMs : DEFAULT_FLUSH_INTERVAL_MS;
        this.maxPendingRecords = resolvePositiveInt(
            options?.maxPendingRecords,
            DEFAULT_MAX_PENDING_RECORDS
        );

        this.batchSize = resolvePositiveInt(options?.batchSize, DEFAULT_BATCH_SIZE);

        this.circuitFailureThreshold = resolvePositiveInt(
            options?.circuitBreaker?.failureThreshold,
            DEFAULT_CIRCUIT_FAILURE_THRESHOLD
        );

        this.circuitOpenMs = resolvePositiveInt(
            options?.circuitBreaker?.openDurationMs,
            DEFAULT_CIRCUIT_OPEN_MS
        );

        this.flushTimer = setInterval(() => {
            void this.flushPending();
        }, this.flushIntervalMs);

        this.flushTimer.unref();
    }

    /**
     * Queues a log record for export.
     *
     * @param logRecord Readable log record.
     * @param _context OTel context.
     * @returns Nothing.
     */
    onEmit(logRecord: ReadableLogRecord, _context: Context): void {
        if (Date.now() < this.circuitOpenUntil) {
            return;
        }

        this.enqueuePending(logRecord);

        if (this.pending.length >= this.batchSize) {
            void this.flushPending();
        }
    }

    /**
     * Flushes any pending log records to the exporter.
     *
     * @returns Resolved flush.
     */
    forceFlush(): Promise<void> {
        return this.flushPending();
    }

    /**
     * Flushes pending records then shuts down the exporter.
     *
     * @returns Resolved shutdown.
     */
    shutdown(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        return this.flushPending().then(() => this.exporter.shutdown());
    }

    /**
     * Appends a record and drops the oldest when the in-memory cap is reached.
     *
     * @param logRecord Log record to queue.
     * @returns Nothing.
     */
    private enqueuePending(logRecord: ReadableLogRecord): void {
        if (this.pending.length >= this.maxPendingRecords) {
            this.pending.shift();
        }

        this.pending.push(logRecord);
    }

    /**
     * Exports the pending batch when the circuit is closed.
     *
     * @returns Nothing.
     */
    private flushPending(): Promise<void> {
        if (this.flushInFlight) {
            return this.flushInFlight;
        }

        this.flushInFlight = this.runFlush().finally(() => {
            this.flushInFlight = null;
        });

        return this.flushInFlight;
    }

    /**
     * Drains the pending queue into one OTLP export call.
     *
     * @returns Nothing.
     */
    private async runFlush(): Promise<void> {
        if (this.pending.length === 0 || Date.now() < this.circuitOpenUntil) {
            return;
        }

        const batch = this.pending.splice(0, this.pending.length);

        await new Promise<void>((resolve) => {
            this.exporter.export(batch, (result: ExportResult) => {
                if (result.code === ExportResultCode.SUCCESS) {
                    this.consecutiveFailures = 0;
                    resolve();
                    return;
                }

                this.consecutiveFailures += 1;

                if (this.consecutiveFailures >= this.circuitFailureThreshold) {
                    this.circuitOpenUntil = Date.now() + this.circuitOpenMs;
                    this.consecutiveFailures = 0;
                }

                this.pending.unshift(...batch);

                if (this.pending.length > this.maxPendingRecords) {
                    this.pending.splice(this.maxPendingRecords);
                }

                resolve();
            });
        });
    }

    /**
     * Whether the export circuit is open (tests).
     *
     * @returns True when exports are paused.
     */
    isCircuitOpen(): boolean {
        return Date.now() < this.circuitOpenUntil;
    }

    /**
     * Simulates consecutive failures (tests).
     *
     * @param count Failure count to apply.
     * @returns Nothing.
     */
    recordFailuresForTests(count: number): void {
        this.consecutiveFailures = count;

        if (count >= this.circuitFailureThreshold) {
            this.circuitOpenUntil = Date.now() + this.circuitOpenMs;
            this.consecutiveFailures = 0;
        }
    }

    /**
     * Returns pending queue length (tests).
     *
     * @returns Number of log records waiting for export.
     */
    getPendingCountForTests(): number {
        return this.pending.length;
    }

    /**
     * Seeds the pending queue for cap tests.
     *
     * @param size Number of placeholder records.
     * @returns Nothing.
     */
    fillPendingQueueForTests(size: number): void {
        this.pending.length = 0;

        for (let index = 0; index < size; index++) {
            this.pending.push({} as ReadableLogRecord);
        }
    }

    /**
     * Enqueues one record using production cap logic (tests).
     *
     * @param logRecord Log record to queue.
     * @returns Nothing.
     */
    simulateEnqueueForTests(logRecord: ReadableLogRecord): void {
        this.enqueuePending(logRecord);
    }
}

/**
 * Resolves a positive integer option or returns the default.
 *
 * @param raw Configured value.
 * @param defaultValue Fallback when missing or invalid.
 * @returns Positive integer.
 */
function resolvePositiveInt(raw: number | undefined, defaultValue: number): number {
    if (raw === undefined || !Number.isFinite(raw) || raw <= 0) {
        return defaultValue;
    }

    return Math.floor(raw);
}
