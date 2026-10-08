/**
 * Formats unknown values (especially Errors) for log output.
 */
export namespace ErrorLogUtils {
    /**
     * Formats an error or unknown value for logging.
     *
     * @param value Value to format.
     * @returns Human-readable string with stack when available.
     */
    export function format(value: unknown): string {
        if (value instanceof Error) {
            if (value.stack) {
                return value.stack;
            }

            return value.message;
        }

        return String(value);
    }
}
