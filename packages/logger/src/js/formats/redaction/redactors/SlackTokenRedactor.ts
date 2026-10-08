import { RegexSecretRedactor } from "../SecretRedactor";

/**
 * Redacts Slack bot/user/app tokens (`xoxb-`, `xoxp-`, …).
 */
export class SlackTokenRedactor extends RegexSecretRedactor {
    /**
     * Creates the Slack token redactor (`id`: `slack-token`).
     */
    constructor() {
        super(
            "slack-token",
            /\b(xoxb-|xoxp-|xapp-|xoxs-)[A-Za-z0-9-]+/gi,
            (match) => {
                const dashIdx = match.indexOf("-", 5);
                const prefix = dashIdx >= 0 ? match.slice(0, dashIdx + 5) : match.slice(0, 9);

                return `${prefix}***REDACTED***`;
            }
        );
    }
}
