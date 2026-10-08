import fs from "fs";
import path from "path";

import type winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

import type { FileRotationOptions, LogSink, SinkBuildContext, SinkCategory } from "../LoggerTypes";

/**
 * Options for {@link FileSink}.
 */
export interface FileSinkOptions {
    logDir?: string;
    combined?: boolean;
    error?: boolean;
    rotation?: FileRotationOptions;
}

/**
 * File sink with daily rotation and configurable retention (default 2 days).
 */
export class FileSink implements LogSink {
    readonly category: SinkCategory = "local";

    private readonly options: FileSinkOptions;
    private readonly transports: DailyRotateFile[] = [];

    /**
     * @param options Log directory and rotation settings.
     */
    constructor(options: FileSinkOptions = {}) {
        this.options = options;
    }

    /**
     * Creates combined and/or error rotate-file transports.
     *
     * @param context Label and format pipelines.
     * @returns Rotate-file transports (empty when log dir is unavailable).
     */
    createTransports(context: SinkBuildContext): winston.transport[] {
        const logDir = path.resolve(this.options.logDir ?? process.env.LOG_DIR ?? "./logs");
        const rotation = this.options.rotation ?? {};
        const maxDays = rotation.maxDays ?? 2;
        const datePattern = rotation.datePattern ?? "YYYY-MM-DD";
        const zippedArchive = rotation.zippedArchive ?? false;

        try {
            fs.mkdirSync(logDir, { recursive: true });
        } catch {
            return [];
        }

        const shared = {
            format: context.fileFormat,
            datePattern,
            zippedArchive,
            maxFiles: `${maxDays}d`
        };

        const created: winston.transport[] = [];

        if (this.options.combined !== false) {
            const combined = new DailyRotateFile({
                ...shared,
                filename: path.join(logDir, "log-%DATE%.log")
            });

            this.transports.push(combined);
            created.push(combined);
        }

        if (this.options.error !== false) {
            const errorFile = new DailyRotateFile({
                ...shared,
                level: "error",
                filename: path.join(logDir, "error-%DATE%.log")
            });

            this.transports.push(errorFile);
            created.push(errorFile);
        }

        return created;
    }

    /**
     * Closes rotate-file transports.
     *
     * @returns Resolved when files are closed.
     */
    async shutdown(): Promise<void> {
        for (const transport of this.transports) {
            await new Promise<void>((resolve) => {
                if (transport.close) {
                    transport.close();
                }

                resolve();
            });
        }
    }
}
