import Transport from "winston-transport";

import type { LogRecord, LogSink, SinkBuildContext, SinkCategory } from "../LoggerTypes";

/**
 * Options for {@link CustomSink}.
 */
export interface CustomSinkOptions {
    level?: string;
    category?: SinkCategory;
    log: (record: LogRecord) => void;
}

/**
 * Callback-based custom sink.
 */
export class CustomSink implements LogSink {
    readonly category: SinkCategory;

    private readonly options: CustomSinkOptions;
    private transport: Transport | null = null;

    /**
     * @param options Callback and optional level/category.
     */
    constructor(options: CustomSinkOptions) {
        this.options = options;
        this.category = options.category ?? "local";
    }

    /**
     * Builds a Winston transport that forwards to the callback.
     *
     * @param context Label context (unused for callback).
     * @returns Custom transport.
     */
    createTransports(context: SinkBuildContext): Transport[] {
        const callback = this.options.log;
        const level = this.options.level;

        class CallbackTransport extends Transport {
            log(info: Record<string, unknown>, transportCallback: () => void): void {
                setImmediate(transportCallback);

                const record: LogRecord = {
                    level: String(info.level ?? "info"),
                    message: String(info.message ?? ""),
                    label: context.label,
                    timestamp: typeof info.timestamp === "string" ? info.timestamp : undefined,
                    meta: { ...info }
                };

                callback(record);
            }
        }

        this.transport = new CallbackTransport({ level });

        return [this.transport];
    }

    /**
     * Closes the custom transport.
     *
     * @returns Resolved promise.
     */
    async shutdown(): Promise<void> {
        if (this.transport) {
            this.transport.close?.();
        }

        return Promise.resolve();
    }
}
