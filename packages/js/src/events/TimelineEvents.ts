/**
 * Channel names emitted by {@link TimelineParser}.
 */
export namespace TimelineChannel {
    /**
     * Emitted for NDJSON event envelopes.
     */
    export const EVENT = "timeline:event";

    /**
     * Emitted for NDJSON request envelopes.
     */
    export const REQUEST = "timeline:request";

    /**
     * Emitted for NDJSON response envelopes.
     */
    export const RESPONSE = "timeline:response";

    /**
     * Emitted for NDJSON error envelopes or decode failures.
     */
    export const ERROR = "timeline:error";
}
