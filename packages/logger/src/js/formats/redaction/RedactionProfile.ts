import type { LoggerRedactionProfile, RedactionOptions, RedactorRef } from "../../LoggerTypes";
import { RedactorPackSelection } from "./packs/RedactorPackSelection";
import { RecommendedRedactorPack } from "./packs/RecommendedRedactorPack";
import { SENSITIVE_FIELD_PATTERNS } from "./SensitiveFieldPatterns";
import { RegexSecretRedactor, type SecretRedactor } from "./SecretRedactor";

/**
 * Builds per-logger redaction profiles (fresh redactor instances on each resolve).
 */
export namespace RedactionProfile {
    /**
     * Returns true when the value is a resolved profile (not raw {@link RedactionOptions}).
     *
     * @param value Options or profile.
     * @returns Whether the value is a {@link LoggerRedactionProfile}.
     */
    export function isResolvedProfile(value: RedactionOptions | LoggerRedactionProfile): value is LoggerRedactionProfile {
        return (
            typeof value === "object"
            && value !== null
            && "fieldPatterns" in value
            && Array.isArray(value.fieldPatterns)
            && Array.isArray(value.redactors)
            && typeof value.enabled === "boolean"
        );
    }

    /**
     * Resolves redaction settings for one logger instance.
     *
     * @param options Logger redaction options from {@link Logger.create}.
     * @returns Profile with new redactor instances.
     */
    export function resolve(options?: RedactionOptions): LoggerRedactionProfile {
        const enabled = options?.enabled !== false;

        let redactors = resolveRedactorRefs(normalizeRedactorRefs(options?.redactors));

        const legacy = legacyExtraPatterns(options);

        if (legacy.length > 0) {
            redactors = [...redactors, ...legacy];
        }

        const fieldPatterns = resolveFieldPatterns(options);

        return {
            enabled,
            fieldPatterns,
            redactors
        };
    }

    /**
     * Normalizes caller input to a profile (resolves options when needed).
     *
     * @param input Resolved profile or create options.
     * @returns The profile to use for redaction.
     */
    export function normalize(input?: RedactionOptions | LoggerRedactionProfile): LoggerRedactionProfile {
        if (!input) {
            return resolve();
        }

        if (isResolvedProfile(input)) {
            return input;
        }

        return resolve(input);
    }

    /**
     * Maps {@link RedactorRef} entries to redactor instances.
     *
     * @param refs Logger redactor list or undefined for the full recommended pack.
     * @returns Redactors in list order.
     */
    /**
     * Normalizes a single ref or list to an array.
     *
     * @param refs One ref or a list.
     * @returns Array form or undefined.
     */
    function normalizeRedactorRefs(refs?: RedactorRef | RedactorRef[]): RedactorRef[] | undefined {
        if (refs === undefined) {
            return undefined;
        }

        if (Array.isArray(refs)) {
            return refs;
        }

        return [refs];
    }

    /**
     * Maps {@link RedactorRef} entries to redactor instances.
     *
     * @param refs Logger redactor list or undefined for the full recommended pack.
     * @returns Redactors in list order.
     */
    function resolveRedactorRefs(refs?: RedactorRef[]): SecretRedactor[] {
        if (!refs || refs.length === 0) {
            return RecommendedRedactorPack.createAll();
        }

        const resolved: SecretRedactor[] = [];

        for (const ref of refs) {
            if (typeof ref === "string") {
                resolved.push(RecommendedRedactorPack.createById(ref));
            } else if (ref instanceof RedactorPackSelection) {
                resolved.push(...RecommendedRedactorPack.instantiate(ref));
            } else {
                resolved.push(ref);
            }
        }

        return resolved;
    }

    /**
     * Merges built-in and extra field patterns.
     *
     * @param options Per-logger redaction options.
     * @returns Field name patterns.
     */
    function resolveFieldPatterns(options?: RedactionOptions): RegExp[] {
        if (!options?.extraFieldPatterns || options.extraFieldPatterns.length === 0) {
            return [...SENSITIVE_FIELD_PATTERNS];
        }

        return [...SENSITIVE_FIELD_PATTERNS, ...options.extraFieldPatterns];
    }

    /**
     * Wraps deprecated `extraValuePatterns` as custom redactors.
     *
     * @param options Per-logger redaction options.
     * @returns Legacy pattern redactors.
     */
    function legacyExtraPatterns(options?: RedactionOptions): SecretRedactor[] {
        if (!options?.extraValuePatterns || options.extraValuePatterns.length === 0) {
            return [];
        }

        return options.extraValuePatterns.map(([pattern, replacement], index) => {
            return new RegexSecretRedactor(`legacy-value-${index}`, pattern, () => replacement);
        });
    }
}
