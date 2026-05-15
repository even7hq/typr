/**
 * Runtime mode options for the TUI client.
 */
export enum RuntimeMode {
    TUI = "TUI",
    JSON = "JSON",
    AUTO = "AUTO"
}

/**
 * AUTO policy options used when no explicit answer is provided by transport.
 */
export enum AutoPolicy {
    SAFE_DEFAULT = "SAFE_DEFAULT",
    ALWAYS_YES = "ALWAYS_YES"
}

/**
 * NDJSON envelope kinds.
 */
export enum NDJSONKind {
    REQUEST = "REQUEST",
    RESPONSE = "RESPONSE",
    EVENT = "EVENT",
    ERROR = "ERROR"
}

/**
 * Base payload shared by all NDJSON messages.
 */
export interface NDJSONBaseEnvelope {
    /**
     * Message kind.
     */
    kind: NDJSONKind;

    /**
     * Correlation key for request and response tracking.
     */
    correlationId?: string;

    /**
     * Message timestamp in ISO format.
     */
    timestamp: string;
}

/**
 * Prompt request message payload.
 */
export interface NDJSONRequestEnvelope extends NDJSONBaseEnvelope {
    kind: NDJSONKind.REQUEST;
    promptType: string;
    payload: Record<string, unknown>;
}

/**
 * Prompt response message payload.
 */
export interface NDJSONResponseEnvelope extends NDJSONBaseEnvelope {
    kind: NDJSONKind.RESPONSE;
    value: unknown;
}

/**
 * Event message payload used by logs, spinners, and progress notifications.
 */
export interface NDJSONEventEnvelope extends NDJSONBaseEnvelope {
    kind: NDJSONKind.EVENT;
    event: string;
    payload: Record<string, unknown>;
}

/**
 * Error message payload.
 */
export interface NDJSONErrorEnvelope extends NDJSONBaseEnvelope {
    kind: NDJSONKind.ERROR;
    code: string;
    message: string;
    payload?: Record<string, unknown>;
}

/**
 * Union type for all supported NDJSON envelopes.
 */
export type NDJSONEnvelope = (
    | NDJSONRequestEnvelope
    | NDJSONResponseEnvelope
    | NDJSONEventEnvelope
    | NDJSONErrorEnvelope
);
