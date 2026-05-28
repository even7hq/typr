import { describe, expect, it } from "vitest";

import { TerminalOverlay } from "../src/helpers/TerminalOverlay.js";

/**
 * Collects writes from a fake TTY stream for assertions.
 */
function createMockTty(): NodeJS.WriteStream & { chunks: string[] } {
    const chunks: string[] = [];

    return {
        isTTY: true,
        columns: 100,
        write(chunk: string) {
            chunks.push(chunk);
            return true;
        },
        chunks
    } as NodeJS.WriteStream & { chunks: string[] };
}

/**
 * Joins all write chunks into one string.
 *
 * @param output - Mock stream.
 * @returns Concatenated output.
 */
function written(output: NodeJS.WriteStream & { chunks: string[] }): string {
    return output.chunks.join("");
}

describe("TerminalOverlay", () => {
    describe("createState", () => {
        it("returns empty paint state", () => {
            expect(TerminalOverlay.createState()).toEqual({
                lineCount: 0,
                lastLineWidth: 0,
                previousLines: []
            });
        });
    });

    describe("paintDiff", () => {
        it("paints every row on first frame", () => {
            const output = createMockTty();
            const state = TerminalOverlay.createState();
            const lines = ["top", "middle", "bottom"];

            expect(TerminalOverlay.paintDiff(output, lines, state)).toBe(true);
            expect(written(output)).toContain("\x1b[1;1H\x1b[2Ktop");
            expect(written(output)).toContain("\x1b[2;1H\x1b[2Kmiddle");
            expect(written(output)).toContain("\x1b[3;1H\x1b[2Kbottom");
            expect(state.previousLines).toEqual(lines);
            expect(state.lineCount).toBe(3);
        });

        it("skips writes when frame is unchanged", () => {
            const output = createMockTty();
            const state = TerminalOverlay.createState();
            const lines = ["a", "b"];

            TerminalOverlay.paintDiff(output, lines, state);
            output.chunks.length = 0;

            expect(TerminalOverlay.paintDiff(output, lines, state)).toBe(false);
            expect(output.chunks).toHaveLength(0);
        });

        it("updates only changed rows", () => {
            const output = createMockTty();
            const state = TerminalOverlay.createState();
            const first = ["border", "phase", "log"];
            const second = ["border", "phase", "new log"];

            TerminalOverlay.paintDiff(output, first, state);
            output.chunks.length = 0;

            expect(TerminalOverlay.paintDiff(output, second, state)).toBe(true);
            expect(written(output)).toBe("\x1b[3;1H\x1b[2Knew log");
        });

        it("clears rows removed from a shorter frame", () => {
            const output = createMockTty();
            const state = TerminalOverlay.createState();

            TerminalOverlay.paintDiff(output, ["one", "two", "three"], state);
            output.chunks.length = 0;

            TerminalOverlay.paintDiff(output, ["one"], state);
            expect(written(output)).toContain("\x1b[2;1H\x1b[2K");
            expect(written(output)).toContain("\x1b[3;1H\x1b[2K");
        });

        it("returns false when not a TTY", () => {
            const output = { isTTY: false, write: () => true } as NodeJS.WriteStream;
            const state = TerminalOverlay.createState();

            expect(TerminalOverlay.paintDiff(output, ["x"], state)).toBe(false);
        });
    });

    describe("paintLine", () => {
        it("overwrites a single line with carriage return clear", () => {
            const output = createMockTty();
            const state = TerminalOverlay.createState();

            expect(TerminalOverlay.paintLine(output, "uploading 1%", state)).toBe(true);
            expect(written(output)).toBe("\r\x1b[2Kuploading 1%");
            expect(state.lastLineWidth).toBe("uploading 1%".length);
        });

        it("pads shorter updates to avoid ghost characters", () => {
            const output = createMockTty();
            const state = TerminalOverlay.createState();

            TerminalOverlay.paintLine(output, "uploading 100%", state);
            output.chunks.length = 0;

            TerminalOverlay.paintLine(output, "done", state);
            expect(written(output)).toBe("\r\x1b[2Kdone          ");
        });
    });

    describe("alt screen", () => {
        it("enters and leaves alternate screen on TTY", () => {
            const output = createMockTty();

            TerminalOverlay.enterAltScreen(output);
            expect(written(output)).toBe("\x1b[?1049h\x1b[?25l\x1b[H\x1b[2J");

            output.chunks.length = 0;
            TerminalOverlay.leaveAltScreen(output);
            expect(written(output)).toBe("\x1b[?25h\x1b[?1049l");
        });
    });
});
