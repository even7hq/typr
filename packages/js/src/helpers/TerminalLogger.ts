import { inspect } from "util";
import chalk from "chalk";
import { log, spinner as typrSpinner } from "../core/GlobalSession";

/**
 * Log levels accepted by optional file sinks.
 */
export type TerminalLogLevel = "debug" | "info" | "warn" | "error" | "success";

/**
 * Optional sink invoked after each formatted log line (e.g. file appenders).
 */
export type TerminalLoggerFileSink = (level: TerminalLogLevel, line: string) => void;

/**
 * Options for {@link TerminalLogger} instances.
 */
export interface TerminalLoggerOptions {
    /** Called with the final formatted line after Typr/console output. */
    fileSink?: TerminalLoggerFileSink;
}

/**
 * A spinner handle returned by {@link TerminalLogger.spinner}.
 */
export interface TerminalLoggerSpinner {
    /**
     * Starts the spinner with an optional initial message.
     *
     * @param message Initial spinner message shown while work is in progress
     * @returns Nothing.
     */
    start(message: string): void;

    /**
     * Updates the spinner message while it is still running.
     *
     * @param message Updated message to display
     * @returns Nothing.
     */
    message(message: string): void;

    /**
     * Stops the spinner and shows a success message.
     *
     * @param message Final message displayed when the operation completes
     * @returns Nothing.
     */
    stop(message: string): void;

    /**
     * Stops the spinner and shows an error message.
     *
     * @param message Error message displayed when the operation fails
     * @returns Nothing.
     */
    error(message: string): void;
}

/**
 * Structured CLI logger backed by Typr `log` and `spinner` with raw-mode fallback.
 *
 * In normal mode all output goes through Typr. In raw mode (ref-counted) output uses
 * plain chalk-colored console lines so child process TUIs are not disrupted.
 */
export class TerminalLogger {
    private static globalVerbose = false;
    private static rawModeRefCount = 0;

    /**
     * Creates a logger scoped to a context label (included in file sink lines when set).
     *
     * @param context Namespace for this logger (e.g. `git/pull`)
     * @param options Optional file sink and other hooks
     * @returns New {@link TerminalLogger} instance
     */
    static create(context: string, options?: TerminalLoggerOptions): TerminalLogger {
        return new TerminalLogger(context, options);
    }

    /**
     * Sets global verbose mode (enables `debug()` output).
     *
     * @param verbose Whether verbose mode should be enabled globally
     * @returns Nothing.
     */
    static setVerbose(verbose: boolean): void {
        TerminalLogger.globalVerbose = verbose;
    }

    /**
     * Gets global verbose mode.
     *
     * @returns Whether verbose mode is enabled globally
     */
    static getVerbose(): boolean {
        return TerminalLogger.globalVerbose;
    }

    /**
     * Increments or decrements raw mode (plain console instead of Typr symbols).
     *
     * @param raw Pass true to enter raw mode, false to leave it
     * @returns Nothing.
     */
    static setRawMode(raw: boolean): void {
        if (raw) {
            TerminalLogger.rawModeRefCount++;
        } else {
            TerminalLogger.rawModeRefCount = Math.max(0, TerminalLogger.rawModeRefCount - 1);
        }
    }

    /**
     * Gets whether raw mode is active.
     *
     * @returns True when at least one caller holds raw mode
     */
    static getRawMode(): boolean {
        return TerminalLogger.rawModeRefCount > 0;
    }

    /**
     * Creates a spinner handle for a long-running operation.
     *
     * @returns Spinner handle
     */
    static spinner(): TerminalLoggerSpinner {
        let active: ReturnType<typeof typrSpinner> | null = null;

        return {
            start(message: string): void {
                if (TerminalLogger.getRawMode()) {
                    console.log(chalk.cyan("...") + " " + message);
                    return;
                }

                active = typrSpinner();
                active.start(message);
            },

            message(message: string): void {
                if (active) {
                    active.message(message);
                } else {
                    console.log(chalk.cyan("...") + " " + message);
                }
            },

            stop(message: string): void {
                if (active) {
                    active.stop(message);
                    active = null;
                } else {
                    console.log(chalk.green("◆") + " " + message);
                }
            },

            error(message: string): void {
                if (active) {
                    active.error(message);
                    active = null;
                } else {
                    console.error(chalk.red("■") + " " + message);
                }
            }
        };
    }

    /**
     * @param context Logger namespace
     * @param options Optional hooks
     */
    constructor(
        public readonly context: string,
        private readonly options: TerminalLoggerOptions = {}
    ) {}

