import * as clack from "@clack/prompts";
import stringWidth from "fast-string-width";

import { StreamLineBuffer, type StreamLineHandlers } from "./StreamLineBuffer";
import { TerminalOverlay } from "./TerminalOverlay";
import type { InterruptPolicy } from "../types/InterruptPolicy";

// #region Types

/**
 * @see {@link InterruptPolicy}
 */
export type FramedConsoleInterruptPolicy = InterruptPolicy;

/**
 * Options for a framed live terminal panel.
 */
export interface FramedConsoleOptions {
    /**
     * Title shown on the top border of the panel.
     */
    title: string;

    /**
     * Number of visible content lines inside the frame (excluding phase row).
     * Ignored when {@link FramedConsoleOptions.useFullTerminal} is true (default).
     */
    height?: number;

    /**
     * Inner width of the panel in columns (content only, excluding borders and padding).
     * Ignored when {@link FramedConsoleOptions.useFullTerminal} is true (default).
     */
    width?: number;

    /**
     * When true (default), the panel uses the full terminal rows and columns and
     * reflows on `stdout` resize events.
     */
    useFullTerminal?: boolean;

    /**
     * When true, never uses the interactive panel (plain line logging only).
     */
    isCI?: boolean;

    /**
     * Called when the user presses Ctrl+C while the panel is active (before the panel closes).
     */
    onInterrupt?: () => void | Promise<void>;

    /**
     * What happens after {@link FramedConsoleOptions.onInterrupt} completes. Default: `"handoff"`.
     */
    interruptPolicy?: FramedConsoleInterruptPolicy;

    /**
     * Optional hint appended to the panel title (caller chooses the text).
     */
    interruptHint?: string;

    /**
     * Called after the panel closes to restore stdin for subsequent prompts.
     */
    onReleaseTerminal?: () => void;

    /**
     * Optional callbacks for non-interactive mode instead of default clack.log output.
     */
    plainLog?: {
        /**
         * Logs one completed stream line.
         *
         * @param line Line text without trailing newline.
         * @param stream stdout or stderr.
         * @returns Nothing.
         */
        onLine: (line: string, stream: "stdout" | "stderr") => void;

        /**
         * Logs a phase/status update.
         *
         * @param phase Phase description.
         * @returns Nothing.
         */
        onPhase: (phase: string) => void;

        /**
         * Logs a success status when the panel stops cleanly.
         *
         * @param message Final status line.
         * @returns Nothing.
         */
        onSuccess?: (message: string) => void;

        /**
         * Logs a failure status when the panel fails.
         *
         * @param message Failure status line.
         * @returns Nothing.
         */
        onError?: (message: string) => void;
    };

    /**
     * Title for the clack note when {@link FramedConsoleSession.fail} dumps buffered output.
     */
    failNoteTitle?: string;
}

/**
 * Active framed terminal session.
 */
export interface FramedConsoleSession {
    /**
     * Updates the subtitle line under the title (phase / connection status).
     *
     * @param phase Phase description.
     * @returns Nothing.
     */
    setPhase(phase: string): void;

    /**
     * Handlers for buffered stdout/stderr stream output.
     */
    readonly handlers: StreamLineHandlers;

    /**
     * Appends a single line to the scroll buffer (local logs, not from a stream).
     *
     * @param line Text line without trailing newline.
     * @param stream Optional stream tag for styling.
     * @returns Nothing.
     */
    appendLine(line: string, stream?: "stdout" | "stderr"): void;

    /**
     * Closes the panel and prints a success status below the frame.
     *
     * @param message Final status line.
     * @returns Nothing.
     */
    stop(message: string): void;

    /**
     * Closes the panel and prints failure output below.
     *
     * @param message Failure status line.
     * @returns Nothing.
     */
    fail(message: string): void;
}

/**
 * Computed layout for the framed panel.
 */
interface PanelDimensions {
    innerWidth: number;
    innerHeight: number;
    borderWidth: number;
}

// #endregion

/** Debounce delay before diff repaint after stream output (trailing edge). */
const RENDER_DEBOUNCE_MS = 80;

const DEFAULT_HEIGHT = 14;

const DEFAULT_WIDTH = 72;

const MAX_BUFFER_LINES = 2_000;

