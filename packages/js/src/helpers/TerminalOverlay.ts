import { stripVTControlCharacters } from "node:util";

/**
 * In-place TTY painting without clack spinner animation (avoids erase/redraw flicker).
 */
export namespace TerminalOverlay {
    /**
     * Tracks how many rows were last painted on a stream.
     */
    export interface PaintState {
        lineCount: number;
        /** Visible width of the last single-line paint (for padding). */
        lastLineWidth: number;
        /** Last frame lines written (for diff painting). */
        previousLines: string[];
    }

    /**
     * Creates empty overlay state.
     *
     * @returns Fresh paint state.
     */
    export function createState(): PaintState {
        return { lineCount: 0, lastLineWidth: 0, previousLines: [] };
    }

    /**
     * Moves to a 1-based row, clears it, and writes text (no full-frame erase).
     *
     * @param output - Stream to write to.
     * @param row - One-based row index.
     * @param text - Line content.
     * @returns Nothing.
     */
    function writeRow(output: NodeJS.WriteStream, row: number, text: string): void {
        output.write(`\x1b[${row};1H\x1b[2K${text}`);
    }

    /**
     * Switches to the terminal alternate screen (isolates live UI from scrollback).
     *
     * @param output - Stream to write to.
     * @returns Nothing.
     */
    export function enterAltScreen(output: NodeJS.WriteStream): void {
        if (!output.isTTY) {
            return;
        }

        output.write("\x1b[?1049h\x1b[?25l\x1b[H\x1b[2J");
    }

    /**
     * Restores the main screen and shows the text cursor.
     *
     * @param output - Stream to write to.
     * @returns Nothing.
     */
    export function leaveAltScreen(output: NodeJS.WriteStream): void {
        if (!output.isTTY) {
            return;
        }

        output.write("\x1b[?25h\x1b[?1049l");
    }

    /**
     * Paints only rows that changed since the last frame (requires alt screen or fixed origin).
     *
     * @param output - Stream to write to (usually stdout).
     * @param lines - Frame rows from top to bottom.
     * @param state - Mutable paint state for this overlay.
     * @returns Whether any row was updated.
     */
    export function paintDiff(
        output: NodeJS.WriteStream,
        lines: string[],
        state: PaintState
    ): boolean {
        if (!output.isTTY || lines.length === 0) {
            return false;
        }

        const prev = state.previousLines;
        let changed = false;

        for (let i = 0; i < lines.length; i++) {
            if (i < prev.length && lines[i] === prev[i]) {
                continue;
            }

            writeRow(output, i + 1, lines[i]);
            changed = true;
        }

        for (let i = lines.length; i < prev.length; i++) {
            writeRow(output, i + 1, "");
            changed = true;
        }

        state.previousLines = lines;
        state.lineCount = lines.length;
        state.lastLineWidth = 0;
        return changed;
    }

    /**
     * Paints multiline text in place on a TTY (full frame; prefer {@link paintDiff}).
     *
     * @param output - Stream to write to (usually stdout).
     * @param text - Full frame without a leading newline.
     * @param state - Mutable paint state for this overlay.
     * @returns Whether the frame was painted.
     */
    export function paint(
        output: NodeJS.WriteStream,
        text: string,
        state: PaintState
    ): boolean {
        state.previousLines = [];
        return paintDiff(output, text.split("\n"), state);
    }

    /**
     * Paints a single status line in place on a TTY.
     *
     * @param output - Stream to write to.
     * @param line - Status text.
     * @param state - Mutable paint state.
     * @returns Nothing.
     */
    export function paintLine(
        output: NodeJS.WriteStream,
        line: string,
        state: PaintState
    ): boolean {
        if (!output.isTTY) {
            return false;
        }

        const visible = stripVTControlCharacters(line);
        const pad = state.lastLineWidth > visible.length
            ? " ".repeat(state.lastLineWidth - visible.length)
            : "";

        output.write(`\r\x1b[2K${line}${pad}`);
        state.lineCount = 1;
        state.lastLineWidth = visible.length;
        return true;
    }

    /**
     * Clears a previously painted overlay without writing a trailing status line.
     *
     * @param output - Stream to write to.
     * @param state - Mutable paint state.
     * @returns Nothing.
     */
    export function clear(output: NodeJS.WriteStream, state: PaintState): void {
        if (!output.isTTY || state.lineCount === 0) {
            state.lineCount = 0;
            state.lastLineWidth = 0;
            return;
        }

        for (let i = 0; i < state.previousLines.length; i++) {
            writeRow(output, i + 1, "");
        }

        state.lineCount = 0;
        state.lastLineWidth = 0;
        state.previousLines = [];
    }

    /**
     * Clears the overlay and writes a final status line followed by a newline.
     *
     * @param output - Stream to write to.
     * @param message - Final status line.
     * @param state - Mutable paint state.
     * @returns Nothing.
     */
    export function finish(
        output: NodeJS.WriteStream,
        message: string,
        state: PaintState
    ): void {
        if (!output.isTTY) {
            return;
        }

        clear(output, state);
        output.write(`${message}\n`);
    }
}
