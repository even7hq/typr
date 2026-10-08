/**
 * Generic OTLP HTTP header builder.
 */
export namespace OtlpHeaders {
    /**
     * Builds OTLP export headers (Bearer + optional extra headers).
     *
     * @param bearerToken Optional bearer token.
     * @param extraHeaders Additional headers (e.g. x-even-product).
     * @returns Headers map for OTLP exporters.
     */
    export function build(
        bearerToken?: string,
        extraHeaders: Record<string, string> = {}
    ): Record<string, string> {
        const headers: Record<string, string> = { ...extraHeaders };

        if (typeof bearerToken === "string" && bearerToken.trim() !== "") {
            headers.Authorization = `Bearer ${bearerToken.trim()}`;
        }

        return headers;
    }
}