/** Spaces between the side border and the content column. */
const ROW_SIDE_PAD = 1;

/** Extra columns reserved so the frame never soft-wraps at the terminal edge. */
const TERMINAL_WIDTH_MARGIN = 2;

/** Top border, phase row, bottom border, and scroll hint. */
const FRAME_STATIC_ROWS = 4;

/**
 * Box-drawing characters for the panel border.
 */
const BOX = {
    tl: "┌",
    tr: "┐",
    bl: "└",
    br: "┘",
    h: "─",
    v: "│"
} as const;

/**
 * Strips ANSI escape sequences from a string.
 *
 * @param text Text that may contain ANSI codes.
 * @returns Plain text without ANSI sequences.
 */
function stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Returns the terminal display width of a string.
 *
 * @param text Text to measure.
 * @returns Visible width in terminal columns.
 */
function displayWidth(text: string): number {
    return stringWidth(stripAnsi(text));
}

/**
 * Iterates grapheme clusters (emoji sequences stay intact).
 *
 * @param text Plain text without ANSI codes.
 * @returns Grapheme segments in order.
 */
function* graphemes(text: string): Generator<string> {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

    for (const { segment } of segmenter.segment(text)) {
        yield segment;
    }
}

/**
 * Normalizes remote text for stable terminal column counting.
 *
 * @param text Raw line from a stream.
 * @returns Text safe to measure and render inside the frame.
 */
function normalizeTerminalText(text: string): string {
    return text
        .replace(/\r/g, "")
        .replace(/\uFE0F/g, "");
}

/**
 * Truncates text to a maximum visible width, appending an ellipsis when needed.
 *
 * @param text Text to truncate.
 * @param maxWidth Maximum visible columns.
 * @returns Truncated text.
 */
function truncateToWidth(text: string, maxWidth: number): string {
    const plain = stripAnsi(text);

    if (maxWidth <= 0) {
        return "";
    }

    if (displayWidth(plain) <= maxWidth) {
        return plain;
    }

    let out = "";
    let width = 0;
    const budget = Math.max(1, maxWidth - 1);

    for (const segment of graphemes(plain)) {
        const segmentWidth = displayWidth(segment);

        if (width + segmentWidth > budget) {
            out += "…";
            break;
        }

        out += segment;
        width += segmentWidth;
    }

    return out;
}

/**
 * Pads text on the right to an exact visible width.
 *
 * @param text Text to pad.
 * @param targetWidth Target visible width.
 * @returns Padded text.
 */
function padToWidth(text: string, targetWidth: number): string {
    const plain = stripAnsi(text);
    const len = displayWidth(plain);

    if (len >= targetWidth) {
        return truncateToWidth(plain, targetWidth);
    }

    return plain + " ".repeat(targetWidth - len);
}

/**
 * Builds one framed row: │ + pad + content + pad + │.
 *
 * @param content Inner content.
 * @param innerWidth Content column width.
 * @returns A full terminal row.
 */
function frameRow(content: string, innerWidth: number): string {
    const pad = " ".repeat(ROW_SIDE_PAD);

    return `${BOX.v}${pad}${padToWidth(content, innerWidth)}${pad}${BOX.v}`;
}

/**
 * Shrinks or pads a full frame line until its visible width matches the target.
 *
 * @param line A complete top, body, or bottom row.
 * @param targetWidth Required visible width in columns.
 * @returns A line that fits within targetWidth.
 */
function fitLineToWidth(line: string, targetWidth: number): string {
    if (targetWidth <= 0) {
        return "";
    }

    if (displayWidth(line) <= targetWidth) {
        return line;
    }

    let fitted = truncateToWidth(line, targetWidth);

    while (displayWidth(fitted) > targetWidth && displayWidth(fitted) > 0) {
        fitted = truncateToWidth(fitted, Math.max(1, displayWidth(fitted) - 1));
    }

    return fitted;
}

/**
 * Builds a body row and guarantees it does not exceed borderWidth.
 *
 * @param content Inner content.
 * @param innerWidth Content column width.
 * @param borderWidth Full outer row width.
 * @returns A border-aligned row.
 */
