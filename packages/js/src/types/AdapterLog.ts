import type { LogMessageOptions } from "@clack/prompts";

/**
 * Yields every string chunk from an iterable or async iterable source.
 *
 * @param iterable - Iterable or async iterable of message fragments.
 * @returns Async iterable over each chunk.
 */
export async function* eachStringChunk(iterable: Iterable<string> | AsyncIterable<string>): AsyncIterable<string> {
    if (typeof iterable === "object" && iterable !== null && Symbol.asyncIterator in iterable) {
        for await (const chunk of iterable as AsyncIterable<string>) {
            yield chunk;
        }

        return;
    }

    for (const chunk of iterable as Iterable<string>) {
        yield chunk;
    }
}

/**
 * Normalized log levels for adapters and NDJSON `LOG` events.
 */
export type AdapterLogLevel =
    | "INFO"
    | "SUCCESS"
    | "STEP"
    | "WARN"
    | "WARNING"
    | "ERROR"
    | "MESSAGE";

/**
 * Optional logger label (scope) for a log line.
 */
export interface AdapterLogEmitOptions {
    label?: string;
}

/**
 * Single structured log line with level, message, and optional label.
 */
export interface AdapterLogLine {
    level: AdapterLogLevel;
    message: string;
    label?: string;
}

/**
 * Options for stream helpers, including optional label and clack stream options.
 */
export type AdapterLogStreamOptions = LogMessageOptions & AdapterLogEmitOptions;

/**
 * Stream helpers for incremental log output.
 */
export interface AdapterLogStream {
    /**
     * @param iterable - Message chunks.
     * @param opts - Optional stream and label options.
     * @returns Nothing.
     */
    message(
        iterable: Iterable<string> | AsyncIterable<string>,
        opts?: AdapterLogStreamOptions
    ): Promise<void>;

    /**
     * @param iterable - Message chunks.
     * @param opts - Optional stream and label options.
     * @returns Nothing.
     */
    info(iterable: Iterable<string> | AsyncIterable<string>, opts?: AdapterLogStreamOptions): Promise<void>;

    /**
     * @param iterable - Message chunks.
     * @param opts - Optional stream and label options.
     * @returns Nothing.
     */
    success(iterable: Iterable<string> | AsyncIterable<string>, opts?: AdapterLogStreamOptions): Promise<void>;

    /**
     * @param iterable - Message chunks.
     * @param opts - Optional stream and label options.
     * @returns Nothing.
     */
    step(iterable: Iterable<string> | AsyncIterable<string>, opts?: AdapterLogStreamOptions): Promise<void>;

    /**
     * @param iterable - Message chunks.
     * @param opts - Optional stream and label options.
     * @returns Nothing.
     */
    warn(iterable: Iterable<string> | AsyncIterable<string>, opts?: AdapterLogStreamOptions): Promise<void>;

    /**
     * @param iterable - Message chunks.
     * @param opts - Optional stream and label options.
     * @returns Nothing.
     */
    warning(iterable: Iterable<string> | AsyncIterable<string>, opts?: AdapterLogStreamOptions): Promise<void>;

    /**
     * @param iterable - Message chunks.
     * @param opts - Optional stream and label options.
     * @returns Nothing.
     */
    error(iterable: Iterable<string> | AsyncIterable<string>, opts?: AdapterLogStreamOptions): Promise<void>;
}

/**
 * Logger surface attached to a terminal adapter (`adapter.log`).
 */
export interface TerminalAdapterLog {
    /**
     * Writes a structured line with explicit level and optional label.
     *
     * @param line - Log line payload.
     * @returns Nothing.
     */
    write(line: AdapterLogLine): void;

    /**
     * @param message - Log body.
     * @param options - Optional label.
     * @returns Nothing.
     */
    info(message: string, options?: AdapterLogEmitOptions): void;

    /**
     * @param message - Log body.
     * @param options - Optional label.
     * @returns Nothing.
     */
    success(message: string, options?: AdapterLogEmitOptions): void;

    /**
     * @param message - Log body.
     * @param options - Optional label.
     * @returns Nothing.
     */
    step(message: string, options?: AdapterLogEmitOptions): void;

    /**
     * @param message - Log body.
     * @param options - Optional label.
     * @returns Nothing.
     */
    warn(message: string, options?: AdapterLogEmitOptions): void;

    /**
     * @param message - Log body.
     * @param options - Optional label.
     * @returns Nothing.
     */
    warning(message: string, options?: AdapterLogEmitOptions): void;

    /**
     * @param message - Log body.
     * @param options - Optional label and clack log message options.
     * @returns Nothing.
     */
    message(message: string, options?: AdapterLogStreamOptions): void;

    /**
     * @param message - Log body.
     * @param options - Optional label.
     * @returns Nothing.
     */
    error(message: string, options?: AdapterLogEmitOptions): void;

    /**
     * Streamed variants of log output.
     */
    readonly stream: AdapterLogStream;
}

/**
 * Helpers for formatting log text when the backend has a single string slot.
 */
export namespace AdapterLogFormatting {
    /**
     * Prefixes a message with a label when provided.
     *
     * @param message - Raw message.
     * @param label - Optional label.
     * @returns Message with optional label prefix.
     */
    export function withLabel(message: string, label?: string): string {
        if (label === undefined || label === "") {
            return message;
        }

        return `[${label}] ${message}`;
    }
}

/**
 * Removes Typr-only `label` from stream options before passing to @clack/prompts.
 *
 * @param opts - Combined stream options.
 * @returns Clack-compatible stream options or undefined.
 */
export function toClackStreamOptions(opts?: AdapterLogStreamOptions): LogMessageOptions | undefined {
    if (!opts) {
        return undefined;
    }

    const { label: _label, ...rest } = opts;

    if (Object.keys(rest).length === 0) {
        return undefined;
    }

    return rest;
}
