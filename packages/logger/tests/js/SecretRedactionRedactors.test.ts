import { describe, expect, it } from "vitest";

import { SecretRedaction } from "../../src/js/formats/SecretRedaction";

describe("SecretRedaction redactor selection", () => {
    it("lists recommended pack redactor ids including config-values", () => {
        const ids = SecretRedaction.listRedactorIds();

        expect(ids).toContain("bearer");
        expect(ids).toContain("jwt");
        expect(ids).toContain("cpf");
        expect(ids).toContain("config-values");
    });

    it("runs only the jwt redactor when redactors is set", () => {
        const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature";
        const line = `Bearer abcdefghij token ${jwt}`;

        const output = SecretRedaction.redactString(line, { redactors: ["jwt"] });

        expect(output).toContain("Bearer abcdefghij");
        expect(output).toContain("[REDACTED]");
        expect(output).not.toContain("eyJhbGci");
    });

    it("redactStringWithRedactor runs a single redactor by id", () => {
        const output = SecretRedaction.redactStringWithRedactor(
            "Bearer supersecrettokenvalue",
            "bearer"
        );

        expect(output).toBe("Bearer supe***REDACTED***");
    });

    it("throws when redactor id is unknown", () => {
        expect(() => SecretRedaction.redactStringWithRedactor("x", "not-a-redactor")).toThrow(
            /Unknown secret redactor/
        );
    });
});