function frameRowSafe(content: string, innerWidth: number, borderWidth: number): string {
    let safeContent = truncateToWidth(content, innerWidth);
    let row = frameRow(safeContent, innerWidth);

    while (displayWidth(row) > borderWidth && displayWidth(safeContent) > 0) {
        safeContent = truncateToWidth(safeContent, Math.max(0, displayWidth(safeContent) - 1));
        row = frameRow(safeContent, innerWidth);
    }

    return fitLineToWidth(row, borderWidth);
}

/**
 * Returns true when the line looks like curl progress noise.
 *
 * @param line Single output line.
 * @returns Whether the line should be hidden.
 */
function isCurlProgressLine(line: string): boolean {
    const t = line.trim();

    if (!t) {
        return true;
    }

    if (/^\d+%$/.test(t)) {
        return true;
    }

    return /^\d+\s+\d+/.test(t)
        || /^% Total/.test(t)
        || /^Dload\s+Upload/.test(t)
        || /^[\d\s]+$/.test(t);
}

/**
 * Wraps or truncates text to fit inside the inner panel width.
 *
 * @param text Text to fit.
 * @param width Maximum visible width.
 * @returns Lines that fit the inner width.
 */
function wrapToWidth(text: string, width: number): string[] {
    const plain = stripAnsi(text);

    if (displayWidth(plain) <= width) {
        return [plain];
    }

    const lines: string[] = [];
    let current = "";

    for (const segment of graphemes(plain)) {
        const next = current + segment;

        if (displayWidth(next) > width) {
            if (current) {
                lines.push(current);
            }

            current = displayWidth(segment) > width
                ? truncateToWidth(segment, width)
                : segment;
        } else {
            current = next;
        }
    }

    if (current) {
        lines.push(current);
    }

    return lines.length > 0 ? lines : [""];
}

/**
 * Builds the top border row with a centered title.
 *
 * @param title Panel title.
 * @param borderWidth Full outer width of the panel.
 * @returns Top border line.
 */
function buildTopBorder(title: string, borderWidth: number): string {
    const maxTitleWidth = borderWidth - 2;
    let titleText = ` ${title} `;

    if (displayWidth(titleText) > maxTitleWidth) {
        titleText = ` ${truncateToWidth(title, Math.max(4, maxTitleWidth - 2))} `;
    }

    const titleLen = displayWidth(titleText);
    const topPad = Math.max(0, borderWidth - 2 - titleLen);

    return fitLineToWidth(
        `${BOX.tl}${titleText}${BOX.h.repeat(topPad)}${BOX.tr}`,
        borderWidth
    );
}

/**
 * Builds the bottom border row with exact outer width.
 *
 * @param borderWidth Full outer width of the panel.
 * @returns Bottom border line.
 */
function buildBottomBorder(borderWidth: number): string {
    const dashCount = Math.max(0, borderWidth - 2);

    return fitLineToWidth(`${BOX.bl}${BOX.h.repeat(dashCount)}${BOX.br}`, borderWidth);
}

/**
 * Computes panel dimensions from the current terminal size and options.
 *
 * @param options Panel options.
 * @returns Layout dimensions for the frame.
 */
function computePanelDimensions(options: FramedConsoleOptions): PanelDimensions {
    const termWidth = process.stdout.columns ?? DEFAULT_WIDTH;
    const termHeight = process.stdout.rows ?? 24;
    const useFullTerminal = options.useFullTerminal !== false;
    const maxBorderWidth = Math.max(
        20,
        termWidth - TERMINAL_WIDTH_MARGIN
    );

    const innerHeight = useFullTerminal
        ? Math.max(
            3,
            termHeight - FRAME_STATIC_ROWS
        )
        : (options.height ?? DEFAULT_HEIGHT);

    const maxInnerWidth = maxBorderWidth - 4 - ROW_SIDE_PAD * 2;

    const innerWidth = useFullTerminal
        ? Math.max(40, maxInnerWidth)
        : Math.max(
            40,
            Math.min(
                options.width ?? DEFAULT_WIDTH,
                maxInnerWidth
            )
        );

    const borderWidth = Math.min(
        innerWidth + 2 + ROW_SIDE_PAD * 2,
        maxBorderWidth
    );

    return {
        innerWidth,
        innerHeight,
        borderWidth
    };
}

/**
 * Restores stdin after clack prompts so the process can exit cleanly.
 *
 * @returns Nothing.
 */
