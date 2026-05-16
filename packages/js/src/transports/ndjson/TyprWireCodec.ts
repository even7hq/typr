import type { TyprWireMessage } from "../../types/ProtocolTypes";
import { isTyprWireMessage } from "../../types/ProtocolTypes";

/**
 * NDJSON line codec for Typr wire messages (one JSON object per line).
 */
export namespace TyprWireCodec {
    /**
     * Encodes a wire message to a single NDJSON line.
     *
     * @param message - Wire message to encode.
     * @returns Encoded line with newline terminator.
     */
    export function encode(message: TyprWireMessage): string {
        return `${JSON.stringify(message)}\n`;
    }

    /**
     * Decodes a line into a Typr wire message.
     *
     * @param line - Line content to decode.
     * @returns Parsed message, or null when the line is empty or not a Typr v1 frame.
     */
    export function decode(line: string): TyprWireMessage | null {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
            return null;
        }

        const parsed: unknown = JSON.parse(trimmedLine);

        if (!isTyprWireMessage(parsed)) {
            return null;
        }

        return parsed;
    }
}
