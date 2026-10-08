import type { SecretRedactor } from "./SecretRedactor";

const CONFIG_VALUES_PATTERN = /("config_values"\s*:\s*\[)([^\]]+)(\])/gi;

/**
 * Redacts long string entries inside JSON `config_values` arrays (Typr logger extension).
 */
export class ConfigValuesRedactor implements SecretRedactor {
    readonly id = "config-values";

    /**
     * Masks quoted secrets inside config_values JSON fragments.
     *
     * @param text The input string.
     * @returns The redacted string.
     */
    redactString(text: string): string {
        return text.replace(CONFIG_VALUES_PATTERN, (_match, prefix: string, values: string, suffix: string) => {
            const redacted = values.replace(/"([^"]{4})[^"]{16,}"/g, "\"$1***REDACTED***\"");

            return `${prefix}${redacted}${suffix}`;
        });
    }

    /**
     * Detects config_values JSON fragments.
     *
     * @param text The input string.
     * @returns True when the pattern matches.
     */
    mayContainSensitive(text: string): boolean {
        CONFIG_VALUES_PATTERN.lastIndex = 0;

        return CONFIG_VALUES_PATTERN.test(text);
    }
}
