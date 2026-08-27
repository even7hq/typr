import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";

import { NDJSONStdioTransport } from "../src/transports/ndjson/NDJSONStdioTransport.js";

describe("NDJSONStdioTransport", () => {
    it("does not attach stdin readline until startReading", () => {
        const input = new PassThrough();
        const output = new PassThrough();
        const transport = new NDJSONStdioTransport(input, output);

        transport.onMessage(() => undefined);

        expect(input.readableFlowing).not.toBe(true);

        transport.startReading();

        expect(input.readableFlowing).toBe(true);

        transport.pauseReading();
        transport.dispose();
    });
});
