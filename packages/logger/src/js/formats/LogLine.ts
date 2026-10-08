import winston from "winston";

/**
 * Options for the default Typr log line printf format.
 */
export interface LogLineOptions {
    nodeId?: string;
    appendMessage?: (info: winston.Logform.TransformableInfo) => string;
    stripAnsi?: boolean;
}

/**
 * Default opinionated log line: `timestamp [nodeId] label [level]: message`.
 */
export namespace LogLine {
    /**
     * Builds the shared printf format used by console and file sinks.
     *
     * @param options Node id and optional hooks.
     * @returns Winston printf format.
     */
    export function generateDefaultPrintfFormat(options: LogLineOptions = {}): winston.Logform.Format {
        const nodeId = options.nodeId ?? process.env.NODE_ID ?? process.pid.toString();

        return winston.format.printf((info) => {
            const label = typeof info.label === "string" ? info.label : "";
            const level = info.level;
            const timestamp = String(info.timestamp ?? "");
            let message = String(info.message ?? "");

            if (options.stripAnsi) {
                message = message.replace(/\u001b\[[0-9;]*m/g, "");
            }

            const suffix = options.appendMessage ? options.appendMessage(info) : "";
            const labelPart = label ? `${label} ` : "";

            return `${timestamp} [${nodeId}] ${labelPart}[${level}]: ${message}${suffix}`;
        });
    }

    /**
     * Console pipeline: timestamp, colorize, splat, redaction, printf.
     *
     * @param parts Format chain segments after timestamp.
     * @param printfFormat Final line shape.
     * @returns Combined format.
     */
    export function generateConsoleFormat(
        parts: winston.Logform.Format[],
        printfFormat: winston.Logform.Format
    ): winston.Logform.Format {
        return winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.colorize(),
            ...parts,
            printfFormat
        );
    }

    /**
     * File pipeline without ANSI color codes.
     *
     * @param parts Format chain segments after timestamp.
     * @param printfFormat Final line shape.
     * @returns Combined format.
     */
    export function generateFileFormat(
        parts: winston.Logform.Format[],
        printfFormat: winston.Logform.Format
    ): winston.Logform.Format {
        return winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            ...parts,
            winston.format.uncolorize(),
            printfFormat
        );
    }
}
