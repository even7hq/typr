/**
 * Validates a numeric string with the Luhn checksum used by card PANs.
 *
 * @param digits The bare digit string, with no separators.
 * @returns True when the digits pass Luhn.
 */
export function validateLuhn(digits: string): boolean {
    let sum = 0;
    let shouldDouble = false;

    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = Number(digits[i]);

        if (!Number.isInteger(digit)) {
            return false;
        }

        if (shouldDouble) {
            digit *= 2;

            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        shouldDouble = !shouldDouble;
    }

    return digits.length > 0 && sum % 10 === 0;
}
