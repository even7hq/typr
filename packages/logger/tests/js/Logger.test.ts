import { describe, expect, it } from "vitest";

import { Logger } from "../../src/js/Logger";
import { CustomSink } from "../../src/js/sinks/CustomSink";

describe("Logger", () => {
    it("creates a logger and writes through a custom sink", () => {
        const lines: string[] = [];
        const sink = new CustomSink({
            log: (record) => {
                lines.push(record.message);
            }
        });

        const logger = Logger.create(`test-${Date.now()}`, {
            sinks: [sink],
            level: "info"
        });

        logger.info("hello %s", "world");

        expect(lines.some((line) => line.includes("hello world"))).toBe(true);
    });

    it("supports mute and unmute", () => {
        const lines: string[] = [];
        const label = `mute-test-${Date.now()}`;
        const sink = new CustomSink({
            log: (record) => {
                lines.push(record.message);
            }
        });

        const logger = Logger.create(label, { sinks: [sink] });

        Logger.mute(label);
        logger.info("hidden");

        expect(lines.length).toBe(0);

        Logger.unmute(label);
        logger.info("visible");

        expect(lines.length).toBeGreaterThan(0);
    });

    it("applies per-label level overrides", () => {
        const label = `level-test-${Date.now()}`;
        const logger = Logger.create(label, { level: "info" });

        Logger.changeLevelForLabel(label, "error");
        expect(logger.level).toBe("error");

        Logger.clearLevelOverrideForLabel(label);
        expect(logger.level).toBe("info");
    });

    it("exposes registry introspection", () => {
        const label = `describe-${Date.now()}`;

        Logger.create(label);

        const snapshot = Logger.describeAll();

        expect(snapshot.loggers.some((entry) => entry.label === label)).toBe(true);
    });
});
