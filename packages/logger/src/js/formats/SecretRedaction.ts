import winston from "winston";

import type { LoggerRedactionProfile, RedactionOptions } from "../LoggerTypes";
import { RecommendedRedactorPack } from "./redaction/packs/RecommendedRedactorPack";
import { RedactionProfile } from "./redaction/RedactionProfile";
import type { SecretRedactor } from "./redaction/SecretRedactor";

/**
 * Maximum recursion depth when redacting objects.
 */
const MAX_DEPTH = 10;

/**
 * Maximum characters scanned in a single string value.
 */
const MAX_VALUE_SCAN_CHARS = 8 * 1024;

/**
 * Redaction placeholder for sensitive object fields.
 */
const REDACTED_TEXT = "[REDACTED]";

let redactionEnabled = true;

/**
 * Secret redaction helpers for log messages and splat args.
 */
export namespace SecretRedaction {
    /**
     * Enables or disables redaction globally.
     *
     * @param value Whether redaction runs.
     * @returns Nothing.
     */
    export function setEnabled(value: boolean): void {
        redactionEnabled = value;
    }

    /**
     * Reports whether redaction is enabled.
     *
     * @returns True when redaction runs.
     */
    export function isEnabled(): boolean {
        return redactionEnabled;
    }

    /**
     * Lists ids from the recommended redactor pack.
     *
     * @returns Stable redactor ids.
     */
    export function listRedactorIds(): string[] {
        return [...RecommendedRedactorPack.ORDERED_IDS];
    }

    /**
     * Resolves whether redaction runs for a logger profile.
     *
     * @param profile Per-logger redaction profile.
     * @returns True when redaction should run.
     */
    function isActive(profile: LoggerRedactionProfile): boolean {
        if (!profile.enabled) {
            return false;
        }

        return redactionEnabled;
    }

    /**
     * Checks if a field name matches any sensitive pattern (lowercase key).
     *
     * @param lowerKey Lowercased object key.
     * @param profile Per-logger redaction profile.
     * @returns True when the field should be fully redacted.
     */
    function isSensitiveFieldName(lowerKey: string, profile: LoggerRedactionProfile): boolean {
        return profile.fieldPatterns.some((pattern) => pattern.test(lowerKey));
    }

    /**
     * Applies the logger's value redactors in order.
     *
     * @param text Input string (already within scan limit).
     * @param profile Per-logger redaction profile.
     * @returns Redacted string.
     */
    function applyValueRedactors(text: string, profile: LoggerRedactionProfile): string {
        let result = text;

        for (const redactor of profile.redactors) {
            result = redactor.redactString(result);
        }

        return result;
    }

    /**
     * Redacts secrets in a plain string.
     *
     * @param text Raw log line.
     * @param input Resolved profile or {@link RedactionOptions} (resolved on the fly).
     * @returns Sanitized string.
     */
    export function redactString(text: string, input?: RedactionOptions | LoggerRedactionProfile): string {
        const profile = RedactionProfile.normalize(input);

        if (!isActive(profile)) {
            return text;
        }

        if (text.length > MAX_VALUE_SCAN_CHARS) {
            return text;
        }

        return applyValueRedactors(text, profile);
    }

    /**
     * Runs a single value redactor by id from the logger profile.
     *
     * @param text Raw log line.
     * @param redactorId Stable redactor id.
     * @param input Resolved profile or create options.
     * @returns Sanitized string.
     */
    export function redactStringWithRedactor(
        text: string,
        redactorId: string,
        input?: RedactionOptions | LoggerRedactionProfile
    ): string {
        const profile = RedactionProfile.normalize(input);

        if (!isActive(profile)) {
            return text;
        }

        if (text.length > MAX_VALUE_SCAN_CHARS) {
            return text;
        }

        const redactor = profile.redactors.find((entry) => entry.id === redactorId);

        if (!redactor) {
            throw new Error(`Unknown secret redactor id: ${redactorId}`);
        }

        return redactor.redactString(text);
    }

