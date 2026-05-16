/**
 * Raised when the NDJSON host responds with a structured RPC error for a pending call.
 */
export class TyprWireRpcError extends Error {
    /**
     * Stable machine-readable error code from the host.
     */
    public readonly code: string;

    /**
     * Optional structured details from the host.
     */
    public readonly data?: Record<string, unknown>;

    /**
     * Creates a new RPC error wrapper.
     *
     * @param code - Host error code.
     * @param message - Human-readable message.
     * @param data - Optional structured payload.
     */
    constructor(code: string, message: string, data?: Record<string, unknown>) {
        super(message);
        this.name = "TyprWireRpcError";
        this.code = code;
        this.data = data;
    }
}
