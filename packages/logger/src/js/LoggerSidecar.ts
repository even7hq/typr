import type { TyprLogger } from "./LoggerTypes";
import { LoggerLokiRouting } from "./LoggerLokiRouting";
import type { SidecarLogger } from "./LoggerTypes";

/**
 * Builds a sidecar proxy that routes the next emit via loki() / console().
 */
export namespace LoggerSidecar {
    /**
     * Creates a sidecar logger around a Typr logger instance.
     *
     * @param instance Parent Winston logger.
     * @param label Logger label used for routing.
     * @param lokiRoute When defined, sets the next emit route.
     * @returns Sidecar proxy.
     */
    export function buildSidecarLogger(
        instance: TyprLogger,
        label: string,
        lokiRoute?: boolean
    ): SidecarLogger {
        const emit = (level: keyof TyprLogger, message: string, ...args: unknown[]) => {
            if (lokiRoute !== undefined) {
                LoggerLokiRouting.markPendingLokiRoute(label, lokiRoute);
            }

            const writer = instance[level];

            if (typeof writer === "function") {
                (writer as (msg: string, ...a: unknown[]) => void)(message, ...args);
            }
        };

        const sidecar: SidecarLogger = {
            error(message: string, ...args: unknown[]) {
                emit("error", message, ...args);
            },
            warn(message: string, ...args: unknown[]) {
                emit("warn", message, ...args);
            },
            info(message: string, ...args: unknown[]) {
                emit("info", message, ...args);
            },
            debug(message: string, ...args: unknown[]) {
                emit("debug", message, ...args);
            },
            verbose(message: string, ...args: unknown[]) {
                emit("verbose", message, ...args);
            },
            loki(enabled = true) {
                return buildSidecarLogger(instance, label, enabled);
            },
            console(show = true) {
                if (show) {
                    return buildSidecarLogger(instance, label, undefined);
                }

                return buildSidecarLogger(instance, label, true);
            }
        };

        return sidecar;
    }
}
