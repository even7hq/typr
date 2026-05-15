// framedConsole.js

import { format } from "util";

interface TextConfiguration {
    /**
     * The prefix to display in the header.
     */
    prefix?: string;

    /**
     * The wrapper function to apply to the text.
     */
    wrapper?: (text: string, configuration: TextConfiguration) => string;

    /**
     * The text to display in the header.
     */
    text?: string;
}

type FramedConsoleOptions = {
    /**
     * The header configuration.
     */
    header?: TextConfiguration;

    /**
     * The text to display in the footer.
     */
    footer?: TextConfiguration;

    /**
     * Whether to enable the framed console.
     * When false, no cursor/clear-screen sequences are emitted and logs pass through unchanged.
     * @default true
     */
    enabled?: boolean;
};

/**
 * Regular expression that matches all ANSI escape sequences (colors, cursor moves, etc.).
 */
const ANSI_ESCAPE_RE = /\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

/**
 * Whether the current platform supports VT100 scroll regions and raw-mode stdin.
 * Windows terminals (cmd, PowerShell, ConPTY) do not support scroll regions reliably,
 * so the framed console is disabled entirely on that platform.
 */
const PLATFORM_SUPPORTS_FRAME = process.platform !== "win32";

/**
 * Returns the visible (display) length of a string, ignoring ANSI codes.
 */
function visibleLength(str: string): number {
    return str.replace(ANSI_ESCAPE_RE, "").length;
}

export class FramedConsole {
    private originalConsole: {
        log: typeof console.log;
        info: typeof console.info;
        warn: typeof console.warn;
        error: typeof console.error;
        debug: typeof console.debug;
    };

    private get terminalHeight(): number {
        return process.stdout.rows || Number(process.env.LINES) || 24;
    }

    private get terminalWidth(): number {
        return process.stdout.columns || Number(process.env.COLUMNS) || 80;
    }

    private get headerLine(): number {
        return 1;
    }

    private get footerLine(): number {
        return this.terminalHeight;
    }

    /**
     * First line of the scrollable body region (live mode).
     */
    private get bodyTop(): number {
        return this.hasHeader ? this.headerLine + 1 : 1;
    }

    /**
     * Last line of the scrollable body region (live mode).
     */
    private get bodyBottom(): number {
        return this.hasFooter ? this.footerLine - 1 : this.terminalHeight;
    }

    /**
     * Whether the framed console is enabled.
     */
    private enabled: boolean;

    /**
     * Ring buffer of all log lines (already wrapped to terminal width at time of write).
     * Used for scroll-review mode and for the crash dump in restore().
     */
    private messageBuffer: string[] = [];

    /**
     * Maximum number of lines kept in the buffer to prevent unbounded memory growth.
     */
    private static readonly MAX_BUFFER = 10_000;

    /**
     * Whether the console is currently in scroll-review mode (user pressed PgUp).
     * In review mode the live scroll region is replaced by a full-screen dump so the
     * terminal's own scrollback bar can be used freely.
     */
    private isReviewing = false;

    constructor(protected readonly options: FramedConsoleOptions = {}) {
        // Disable on platforms that don't support VT100 scroll regions (e.g. Windows),
        // or when the caller explicitly passes enabled: false (e.g. --noFrame).
        this.enabled = options.enabled !== false && PLATFORM_SUPPORTS_FRAME;

        // Keep original console methods for restore().
        this.originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
            debug: console.debug
        };

        // Draw the frame for the first time
        this.drawLiveFrame();

        if (this.enabled) {
            this.setupResizeHandler();
            this.setupKeyboardHandlers();
        }

