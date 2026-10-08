import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts international phone numbers with a leading `+` country code.
 */
export class PhoneIntlRedactor extends RegexSecretRedactor {
    /**
     * Creates the international phone redactor (`id`: `phone-intl`).
     */
    constructor() {
        super(
            "phone-intl",
            /\+\d{1,3}[\s-]?\(?\d{2,3}\)?[\s-]?\d{4,5}[\s-]?\d{4}/g,
            (match) => `${match.substring(0, 3)}*****${match.slice(-2)}`
        );
    }
}
