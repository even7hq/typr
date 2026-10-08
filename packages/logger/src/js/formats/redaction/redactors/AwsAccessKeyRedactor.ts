import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts AWS access key ids (`AKIA…`, `ASIA…`).
 */
export class AwsAccessKeyRedactor extends RegexSecretRedactor {
    /**
     * Creates the AWS access key redactor (`id`: `aws-access-key`).
     */
    constructor() {
        super(
            "aws-access-key",
            /\b(AKIA|ASIA)[A-Z0-9]{16}\b/g,
            (match) => `${match.slice(0, 6)}***REDACTED***`
        );
    }
}
