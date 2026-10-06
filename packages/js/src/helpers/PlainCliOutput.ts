import { TerminalLogger } from "./TerminalLogger";

/**
 * Detects environments where clack/TUI spinners must not redraw (E7 deploy, CI, nested raw mode).
 */
export namespace PlainCliOutput {
    /**
     * Returns true when stdout should use plain one-line logs instead of clack spinners.
     *
     * @returns Whether plain CLI output is required.
     */
    export function isActive(): boolean {
        if (TerminalLogger.getRawMode()) {
            return true;
        }

        const ci = process.env.CI;

        if (ci && ci !== "0" && ci !== "false") {
            return true;
        }

        if (process.env.OPERATION_MODE === "CI") {
            return true;
        }

        return false;
    }
}
