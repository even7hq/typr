/**
 * Thrown when AUTO policy cannot resolve a prompt without a default value.
 */
export class TUICanceledError extends Error {
    /**
     * Creates a new cancel error.
     *
     * @param message - Optional diagnostic message.
     * @returns Nothing.
     */
    constructor(message = "TUI_CANCELED") {
        super(message);
        this.name = "TUICanceledError";
    }
}
