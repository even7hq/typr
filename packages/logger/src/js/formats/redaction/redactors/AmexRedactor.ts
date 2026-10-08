import { validateLuhn } from "../LuhnValidation";
import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts Luhn-valid American Express card numbers (IIN 34/37).
 */
export class AmexRedactor extends RegexSecretRedactor {
    /**
     * Creates the AMEX redactor (`id`: `amex`).
     */
    constructor() {
        super(
            "amex",
            /(?<!\d)3[47]\d{2}[\s-]?\d{6}[\s-]?\d{5}(?!\d)/g,
            (match) => {
                const digits = match.replace(/\D/g, "");
                const iin = digits.slice(0, 2);

                if (digits.length !== 15 || (iin !== "34" && iin !== "37") || !validateLuhn(digits)) {
                    return match;
                }

                return `****-******-${digits.slice(-4)}`;
            }
        );
    }
}
