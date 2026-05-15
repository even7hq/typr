import readline from "node:readline";

import { AbstractTransport } from "../../models/AbstractTransport";
import { NDJSONEnvelope } from "../../types/ProtocolTypes";
import { NDJSONLineCodec } from "./NDJSONLineCodec";

/**
 * NDJSON transport over stdin and stdout.
 */
export class NDJSONStdioTransport extends AbstractTransport {
    /**
     * Registered inbound handlers.
     */
    private readonly handlers: Array<(envelope: NDJSONEnvelope) => void> = [];

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
     * Sends an envelope as one NDJSON line to the output stream.
     *
     * @param envelope - Envelope to send.
     * @returns Nothing.
     */
    public send(envelope: NDJSONEnvelope): void {
        this.output.write(NDJSONLineCodec.encode(envelope));
    }

    /**
     * Registers a handler for inbound envelopes.
     *
     * @param handler - Callback invoked for each decoded line.
     * @returns Nothing.
     */
    public onMessage(handler: (envelope: NDJSONEnvelope) => void): void {
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
            let envelope: NDJSONEnvelope | null;

            try {
                envelope = NDJSONLineCodec.decode(line);
            } catch {
                return;
            }

            if (!envelope) {
                return;
            }

            for (const handler of this.handlers) {
                handler(envelope);
            }
        });
    }
}
