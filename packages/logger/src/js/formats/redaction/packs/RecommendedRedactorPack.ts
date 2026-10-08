import { ConfigValuesRedactor } from "../ConfigValuesRedactor";
import { AmexRedactor } from "../redactors/AmexRedactor";
import { AwsAccessKeyRedactor } from "../redactors/AwsAccessKeyRedactor";
import { BearerRedactor } from "../redactors/BearerRedactor";
import { CnpjRedactor } from "../redactors/CnpjRedactor";
import { CpfRedactor } from "../redactors/CpfRedactor";
import { CreditCardRedactor } from "../redactors/CreditCardRedactor";
import { EmailRedactor } from "../redactors/EmailRedactor";
import { GithubTokenRedactor } from "../redactors/GithubTokenRedactor";
import { HexSecretRedactor } from "../redactors/HexSecretRedactor";
import { JwtRedactor } from "../redactors/JwtRedactor";
import { PhoneIntlRedactor } from "../redactors/PhoneIntlRedactor";
import { SlackTokenRedactor } from "../redactors/SlackTokenRedactor";
import { XAccessTokenRedactor } from "../redactors/XAccessTokenRedactor";
import type { SecretRedactor } from "../SecretRedactor";
import { RedactorPackSelection } from "./RedactorPackSelection";

/**
 * Default redactor pack used when the registry boots (Typr logger recommended set).
 */
export namespace RecommendedRedactorPack {
    /**
     * Stable ids in application order (matches {@link createAll}).
     */
    export const ORDERED_IDS: readonly string[] = [
        "bearer",
        "github-token",
        "aws-access-key",
        "slack-token",
        "jwt",
        "cpf",
        "cnpj",
        "credit-card",
        "amex",
        "email",
        "phone-intl",
        "hex-secret",
        "x-access-token",
        "config-values"
    ];

    /**
     * Pack reference for {@link RedactionOptions.redactors} with an optional id subset.
     *
     * @param redactors Built-in ids to include (omit for the full pack).
     * @returns A pack selection resolved at {@link Logger.create}.
     */
    export function configure(redactors?: string[]): RedactorPackSelection {
        if (!redactors || redactors.length === 0) {
            return new RedactorPackSelection("recommended");
        }

        return new RedactorPackSelection("recommended", redactors);
    }

    /**
     * Instantiates redactors from a {@link RedactorPackSelection}.
     *
     * @param selection Pack and optional ids.
     * @returns Fresh redactor instances.
     */
    export function instantiate(selection: RedactorPackSelection): SecretRedactor[] {
        if (selection.pack !== "recommended") {
            throw new Error(`Unknown redactor pack: ${selection.pack}`);
        }

        if (!selection.redactors || selection.redactors.length === 0) {
            return createAll();
        }

        return selection.redactors.map((id) => createById(id));
    }

    /**
     * Instantiates every redactor in the recommended pack.
     *
     * @returns Redactors in the order they run on strings.
     */
    export function createAll(): SecretRedactor[] {
        return [
            new BearerRedactor(),
            new GithubTokenRedactor(),
            new AwsAccessKeyRedactor(),
            new SlackTokenRedactor(),
            new JwtRedactor(),
            new CpfRedactor(),
            new CnpjRedactor(),
            new CreditCardRedactor(),
            new AmexRedactor(),
            new EmailRedactor(),
            new PhoneIntlRedactor(),
            new HexSecretRedactor(),
            new XAccessTokenRedactor(),
            new ConfigValuesRedactor()
        ];
    }

    /**
     * Instantiates one built-in redactor by id.
     *
     * @param id Stable redactor id from {@link ORDERED_IDS}.
     * @returns A new redactor instance.
     */
    export function createById(id: string): SecretRedactor {
        switch (id) {
            case "bearer":
                return new BearerRedactor();
            case "github-token":
                return new GithubTokenRedactor();
            case "aws-access-key":
                return new AwsAccessKeyRedactor();
            case "slack-token":
                return new SlackTokenRedactor();
            case "jwt":
                return new JwtRedactor();
            case "cpf":
                return new CpfRedactor();
            case "cnpj":
                return new CnpjRedactor();
            case "credit-card":
                return new CreditCardRedactor();
            case "amex":
                return new AmexRedactor();
            case "email":
                return new EmailRedactor();
            case "phone-intl":
                return new PhoneIntlRedactor();
            case "hex-secret":
                return new HexSecretRedactor();
            case "x-access-token":
                return new XAccessTokenRedactor();
            case "config-values":
                return new ConfigValuesRedactor();
            default:
                throw new Error(`Unknown secret redactor id: ${id}`);
        }
    }
}
