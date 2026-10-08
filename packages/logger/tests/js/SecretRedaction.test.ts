import { describe, expect, it } from "vitest";

import { SecretRedaction } from "../../src/js/formats/SecretRedaction";

describe("SecretRedaction", () => {
    it("redacts bearer tokens in strings", () => {
        const input = "Authorization Bearer abcdefghijklmnopqrstuvwxyz";

        const output = SecretRedaction.redactString(input);

        expect(output).toContain("***REDACTED***");
        expect(output).not.toContain("abcdefghijklmnopqrstuvwxyz");
    });

    it("does not alter plain strings when disabled", () => {
        SecretRedaction.setEnabled(false);

        const input = "Bearer abcdefghijklmnopqrstuvwxyz";
        const output = SecretRedaction.redactString(input);

        expect(output).toBe(input);

        SecretRedaction.setEnabled(true);
    });

    it("redacts sensitive object fields", () => {
        const output = SecretRedaction.redact({
            password: "secret-value",
            name: "ok"
        }) as Record<string, unknown>;

        expect(output.password).toBe("[REDACTED]");
        expect(output.name).toBe("ok");
    });

    it("honors per-logger disabled redaction without mutating global state", () => {
        SecretRedaction.setEnabled(true);

        const output = SecretRedaction.redactString("Bearer abcdefghijklmnopqrstuvwxyz", {
            enabled: false
        });

        expect(output).toContain("Bearer");
        expect(SecretRedaction.isEnabled()).toBe(true);
    });
});
