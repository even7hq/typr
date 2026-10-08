import util from "util";
import winston from "winston";
import { SPLAT } from "triple-beam";

import type { LoggerRedactionProfile, RedactionOptions } from "../LoggerTypes";
import { ErrorLogUtils } from "./ErrorLogUtils";
import { SecretRedaction } from "./SecretRedaction";

type TransformableInfo = winston.Logform.TransformableInfo;

/**
 * Options for custom splat formatting.
 */
export interface CustomSplatOptions {
    colors?: boolean;
    redaction?: LoggerRedactionProfile | RedactionOptions;
}

/**
 * Custom printf-style splat formatting for Typr loggers.
 */
export namespace CustomSplat {
    /**
     * Fallback stringifier when util.inspect throws.
     *
     * @param arg Value to stringify.
     * @param opts Inspect options.
     * @returns String representation.
     */
    export function inspectorFallback(arg: unknown, opts: { depth: number }): string {
        try {
            return util.inspect(arg, {
                depth: opts.depth,
                colors: false,
                breakLength: 120
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);

            return `[uninspectable: ${message}]`;
        }
    }

    /**
     * Formats a template with splat placeholders.
     *
     * @param format Template string.
     * @param args Interpolation values.
     * @param colors Whether ANSI colors are enabled.
     * @param redaction Per-logger redaction options.
     * @returns Formatted message.
     */
    export function formatString(
        format: string,
        args: unknown[],
        colors: boolean,
        redaction?: RedactionOptions
    ): string {
        let result = format;
        let argIndex = 0;

        result = result.replace(/%I(\d+)?/g, (match, depthGroup: string | undefined) => {
            if (argIndex >= args.length) {
                return match;
            }

            const arg = args[argIndex++];
            const depth = depthGroup ? Number(depthGroup) : 6;

            return util.inspect(arg, {
                depth: Number.isFinite(depth) ? depth : 6,
                colors,
                breakLength: 120
            });
        });

        result = result.replace(/%(\d+)?([sdifjoOt%])/g, (match, depthGroup: string | undefined, token: string) => {
            if (token === "%") {
                return "%";
            }

            if (argIndex >= args.length) {
                return match;
            }

            const arg = args[argIndex++];

            switch (token) {
                case "s":
                    return String(arg);
                case "d":
                case "i":
                    return String(Number(arg));
                case "f":
                    return String(Number(arg));
                case "j":
                    return JSON.stringify(arg);
                case "o":
                    return util.inspect(arg, { depth: 4, colors, breakLength: 120 });
                case "O": {
                    const depth = depthGroup ? Number(depthGroup) : Infinity;

                    return util.inspect(arg, {
                        depth: Number.isFinite(depth) ? depth : Infinity,
                        colors,
                        breakLength: 120
                    });
                }

                case "t": {
                    if (typeof arg !== "object" || arg === null) {
                        return String(arg);
                    }

                    const pairs = Object.entries(arg as Record<string, unknown>).map(([key, value]) => {
                        return `${key}=${String(value)}`;
                    });

                    return `(${pairs.join(", ")})`;
                }

                default:
                    return match;
            }
        });

        return result;
    }

    /**
     * Winston format that applies custom splat interpolation.
     *
     * @param options Color and inspect options.
     * @returns Winston format instance.
     */
    export function customSplatFormat(options: CustomSplatOptions = {}): winston.Logform.Format {
        const colors = options.colors ?? false;
        const redaction = options.redaction;

        return winston.format((info: TransformableInfo) => {
            const record = info as TransformableInfo & { [SPLAT]?: unknown[] };
            const splat = record[SPLAT];

            if (!splat || splat.length === 0) {
                if (info.message instanceof Error) {
                    info.message = ErrorLogUtils.format(info.message);
                }

                return info;
            }

            const redactedArgs = splat.map((arg) => SecretRedaction.redact(arg, 0, new WeakSet(), redaction));
            const template = typeof info.message === "string" ? info.message : String(info.message);

            info.message = formatString(template, redactedArgs, colors, redaction);
            record[SPLAT] = [];

            return info;
        })();
    }
}
