import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts `x-access-token:` header fragments in log text.
 */
export class XAccessTokenRedactor extends RegexSecretRedactor {
    /**
     * Creates the x-access-token redactor (`id`: `x-access-token`).
     */
    constructor() {
        super(
            "x-access-token",
            /x-access-token:[^@\s'"]+/g,
            () => "x-access-token:***REDACTED***"
        );
    }
}
