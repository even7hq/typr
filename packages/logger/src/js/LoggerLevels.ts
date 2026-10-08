import type { LogLevel } from "./LoggerTypes";

/**
 * Typr log levels in severity order (least to most severe).
 */
export const LOG_LEVELS: readonly LogLevel[] = [
    "silly",
    "debug",
    "verbose",
    "http",
    "info",
    "warn",
    "error",
    "silent"
];

/**
 * OpenTelemetry severity numbers per Typr log level.
 */
export const LOG_LEVEL_TO_OTEL_SEVERITY: Record<string, number> = {
    error: 17,
    warn: 13,
    info: 9,
    http: 7,
    verbose: 6,
    debug: 5,
    silly: 1
};

/**
 * Maps a Typr log level to an OTEL severity number.
 * @param level The log level name.
 * @returns The OTEL severity number for the level, or info when unknown.
 */
export function levelToOtelSeverity(level: string): number {
    const mapped = LOG_LEVEL_TO_OTEL_SEVERITY[level];

    if (mapped !== undefined) {
        return mapped;
    }

    return LOG_LEVEL_TO_OTEL_SEVERITY.info;
}

/**
 * Returns whether a string is a valid Typr log level.
 * @param level The candidate level name.
 * @returns True when the level is a supported Typr log level.
 */
export function isValidLogLevel(level: string): level is LogLevel {
    return (LOG_LEVELS as readonly string[]).includes(level);
}

/**
 * Default log level when none is configured.
 */
const envLogLevel = process.env.LOG_LEVEL;

export const DEFAULT_LOG_LEVEL: LogLevel =
    envLogLevel && isValidLogLevel(envLogLevel) ? envLogLevel : "info";
