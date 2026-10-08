import { context } from "@opentelemetry/api";
import { ExportResultCode } from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";
import type { LogRecordExporter, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import { resolveDefaultLogWalDbPath, resolveLogWalOptions } from "../../src/js/otel/wal/LogWalConfig";
import { LogWalDatabase } from "../../src/js/otel/wal/LogWalDatabase";
import { OtlpLogWalExportProcessor } from "../../src/js/otel/wal/OtlpLogWalExportProcessor";
import { resolveLogWalFromEnv } from "../../src/js/otel/TelemetryConfig";

/**
 * Builds a minimal readable log record for WAL tests.
 *
 * @returns OTLP-readable log record.
 */
function createTestLogRecord(): ReadableLogRecord {
    return {
        hrTime: [1, 0],
        hrTimeObserved: [1, 0],
        body: "wal-test",
        resource: new Resource({ "service.name": "test" }),
        instrumentationScope: { name: "test" },
        attributes: {},
        droppedAttributesCount: 0
    };
}

/**
 * Creates a temp SQLite path for an isolated WAL test.
 *
 * @returns Absolute db path under the OS temp directory.
 */
function createTempDbPath(): string {
    return path.join(os.tmpdir(), `typr-logger-wal-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
}

describe("LogWalConfig", () => {
    it("defaults db path to cwd/typr.db", () => {
        const cwd = "/tmp/work";
        const resolved = resolveDefaultLogWalDbPath(cwd);

        expect(resolved).toBe(path.resolve(cwd, "typr.db"));
    });

    it("disables WAL when resolveLogWalOptions receives false", () => {
        expect(resolveLogWalOptions(false)).toBeNull();
    });

    it("reads OTEL_WAL_* from env", () => {
        expect(resolveLogWalFromEnv({ OTEL_WAL_ENABLED: "false" })).toBe(false);
        expect(resolveLogWalFromEnv({ OTEL_WAL_DB: "/data/logs.db" })).toEqual({ dbPath: "/data/logs.db" });
        expect(resolveLogWalFromEnv({})).toEqual({});
    });
});

describe("OtlpLogWalExportProcessor", () => {
    const dbPaths: string[] = [];

    afterEach(() => {
        LogWalDatabase.closeAllForTests();

        for (const dbPath of dbPaths) {
            if (fs.existsSync(dbPath)) {
                fs.unlinkSync(dbPath);
            }
        }

        dbPaths.length = 0;
    });

    it("persists failed exports to SQLite and clears backlog on retry success", async () => {
        const dbPath = createTempDbPath();
        dbPaths.push(dbPath);

        let shouldFail = true;

        const exporter: LogRecordExporter = {
            export: (_records, resultCallback) => {
                resultCallback({
                    code: shouldFail ? ExportResultCode.FAILED : ExportResultCode.SUCCESS
                });
            },
            shutdown: () => Promise.resolve()
        };

        const wal = resolveLogWalOptions({ dbPath });

        if (!wal) {
            throw new Error("expected WAL options");
        }

        const processor = new OtlpLogWalExportProcessor(exporter, { wal });

        processor.onEmit(createTestLogRecord(), context.active());
        await processor.flushPendingForTests();

        expect(processor.getBacklogCountForTests()).toBe(1);

        shouldFail = false;
        await processor.flushBacklogForTests();

        expect(processor.getBacklogCountForTests()).toBe(0);

        await processor.shutdown();
    });

    it("persists to SQLite when the export circuit is open", async () => {
        const dbPath = createTempDbPath();
        dbPaths.push(dbPath);

        const exporter = createExporter(() => ExportResultCode.FAILED);
        const wal = resolveLogWalOptions({ dbPath });

        if (!wal) {
            throw new Error("expected WAL options");
        }

        const processor = new OtlpLogWalExportProcessor(exporter, {
            wal,
            circuitBreaker: { failureThreshold: 1, openDurationMs: 60_000 }
        });

        processor.onEmit(createTestLogRecord(), context.active());
        await processor.flushPendingForTests();

        expect(processor.getBacklogCountForTests()).toBe(1);
        expect(processor.isCircuitOpenForTests()).toBe(true);

        await processor.shutdown();
    });
});

/**
 * Builds a stub OTLP exporter.
 *
 * @param onExport Result code factory.
 * @returns Log record exporter.
 */
function createExporter(onExport: () => ExportResultCode): LogRecordExporter {
    return {
        export: (_records, resultCallback) => {
            resultCallback({ code: onExport() });
        },
        shutdown: () => Promise.resolve()
    };
}
