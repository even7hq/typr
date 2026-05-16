/**
 * Channel names emitted by {@link TimelineParser}.
 */
export namespace TimelineChannel {
    /**
     * Emitted for Typr wire `event` frames.
     */
    export const EVENT = "timeline:event";

    /**
     * Emitted for Typr wire `request` frames.
     */
    export const REQUEST = "timeline:request";

    /**
     * Emitted for Typr wire `response` frames.
     */
    export const RESPONSE = "timeline:response";

    /**
     * Emitted for Typr wire `error` frames or decode failures.
     */
    export const ERROR = "timeline:error";
}
