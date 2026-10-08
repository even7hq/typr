import { describe, expect, it } from "vitest";

import { SecretRedaction } from "../../src/js/formats/SecretRedaction";

describe("SecretRedaction recommended pack behavior", () => {
    it("still redacts a short e-mail", () => {
        const redacted = SecretRedaction.redactString("contato@even7.com.br");

        expect(redacted).toContain("***@");
        expect(redacted).not.toBe("contato@even7.com.br");
    });

    it("does not hang on a 90 KB alphanumeric blob with no @ (admin FAQ paste)", () => {
        const blob = "a".repeat(90 * 1024);
        const started = Date.now();
        const redacted = SecretRedaction.redactString(blob);
        const elapsed = Date.now() - started;

        expect(redacted).toBe(blob);
        expect(elapsed).toBeLessThan(200);
    });

    it("redact() on a TipTap-like FAQ payload stays fast", () => {
        const blob = "a".repeat(90 * 1024);
        const body = {
            site: {
                faq: {
                    items: [
                        {
                            question: "Teste",
                            answer: {
                                type: "doc",
                                content: [
                                    {
                                        type: "paragraph",
                                        content: [{ type: "text", text: blob }]
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        };

        const started = Date.now();
        const redacted = SecretRedaction.redact(body) as typeof body;
        const elapsed = Date.now() - started;

        expect(elapsed).toBeLessThan(200);
        expect(redacted.site.faq.items[0].answer.content[0].content[0].text).toBe(blob);
    });

    it("does not redact an 18-digit Snowflake automation id in a failure log", () => {
        const message = "automation 123456789012256448 failed: Error: HTTP request failed with status 401";

        expect(SecretRedaction.redactString(message)).toBe(message);
    });

    it("does not redact a 19-digit Snowflake id", () => {
        const message = "automation 1234567890123456789 failed";

        expect(SecretRedaction.redactString(message)).toBe(message);
    });

    it("redacts an isolated Luhn-valid card and keeps the last 4 digits", () => {
        expect(SecretRedaction.redactString("4111111111111111")).toBe("****-****-****-1111");
        expect(SecretRedaction.redactString("4111 1111 1111 1111")).toBe("****-****-****-1111");
        expect(SecretRedaction.redactString("4111-1111-1111-1111")).toBe("****-****-****-1111");
    });

    it("does not redact an isolated 16-digit sequence that fails Luhn", () => {
        const invalidPan = "1234567890123456";

        expect(SecretRedaction.redactString(invalidPan)).toBe(invalidPan);
    });

    it("does not treat a Luhn-valid card prefix inside a longer digit run as a card", () => {
        const longerThanPan = "41111111111111119";

        expect(SecretRedaction.redactString(longerThanPan)).toBe(longerThanPan);
    });

    it("redacts an isolated Luhn-valid AMEX and keeps the last 4 digits", () => {
        expect(SecretRedaction.redactString("378282246310005")).toBe("****-******-0005");
        expect(SecretRedaction.redactString("3782 822463 10005")).toBe("****-******-0005");
        expect(SecretRedaction.redactString("3782-822463-10005")).toBe("****-******-0005");
        expect(SecretRedaction.redactString("371449635398431")).toBe("****-******-8431");
        expect(SecretRedaction.redactString("340000000000009")).toBe("****-******-0009");
    });

    it("redacts AMEX inside a log line and leaves the Snowflake id intact", () => {
        const message = "automation 123456789012256448 card 378282246310005 failed";

        expect(SecretRedaction.redactString(message)).toBe(
            "automation 123456789012256448 card ****-******-0005 failed"
        );
    });

    it("does not redact an isolated 15-digit AMEX-shaped sequence that fails Luhn", () => {
        const invalidAmex = "378282246310006";

        expect(SecretRedaction.redactString(invalidAmex)).toBe(invalidAmex);
    });

    it("does not redact a Luhn-valid 15-digit sequence that is not AMEX IIN", () => {
        const mastercardShaped = "511000000000002";

        expect(SecretRedaction.redactString(mastercardShaped)).toBe(mastercardShaped);
    });

    it("does not treat a Luhn-valid AMEX prefix inside a longer digit run as a card", () => {
        const longerThanAmex = "37828224631000512";

        expect(SecretRedaction.redactString(longerThanAmex)).toBe(longerThanAmex);
    });

    it("redacts AMEX inside redact() string fields", () => {
        const redacted = SecretRedaction.redact({
            note: "cobrar 3714-496353-98431"
        }) as { note: string };

        expect(redacted.note).toBe("cobrar ****-******-8431");
    });

    it("still redacts a valid CPF", () => {
        const redacted = SecretRedaction.redactString("529.982.247-25");

        expect(redacted).toBe("***.982.247-**");
    });

    it("still redacts a valid CNPJ", () => {
        const redacted = SecretRedaction.redactString("11.222.333/0001-81");

        expect(redacted).toBe("**.222.333/****-**");
    });

    it("still redacts Bearer and JWT tokens", () => {
        expect(SecretRedaction.redactString("Bearer supersecrettokenvalue")).toBe(
            "Bearer supe***REDACTED***"
        );

        expect(
            SecretRedaction.redactString("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature")
        ).toBe("[REDACTED]");
    });

    it("redacts sessionFingerprint field names", () => {
        expect(SecretRedaction.redact({
            sessionFingerprint: "fp-secret"
        })).toEqual({
            sessionFingerprint: "[REDACTED]"
        });
    });

    it("redacts x-proxygon field names", () => {
        expect(SecretRedaction.redact({
            "x-proxygon": "sig-secret"
        })).toEqual({
            "x-proxygon": "[REDACTED]"
        });
    });
});
