import { describe, expect, it } from "vitest";

import { DEFAULT_LOG_LEVEL, LOG_LEVELS, isValidLogLevel, levelToOtelSeverity } from "../../src/js/LoggerLevels";

describe("LoggerLevels", () => {
    it("lists Typr log levels in severity order", () => {
        expect(LOG_LEVELS[0]).toBe("silly");
        expect(LOG_LEVELS[LOG_LEVELS.length - 1]).toBe("silent");
    });

    it("maps known levels to OTEL severity", () => {
        expect(levelToOtelSeverity("error")).toBe(17);
        expect(levelToOtelSeverity("info")).toBe(9);
    });

    it("falls back to info severity for unknown levels", () => {
        expect(levelToOtelSeverity("not-a-level")).toBe(9);
    });

    it("accepts valid log level names", () => {
        expect(isValidLogLevel("warn")).toBe(true);
        expect(isValidLogLevel("bogus")).toBe(false);
    });

    it("resolves DEFAULT_LOG_LEVEL to a supported level", () => {
        expect(isValidLogLevel(DEFAULT_LOG_LEVEL)).toBe(true);
    });
});
