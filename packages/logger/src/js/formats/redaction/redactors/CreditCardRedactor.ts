import { validateLuhn } from "../LuhnValidation";
import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts Luhn-valid 16-digit card numbers.
 */
export class CreditCardRedactor extends RegexSecretRedactor {
    /**
     * Creates the credit card redactor (`id`: `credit-card`).
     */
    constructor() {
        super(
            "credit-card",
            /(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)/g,
            (match) => {
                const digits = match.replace(/\D/g, "");

                if (digits.length !== 16 || !validateLuhn(digits)) {
                    return match;
                }

                return `****-****-****-${digits.slice(-4)}`;
            }
        );
    }
}
