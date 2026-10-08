import type { LogRecordExporter, LogRecordProcessor } from "@opentelemetry/sdk-logs";

import {
    OtlpLogExportProcessor,
    type OtlpLogExportProcessorOptions
} from "./OtlpLogExportProcessor";
import { resolveLogWalOptions, type LogWalOptions } from "./wal/LogWalConfig";
import { OtlpLogWalExportProcessor } from "./wal/OtlpLogWalExportProcessor";

/**
 * Options for creating an OTLP log record processor (memory-only or SQLite WAL).
 */
export interface CreateOtlpLogRecordProcessorOptions extends OtlpLogExportProcessorOptions {
    /**
     * SQLite WAL settings. Omitted = enabled with `process.cwd()/typr.db`.
     * `dbPath` may be LuckyMaker `state.db` (shared `wal_entries`, stream `OTLP_LOGS`).
     * Pass `false` to use in-memory re-queue only.
     */
    wal?: LogWalOptions | false;
    /** Optional node id stored on WAL rows. */
    nodeId?: string;
}

/**
 * Creates the OTLP log processor used by {@link OtelSink}.
 *
 * @param exporter OTLP log exporter.
 * @param options Flush, circuit breaker, and optional WAL settings.
 * @returns Log record processor implementation.
 */
export function createOtlpLogRecordProcessor(
    exporter: LogRecordExporter,
    options: CreateOtlpLogRecordProcessorOptions = {}
): LogRecordProcessor {
    const wal = resolveLogWalOptions(options.wal);

    const base: OtlpLogExportProcessorOptions = {
        flushIntervalMs: options.flushIntervalMs,
        maxPendingRecords: options.maxPendingRecords,
        batchSize: options.batchSize,
        circuitBreaker: options.circuitBreaker
    };

    if (wal) {
        return new OtlpLogWalExportProcessor(exporter, {
            ...base,
            wal,
            nodeId: options.nodeId
        });
    }

    return new OtlpLogExportProcessor(exporter, base);
}
