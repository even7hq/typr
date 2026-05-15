import { NDJSONEventEnvelope, NDJSONKind } from "../../types/ProtocolTypes";
import { ANSIStreamNormalizer } from "./ANSIStreamNormalizer";

/**
 * Converts legacy stdout or stderr text into NDJSON log events.
 */
export class LogToNDJSONConverter {
    /**
     * Incremental line normalizer.
     */
    private readonly normalizer = new ANSIStreamNormalizer();

    /**
     * Creates a new log converter.
     *
     * @param sink - Callback invoked for each NDJSON log event.
     * @param correlationId - Optional correlation id attached to every event.
     */
    constructor(
        private readonly sink: (envelope: NDJSONEventEnvelope) => void,
        private readonly correlationId?: string
    ) {}

    /**
     * Feeds a raw chunk and emits one NDJSON event per completed line.
     *
     * @param chunk - Raw chunk from the child stream.
     * @param source - Stream source label.
     * @returns Nothing.
     */
    public writeChunk(chunk: string, source: "stdout" | "stderr"): void {
        const lines = this.normalizer.push(chunk);

        for (const line of lines) {
            this.emitLine(line, source);
        }
    }

    /**
     * Flushes any trailing buffered bytes as a final line.
     *
     * @param source - Stream source label.
     * @returns Nothing.
     */
    public flush(source: "stdout" | "stderr"): void {
        const tail = this.normalizer.flush();

        if (tail) {
            this.emitLine(tail, source);
        }
    }

    /**
     * Emits a single NDJSON log event for one normalized line.
     *
     * @param message - Sanitized line text.
     * @param source - Stream source label.
     * @returns Nothing.
     */
    private emitLine(message: string, source: "stdout" | "stderr"): void {
        const level = source === "stderr" ? "ERROR" : "INFO";

        const envelope: NDJSONEventEnvelope = {
            kind: NDJSONKind.EVENT,
            timestamp: new Date().toISOString(),
            correlationId: this.correlationId,
            event: "LOG",
            payload: {
                level,
                source,
                message
            }
        };

        this.sink(envelope);
    }
}
