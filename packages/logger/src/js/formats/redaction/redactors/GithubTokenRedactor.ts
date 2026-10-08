import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts GitHub personal/app tokens (`ghp_`, `ghs_`, …).
 */
export class GithubTokenRedactor extends RegexSecretRedactor {
    /**
     * Creates the GitHub token redactor (`id`: `github-token`).
     */
    constructor() {
        super(
            "github-token",
            /\b(ghs_|ghp_|gho_|ghu_)[A-Za-z0-9_]{4}[A-Za-z0-9_]+/gi,
            (match) => `${match.slice(0, 8)}***REDACTED***`
        );
    }
}
