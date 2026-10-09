import type winston from "winston";

import type { RedactorPackSelection } from "./formats/redaction/packs/RedactorPackSelection";
import type { SecretRedactor } from "./formats/redaction/SecretRedactor";
import type { LoggerLabels } from "./LoggerStaticLabels";

/**
 * Supported log levels for Typr loggers.
 */
export type LogLevel =
    | "error"
    | "warn"
    | "info"
    | "http"
    | "verbose"
    | "debug"
    | "silly"
    | "silent";

/**
 * Sink routing category for loki() sidecar.
 */
export type SinkCategory = "local" | "remote";

/**
 * Structured log record passed to custom sinks.
 */
export interface LogRecord {
    level: string;
    message: string;
    label: string;
    timestamp?: string;
    /** Static labels from {@link LoggerOptions.labels} (also on OTEL/Loki). */
    labels: LoggerLabels;
    meta: Record<string, unknown>;
}

/**
 * Context passed when building Winston transports from sinks.
 */
export interface SinkBuildContext {
    label: string;
    /** Static labels for remote sinks (OTEL / Loki via OTLP). */
    labels: LoggerLabels;
    consoleFormat: winston.Logform.Format;
    fileFormat: winston.Logform.Format;
}

/**
 * Pluggable log sink (console, file, OTEL, Typr, custom).
 */
export interface LogSink {
    /** Routing bucket for loki() sidecar. */
    readonly category: SinkCategory;

    /**
     * Builds Winston transport(s) for this sink.
     *
     * @param context Label and format pipelines.
     * @returns One or more Winston transports.
     */
    createTransports(context: SinkBuildContext): winston.transport[];

    /**
     * Graceful shutdown hook.
     *
     * @returns Resolved when the sink is closed.
     */
    shutdown(): Promise<void>;
}

/**
 * Built-in id, pack selection, or custom {@link SecretRedactor} instance.
 */
export type RedactorRef = string | SecretRedactor | RedactorPackSelection;

/**
 * Resolved redaction state for one logger (created in {@link Logger.create}).
 */
export interface LoggerRedactionProfile {
    /** When false, redaction is skipped for this logger. */
    enabled: boolean;
    /** Field-name patterns for object-key redaction. */
    fieldPatterns: RegExp[];
    /** Value redactor instances owned by this logger. */
    redactors: SecretRedactor[];
}

/**
 * Secret redaction options passed to {@link Logger.create}.
 */
export interface RedactionOptions {
    /** When false, disables redaction for this logger only. */
    enabled?: boolean;
    /**
     * Redactors for this logger: id, {@link RedactorPackSelection} (e.g. `RecommendedRedactorPack.configure([...])`),
     * or your own instance. When omitted, the full recommended pack is used.
     */
    redactors?: RedactorRef | RedactorRef[];
    /** Additional field-name patterns merged with built-in sensitive keys. */
    extraFieldPatterns?: RegExp[];
    /** Additional value patterns merged with built-in secret matchers (legacy; each becomes a `legacy-value-*` redactor). */
    extraValuePatterns?: Array<[RegExp, string]>;
}

/**
 * File rotation settings for {@link FileSink}.
 */
export interface FileRotationOptions {
    maxDays?: number;
    datePattern?: string;
    zippedArchive?: boolean;
}

/**
 * Options for {@link Logger.create}.
 */
export interface LoggerOptions {
    level?: LogLevel;
    sinks?: LogSink[];
    nodeId?: string;
    /**
     * Static key/value labels exported on every log line to OTEL (and Loki when ingested via OTLP).
     */
    labels?: LoggerLabels;
    redaction?: RedactionOptions;
    format?: winston.Logform.Format;
}

/**
 * Descriptor for one transport on a logger instance.
 */
export interface TransportDescriptor {
    name: string;
    level: string;
    category: SinkCategory;
    silent: boolean;
}

/**
 * Introspection snapshot for one registered logger.
 */
export interface LoggerInstanceIntrospection {
    label: string;
    labels: LoggerLabels;
    level: string;
    callCount: number;
    muted: boolean;
    levelOverride: LogLevel | null;
    transports: TransportDescriptor[];
}

/**
 * Full introspection snapshot for admin/ops endpoints.
 */
export interface LoggerIntrospection {
    globalLogLevel: LogLevel;
    defaultLogLevel: LogLevel;
    mutedLoggers: string[];
    globalTransportCount: number;
    loggers: LoggerInstanceIntrospection[];
}

/**
 * Fire-and-forget proxy for one routed emit.
 */
export interface SidecarLogger {
    error(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
    verbose(message: string, ...args: unknown[]): void;
    loki(enabled?: boolean): SidecarLogger;
    console(show?: boolean): SidecarLogger;
}

/**
 * Typr logger instance.
 */
export interface TyprLogger extends Omit<winston.Logger, "child"> {
    label: string;
    /** Static labels copied to OTEL/Loki on every emit. */
    labels: LoggerLabels;
    child(childLabel: string): TyprLogger;
    loki(enabled?: boolean): SidecarLogger;
    console(show?: boolean): SidecarLogger;
}
