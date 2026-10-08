import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts JWT-shaped strings (`eyJ….eyJ…..`).
 */
export class JwtRedactor extends RegexSecretRedactor {
    /**
     * Creates the JWT redactor (`id`: `jwt`).
     */
    constructor() {
        super(
            "jwt",
            /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/gi,
            () => "[REDACTED]"
        );
    }
}
