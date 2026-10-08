const CNPJ_MASK_CHARS = /[./-]/g;
const CNPJ_INVALID_CHARS = /[^A-Z0-9./-]/i;
const CNPJ_BODY_LENGTH = 12;
const CNPJ_TOTAL_LENGTH = 14;
const CNPJ_ZEROED = "00000000000000";
const CNPJ_DV_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const ASCII_BASE = "0".charCodeAt(0);

/**
 * Strips any non-digit characters from a document string.
 *
 * @param value The raw CPF/CNPJ input.
 * @returns Only numeric characters.
 */
export function sanitizeDocumentDigits(value: string | number): string {
    return String(value).replace(/[^0-9]/g, "");
}

/**
 * Sanitizes a CNPJ value (numeric or alphanumeric).
 *
 * @param value The raw CNPJ input.
 * @returns CNPJ body without mask (A-Z and 0-9 only).
 */
export function sanitizeCNPJ(value: string | number): string {
    return String(value)
        .toUpperCase()
        .replace(CNPJ_MASK_CHARS, "")
        .replace(/[^A-Z0-9]/g, "");
}

/**
 * Returns the numeric weight of a CNPJ character for DV calculation (ASCII - 48).
 *
 * @param char The single CNPJ character.
 * @returns Weight value used in modulo 11.
 */
function cnpjCharWeight(char: string): number {
    return char.charCodeAt(0) - ASCII_BASE;
}

/**
 * Calculates both CNPJ verification digits for the 12-character base.
 *
 * @param base The twelve-character CNPJ base (no DV).
 * @returns Two-digit verification string.
 */
function calculateCNPJVerificationDigits(base: string): string {
    let sumDv1 = 0;
    let sumDv2 = 0;

    for (let i = 0; i < CNPJ_BODY_LENGTH; i++) {
        const weight = cnpjCharWeight(base[i]);
        sumDv1 += weight * CNPJ_DV_WEIGHTS[i + 1];
        sumDv2 += weight * CNPJ_DV_WEIGHTS[i];
    }

    const dv1 = sumDv1 % 11 < 2 ? 0 : 11 - (sumDv1 % 11);
    sumDv2 += dv1 * CNPJ_DV_WEIGHTS[CNPJ_BODY_LENGTH];
    const dv2 = sumDv2 % 11 < 2 ? 0 : 11 - (sumDv2 % 11);

    return `${dv1}${dv2}`;
}

/**
 * Validates a Brazilian CPF (11 digits, checksum).
 *
 * @param cpf The CPF value (with or without punctuation).
 * @returns True when the CPF is valid.
 */
export function validateCPF(cpf: string): boolean {
    let sum = 0;
    let rest: number;

    cpf = sanitizeDocumentDigits(cpf);

    if (cpf.length !== 11) {
        return false;
    }

    if (cpf === "0".repeat(11) || cpf === "1".repeat(11) || cpf === "2".repeat(11)) {
        return false;
    }

    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
    }

    rest = (sum * 10) % 11;

    if (rest === 10 || rest === 11) {
        rest = 0;
    }

    if (rest !== parseInt(cpf.substring(9, 10), 10)) {
        return false;
    }

    sum = 0;

    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
    }

    rest = (sum * 10) % 11;

    if (rest === 10 || rest === 11) {
        rest = 0;
    }

    if (rest !== parseInt(cpf.substring(10, 11), 10)) {
        return false;
    }

    return true;
}

/**
 * Validates a Brazilian CNPJ (14 characters, numeric or alphanumeric, checksum).
 *
 * @param cnpj The CNPJ value (with or without punctuation).
 * @returns True when the CNPJ is valid.
 */
export function validateCNPJ(cnpj: string | number): boolean {
    if (CNPJ_INVALID_CHARS.test(String(cnpj))) {
        return false;
    }

    const cleaned = sanitizeCNPJ(cnpj);

    if (
        !cleaned ||
        cleaned.length !== CNPJ_TOTAL_LENGTH ||
        !/^[A-Z0-9]{12}\d{2}$/.test(cleaned) ||
        cleaned === CNPJ_ZEROED
    ) {
        return false;
    }

    const base = cleaned.substring(0, CNPJ_BODY_LENGTH);
    const informedDv = cleaned.substring(CNPJ_BODY_LENGTH);
    const calculatedDv = calculateCNPJVerificationDigits(base);

    return informedDv === calculatedDv;
}
