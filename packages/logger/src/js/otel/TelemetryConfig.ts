import type { OtelSinkOptions } from "../sinks/OtelSink";
import type { LogWalOptions } from "./wal/LogWalConfig";

/**
 * Telemetry options read from environment variables.
 */
export interface TelemetryEnvConfig {
    endpoint: string;
    bearerToken?: string;
    serviceName: string;
    serviceVersion?: string;
    extraHeaders?: Record<string, string>;
    flushIntervalMs: number;
    maxPendingRecords: number;
    batchSize: number;
    circuitFailureThreshold: number;
    circuitOpenMs: number;
    exportLogs: boolean;
}

/**
 * Parses a boolean env flag (`true`, `1`, case-insensitive).
 *
 * @param raw Raw env value.
 * @param defaultValue Value when raw is missing or empty.
 * @returns Parsed boolean.
 */
function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
    if (raw === undefined || raw.trim() === "") {
        return defaultValue;
    }

    const normalized = raw.trim().toLowerCase();

    return normalized === "true" || normalized === "1";
}

/**
 * Parses a positive integer from env (milliseconds).
 *
 * @param raw Raw env value.
 * @param defaultValue Default when missing or invalid.
 * @returns Parsed integer.
 */
function parsePositiveInt(raw: string | undefined, defaultValue: number): number {
    if (raw === undefined || raw.trim() === "") {
        return defaultValue;
    }

    const value = Number(raw);

    if (!Number.isFinite(value) || value <= 0) {
        return defaultValue;
    }

    return Math.floor(value);
}

/**
 * Resolves SQLite WAL settings from env (`OTEL_WAL_*`).
 * `OTEL_WAL_DB` may target LuckyMaker `state.db` (shared with other `wal_entries` streams).
 *
 * @param env Environment map.
 * @returns WAL options, or `false` when persistence is disabled.
 */
export function resolveLogWalFromEnv(env: NodeJS.ProcessEnv = process.env): LogWalOptions | false {
    if (!parseBool(env.OTEL_WAL_ENABLED, true)) {
        return false;
    }

    const dbPath = env.OTEL_WAL_DB?.trim();

    if (dbPath && dbPath !== "") {
        return { dbPath };
    }

    return {};
}

/**
 * Resolves OTel service.name from env.
 *
 * @param env Environment map.
 * @returns Service name for the resource.
 */
export function resolveTelemetryServiceName(env: NodeJS.ProcessEnv = process.env): string {
    const raw = (env.OTEL_SERVICE_NAME ?? env.npm_package_name ?? "typr-logger").trim();

    if (raw === "") {
        return "typr-logger";
    }

    return raw;
}

/**
 * Reads OTEL settings from `process.env`.
 *
 * @param env Environment map (defaults to `process.env`).
 * @returns Init options when OTEL is enabled and endpoint is set; otherwise null.
 */
export function readTelemetryConfig(env: NodeJS.ProcessEnv = process.env): TelemetryEnvConfig | null {
    const enabled = parseBool(env.OTEL_ENABLED, false);

    if (!enabled) {
        return null;
    }

    const rawEndpoint = env.OTEL_ENDPOINT?.trim() ?? "";

    if (rawEndpoint === "") {
        return null;
    }

    const endpoint = rawEndpoint.replace(/\/+$/, "");
    const bearerToken = env.OTEL_BEARER_TOKEN?.trim();
    const extraProduct = env.OTEL_EXTRA_PRODUCT?.trim();

    const extraHeaders: Record<string, string> = {};

    if (extraProduct && extraProduct !== "") {
        extraHeaders["x-even-product"] = extraProduct;
    }

    return {
        endpoint,
        bearerToken: bearerToken && bearerToken !== "" ? bearerToken : undefined,
        serviceName: resolveTelemetryServiceName(env),
        serviceVersion: env.npm_package_version,
        extraHeaders: Object.keys(extraHeaders).length > 0 ? extraHeaders : undefined,
        flushIntervalMs: parsePositiveInt(env.OTEL_LOG_FLUSH_INTERVAL_MS, 1000),
        maxPendingRecords: parsePositiveInt(env.OTEL_LOG_MAX_PENDING_RECORDS, 4096),
        batchSize: parsePositiveInt(env.OTEL_LOG_BATCH_SIZE, 256),
        circuitFailureThreshold: parsePositiveInt(env.OTEL_LOG_CIRCUIT_FAILURE_THRESHOLD, 3),
        circuitOpenMs: parsePositiveInt(env.OTEL_LOG_CIRCUIT_OPEN_MS, 30_000),
        exportLogs: parseBool(env.OTEL_EXPORT_LOGS, true)
    };
}

/**
 * Returns whether OTLP log export is enabled from env.
 *
 * @param env Environment map.
 * @returns True when logs would be exported.
 */
export function isOtelLogsExportEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const opts = readTelemetryConfig(env);

    return opts !== null && opts.exportLogs === true;
}

/**
 * Builds {@link OtelSinkOptions} from env when OTEL log export is enabled.
 *
 * @param env Environment map.
 * @returns Options for OtelSink or null when disabled.
 */
export function buildOtelSinkOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): OtelSinkOptions | null {
    const config = readTelemetryConfig(env);

    if (!config || !config.exportLogs) {
        return null;
    }

    return {
        endpoint: config.endpoint,
        bearerToken: config.bearerToken,
        serviceName: config.serviceName,
        serviceVersion: config.serviceVersion,
        extraHeaders: config.extraHeaders,
        flushIntervalMs: config.flushIntervalMs,
        maxPendingRecords: config.maxPendingRecords,
        batchSize: config.batchSize,
        circuitBreaker: {
            failureThreshold: config.circuitFailureThreshold,
            openDurationMs: config.circuitOpenMs
        },
        wal: resolveLogWalFromEnv(env)
    };
}