function releaseTerminal(): void {
    if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
        try {
            process.stdin.setRawMode(false);
        } catch {
            // Ignore if stdin is not in raw mode
        }
    }

    if (process.stdin.isTTY) {
        process.stdin.pause();
    }
}

/**
 * Framed scrollable terminal panel for live command output (clack spinner, no raw cursor control).
 */
export namespace FramedConsole {
    /**
     * Creates a framed terminal panel when stdout is a TTY; falls back to plain logging in CI.
     *
     * @param options Panel options.
     * @returns Session with stream handlers and scroll UI.
     */
    export function create(options: FramedConsoleOptions): FramedConsoleSession {
        const isCI = options.isCI ?? (
            process.env.CI === "true"
            || process.env.CI === "1"
            || Boolean(process.env.GITHUB_ACTIONS)
        );

        const useInteractive = !isCI && Boolean(process.stdout.isTTY);

        if (!useInteractive) {
            return createPlainLoggerSession(options);
        }

        return createInteractiveSession(options);
    }
}

/**
 * Plain logging fallback when there is no TTY.
 *
 * @param options Panel options.
 * @returns A session that logs each line.
 */
function createPlainLoggerSession(options: FramedConsoleOptions): FramedConsoleSession {
    const title = options.title;

    /**
     * Logs one line with a title prefix.
     *
     * @param line Line text.
     * @param stream stdout or stderr.
     * @returns Nothing.
     */
    const logLine = (line: string, stream: "stdout" | "stderr"): void => {
        if (isCurlProgressLine(line)) {
            return;
        }

        if (options.plainLog) {
            options.plainLog.onLine(line, stream);
            return;
        }

        if (stream === "stderr") {
            clack.log.warn(`[${title}] ${line}`);
        } else {
            clack.log.info(`[${title}] ${line}`);
        }
    };

    const handlers = StreamLineBuffer.create(logLine);

    return {
        handlers,

        setPhase(phase: string): void {
            if (options.plainLog?.onPhase) {
                options.plainLog.onPhase(phase);
                return;
            }

            clack.log.info(`[${title}] ${phase}`);
        },

        appendLine(line: string, stream: "stdout" | "stderr" = "stdout"): void {
            logLine(line, stream);
        },

        stop(message: string): void {
            if (options.plainLog?.onSuccess) {
                options.plainLog.onSuccess(message);
            } else {
                clack.log.success(message);
            }

            options.onReleaseTerminal?.();
        },

        fail(message: string): void {
            if (options.plainLog?.onError) {
                options.plainLog.onError(message);
            } else {
                clack.log.error(message);
            }

            options.onReleaseTerminal?.();
        }
    };
}

/**
 * Interactive panel rendered via clack spinner only (no stdout cursor control).
 *
 * @param options Panel options.
 * @returns Interactive framed session.
 */
