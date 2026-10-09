/**
 * Static Loki/OTEL labels attached at {@link Logger.create} (merged on every emit).
 */
export type LoggerLabels = Record<string, string>;

/**
 * Winston `defaultMeta` / log record key for static logger labels.
 */
export const LOGGER_LABELS_SYMBOL = Symbol.for("typr.logger.labels");

/**
 * Normalizes and validates logger label maps for OTEL/Loki export.
 */
export namespace LoggerStaticLabels {
    /**
     * Keeps only non-empty string keys and values.
     *
     * @param input User-provided labels.
     * @returns Sanitized label map.
     */
    export function normalize(input?: LoggerLabels): LoggerLabels {
        if (!input) {
            return {};
        }

        const normalized: LoggerLabels = {};

        for (const [key, value] of Object.entries(input)) {
            if (typeof value !== "string") {
                continue;
            }

            const trimmedKey = key.trim();
            const trimmedValue = value.trim();

            if (trimmedKey === "" || trimmedValue === "") {
                continue;
            }

            normalized[trimmedKey] = trimmedValue;
        }

        return normalized;
    }

    /**
     * Reads static labels from a Winston log record.
     *
     * @param info Winston log record.
     * @returns Label map when present.
     */
    export function readFromInfo(info: Record<string, unknown>): LoggerLabels {
        const record = info as Record<PropertyKey, unknown>;
        const raw = record[LOGGER_LABELS_SYMBOL];

        if (typeof raw !== "object" || raw === null) {
            return {};
        }

        const normalized: LoggerLabels = {};

        for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
            if (typeof value !== "string" || value.trim() === "") {
                continue;
            }

            normalized[key] = value;
        }

        return normalized;
    }

    /**
     * Builds Winston `defaultMeta` for static labels.
     *
     * @param labels Sanitized labels.
     * @returns Default meta or undefined when empty.
     */
    export function defaultMeta(labels: LoggerLabels): Record<string, unknown> | undefined {
        if (Object.keys(labels).length === 0) {
            return undefined;
        }

        return {
            [LOGGER_LABELS_SYMBOL]: labels
        };
    }
}
