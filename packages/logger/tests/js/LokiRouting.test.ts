import { describe, expect, it } from "vitest";

import { Logger } from "../../src/js/Logger";
import { LoggerLokiRouting } from "../../src/js/LoggerLokiRouting";
import { CustomSink } from "../../src/js/sinks/CustomSink";

describe("LokiRouting", () => {
    it("routes loki(false) to local sinks only", () => {
        const localLines: string[] = [];
        const remoteLines: string[] = [];

        const localSink = new CustomSink({
            category: "local",
            log: (record) => {
                localLines.push(record.message);
            }
        });

        const remoteSink = new CustomSink({
            category: "remote",
            log: (record) => {
                remoteLines.push(record.message);
            }
        });

        const label = `loki-local-${Date.now()}`;
        const logger = Logger.create(label, {
            sinks: [localSink, remoteSink]
        });

        logger.loki(false).info("local only");

        expect(localLines.length).toBeGreaterThan(0);
        expect(remoteLines.length).toBe(0);
    });

    it("routes console(false) to remote sinks only", () => {
        const localLines: string[] = [];
        const remoteLines: string[] = [];

        const label = `console-remote-${Date.now()}`;
        const logger = Logger.create(label, {
            sinks: [
                new CustomSink({
                    category: "local",
                    log: (record) => {
                        localLines.push(record.message);
                    }
                }),
                new CustomSink({
                    category: "remote",
                    log: (record) => {
                        remoteLines.push(record.message);
                    }
                })
            ]
        });

        logger.console(false).info("remote via console sidecar");

        expect(remoteLines.length).toBeGreaterThan(0);
        expect(localLines.length).toBe(0);
    });

    it("routes loki(true) to remote sinks only", () => {
        const localLines: string[] = [];
        const remoteLines: string[] = [];

        const label = `loki-remote-${Date.now()}`;
        const logger = Logger.create(label, {
            sinks: [
                new CustomSink({
                    category: "local",
                    log: (record) => {
                        localLines.push(record.message);
                    }
                }),
                new CustomSink({
                    category: "remote",
                    log: (record) => {
                        remoteLines.push(record.message);
                    }
                })
            ]
        });

        logger.loki(true).info("remote only");

        expect(remoteLines.length).toBeGreaterThan(0);
        expect(localLines.length).toBe(0);
    });

    it("adds loki-fallback prefix in the format pipeline", () => {
        const format = LoggerLokiRouting.lokiFallbackMessageFormat();
        const info: Record<string | symbol, unknown> = {
            level: "warn",
            message: "missing remote",
            [LoggerLokiRouting.LOKI_FALLBACK_SYMBOL]: true
        };

        format.transform(info, format.options);

        expect(String(info.message)).toContain("[loki-fallback]");
    });
});