    /**
     * Deep-redacts sensitive fields in an arbitrary value.
     *
     * @param value Value to sanitize.
     * @param depth Current recursion depth.
     * @param visited Cycle detection set.
     * @param input Resolved profile or create options.
     * @returns Redacted copy or primitive.
     */
    export function redact(
        value: unknown,
        depth = 0,
        visited: WeakSet<object> = new WeakSet(),
        input?: RedactionOptions | LoggerRedactionProfile
    ): unknown {
        const profile = RedactionProfile.normalize(input);

        if (!isActive(profile)) {
            return value;
        }

        if (depth > MAX_DEPTH) {
            return "[MAX_DEPTH_EXCEEDED]";
        }

        if (value === null || value === undefined) {
            return value;
        }

        if (typeof value === "string") {
            return redactString(value, profile);
        }

        if (typeof value === "number" || typeof value === "boolean") {
            return value;
        }

        if (value instanceof Date) {
            return value;
        }

        if (Array.isArray(value)) {
            if (visited.has(value)) {
                return "[CIRCULAR_REFERENCE]";
            }

            visited.add(value);

            return value.map((entry) => redact(entry, depth + 1, visited, profile));
        }

        if (typeof value === "object") {
            if (visited.has(value)) {
                return "[CIRCULAR_REFERENCE]";
            }

            visited.add(value);

            const output: Record<string, unknown> = {};

            for (const [key, entry] of Object.entries(value)) {
                const lowerKey = key.toLowerCase();

                if (isSensitiveFieldName(lowerKey, profile)) {
                    output[key] = REDACTED_TEXT;
                } else {
                    output[key] = redact(entry, depth + 1, visited, profile);
                }
            }

            return output;
        }

        return value;
    }

    /**
     * Checks if a value contains sensitive data without redacting.
     *
     * @param value The value to inspect.
     * @param visited Cycle detection set.
     * @param input Resolved profile or create options.
     * @returns True when sensitive data is detected.
     */
    export function containsSensitiveData(
        value: unknown,
        visited: WeakSet<object> = new WeakSet(),
        input?: RedactionOptions | LoggerRedactionProfile
    ): boolean {
        if (!redactionEnabled) {
            return false;
        }

        const profile = RedactionProfile.normalize(input);

        if (!profile.enabled) {
            return false;
        }

        if (value === null || value === undefined) {
            return false;
        }

        if (typeof value === "string") {
            if (value.length > MAX_VALUE_SCAN_CHARS) {
                return false;
            }

            return profile.redactors.some((redactor) => redactor.mayContainSensitive(value));
        }

        if (Array.isArray(value)) {
            if (visited.has(value)) {
                return false;
            }

            visited.add(value);

            return value.some((item) => containsSensitiveData(item, visited, profile));
        }

        if (typeof value === "object") {
            if (visited.has(value)) {
                return false;
            }

            visited.add(value);

            for (const [key, entry] of Object.entries(value)) {
                const lowerKey = key.toLowerCase();

                if (isSensitiveFieldName(lowerKey, profile)) {
                    return true;
                }

                if (containsSensitiveData(entry, visited, profile)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Winston format that redacts the final message string.
     *
     * @param profile Per-logger redaction profile from {@link Logger.create}.
     * @returns Winston format instance.
     */
    export function redactMessageFormat(profile: LoggerRedactionProfile): winston.Logform.Format {
        return winston.format((info) => {
            if (typeof info.message === "string") {
                info.message = redactString(info.message, profile);
            }

            return info;
        })();
    }

    /**
     * Winston format that redacts splat interpolation args.
     *
     * @param profile Per-logger redaction profile from {@link Logger.create}.
     * @returns Winston format instance.
     */
    export function redactSplatArgsFormat(profile: LoggerRedactionProfile): winston.Logform.Format {
        return winston.format((info) => {
            const splatSymbol = Symbol.for("splat");
            const record = info as Record<PropertyKey, unknown>;
            const splat = record[splatSymbol];

            if (!Array.isArray(splat)) {
                return info;
            }

            record[splatSymbol] = splat.map((arg) => redact(arg, 0, new WeakSet(), profile));

            return info;
        })();
    }
}

export type { SecretRedactor } from "./redaction/SecretRedactor";
export { RegexSecretRedactor } from "./redaction/SecretRedactor";
export { RedactionProfile } from "./redaction/RedactionProfile";
export { RedactorPackSelection } from "./redaction/packs/RedactorPackSelection";
export { RecommendedRedactorPack } from "./redaction/packs/RecommendedRedactorPack";
export { BearerRedactor } from "./redaction/redactors/BearerRedactor";
export { GithubTokenRedactor } from "./redaction/redactors/GithubTokenRedactor";
export { AwsAccessKeyRedactor } from "./redaction/redactors/AwsAccessKeyRedactor";
export { SlackTokenRedactor } from "./redaction/redactors/SlackTokenRedactor";
export { JwtRedactor } from "./redaction/redactors/JwtRedactor";
export { CpfRedactor } from "./redaction/redactors/CpfRedactor";
export { CnpjRedactor } from "./redaction/redactors/CnpjRedactor";
export { CreditCardRedactor } from "./redaction/redactors/CreditCardRedactor";
export { AmexRedactor } from "./redaction/redactors/AmexRedactor";
export { EmailRedactor } from "./redaction/redactors/EmailRedactor";
export { PhoneIntlRedactor } from "./redaction/redactors/PhoneIntlRedactor";
export { HexSecretRedactor } from "./redaction/redactors/HexSecretRedactor";
export { XAccessTokenRedactor } from "./redaction/redactors/XAccessTokenRedactor";
