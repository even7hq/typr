import { describe, expect, it } from "vitest";

import { RedactionProfile } from "../../src/js/formats/redaction/RedactionProfile";
import { RecommendedRedactorPack } from "../../src/js/formats/redaction/packs/RecommendedRedactorPack";
import { JwtRedactor } from "../../src/js/formats/redaction/redactors/JwtRedactor";
import { Logger } from "../../src/js/Logger";
import { SecretRedaction } from "../../src/js/formats/SecretRedaction";
import { CustomSink } from "../../src/js/sinks/CustomSink";

describe("RedactionProfile per logger", () => {
    it("creates fresh redactor instances on each resolve", () => {
        const first = RedactionProfile.resolve();
        const second = RedactionProfile.resolve();

        expect(first.redactors).not.toBe(second.redactors);
        expect(first.redactors[0]).not.toBe(second.redactors[0]);
    });

    it("accepts redactor id or instance in redactors", () => {
        const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature";
        const line = `Bearer abcdefghij token ${jwt}`;

        const records: string[] = [];
        const sink = new CustomSink({
            log: (record) => {
                records.push(record.message);
            }
        });

        Logger.create(`redaction-jwt-only-${Date.now()}`, {
            sinks: [sink],
            redaction: {
                redactors: ["jwt"]
            }
        }).info(line);

        expect(records[0]).toContain("Bearer abcdefghij");
        expect(records[0]).toContain("[REDACTED]");
        expect(records[0]).not.toContain("eyJhbGci");
    });

    it("accepts a configured pack as a single redactors entry", () => {
        const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature";
        const line = `Bearer abcdefghij token ${jwt}`;

        const profile = RedactionProfile.resolve({
            redactors: RecommendedRedactorPack.configure(["jwt"])
        });

        expect(SecretRedaction.redactString(line, profile)).toContain("[REDACTED]");
        expect(SecretRedaction.redactString(line, profile)).toContain("Bearer abcdefghij");
    });

    it("accepts a mix of ids, pack, and instances", () => {
        const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature";
        const bearerLine = "Bearer supersecrettokenvalue";

        const jwtOnly = RedactionProfile.resolve({
            redactors: [new JwtRedactor()]
        });

        const packOnlyBearer = RedactionProfile.resolve({
            redactors: ["bearer"]
        });

        const mixed = RedactionProfile.resolve({
            redactors: [
                RecommendedRedactorPack.configure(["bearer"]),
                new JwtRedactor()
            ]
        });

        expect(SecretRedaction.redactString(bearerLine, jwtOnly)).toBe(bearerLine);
        expect(SecretRedaction.redactString(bearerLine, packOnlyBearer)).toBe("Bearer supe***REDACTED***");
        expect(SecretRedaction.redactString(`x ${jwt}`, jwtOnly)).toContain("[REDACTED]");
        expect(SecretRedaction.redactString(bearerLine, mixed)).toBe("Bearer supe***REDACTED***");
        expect(SecretRedaction.redactString(`x ${jwt}`, mixed)).toContain("[REDACTED]");
    });
});
