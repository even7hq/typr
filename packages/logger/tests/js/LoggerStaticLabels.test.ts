import { describe, expect, it } from "vitest";

import { Logger } from "../../src/js/Logger";
import { LOGGER_LABELS_SYMBOL, LoggerStaticLabels } from "../../src/js/LoggerStaticLabels";
import { buildOtelLogAttributes } from "../../src/js/otel/OtelLogAttributes";
import { CustomSink } from "../../src/js/sinks/CustomSink";

describe("LoggerStaticLabels", () => {
    it("normalizes empty keys and non-string values", () => {
        const input: Record<string, string> = {
            team: "storefront",
            "": "x",
            keep: "  value  "
        };

        expect(LoggerStaticLabels.normalize(input)).toEqual({
            team: "storefront",
            keep: "value"
        });
    });

    it("attaches labels to custom sink records and OTEL attributes", () => {
        let capturedLabels: Record<string, string> = {};

        const sink = new CustomSink({
            category: "remote",
            log: (record) => {
                capturedLabels = record.labels;
            }
        });

        const label = `labels-${Date.now()}`;
        const logger = Logger.create(label, {
            sinks: [sink],
            labels: {
                product: "luckymaker",
                module: "cart"
            }
        });

        logger.info("hello");

        expect(capturedLabels).toEqual({
            product: "luckymaker",
            module: "cart"
        });

        const info: Record<string, unknown> = {
            level: "info",
            message: "hello",
            [LOGGER_LABELS_SYMBOL]: capturedLabels
        };

        expect(buildOtelLogAttributes(label, info)).toMatchObject({
            product: "luckymaker",
            module: "cart",
            "log.logger": label
        });
    });

    it("inherits labels on child loggers", () => {
        const sink = new CustomSink({
            log: (record) => {
                expect(record.labels).toEqual({ area: "checkout" });
            }
        });

        const label = `child-labels-${Date.now()}`;
        const logger = Logger.create(label, {
            sinks: [sink],
            labels: { area: "checkout" }
        });

        logger.child("step").info("tick");
    });
});
