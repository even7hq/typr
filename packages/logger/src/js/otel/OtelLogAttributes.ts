import { LoggerStaticLabels } from "../LoggerStaticLabels";
import { isWinstonAttributeKey } from "./WinstonLogMessageFormat";

/**
 * Builds OTLP log attributes from a Winston record (static labels + logger name + safe info keys).
 *
 * @param loggerLabel Logger name from {@link Logger.create}.
 * @param info Winston log record.
 * @returns Attribute map for `otelLogger.emit`.
 */
export function buildOtelLogAttributes(
    loggerLabel: string,
    info: Record<string, unknown>
): Record<string, string | number | boolean> {
    const attributes: Record<string, string | number | boolean> = {
        ...LoggerStaticLabels.readFromInfo(info),
        "log.logger": loggerLabel
    };

    for (const key of Object.keys(info)) {
        if (!isWinstonAttributeKey(key)) {
            continue;
        }

        const value = info[key];

        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            attributes[key] = value;
        }
    }

    return attributes;
}
