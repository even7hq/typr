import { TYPR_WIRE_VERSION } from "../../types/ProtocolTypes";
import type { TyprWireEvent } from "../../types/ProtocolTypes";
import { ANSIStreamNormalizer } from "./ANSIStreamNormalizer";

/**
 * Converts legacy stdout or stderr text into Typr wire log events.
 */
export class LogToNDJSONConverter {
    /**
     * Incremental line normalizer.
     */
    private readonly normalizer = new ANSIStreamNormalizer();

    /**
     * Creates a new log converter.
     *
     * @param sink - Callback invoked for each Typr wire log event.
     * @param cid - Optional correlation id attached to every event.
     */
    constructor(
        private readonly sink: (message: TyprWireEvent) => void,
        private readonly cid?: string
    ) {}

    /**
     * Feeds a raw chunk and emits one Typr wire event per completed line.
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
     * Emits a single Typr wire event for one normalized line.
     *
     * @param message - Sanitized line text.
     * @param source - Stream source label.
     * @returns Nothing.
     */
    private emitLine(message: string, source: "stdout" | "stderr"): void {
        const level = source === "stderr" ? "ERROR" : "INFO";

        const evt: TyprWireEvent = {
            typr: TYPR_WIRE_VERSION,
            type: "event",
            path: "terminal.emit",
            name: "LOG",
            payload: {
                level,
                source,
                message
            },
            ts: new Date().toISOString()
        };

        if (this.cid) {
            evt.cid = this.cid;
        }

        this.sink(evt);
    }
}
