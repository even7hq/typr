/**
 * Builds JSON-serializable payloads for NDJSON requests by stripping functions and Typr-only keys.
 */
export namespace NDJSONWirePayload {
    /**
     * Converts prompt options into a plain record safe to place on the wire.
     *
     * @param options - Prompt options object.
     * @returns Serializable payload without `autoPolicy` or functions.
     */
    export function fromOptions(options: object): Record<string, unknown> {
        const out: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(options)) {
            if (key === "autoPolicy") {
                continue;
            }

            if (typeof value === "function") {
                continue;
            }

            out[key] = value;
        }

        return out;
    }
}
