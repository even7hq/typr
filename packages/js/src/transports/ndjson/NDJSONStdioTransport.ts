import readline from "node:readline";

import { AbstractTransport } from "../../models/AbstractTransport";
import type { TyprWireMessage } from "../../types/ProtocolTypes";
import { TyprWireCodec } from "./TyprWireCodec";

/**
 * NDJSON transport over stdin and stdout for Typr wire frames.
 */
export class NDJSONStdioTransport extends AbstractTransport {
    /**
     * Registered inbound handlers.
     */
    private readonly handlers: Array<(message: TyprWireMessage) => void> = [];

    /**
     * Readline interface for stdin, when attached.
     */
    private readlineInterface: readline.Interface | null = null;

    /**
     * Creates a new NDJSON stdio transport.
     *
     * @param input - Readable stream for inbound NDJSON lines.
     * @param output - Writable stream for outbound NDJSON lines.
     */
    constructor(
        private readonly input: NodeJS.ReadableStream = process.stdin,
        private readonly output: NodeJS.WritableStream = process.stdout
    ) {
        super();
    }

    /**
     * Sends a wire message as one NDJSON line to the output stream.
     *
     * @param message - Wire message to send.
     * @returns Nothing.
     */
    public send(message: TyprWireMessage): void {
        this.output.write(TyprWireCodec.encode(message));
    }

    /**
     * Registers a handler for inbound wire messages.
     *
     * @param handler - Handler called for each decoded message.
     * @returns Nothing.
     */
    public onMessage(handler: (message: TyprWireMessage) => void): void {
        this.handlers.push(handler);
        this.ensureReader();
    }

    /**
     * Detaches listeners and closes the readline interface.
     *
     * @returns Nothing.
     */
    public dispose(): void {
        if (this.readlineInterface) {
            this.readlineInterface.close();
            this.readlineInterface = null;
        }

        this.handlers.length = 0;
    }

    /**
     * Ensures stdin is being read as NDJSON lines.
     *
     * @returns Nothing.
     */
    private ensureReader(): void {
        if (this.readlineInterface) {
            return;
        }

        this.readlineInterface = readline.createInterface({
            input: this.input
        });

        this.readlineInterface.on("line", (line) => {
            let message: TyprWireMessage | null;

            try {
                message = TyprWireCodec.decode(line);
            } catch {
                return;
            }

            if (!message) {
                return;
            }

            for (const handler of this.handlers) {
                handler(message);
            }
        });
    }
}
