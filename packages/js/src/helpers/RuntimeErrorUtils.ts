/**
 * Formats runtime errors for terminal output, always preferring the full stack trace.
 */
export namespace RuntimeErrorUtils {
    /**
     * Returns a multi-line string with the full stack trace when available.
     *
     * @param err Unknown thrown or rejected value.
     * @returns Human-readable error text for stderr/logging.
     */
    export function format(err: unknown): string {
        if (err instanceof Error) {
            return err.stack ?? err.message;
        }

        if (typeof err === "object" && err !== null && "stack" in err) {
            const stack = (err as { stack?: unknown }).stack;

            if (typeof stack === "string" && stack.length > 0) {
                return stack;
            }
        }

        return String(err);
    }
}
