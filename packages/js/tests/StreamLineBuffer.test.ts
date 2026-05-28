import { describe, expect, it, vi } from "vitest";

import { StreamLineBuffer } from "../src/helpers/StreamLineBuffer.js";

describe("StreamLineBuffer", () => {
    it("emits complete stdout lines on newline", () => {
        const onLine = vi.fn();
        const handlers = StreamLineBuffer.create(onLine);

        handlers.onStdout(Buffer.from("hello\nworld\n"));
        expect(onLine).toHaveBeenCalledTimes(2);
        expect(onLine).toHaveBeenNthCalledWith(1, "hello", "stdout");
        expect(onLine).toHaveBeenNthCalledWith(2, "world", "stdout");
    });

    it("keeps partial lines until a newline arrives", () => {
        const onLine = vi.fn();
        const handlers = StreamLineBuffer.create(onLine);

        handlers.onStdout(Buffer.from("part"));
        expect(onLine).not.toHaveBeenCalled();

        handlers.onStdout(Buffer.from("ial\n"));
        expect(onLine).toHaveBeenCalledOnce();
        expect(onLine).toHaveBeenCalledWith("partial", "stdout");
    });

    it("collapses carriage-return progress to the latest segment", () => {
        const onLine = vi.fn();
        const handlers = StreamLineBuffer.create(onLine);

        handlers.onStdout(Buffer.from("10%\r50%\r90%\n"));
        expect(onLine).toHaveBeenCalledOnce();
        expect(onLine).toHaveBeenCalledWith("90%", "stdout");
    });

    it("flushes a trailing line without newline", () => {
        const onLine = vi.fn();
        const handlers = StreamLineBuffer.create(onLine);

        handlers.onStderr(Buffer.from("tail"));
        handlers.flush();
        expect(onLine).toHaveBeenCalledOnce();
        expect(onLine).toHaveBeenCalledWith("tail", "stderr");
    });

    it("ignores whitespace-only lines", () => {
        const onLine = vi.fn();
        const handlers = StreamLineBuffer.create(onLine);

        handlers.onStdout(Buffer.from("   \n\t\n"));
        expect(onLine).not.toHaveBeenCalled();
    });
});
