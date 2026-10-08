import winston from "winston";

import type { LogSink, SinkBuildContext, SinkCategory } from "../LoggerTypes";

/**
 * Console sink with colorized Typr default formatting.
 */
export class ConsoleSink implements LogSink {
    readonly category: SinkCategory = "local";

    /**
     * Creates a Winston console transport.
     *
     * @param context Label and format pipelines.
     * @returns Console transport.
     */
    createTransports(context: SinkBuildContext): winston.transport[] {
        return [
            new winston.transports.Console({
                format: context.consoleFormat,
                stderrLevels: ["error"]
            })
        ];
    }

    /**
     * No-op shutdown for console.
     *
     * @returns Resolved promise.
     */
    async shutdown(): Promise<void> {
        return Promise.resolve();
    }
}
