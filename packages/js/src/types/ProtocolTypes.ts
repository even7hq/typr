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
 * Wire protocol version marker carried on every Typr NDJSON frame.
 */
export const TYPR_WIRE_VERSION = 1 as const;

/**
 * Discriminant for Typr RPC-style NDJSON frames.
 */
export type TyprWireType = "request" | "response" | "error" | "event";

/**
 * Shared fields for Typr wire frames.
 */
export interface TyprWireBase {
    /**
     * Protocol version marker. Must be {@link TYPR_WIRE_VERSION}.
     */
    typr: typeof TYPR_WIRE_VERSION;

    /**
     * Frame discriminant.
     */
    type: TyprWireType;

    /**
     * ISO-8601 timestamp for the frame.
     */
    ts: string;
}

/**
 * Procedure call request from the CLI process to the host (stdin).
 */
export interface TyprWireRequest extends TyprWireBase {
    type: "request";

    /**
     * Correlates with {@link TyprWireResponse} / {@link TyprWireError}.
     */
    id: string;

    /**
     * Dot-separated procedure path (for example `adapter.confirm`).
     */
    path: string;

    /**
     * JSON-serializable input payload for the procedure.
     */
    input?: Record<string, unknown>;
}

/**
 * Successful RPC result from the host to the CLI (stdout).
 */
export interface TyprWireResponse extends TyprWireBase {
    type: "response";

    /**
     * Correlates with the originating {@link TyprWireRequest}.
     */
    id: string;

    /**
     * Result value produced by the host.
     */
    result?: unknown;
}

/**
 * RPC failure from the host to the CLI (stdout).
 */
export interface TyprWireError extends TyprWireBase {
    type: "error";

    /**
     * Correlates with the originating {@link TyprWireRequest}.
     */
    id: string;

    /**
     * Structured error payload.
     */
    error: {
        code: string;
        message: string;
        data?: Record<string, unknown>;
    };
}

/**
 * One-way terminal event from the CLI to the host (stdout).
 */
export interface TyprWireEvent extends TyprWireBase {
    type: "event";

    /**
     * Logical channel for the event (for example `terminal.emit`).
     */
    path: string;

    /**
     * Event name inside the channel (for example `LOG`, `SPINNER_START`).
     */
    name: string;

    /**
     * Event payload data.
     */
    payload: Record<string, unknown>;

    /**
     * Optional correlation id for log streaming helpers.
     */
    cid?: string;
}

/**
 * Union of all Typr wire frames exchanged as NDJSON lines.
 */
export type TyprWireMessage = TyprWireRequest | TyprWireResponse | TyprWireError | TyprWireEvent;

/**
 * Type guard for {@link TyprWireMessage}.
 *
 * @param value - Parsed JSON value from a line.
 * @returns True when the value matches the Typr v1 wire contract.
 */
export function isTyprWireMessage(value: unknown): value is TyprWireMessage {
    if (!value || typeof value !== "object") {
        return false;
    }

    const v = value as Record<string, unknown>;

    if (v.typr !== TYPR_WIRE_VERSION) {
        return false;
    }

    if (typeof v.type !== "string" || typeof v.ts !== "string") {
        return false;
    }

    const t = v.type;

    if (t === "request") {
        return typeof v.id === "string" && typeof v.path === "string";
    }

    if (t === "response") {
        return typeof v.id === "string";
    }

    if (t === "error") {
        if (typeof v.id !== "string") {
            return false;
        }

        const err = v.error;

        if (!err || typeof err !== "object") {
            return false;
        }

        const e = err as Record<string, unknown>;

        return typeof e.code === "string" && typeof e.message === "string";
    }

    if (t === "event") {
        return typeof v.path === "string" && typeof v.name === "string" && typeof v.payload === "object" && v.payload !== null;
    }

    return false;
}
