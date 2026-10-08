import { SeverityNumber, type Logger as OtelApiLogger } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { LoggerProvider, type LogRecordProcessor } from "@opentelemetry/sdk-logs";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import Transport from "winston-transport";

import type { LogSink, SinkBuildContext, SinkCategory } from "../LoggerTypes";
import { createOtlpLogRecordProcessor } from "../otel/CreateOtlpLogRecordProcessor";
import type { OtelCircuitBreakerOptions } from "../otel/OtelCircuitBreakerOptions";
import { OtlpHeaders } from "../otel/OtlpHeaders";
import { formatWinstonLogBody, isWinstonAttributeKey } from "../otel/WinstonLogMessageFormat";
import type { LogWalOptions } from "../otel/wal/LogWalConfig";

/**
 * Options for {@link OtelSink}.
 */
export interface OtelSinkOptions {
    endpoint: string;
    bearerToken?: string;
    serviceName: string;
    serviceVersion?: string;
    extraHeaders?: Record<string, string>;
    flushIntervalMs?: number;
    maxPendingRecords?: number;
    batchSize?: number;
    circuitBreaker?: OtelCircuitBreakerOptions;
    /**
     * SQLite WAL for failed OTLP exports. Default: enabled at `process.cwd()/typr.db`.
     * Pass `{ dbPath: '...' }` to override (including LM `state.db` - same `wal_entries` table),
     * or `false` to disable persistence.
     */
    wal?: LogWalOptions | false;
}

/**
 * Remote sink that exports logs via OTLP HTTP using a dedicated LoggerProvider.
 */
export class OtelSink implements LogSink {
    readonly category: SinkCategory = "remote";

    private readonly options: OtelSinkOptions;
    private provider: LoggerProvider | null = null;
    private processor: LogRecordProcessor | null = null;
    private otelLogger: OtelApiLogger | null = null;
    private transport: Transport | null = null;

    /**
     * @param options OTLP endpoint and resource attributes.
     */
    constructor(options: OtelSinkOptions) {
        this.options = options;
    }

    /**
     * Builds a Winston transport wired to the OTel logger API.
     *
     * @param _context Sink build context (unused).
     * @returns OTel Winston transport.
     */
    createTransports(_context: SinkBuildContext): Transport[] {
        const headers = OtlpHeaders.build(this.options.bearerToken, this.options.extraHeaders);
        const endpoint = this.options.endpoint.replace(/\/+$/, "");

        const exporter = new OTLPLogExporter({
            url: `${endpoint}/v1/logs`,
            headers
        });

        const resource = new Resource({
            [ATTR_SERVICE_NAME]: this.options.serviceName,
            ...(this.options.serviceVersion
                ? { [ATTR_SERVICE_VERSION]: this.options.serviceVersion }
                : {})
        });

        this.provider = new LoggerProvider({ resource });
        this.processor = createOtlpLogRecordProcessor(exporter, {
            flushIntervalMs: this.options.flushIntervalMs ?? 1000,
            maxPendingRecords: this.options.maxPendingRecords,
            batchSize: this.options.batchSize,
            circuitBreaker: this.options.circuitBreaker,
            wal: this.options.wal
        });

        this.provider.addLogRecordProcessor(this.processor);
        this.otelLogger = this.provider.getLogger("typr.logger", "1.0.0");

        const otelLogger = this.otelLogger;

        class OtelWinstonTransport extends Transport {
            log(info: Record<string, unknown>, callback: () => void): void {
                setImmediate(callback);

                try {
                    const level = typeof info.level === "string" ? info.level : "info";
                    const attributes: Record<string, string | number | boolean> = {};

                    for (const key of Object.keys(info)) {
                        if (!isWinstonAttributeKey(key)) {
                            continue;
                        }

                        const value = info[key];

                        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                            attributes[key] = value;
                        }
                    }

                    otelLogger.emit({
                        severityNumber: mapLevelToSeverityNumber(level),
                        severityText: level,
                        body: formatWinstonLogBody(info),
                        attributes
                    });
                } catch (err) {
                    this.emit("warn", err);
                }
            }
        }

        this.transport = new OtelWinstonTransport();

        return [this.transport];
    }

    /**
     * Shuts down the OTel logger provider and processor.
     *
     * @returns Resolved shutdown.
     */
    async shutdown(): Promise<void> {
        if (this.processor) {
            await this.processor.shutdown();
        }

        if (this.provider) {
            await this.provider.shutdown();
        }

        this.processor = null;
        this.provider = null;
        this.otelLogger = null;
    }
}

/**
 * Maps Typr log level names to OTel severity numbers.
 *
 * @param level Log level name.
 * @returns OTel severity number.
 */
function mapLevelToSeverityNumber(level: string): SeverityNumber {
    switch (level) {
        case "error":
            return SeverityNumber.ERROR;
        case "warn":
            return SeverityNumber.WARN;
        case "debug":
        case "verbose":
        case "silly":
            return SeverityNumber.DEBUG;
        default:
            return SeverityNumber.INFO;
    }
}
