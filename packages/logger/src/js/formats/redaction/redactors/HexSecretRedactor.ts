import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts long hex strings (64+ chars), e.g. signing keys.
 */
export class HexSecretRedactor extends RegexSecretRedactor {
    /**
     * Creates the hex secret redactor (`id`: `hex-secret`).
     */
    constructor() {
        super(
            "hex-secret",
            /\b[a-fA-F0-9]{64,}\b/g,
            () => "[REDACTED]"
        );
    }
}
