/**
 * Built-in redactor pack ids.
 */
export type RedactorPackId = "recommended";

/**
 * Selects a built-in redactor pack and optional id subset (pack order when ids are omitted).
 */
export class RedactorPackSelection {
    readonly pack: RedactorPackId;
    readonly redactors?: readonly string[];

    /**
     * @param pack The pack id.
     * @param redactors Optional redactor ids from that pack (omit for the full pack).
     */
    constructor(pack: RedactorPackId, redactors?: readonly string[]) {
        this.pack = pack;
        this.redactors = redactors;
    }
}
