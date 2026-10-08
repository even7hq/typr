import { validateCPF } from "../DocumentValidation";
import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts valid CPF numbers (checksum-validated).
 */
export class CpfRedactor extends RegexSecretRedactor {
    /**
     * Creates the CPF redactor (`id`: `cpf`).
     */
    constructor() {
        super(
            "cpf",
            /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g,
            (match) => {
                const digits = match.replace(/\D/g, "");

                if (digits.length !== 11 || !validateCPF(digits)) {
                    return match;
                }

                return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
            }
        );
    }
}
