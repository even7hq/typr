import util from "util";

const WINSTON_SPLAT = Symbol.for("splat");

const WINSTON_RESERVED_KEYS = new Set([
    "level",
    "message",
    "splat",
    "timestamp",
    "label"
]);

/**
 * Formats a Winston log message with splat args.
 *
 * @param info Winston log record.
 * @returns Final log body string.
 */
export function formatWinstonLogBody(info: Record<string, unknown>): string {
    const rawMessage = info.message;
    const splat = readWinstonSplat(info);

    if (splat !== undefined && splat.length > 0) {
        const template = typeof rawMessage === "string" ? rawMessage : String(rawMessage ?? "");

        return util.format(template, ...splat);
    }

    if (typeof rawMessage === "string") {
        return rawMessage;
    }

    return String(rawMessage ?? "");
}

/**
 * Returns whether a Winston info key should be copied to OTel attributes.
 *
 * @param key Property name on the log record.
 * @returns True when the key is safe to export as an attribute.
 */
export function isWinstonAttributeKey(key: string): boolean {
    return !WINSTON_RESERVED_KEYS.has(key);
}

/**
 * Reads Winston splat interpolation args from a log record.
 *
 * @param info Winston log record.
 * @returns Splat args when present.
 */
function readWinstonSplat(info: Record<string, unknown>): unknown[] | undefined {
    const record = info as Record<PropertyKey, unknown>;
    const splat = record[WINSTON_SPLAT];

    if (!Array.isArray(splat)) {
        return undefined;
    }

    return splat;
}
