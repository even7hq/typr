import { createRequire } from "node:module";

import Transport from "winston-transport";

import type { LogSink, SinkBuildContext, SinkCategory } from "../LoggerTypes";

const requirePeer = createRequire(__filename);

/**
 * Output mode for {@link TyprSink}.
 */
export type TyprSinkMode = "human" | "ndjson" | "auto";

/**
 * Options for {@link TyprSink}.
 */
export interface TyprSinkOptions {
    mode?: TyprSinkMode;
}

interface TyprLogModule {
    log: {
        info: (message: string) => void;
        warn: (message: string) => void;
        error: (message: string) => void;
        success?: (message: string) => void;
        message: (message: string, options?: { symbol?: string }) => void;
    };
}

interface TyprWireModule {
    TYPR_WIRE_VERSION: string;
}

/**
 * Resolves the @typr/js log facade (optional peer).
 *
 * @returns Typr log module.
 */
function loadTyprLog(): TyprLogModule {
    try {
        const mod = requirePeer("@typr/js") as TyprLogModule;

        if (!mod.log) {
            throw new Error("missing log export");
        }

        return mod;
    } catch {
        try {
            const mod = requirePeer("@typr/js-src") as TyprLogModule;

            if (!mod.log) {
                throw new Error("missing log export");
            }

            return mod;
        } catch {
            throw new Error(
                "TyprSink requires optional peer @typr/js. Install @typr/js to use TyprSink."
            );
        }
    }
}

/**
 * Loads Typr wire constants for NDJSON mode.
 *
 * @returns Wire version constant.
 */
function loadTyprWireVersion(): string {
    try {
        const mod = requirePeer("@typr/js") as TyprWireModule;

        return mod.TYPR_WIRE_VERSION ?? "1";
    } catch {
        const mod = requirePeer("@typr/js-src") as TyprWireModule;

        return mod.TYPR_WIRE_VERSION ?? "1";
    }
}

/**
 * Routes formatted log lines through @typr/js (human) or NDJSON (machine).
 */
export class TyprSink implements LogSink {
    readonly category: SinkCategory = "local";

    private readonly options: TyprSinkOptions;
    private transport: Transport | null = null;

    /**
     * @param options Human, NDJSON, or auto mode.
     */
    constructor(options: TyprSinkOptions = {}) {
        this.options = options;
    }

    /**
     * Builds a transport that writes through Typr log or NDJSON stdout.
     *
     * @param context Label for structured NDJSON events.
     * @returns Typr transport.
     */
    createTransports(context: SinkBuildContext): Transport[] {
        const mode = this.options.mode ?? "human";
        const label = context.label;
        const typrLog = loadTyprLog();
        const wireVersion = loadTyprWireVersion();

        class TyprTransport extends Transport {
            log(info: Record<string, unknown>, callback: () => void): void {
                setImmediate(callback);

                const level = String(info.level ?? "info");
                const message = String(info.message ?? "");
                const line = label ? `[${label}] ${message}` : message;
                const resolvedMode = mode === "auto" ? resolveAutoMode() : mode;

                if (resolvedMode === "ndjson") {
                    const payload = {
                        typr: wireVersion,
                        type: "event",
                        path: "terminal.emit",
                        name: "LOG",
                        payload: {
                            level: level.toUpperCase(),
                            source: level === "error" ? "stderr" : "stdout",
                            message: line
                        },
                        ts: new Date().toISOString()
                    };

                    process.stdout.write(`${JSON.stringify(payload)}\n`);
                    return;
                }

                if (level === "error") {
                    typrLog.log.error(line);
                    return;
                }

                if (level === "warn") {
                    typrLog.log.warn(line);
                    return;
                }

                if (level === "debug" || level === "verbose" || level === "silly") {
                    typrLog.log.message(line, { symbol: "~" });
                    return;
                }

                typrLog.log.info(line);
            }
        }

        this.transport = new TyprTransport();

        return [this.transport];
    }

    /**
     * Closes the Typr transport.
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

/**
 * Resolves auto mode from environment (NDJSON when TYPR_MODE=ndjson).
 *
 * @returns Resolved output mode.
 */
function resolveAutoMode(): TyprSinkMode {
    const raw = process.env.TYPR_MODE?.trim().toLowerCase();

    if (raw === "ndjson" || raw === "machine") {
        return "ndjson";
    }

    return "human";
}
