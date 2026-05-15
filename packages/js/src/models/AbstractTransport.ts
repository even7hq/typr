import { NDJSONEnvelope } from "../types/ProtocolTypes";

/**
 * Base transport abstraction for NDJSON communication.
 */
export abstract class AbstractTransport {
    /**
     * Sends an envelope through the transport channel.
     *
     * @param envelope - Envelope to send.
     * @returns Nothing.
     */
    abstract send(envelope: NDJSONEnvelope): void;

    /**
     * Subscribes to incoming envelopes.
     *
     * @param handler - Handler called for each decoded envelope.
     * @returns Nothing.
     */
    abstract onMessage(handler: (envelope: NDJSONEnvelope) => void): void;

    /**
     * Releases all transport resources.
     *
     * @returns Nothing.
     */
    abstract dispose(): void;
}
