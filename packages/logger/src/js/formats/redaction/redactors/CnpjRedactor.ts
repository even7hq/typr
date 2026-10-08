import { sanitizeCNPJ, validateCNPJ } from "../DocumentValidation";
import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts valid CNPJ numbers (checksum-validated).
 */
export class CnpjRedactor extends RegexSecretRedactor {
    /**
     * Creates the CNPJ redactor (`id`: `cnpj`).
     */
    constructor() {
        super(
            "cnpj",
            /(?<![A-Z0-9])[A-Z0-9]{2}\.?[A-Z0-9]{3}\.?[A-Z0-9]{3}\/?[A-Z0-9]{4}-?[0-9]{2}(?![A-Z0-9])/gi,
            (match) => {
                const sanitized = sanitizeCNPJ(match);

                if (sanitized.length !== 14 || !validateCNPJ(sanitized)) {
                    return match;
                }

                return `**.${sanitized.slice(2, 5)}.${sanitized.slice(5, 8)}/****-**`;
            }
        );
    }
}
