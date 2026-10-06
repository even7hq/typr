import { afterEach, describe, expect, it } from "vitest";

import { PlainCliOutput } from "../src/helpers/PlainCliOutput";
import { TerminalLogger } from "../src/helpers/TerminalLogger";

describe("PlainCliOutput", () => {
    afterEach(() => {
        TerminalLogger.setRawMode(false);
        delete process.env.CI;
        delete process.env.OPERATION_MODE;
    });

    it("is active when CI is set", () => {
        process.env.CI = "true";

        expect(PlainCliOutput.isActive()).toBe(true);
    });

    it("is active when OPERATION_MODE is CI", () => {
        process.env.OPERATION_MODE = "CI";

        expect(PlainCliOutput.isActive()).toBe(true);
    });

    it("is inactive when CI is false and raw mode is off", () => {
        process.env.CI = "false";

        expect(PlainCliOutput.isActive()).toBe(false);
    });
});
