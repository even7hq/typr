import winston from "winston";
import Transport from "winston-transport";

import type { SinkCategory } from "./LoggerTypes";

/**
 * Winston Loki/OTel routing: sidecar flags, transport filters, and console fallback when OTel is off.
 */
export namespace LoggerLokiRouting {
    /**
     * When set on the winston info object, controls remote vs local transport routing.
     */
    export const LOKI_ROUTE_SYMBOL = Symbol.for("typr.logger.loki");

    /**
     * When set, the line was meant for remote only but no remote transport is registered.
     */
    export const LOKI_FALLBACK_SYMBOL = Symbol.for("typr.logger.lokiFallback");

    const pendingLokiRouteByLabel = new Map<string, boolean>();

    /**
     * Marks the next winston emit for `label` with a Loki route.
     *
     * @param label Logger label.
     * @param enabled When true, remote only; when false, local only.
     * @returns Nothing.
     */
    export function markPendingLokiRoute(label: string, enabled: boolean): void {
        pendingLokiRouteByLabel.set(label, enabled);
    }

    /**
     * Promotes pending Loki route flags onto the winston info object.
     *
     * @param infoRecord Winston info object.
     * @param label Logger label for this emit.
     * @param isRemoteAvailable Whether at least one remote sink is registered.
     * @returns Nothing.
     */
    export function promotePendingLokiRoute(
        infoRecord: Record<string | symbol, unknown>,
        label: string,
        isRemoteAvailable: boolean
    ): void {
        const lokiRoute = pendingLokiRouteByLabel.get(label);

        if (lokiRoute === undefined) {
            return;
        }

        if (lokiRoute === true && !isRemoteAvailable) {
            infoRecord[LOKI_FALLBACK_SYMBOL] = true;
            infoRecord[LOKI_ROUTE_SYMBOL] = true;
        } else {
            infoRecord[LOKI_ROUTE_SYMBOL] = lokiRoute;
        }

        pendingLokiRouteByLabel.delete(label);
    }

    /**
     * Winston format step that prefixes console fallback lines.
     *
     * @returns Winston format instance.
     */
    export function lokiFallbackMessageFormat(): winston.Logform.Format {
        return winston.format((info) => {
            const infoRecord = info as Record<string | symbol, unknown>;

            if (infoRecord[LOKI_FALLBACK_SYMBOL] === true && typeof info.message === "string") {
                if (!info.message.startsWith("[loki-fallback]")) {
                    info.message = `[loki-fallback] ${info.message}`;
                }
            }

            return info;
        })();
    }

    /**
     * Routing format that applies pending sidecar flags before transports run.
     *
     * @param label Logger label.
     * @param isRemoteAvailable Whether remote sinks exist.
     * @returns Winston format instance.
     */
    export function lokiRoutePromotionFormat(label: string, isRemoteAvailable: boolean): winston.Logform.Format {
        return winston.format((info) => {
            const infoRecord = info as Record<string | symbol, unknown>;

            promotePendingLokiRoute(infoRecord, label, isRemoteAvailable);

            return info;
        })();
    }

    /**
     * @param transport Winston transport instance.
     * @returns Whether the transport is the console sink.
     */
    function isConsoleTransport(transport: winston.transport): boolean {
        const named = transport as winston.transport & { name?: string };

        if (named.name === "console") {
            return true;
        }

        return transport instanceof winston.transports.Console;
    }

    /**
     * Decides whether a local transport should be skipped for a remote-only routed log line.
     *
     * @param info Winston log info object.
     * @param category Sink category for this transport.
     * @param transport Transport evaluating the line.
     * @returns True when this transport must not receive the line.
     */
    function shouldSkipLocalTransportForLokiRoute(
        info: Record<string | symbol, unknown>,
        category: SinkCategory,
        transport: winston.transport
    ): boolean {
        if (category !== "local") {
            return false;
        }

        const route = info[LOKI_ROUTE_SYMBOL];

        if (route !== true) {
            return false;
        }

        if (info[LOKI_FALLBACK_SYMBOL] === true) {
            return !isConsoleTransport(transport);
        }

        return true;
    }

    /**
     * Wraps a transport so it respects Loki routing flags.
     *
     * @param transport Winston transport.
     * @param category Sink category for this transport.
     * @returns The same transport instance (patched).
     */
    export function wrapTransportForLokiRouteFilter(
        transport: winston.transport,
        category: SinkCategory
    ): winston.transport {
        const logFn = transport.log as { __typrLokiRouteWrapped?: boolean };

        if (logFn.__typrLokiRouteWrapped) {
            return transport;
        }

        const originalLog = transport.log;

        if (!originalLog) {
            return transport;
        }

        const boundOriginalLog = originalLog.bind(transport);

        transport.log = function lokiRouteAwareLog(info, callback) {
            const record = info as Record<string | symbol, unknown>;

            if (shouldSkipLocalTransportForLokiRoute(record, category, transport)) {
                if (callback) {
                    callback();
                }

                return transport;
            }

            const route = record[LOKI_ROUTE_SYMBOL];

            if (route === false && category === "remote") {
                if (callback) {
                    callback();
                }

                return transport;
            }

            return boundOriginalLog(info, callback);
        };

        logFn.__typrLokiRouteWrapped = true;

        return transport;
    }

    /**
     * Patches Transport.prototype so global transports respect routing.
     *
     * @returns Nothing.
     */
    export function installLokiRouteTransportFilter(): void {
        const prototypeLog = Transport.prototype.log as { __typrLokiRoutePatched?: boolean };

        if (prototypeLog.__typrLokiRoutePatched) {
            return;
        }

        prototypeLog.__typrLokiRoutePatched = true;
    }
}
