import type { Attributes, HrTime, SpanContext } from "@opentelemetry/api";
import type { LogAttributes, LogBody } from "@opentelemetry/api-logs";
import type { InstrumentationScope } from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";
import type { ReadableLogRecord } from "@opentelemetry/sdk-logs";

/**
 * Base retry delay in milliseconds.
 */
export const BASE_RETRY_DELAY_MS = 30_000;

/**
 * Maximum retry delay in milliseconds.
 */
export const MAX_RETRY_DELAY_MS = 3_600_000;

interface SerializedOtlpLogRecord {
    hrTime: HrTime;
    hrTimeObserved: HrTime;
    spanContext?: SpanContext;
    severityText?: string;
    severityNumber?: number;
    body?: LogBody;
    resource: {
        attributes: Attributes;
    };
    instrumentationScope: InstrumentationScope;
    attributes: LogAttributes;
    droppedAttributesCount: number;
}

/**
 * Serializes a log record into JSON for SQLite persistence.
 *
 * @param logRecord Emitted log record.
 * @returns Serialized JSON payload.
 */
export function serializeLogRecord(logRecord: ReadableLogRecord): string {
    const payload: SerializedOtlpLogRecord = {
        hrTime: logRecord.hrTime,
        hrTimeObserved: logRecord.hrTimeObserved,
        spanContext: logRecord.spanContext,
        severityText: logRecord.severityText,
        severityNumber: logRecord.severityNumber,
        body: logRecord.body,
        resource: {
            attributes: logRecord.resource.attributes
        },
        instrumentationScope: logRecord.instrumentationScope,
        attributes: logRecord.attributes,
        droppedAttributesCount: logRecord.droppedAttributesCount
    };

    return JSON.stringify(payload);
}

/**
 * Rebuilds a readable log record from persisted JSON.
 *
 * @param payload The serialized JSON payload.
 * @returns The readable log record for OTLP export.
 */
export function deserializeLogRecord(payload: string): ReadableLogRecord {
    const parsed: unknown = JSON.parse(payload);

    if (!isSerializedOtlpLogRecord(parsed)) {
        throw new Error("invalid serialized OTLP log record payload");
    }

    return {
        hrTime: parsed.hrTime,
        hrTimeObserved: parsed.hrTimeObserved,
        spanContext: parsed.spanContext,
        severityText: parsed.severityText,
        severityNumber: parsed.severityNumber,
        body: parsed.body,
        resource: new Resource(parsed.resource.attributes),
        instrumentationScope: parsed.instrumentationScope,
        attributes: parsed.attributes,
        droppedAttributesCount: parsed.droppedAttributesCount
    };
}

/**
 * Computes the next retry timestamp using exponential backoff.
 *
 * @param attempts Number of failed attempts already performed.
 * @returns ISO timestamp for the next retry.
 */
export function computeNextRetryAt(attempts: number): string {
    const delayMs = Math.min(
        BASE_RETRY_DELAY_MS * (2 ** Math.max(attempts - 1, 0)),
        MAX_RETRY_DELAY_MS
    );

    return new Date(Date.now() + delayMs).toISOString();
}

/**
 * Detects SQLite busy errors from better-sqlite3.
 *
 * @param err Caught error.
 * @returns Whether the error indicates SQLITE_BUSY.
 */
export function isSqliteBusyError(err: unknown): boolean {
    if (!err || typeof err !== "object") {
        return false;
    }

    if ("code" in err && err.code === "SQLITE_BUSY") {
        return true;
    }

    return false;
}

/**
 * Validates a parsed JSON value as a serialized OTLP log record.
 *
 * @param value The parsed JSON value.
 * @returns Whether the value matches the serialized OTLP log record shape.
 */
function isSerializedOtlpLogRecord(value: unknown): value is SerializedOtlpLogRecord {
    if (!value || typeof value !== "object") {
        return false;
    }

    const record = value as Record<string, unknown>;

    if (!Array.isArray(record.hrTime) || !Array.isArray(record.hrTimeObserved)) {
        return false;
    }

    if (!record.resource || typeof record.resource !== "object") {
        return false;
    }

    const resource = record.resource as Record<string, unknown>;

    if (!resource.attributes || typeof resource.attributes !== "object") {
        return false;
    }

    if (!record.instrumentationScope || typeof record.instrumentationScope !== "object") {
        return false;
    }

    if (!record.attributes || typeof record.attributes !== "object") {
        return false;
    }

    return typeof record.droppedAttributesCount === "number";
}
