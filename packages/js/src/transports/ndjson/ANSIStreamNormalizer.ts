import stripAnsi from "strip-ansi";

/**
 * Incremental ANSI stream normalizer that emits one sanitized line at a time.
 */
export class ANSIStreamNormalizer {
    private buffer = "";

    /**
     * Pushes a stream chunk and returns all complete normalized lines.
     *
     * @param chunk - Raw stream chunk.
     * @returns Completed line array.
     */
    public push(chunk: string): string[] {
        this.buffer += chunk;
        const lines: string[] = [];

        while (true) {
            const newLineIndex = this.buffer.indexOf("\n");

            if (newLineIndex < 0) {
                break;
            }

            const rawLine = this.buffer.slice(0, newLineIndex);
            this.buffer = this.buffer.slice(newLineIndex + 1);
            lines.push(stripAnsi(rawLine.replace(/\r/g, "")));
        }

        return lines;
    }

    /**
     * Flushes remaining buffered content as a single normalized line.
     *
     * @returns Remaining line or null when buffer is empty.
     */
    public flush(): string | null {
        const remaining = stripAnsi(this.buffer.replace(/\r/g, ""));
        this.buffer = "";

        if (!remaining) {
            return null;
        }

        return remaining;
    }
}
