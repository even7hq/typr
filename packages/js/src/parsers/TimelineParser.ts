import { EventEmitter } from "node:events";

import { TimelineChannel } from "../events/TimelineEvents";
import { TyprWireCodec } from "../transports/ndjson/TyprWireCodec";
import type {
    TyprWireError,
    TyprWireEvent,
    TyprWireMessage,
    TyprWireRequest,
    TyprWireResponse
} from "../types/ProtocolTypes";

/**
 * Parses Typr NDJSON lines and emits timeline channel events.
 */
export class TimelineParser extends EventEmitter {
    /**
     * Feeds one NDJSON line into the parser.
     *
     * @param line - Single line without trailing newline.
     * @returns Nothing.
     */
    public pushLine(line: string): void {
        let message: TyprWireMessage | null;

        try {
            message = TyprWireCodec.decode(line);
        } catch (err) {
            this.emit(TimelineChannel.ERROR, err);
            return;
        }

        if (!message) {
            return;
        }

        switch (message.type) {
            case "request": {
                this.emit(TimelineChannel.REQUEST, message as TyprWireRequest);
                break;
            }

            case "response": {
                this.emit(TimelineChannel.RESPONSE, message as TyprWireResponse);
                break;
            }

            case "event": {
                this.emit(TimelineChannel.EVENT, message as TyprWireEvent);
                break;
            }

            case "error": {
                this.emit(TimelineChannel.ERROR, message as TyprWireError);
                break;
            }

            default: {
                this.emit(TimelineChannel.ERROR, new Error(`Unknown Typr wire type: ${String((message as TyprWireMessage).type)}`));
            }
        }
    }
}
