import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts `Bearer` authorization tokens in log lines.
 */
export class BearerRedactor extends RegexSecretRedactor {
    /**
     * Creates the bearer token redactor (`id`: `bearer`).
     */
    constructor() {
        super(
            "bearer",
            /Bearer\s+([\w\-._~+/]+=*)/gi,
            (match) => {
                const parts = match.split(/\s+/);
                const token = parts[1] ?? "";

                return `Bearer ${token.slice(0, 4)}***REDACTED***`;
            }
        );
    }
}