    /**
     * Logs an error message.
     *
     * @param message Error message or object
     * @param args Printf-style format arguments
     * @returns Nothing.
     */
    public error(message: string | unknown, ...args: unknown[]): void {
        this.emit("error", message, args, (line) => log.error(line));
    }

    /**
     * Logs a warning message.
     *
     * @param message Warning message or object
     * @param args Printf-style format arguments
     * @returns Nothing.
     */
    public warn(message: string | unknown, ...args: unknown[]): void {
        this.emit("warn", message, args, (line) => log.warn(line));
    }

    /**
     * Logs an informational message.
     *
     * @param message Info message or object
     * @param args Printf-style format arguments
     * @returns Nothing.
     */
    public info(message: string | unknown, ...args: unknown[]): void {
        this.emit("info", message, args, (line) => log.info(line));
    }

    /**
     * Logs a success message.
     *
     * @param message Success message or object
     * @param args Printf-style format arguments
     * @returns Nothing.
     */
    public success(message: string | unknown, ...args: unknown[]): void {
        this.emit("success", message, args, (line) => log.success(line));
    }

    /**
     * Logs a debug message when global verbose mode is enabled.
     *
     * @param message Debug message or object
     * @param args Printf-style format arguments
     * @returns Nothing.
     */
    public debug(message: string | unknown, ...args: unknown[]): void {
        if (!TerminalLogger.globalVerbose) {
            return;
        }

        this.emit("debug", message, args, (line) => {
            log.message(line, { symbol: chalk.dim("~"), spacing: 0 });
        });
    }

    /**
     * Logs a message with a custom symbol prefix.
     *
     * @param prefix Symbol or emoji prefix
     * @param message Message to log
     * @param args Printf-style format arguments
     * @returns Nothing.
     */
    public log(prefix: string, message: string | unknown, ...args: unknown[]): void {
        const formatted = this.format(message, args);

        if (TerminalLogger.getRawMode()) {
            for (const line of formatted.split("\n")) {
                console.log(prefix + " " + line);
            }
        } else {
            log.message(formatted, { symbol: prefix, spacing: 0 });
        }

        this.options.fileSink?.("info", this.tagLine(formatted));
    }

    /**
     * Formats a message with optional printf-style arguments.
     *
     * @param message Message string or object
     * @param args Printf-style arguments
     * @returns Formatted string
     */
    public format(message: string | unknown, args: unknown[]): string {
        if (typeof message === "object" && message !== null) {
            message = inspect(message, { depth: null, colors: true });
        }

        if (args.length === 0) {
            return String(message);
        }

        return this.formatString(String(message), ...args);
    }

    /**
     * @param level Log level for file sink tagging
     * @param message Message or object
     * @param args Format arguments
     * @param write Typr log writer for this level
     * @returns Nothing.
     */
    private emit(
        level: TerminalLogLevel,
        message: string | unknown,
        args: unknown[],
        write: (line: string) => void
    ): void {
        const formatted = this.format(message, args);

        if (TerminalLogger.getRawMode()) {
            this.writeRaw(level, formatted);
        } else {
            write(formatted);
        }

        this.options.fileSink?.(level, this.tagLine(formatted));
    }

    /**
     * @param level Log level
     * @param formatted Pre-formatted message body
     * @returns Nothing.
     */
    private writeRaw(level: TerminalLogLevel, formatted: string): void {
        const lines = formatted.split("\n");

        for (const line of lines) {
            switch (level) {
                case "error":
                    console.error(chalk.red("ERROR") + " " + line);
                    break;
                case "warn":
                    console.warn(chalk.yellow("WARN") + " " + line);
                    break;
                case "success":
                    console.log(chalk.green("SUCCESS") + " " + line);
                    break;
                case "debug":
                    console.log(chalk.gray("DEBUG") + " " + line);
                    break;
                default:
                    console.log(chalk.blue("INFO") + " " + line);
            }
        }
    }

    /**
     * @param formatted Message body
     * @returns Line prefixed with context when set
     */
    private tagLine(formatted: string): string {
        return this.context ? `[${this.context}] ${formatted}` : formatted;
    }

    /**
     * @param format Format string with placeholders
     * @param args Substitution values
     * @returns Formatted string
     */
    private formatString(format: string, ...args: unknown[]): string {
        let result = format;
        let argIndex = 0;

        result = result.replace(/%[sdjvo]/ig, (match) => {
            match = match.toLowerCase();

            if (match === "%%") {
                return "%";
            }

            if (argIndex >= args.length) {
                return match;
            }

            const arg = args[argIndex++];

            if (match === "%d") {
                return String(Number(arg));
            }

            if (match === "%j" || match === "%o") {
                return inspect(arg, { depth: 4, colors: true });
            }

            return String(arg);
        });

        return result;
    }
}
