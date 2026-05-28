// #region Types

/**
 * Handlers that buffer stream chunks into complete lines.
 */
export interface StreamLineHandlers {
    /**
     * Appends stdout bytes to the line buffer.
     *
     * @param chunk - Raw stdout chunk.
     * @returns Nothing.
     */
    onStdout(chunk: Buffer): void;

    /**
     * Appends stderr bytes to the line buffer.
     *
     * @param chunk - Raw stderr chunk.
     * @returns Nothing.
     */
    onStderr(chunk: Buffer): void;

    /**
     * Flushes any trailing bytes without a final newline.
     *
     * @returns Nothing.
     */
    flush(): void;
}

// #endregion

/**
 * Buffers stream chunks into complete lines, collapsing carriage-return progress updates.
 */
export namespace StreamLineBuffer {
    /**
     * Creates stdout/stderr handlers that emit one line per newline.
     *
     * @param onLine - Called for each complete non-empty line.
     * @returns Stream handlers with a flush method.
     */
    export function create(
        onLine: (line: string, stream: "stdout" | "stderr") => void
    ): StreamLineHandlers {
        let stdoutBuf = "";
        let stderrBuf = "";

        /**
         * Feeds bytes into a per-stream buffer and emits completed lines.
         *
         * @param kind - Stream identifier.
         * @param chunk - Raw bytes to append.
         * @returns Nothing.
         */
        const feed = (kind: "stdout" | "stderr", chunk: string): void => {
            let buf = kind === "stdout" ? stdoutBuf + chunk : stderrBuf + chunk;

            while (buf.length > 0) {
                const nl = buf.indexOf("\n");

                if (nl === -1) {
                    const cr = buf.lastIndexOf("\r");

                    if (cr !== -1) {
                        buf = buf.slice(cr + 1);
                    }

                    if (kind === "stdout") {
                        stdoutBuf = buf;
                    } else {
                        stderrBuf = buf;
                    }

                    return;
                }

                let line = buf.slice(0, nl);
                buf = buf.slice(nl + 1);

                const cr = line.lastIndexOf("\r");

                if (cr !== -1) {
                    line = line.slice(cr + 1);
                }

                line = line.trimEnd();

                if (line.trim()) {
                    onLine(line, kind);
                }
            }

            if (kind === "stdout") {
                stdoutBuf = buf;
            } else {
                stderrBuf = buf;
            }
        };

        /**
         * Emits a trailing partial line if the stream ended without a newline.
         *
         * @param kind - Stream identifier.
         * @param buf - Current buffer contents.
         * @returns Nothing.
         */
        const flushStream = (kind: "stdout" | "stderr", buf: string): void => {
            const cr = buf.lastIndexOf("\r");
            let line = cr !== -1 ? buf.slice(cr + 1) : buf;
            line = line.trimEnd();

            if (line.trim()) {
                onLine(line, kind);
            }

            if (kind === "stdout") {
                stdoutBuf = "";
            } else {
                stderrBuf = "";
            }
        };

        return {
            onStdout(chunk: Buffer): void {
                feed("stdout", chunk.toString());
            },

            onStderr(chunk: Buffer): void {
                feed("stderr", chunk.toString());
            },

            flush(): void {
                if (stdoutBuf) {
                    flushStream("stdout", stdoutBuf);
                }

                if (stderrBuf) {
                    flushStream("stderr", stderrBuf);
                }
            }
        };
    }
}