        // Hook console global
        console.log = this.createHookedMethod("", this.originalConsole.log);
        console.info = this.createHookedMethod("info", this.originalConsole.info);
        console.warn = this.createHookedMethod("warn", this.originalConsole.warn);
        console.error = this.createHookedMethod("error", this.originalConsole.error);
        console.debug = this.createHookedMethod("debug", this.originalConsole.debug);
    }

    /**
     * Applies the text configuration to the text.
     */
    private applyTextConfiguration(configuration?: TextConfiguration): string {
        if (!configuration) {
            return "";
        }

        let text = configuration.prefix ?? "";

        if (configuration.text) {
            text += configuration.text;
        }

        if (configuration.wrapper) {
            text = configuration.wrapper(text, configuration);
        }

        return text;
    }

    protected get headerText(): string {
        return this.applyTextConfiguration(this.options.header);
    }

    protected get footerText(): string {
        return this.applyTextConfiguration(this.options.footer);
    }

    protected get hasHeader(): boolean {
        return !!this.options.header;
    }

    protected get hasFooter(): boolean {
        return !!this.options.footer;
    }

    /**
     * Updates the header configuration and redraws the pinned lines.
     */
    public setHeader(configuration: TextConfiguration): void {
        this.options.header = {...this.options.header, ...configuration};
        this.redrawHeaderFooter();
    }

    /**
     * Updates the footer configuration and redraws the pinned lines.
     */
    public setFooter(configuration: TextConfiguration): void {
        this.options.footer = {...this.options.footer, ...configuration};
        this.redrawHeaderFooter();
    }

    /**
     * Restores the original console methods and leaves the terminal in a clean state.
     *
     * On a clean exit this clears the frame and parks the cursor.
     * On an unexpected crash the full buffer is dumped to the scrollback so no
     * log lines are lost.
     */
    public restore(isDump = false): void {
        console.log = this.originalConsole.log;
        console.info = this.originalConsole.info;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
        console.debug = this.originalConsole.debug;

        if (!this.enabled) {
            return;
        }

        this.teardownKeyboardHandlers();

        // Reset scroll region so the whole terminal is usable again
        process.stdout.write("\x1b[r");

        if (isDump) {
            // Crash path: dump the full buffer so the developer can see everything
            process.stdout.write("\x1b[2J\x1b[H\x1b[0m");

            for (const line of this.messageBuffer) {
                process.stdout.write(line + "\n");
            }
        } else {
            // Clean exit: just clear the frame and move cursor to bottom
            process.stdout.write("\x1b[2J\x1b[H\x1b[0m");
            process.stdout.write(`\x1b[${this.terminalHeight};1H\n`);
        }
    }

    /**
     * Redraws the header and footer without touching the body area.
     */
    public redraw(): void {
        this.redrawHeaderFooter();
    }

    /**
     * No-op kept for API compatibility.
     * The buffer is never cleared - it grows continuously so restore() can always dump it.
     */
    public clearBuffer(): void {
        // Intentionally empty: the buffer must survive phase transitions so restore()
        // can always dump the full history on a crash.
    }

    // ─── Live frame ──────────────────────────────────────────────────────────

    /**
     * Draws the full live frame:
     *   • clears the screen
     *   • pins header (line 1) and footer (last line)
     *   • sets the terminal scroll region to the body area
     *   • parks the cursor at the top of the body
     */
    private drawLiveFrame(): void {
        if (!this.enabled) {
            return;
        }

        process.stdout.write("\x1b[2J\x1b[H\x1b[0m");

        if (this.hasHeader) {
            process.stdout.write(`\x1b[1;1H\x1b[2K${this.headerText}`);
        }

        if (this.hasFooter) {
            process.stdout.write(`\x1b[${this.footerLine};1H\x1b[2K${this.footerText}`);
        }

        // Set scroll region and park cursor at top of body
        process.stdout.write(
            `\x1b[${this.bodyTop};${this.bodyBottom}r`
            + `\x1b[${this.bodyTop};1H`
        );
    }

    /**
     * Redraws only the pinned header and footer lines using save/restore cursor
     * so the cursor position inside the body is never disturbed.
     */
    private redrawHeaderFooter(): void {
        if (!this.enabled || this.isReviewing) {
            return;
        }

        let seq = "\x1b[s"; // save cursor

        if (this.hasHeader) {
            seq += `\x1b[1;1H\x1b[2K\x1b[0m${this.headerText}`;
        }

        if (this.hasFooter) {
            seq += `\x1b[${this.footerLine};1H\x1b[2K\x1b[0m${this.footerText}`;
        }

        seq += "\x1b[u"; // restore cursor
        process.stdout.write(seq);
    }

    // ─── Review mode ─────────────────────────────────────────────────────────

    /**
     * Enters scroll-review mode:
     *   • resets the scroll region to the full terminal
     *   • dumps the buffered lines so the terminal's native scrollback works
     *   • shows a hint in place of the footer
     *
     * The user can now scroll freely with the terminal emulator (PgUp/Down,
     * mouse wheel, etc.).  Press PgDown or End to return to live mode.
     */
    private enterReviewMode(): void {
        if (this.isReviewing || !this.enabled) {
            return;
        }

        this.isReviewing = true;

        // Reset the scroll region so the terminal can scroll freely again,
        // then use the alternate screen buffer to show the full log history.
        // The alternate screen keeps the live view intact so exiting review
        // mode (smcup/rmcup) restores it exactly as it was.
        process.stdout.write(
            "\x1b[r"        // reset scroll region
            + "\x1b[?1049h" // enter alternate screen buffer
            + "\x1b[2J\x1b[H\x1b[0m" // clear alternate screen, cursor to top
        );

        // Dump all buffered lines into the alternate screen
        for (const line of this.messageBuffer) {
            process.stdout.write(line + "\n");
        }

        // Hint bar at the very bottom of the viewport
        process.stdout.write(`\x1b[${this.terminalHeight};1H\x1b[2K\x1b[7m PgDown / End = back to live \x1b[0m`);
    }

    /**
     * Returns from scroll-review mode to the live framed view.
     * Redraws the full frame and replays the buffer inside the scroll region
     * so the most-recent lines are visible.
     */
    private exitReviewMode(): void {
        if (!this.isReviewing) {
            return;
        }

        this.isReviewing = false;

        // Leave the alternate screen buffer - this instantly restores the live
        // frame exactly as it was before enterReviewMode() was called.
        process.stdout.write("\x1b[?1049l");
        this.drawLiveFrame();

        // Replay the last N lines of the buffer so the body isn't empty on return
        const bodyHeight = this.bodyBottom - this.bodyTop + 1;
        const start = Math.max(0, this.messageBuffer.length - bodyHeight);

        for (let i = start; i < this.messageBuffer.length; i++) {
            process.stdout.write(this.messageBuffer[i] + "\n");
        }

        this.redrawHeaderFooter();
    }

    // ─── Keyboard ────────────────────────────────────────────────────────────

    private keyListener: ((key: Buffer) => void) | null = null;
    private keyTimeout: NodeJS.Timeout | null = null;
    private keyBuffer = "";

    /**
     * Sets up raw-mode keyboard handling for PgUp (enter review) and PgDown/End
     * (exit review) as well as Ctrl+C for a clean shutdown.
     */
    private setupKeyboardHandlers(): void {
        if (!process.stdin.isTTY) {
            return;
        }

        try {
            process.stdin.setRawMode(true);
        } catch {
            // setRawMode is not supported on this platform/environment - skip keyboard handling
            return;
        }

        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        this.keyListener = (key: Buffer) => {
            this.keyBuffer += key.toString();

            if (this.keyTimeout) {
                clearTimeout(this.keyTimeout);
                this.keyTimeout = null;
            }

            // Single non-escape character - process immediately
            if (this.keyBuffer.length === 1 && !this.keyBuffer.startsWith("\u001b")) {
                this.handleKey(this.keyBuffer);
                this.keyBuffer = "";
                return;
            }

            // Escape sequence - wait briefly to collect all bytes
            this.keyTimeout = setTimeout(() => {
                this.handleKey(this.keyBuffer);
                this.keyBuffer = "";
                this.keyTimeout = null;
            }, 10);
        };

        process.stdin.on("data", this.keyListener);
    }

    private teardownKeyboardHandlers(): void {
        if (!process.stdin.isTTY) {
            return;
        }

        if (this.keyListener) {
            process.stdin.removeListener("data", this.keyListener);
            this.keyListener = null;
        }

        if (this.keyTimeout) {
            clearTimeout(this.keyTimeout);
            this.keyTimeout = null;
        }

        try {
            process.stdin.setRawMode(false);
        } catch {
            // ignore - setRawMode may not be available
        }

        process.stdin.pause();
    }

    /**
     * Handles a parsed key/escape sequence.
     */
    private handleKey(key: string): void {
        if (!key) {
            return;
        }

        const k = key.replace(/\u0000/g, "");

        // Ctrl+C - clean exit
        if (k === "\u0003" || k.charCodeAt(0) === 3) {
            this.restore(false);
            process.exit(0);
        }

        if (k.startsWith("\u001b")) {
            // Page Up → enter review mode
            if (k.includes("5~") || k.endsWith("5~")) {
                this.enterReviewMode();
                return;
            }

            // Page Down or End → exit review mode (return to live)
            if (k.includes("6~") || k.endsWith("6~") || k.includes("4~") || k.endsWith("F") || k.endsWith("OF")) {
                this.exitReviewMode();
                return;
            }
        }
    }

    // ─── Resize ──────────────────────────────────────────────────────────────

    /**
     * Listens for terminal resize events and redraws the full frame.
     */
    private setupResizeHandler(): void {
        process.stdout.on("resize", () => {
            if (this.isReviewing) {
                // In review mode just redraw the hint line at the new last row
                process.stdout.write(`\x1b[${this.terminalHeight};1H\x1b[2K\x1b[7m PgDown / End = back to live \x1b[0m`);
            } else {
                this.drawLiveFrame();
                const bodyHeight = this.bodyBottom - this.bodyTop + 1;
                const start = Math.max(0, this.messageBuffer.length - bodyHeight);

                for (let i = start; i < this.messageBuffer.length; i++) {
                    process.stdout.write(this.messageBuffer[i] + "\n");
                }

                this.redrawHeaderFooter();
            }
        });
    }

    // ─── Logging ─────────────────────────────────────────────────────────────

    /**
     * Formats the arguments to a string using util.format (supports %d, %s, etc.).
     */
    private formatArguments(args: any[]): string {
        if (args.length === 0) {
            return "";
        }

        return format(...args);
    }

    /**
     * Wraps text to fit terminal width, breaking long lines into multiple lines.
     * Uses visible length (ignoring ANSI escape codes) for accurate measurement.
     */
    private wrapText(text: string): string[] {
        if (!text) {
            return [""];
        }

        if (visibleLength(text) <= this.terminalWidth) {
            return [text];
        }

        const lines: string[] = [];
        let currentLine = "";
        let currentLen = 0;

        const parts = text.split(/(\s+)/);

        for (const part of parts) {
            const partLen = visibleLength(part);
            const testLen = currentLen + partLen;

            if (testLen <= this.terminalWidth) {
                currentLine += part;
                currentLen = testLen;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }

                if (partLen > this.terminalWidth) {
                    let remaining = part;

                    while (visibleLength(remaining) > this.terminalWidth) {
                        lines.push(remaining.slice(0, this.terminalWidth));
                        remaining = remaining.slice(this.terminalWidth);
                    }

                    currentLine = remaining;
                    currentLen = visibleLength(remaining);
                } else {
                    currentLine = part;
                    currentLen = partLen;
                }
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines.length > 0 ? lines : [""];
    }

    /**
     * Creates a hooked console method.
     *
     * In live mode, writes to stdout inside the scroll region and redraws the
     * header/footer to keep them pinned.  In review mode the write is suppressed
     * so the user's scroll position isn't disturbed; the line is still buffered.
     */
    private createHookedMethod(label: string, originalFn: (...args: any[]) => void): (...args: any[]) => void {
        return (...args: any[]) => {
            if (!this.enabled) {
                return originalFn(...args);
            }

            const message = this.formatArguments(args);
            const finalMessage = label ? `[${label}] ${message}` : message;

            // Wrap and buffer every line
            const wrapped = finalMessage
                .split(/\r?\n/)
                .flatMap((line) => this.wrapText(line));

            for (const line of wrapped) {
                this.messageBuffer.push(line);
            }

            // Trim buffer to keep memory bounded
            if (this.messageBuffer.length > FramedConsole.MAX_BUFFER) {
                this.messageBuffer.splice(0, this.messageBuffer.length - FramedConsole.MAX_BUFFER);
            }

            // Only write to the terminal in live mode - don't disturb the user's scroll position
            if (!this.isReviewing) {
                process.stdout.write(wrapped.join("\n") + "\n");
                this.redrawHeaderFooter();
            }
        };
    }

    /**
     * Sets whether the framed console is enabled.
     */
    public setEnabled(enabled = true): void {
        this.enabled = enabled;
    }
}

/**
 * Installs a framed console with header and footer.
 * @param options Configuration options for the framed console.
 * @returns An instance of FramedConsole with methods to control it.
 */
export function installFramedConsole(options: FramedConsoleOptions = {}): FramedConsole {
    return new FramedConsole(options);
}