function createInteractiveSession(options: FramedConsoleOptions): FramedConsoleSession {
    let dimensions = computePanelDimensions(options);
    const lines: string[] = [];
    let phase = "";
    let scrollOffset = 0;
    let closed = false;
    let renderTimer: ReturnType<typeof setTimeout> | undefined;
    let keyListenerAttached = false;
    let sigintListenerAttached = false;
    let resizeListenerAttached = false;

    const overlayState = TerminalOverlay.createState();
    const interruptPolicy = options.interruptPolicy ?? "handoff";

    const panelTitle = options.interruptHint
        ? `${options.title} | ${options.interruptHint}`
        : options.title;

    /**
     * Tears down the panel after optional cleanup; exits only when {@link interruptPolicy} is `"exit"`.
     *
     * @returns Nothing.
     */
    const handleUserInterrupt = (): void => {
        if (closed) {
            return;
        }

        closed = true;
        detachKeys();
        detachResize();

        /**
         * Stops the spinner and restores the terminal; optionally exits the process.
         *
         * @returns Nothing.
         */
        const finishInterrupt = (): void => {
            if (renderTimer !== undefined) {
                clearTimeout(renderTimer);
                renderTimer = undefined;
            }

            TerminalOverlay.leaveAltScreen(process.stdout);
            process.stdout.write("Interrupted\n");
            options.onReleaseTerminal?.();
            releaseTerminal();

            if (interruptPolicy === "exit") {
                process.exit(130);
            }
        };

        const interruptWork = options.onInterrupt?.();

        if (interruptWork && typeof (interruptWork as Promise<void>).then === "function") {
            (interruptWork as Promise<void>).then(finishInterrupt).catch(finishInterrupt);
            return;
        }

        finishInterrupt();
    };

    /**
     * Returns visible window of buffered lines.
     *
     * @returns Lines to render inside the panel.
     */
    const getVisibleLines = (): string[] => {
        const { innerHeight } = dimensions;
        const maxOffset = Math.max(0, lines.length - innerHeight);
        const offset = Math.min(scrollOffset, maxOffset);
        const slice = lines.slice(offset, offset + innerHeight);

        while (slice.length < innerHeight) {
            slice.push("");
        }

        return slice;
    };

    /**
     * Builds the framed panel as a single multiline string for the spinner.
     *
     * @returns Frame text.
     */
    const buildFrameText = (): string => {
        const { innerWidth, borderWidth } = dimensions;
        const frameLines: string[] = [
            buildTopBorder(panelTitle, borderWidth),
            frameRowSafe(phase || "waiting for output...", innerWidth, borderWidth),
            ...getVisibleLines().map((row) => frameRowSafe(row, innerWidth, borderWidth)),
            buildBottomBorder(borderWidth)
        ];

        const { innerHeight } = dimensions;
        const hidden = Math.max(0, lines.length - innerHeight);

        if (hidden > 0) {
            const from = scrollOffset + 1;
            const to = Math.min(scrollOffset + innerHeight, lines.length);
            frameLines.push(frameRowSafe(
                `scroll ${from}-${to} of ${lines.length} (arrow keys)`,
                innerWidth,
                borderWidth
            ));
        } else {
            frameLines.push(frameRowSafe(
                "scroll with arrow keys when output overflows",
                innerWidth,
                borderWidth
            ));
        }

        return frameLines.join("\n");
    };

    /**
     * Repaints the framed panel when the built frame differs from the last paint.
     *
     * @returns Nothing.
     */
    const flushRender = (): void => {
        if (closed) {
            return;
        }

        const frameLines = buildFrameText().split("\n");
        TerminalOverlay.paintDiff(process.stdout, frameLines, overlayState);
    };

    /**
     * Schedules a trailing debounced repaint (coalesces rapid SSH lines).
     *
     * @param force When true, paints immediately (scroll keys, phase changes).
     * @returns Nothing.
     */
    const render = (force = false): void => {
        if (closed) {
            return;
        }

        if (force) {
            if (renderTimer !== undefined) {
                clearTimeout(renderTimer);
                renderTimer = undefined;
            }

            flushRender();
            return;
        }

        if (renderTimer !== undefined) {
            clearTimeout(renderTimer);
        }

        renderTimer = setTimeout(() => {
            renderTimer = undefined;
            flushRender();
        }, RENDER_DEBOUNCE_MS);
    };

    /**
     * Pushes wrapped lines into the buffer and scrolls to the end.
     *
     * @param line Raw line text.
     * @param stream stdout or stderr.
     * @returns Nothing.
     */
    const pushLine = (line: string, stream: "stdout" | "stderr"): void => {
        if (isCurlProgressLine(line)) {
            return;
        }

        const normalized = normalizeTerminalText(line);
        const tagged = stream === "stderr" ? `[stderr] ${normalized}` : normalized;
        const { innerWidth, innerHeight } = dimensions;

        for (const row of wrapToWidth(tagged, innerWidth)) {
            lines.push(row);

            if (lines.length > MAX_BUFFER_LINES) {
                lines.splice(0, lines.length - MAX_BUFFER_LINES);
            }
        }

        const maxOffset = Math.max(0, lines.length - innerHeight);
        scrollOffset = maxOffset;

        render();
    };

    /**
     * Recalculates layout from the current terminal size and redraws.
     *
     * @returns Nothing.
     */
    const handleResize = (): void => {
        if (closed) {
            return;
        }

        const previous = dimensions;
        dimensions = computePanelDimensions(options);

        const maxOffset = Math.max(0, lines.length - dimensions.innerHeight);
        scrollOffset = Math.min(scrollOffset, maxOffset);

        if (
            previous.innerWidth !== dimensions.innerWidth
            || previous.innerHeight !== dimensions.innerHeight
        ) {
            overlayState.previousLines = [];
            render(true);
        }
    };

    /**
     * Handles arrow keys for scrolling the buffer.
     *
     * @param key Raw key data from stdin.
     * @returns Nothing.
     */
    const onKeyData = (key: Buffer): void => {
        const s = key.toString();

        if (s === "\x03" || s === "\x04") {
            handleUserInterrupt();
            return;
        }

        const { innerHeight } = dimensions;

        if (s === "\x1b[A" || s === "k") {
            scrollOffset = Math.max(0, scrollOffset - 1);
            render(true);
            return;
        }

        if (s === "\x1b[B" || s === "j") {
            const maxOffset = Math.max(0, lines.length - innerHeight);
            scrollOffset = Math.min(maxOffset, scrollOffset + 1);
            render(true);
            return;
        }

        if (s === "\x1b[5~" || s === "\x1b[6~") {
            const maxOffset = Math.max(0, lines.length - innerHeight);
            scrollOffset = s === "\x1b[5~"
                ? Math.max(0, scrollOffset - innerHeight)
                : Math.min(maxOffset, scrollOffset + innerHeight);

            render(true);
        }
    };

    /**
     * Enables raw stdin to capture scroll keys.
     *
     * @returns Nothing.
     */
    const attachKeys = (): void => {
        if (keyListenerAttached || !process.stdin.isTTY) {
            return;
        }

        keyListenerAttached = true;
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on("data", onKeyData);

        if (!sigintListenerAttached) {
            sigintListenerAttached = true;
            process.on("SIGINT", handleUserInterrupt);
        }
    };

    /**
     * Disables raw stdin.
     *
     * @returns Nothing.
     */
    const detachKeys = (): void => {
        if (!keyListenerAttached) {
            return;
        }

        keyListenerAttached = false;
        process.stdin.off("data", onKeyData);

        if (sigintListenerAttached) {
            sigintListenerAttached = false;
            process.removeListener("SIGINT", handleUserInterrupt);
        }

        if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
            try {
                process.stdin.setRawMode(false);
            } catch {
                // Ignore
            }
        }

        process.stdin.pause();
    };

    /**
     * Subscribes to terminal resize events.
     *
     * @returns Nothing.
     */
    const attachResize = (): void => {
        if (resizeListenerAttached || options.useFullTerminal === false) {
            return;
        }

        resizeListenerAttached = true;
        process.stdout.on("resize", handleResize);
    };

    /**
     * Unsubscribes from terminal resize events.
     *
     * @returns Nothing.
     */
    const detachResize = (): void => {
        if (!resizeListenerAttached) {
            return;
        }

        resizeListenerAttached = false;
        process.stdout.off("resize", handleResize);
    };

    /**
     * Stops the spinner and restores stdin for clack.
     *
     * @param message Final status line.
     * @returns Nothing.
     */
    const finalize = (message: string): void => {
        if (closed) {
            return;
        }

        closed = true;

        if (renderTimer !== undefined) {
            clearTimeout(renderTimer);
            renderTimer = undefined;
        }

        detachKeys();
        detachResize();
        TerminalOverlay.leaveAltScreen(process.stdout);
        process.stdout.write(`${message}\n`);
        options.onReleaseTerminal?.();
        releaseTerminal();
    };

    attachKeys();
    attachResize();
    TerminalOverlay.enterAltScreen(process.stdout);
    TerminalOverlay.paintDiff(
        process.stdout,
        buildFrameText().split("\n"),
        overlayState
    );

    const handlers = StreamLineBuffer.create(pushLine);

    return {
        handlers,

        setPhase(phaseText: string): void {
            if (closed || phaseText === phase) {
                return;
            }

            phase = phaseText;
            render(true);
        },

        appendLine(line: string, stream: "stdout" | "stderr" = "stdout"): void {
            if (closed) {
                return;
            }

            pushLine(line, stream);
        },

        stop(message: string): void {
            finalize(message);
        },

        fail(message: string): void {
            const dump = lines.join("\n");
            finalize(message);

            if (dump) {
                clack.note(dump, options.failNoteTitle ?? "Output");
            }
        }
    };
}
