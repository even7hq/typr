import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts e-mail addresses in free text.
 */
export class EmailRedactor extends RegexSecretRedactor {
    /**
     * Creates the e-mail redactor (`id`: `email`).
     */
    constructor() {
        super(
            "email",
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            (match) => {
                const parts = match.split("@");

                if (parts.length === 2) {
                    return `${parts[0].substring(0, 2)}***@${parts[1]}`;
                }

                return "[REDACTED]";
            }
        );
    }
}
