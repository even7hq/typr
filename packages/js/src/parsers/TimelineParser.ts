import { EventEmitter } from "node:events";

import { TimelineChannel } from "../events/TimelineEvents";
import { NDJSONLineCodec } from "../transports/ndjson/NDJSONLineCodec";
import {
    NDJSONEnvelope,
    NDJSONErrorEnvelope,
    NDJSONEventEnvelope,
    NDJSONKind,
    NDJSONRequestEnvelope,
    NDJSONResponseEnvelope
} from "../types/ProtocolTypes";

/**
 * Parses NDJSON lines and emits timeline channel events.
 */
export class TimelineParser extends EventEmitter {
    /**
     * Feeds one NDJSON line into the parser.
     *
     * @param line - Single line without trailing newline.
     * @returns Nothing.
     */
    public pushLine(line: string): void {
        let envelope: NDJSONEnvelope | null;

        try {
            envelope = NDJSONLineCodec.decode(line);
        } catch (err) {
            this.emit(TimelineChannel.ERROR, err);
            return;
        }

        if (!envelope) {
            return;
        }

        switch (envelope.kind) {
            case NDJSONKind.REQUEST: {
                this.emit(TimelineChannel.REQUEST, envelope as NDJSONRequestEnvelope);
                break;
            }

            case NDJSONKind.RESPONSE: {
                this.emit(TimelineChannel.RESPONSE, envelope as NDJSONResponseEnvelope);
                break;
            }

            case NDJSONKind.EVENT: {
                this.emit(TimelineChannel.EVENT, envelope as NDJSONEventEnvelope);
                break;
            }

            case NDJSONKind.ERROR: {
                this.emit(TimelineChannel.ERROR, envelope as NDJSONErrorEnvelope);
                break;
            }

            default: {
                this.emit(TimelineChannel.ERROR, new Error(`Unknown NDJSON kind: ${String((envelope as NDJSONEnvelope).kind)}`));
            }
        }
    }
}
