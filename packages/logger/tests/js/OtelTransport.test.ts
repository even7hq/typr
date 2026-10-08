import { describe, expect, it } from "vitest";

import { OtelSink } from "../../src/js/sinks/OtelSink";

describe("OtelSink", () => {
    it("creates a winston transport without throwing", () => {
        const sink = new OtelSink({
            endpoint: "http://127.0.0.1:9",
            serviceName: "test"
        });

        const transports = sink.createTransports({
            label: "otel-test",
            consoleFormat: {} as never,
            fileFormat: {} as never
        });

        expect(transports.length).toBe(1);
    });
});
