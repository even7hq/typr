import type { TyprWireMessage } from "../types/ProtocolTypes";

/**
 * Base transport abstraction for Typr NDJSON wire communication.
 */
export abstract class AbstractTransport {
    /**
     * Sends a wire message through the transport channel.
     *
     * @param message - Wire message to send.
     * @returns Nothing.
     */
    abstract send(message: TyprWireMessage): void;

    /**
     * Subscribes to incoming wire messages.
     *
     * @param handler - Handler called for each decoded message.
     * @returns Nothing.
     */
    abstract onMessage(handler: (message: TyprWireMessage) => void): void;

    /**
     * Releases all transport resources.
     *
     * @returns Nothing.
     */
    abstract dispose(): void;
}
