/**
 * One value-level secret redactor (Bearer, CPF, JWT, …).
 */
export interface SecretRedactor {
    /** Stable id used in {@link RedactionOptions.redactors}. */
    readonly id: string;
    /**
     * Applies this redactor to a string fragment.
     *
     * @param text The input log line or string value.
     * @returns The string after this redactor runs.
     */
    redactString(text: string): string;
    /**
     * Fast check for possible sensitive content (pattern match; see {@link SecretRedaction.containsSensitiveData}).
     *
     * @param text The input string.
     * @returns True when this redactor's detector would fire.
     */
    mayContainSensitive(text: string): boolean;
}

/**
 * Regex-based {@link SecretRedactor} with global pattern reset.
 */
export class RegexSecretRedactor implements SecretRedactor {
    readonly id: string;
    private readonly pattern: RegExp;
    private readonly replace: (match: string) => string;

    /**
     * @param id The stable redactor id.
     * @param pattern The global regex pattern.
     * @param replace The replacer invoked per match.
     */
    constructor(id: string, pattern: RegExp, replace: (match: string) => string) {
        this.id = id;
        this.pattern = pattern;
        this.replace = replace;
    }

    /**
     * Runs the configured regex replace on the input.
     *
     * @param text The input string.
     * @returns The redacted string.
     */
    redactString(text: string): string {
        this.pattern.lastIndex = 0;

        return text.replace(this.pattern, this.replace);
    }

    /**
     * Tests the configured pattern against the input.
     *
     * @param text The input string.
     * @returns True when the pattern matches.
     */
    mayContainSensitive(text: string): boolean {
        this.pattern.lastIndex = 0;

        return this.pattern.test(text);
    }
}
