import { ExportResultCode } from "@opentelemetry/core";
import type { LogRecordExporter, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import { describe, expect, it, vi } from "vitest";

import { OtlpLogExportProcessor } from "../../src/js/otel/OtlpLogExportProcessor";

function createExporter(onExport: () => ExportResultCode): LogRecordExporter {
    return {
        export: (_records, resultCallback) => {
            resultCallback({ code: onExport() });
        },
        shutdown: () => Promise.resolve()
    };
}

describe("OtlpLogExportProcessor", () => {
    it("drops oldest records when queue exceeds cap", () => {
        const processor = new OtlpLogExportProcessor(createExporter(() => ExportResultCode.SUCCESS));

        processor.fillPendingQueueForTests(4096);
        processor.simulateEnqueueForTests({} as ReadableLogRecord);

        expect(processor.getPendingCountForTests()).toBe(4096);
    });

    it("opens circuit after repeated failures", () => {
        const processor = new OtlpLogExportProcessor(createExporter(() => ExportResultCode.FAILED));

        processor.recordFailuresForTests(3);

        expect(processor.isCircuitOpen()).toBe(true);
    });

    it("respects custom queue cap and circuit threshold", () => {
        const processor = new OtlpLogExportProcessor(createExporter(() => ExportResultCode.SUCCESS), {
            maxPendingRecords: 4,
            circuitBreaker: {
                failureThreshold: 2,
                openDurationMs: 1000
            }
        });

        processor.fillPendingQueueForTests(4);
        processor.simulateEnqueueForTests({} as ReadableLogRecord);

        expect(processor.getPendingCountForTests()).toBe(4);

        processor.recordFailuresForTests(2);

        expect(processor.isCircuitOpen()).toBe(true);
    });

    it("flushes pending records on forceFlush", async () => {
        const exportSpy = vi.fn(() => ExportResultCode.SUCCESS);
        const processor = new OtlpLogExportProcessor({
            export: (records, resultCallback) => {
                exportSpy(records.length);
                resultCallback({ code: ExportResultCode.SUCCESS });
            },
            shutdown: () => Promise.resolve()
        });

        processor.simulateEnqueueForTests({} as ReadableLogRecord);
        await processor.forceFlush();

        expect(exportSpy).toHaveBeenCalledWith(1);
    });
});
