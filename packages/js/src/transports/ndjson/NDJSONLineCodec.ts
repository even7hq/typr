import { NDJSONEnvelope } from "../../types/ProtocolTypes";

/**
 * Utility namespace for NDJSON line encoding and decoding.
 */
export namespace NDJSONLineCodec {
    /**
     * Encodes an envelope to a single NDJSON line.
     *
     * @param envelope - Envelope to encode.
     * @returns Encoded line with newline terminator.
     */
    export function encode(envelope: NDJSONEnvelope): string {
        return `${JSON.stringify(envelope)}\n`;
    }

    /**
     * Decodes a line into an NDJSON envelope.
     *
     * @param line - Line content to decode.
     * @returns Decoded envelope or null when line is empty.
     */
    export function decode(line: string): NDJSONEnvelope | null {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
            return null;
        }

        return JSON.parse(trimmedLine) as NDJSONEnvelope;
    }
}
