import winston from "winston";
import type Transport from "winston-transport";

import { CustomSplat } from "./formats/CustomSplat";
import { LogLine } from "./formats/LogLine";
import { RedactionProfile } from "./formats/redaction/RedactionProfile";
import { SecretRedaction } from "./formats/SecretRedaction";
import { DEFAULT_LOG_LEVEL, isValidLogLevel } from "./LoggerLevels";
import { LoggerLokiRouting } from "./LoggerLokiRouting";
import { LoggerSidecar } from "./LoggerSidecar";
import { LoggerStaticLabels } from "./LoggerStaticLabels";
import type {
    LogLevel,
    LoggerInstanceIntrospection,
    LoggerIntrospection,
    LoggerOptions,
    LogSink,
    TransportDescriptor,
    TyprLogger
} from "./LoggerTypes";
import type { LoggerLabels } from "./LoggerStaticLabels";
import { ConsoleSink } from "./sinks/ConsoleSink";

interface RegistryEntry {
    instance: TyprLogger;
    callCount: number;
    sinks: LogSink[];
    consoleFormat: winston.Logform.Format;
    fileFormat: winston.Logform.Format;
    staticLabels: LoggerLabels;
}

const registry = new Map<string, RegistryEntry>();
const mutedLoggers = new Set<string>();
const labelLevelOverrides = new Map<string, LogLevel>();
const globalSinks: LogSink[] = [];
const sinkCategories = new WeakMap<winston.transport, "local" | "remote">();
const globalSinkTransportsByLabel = new Map<LogSink, Map<string, winston.transport[]>>();

let globalLogLevel: LogLevel = DEFAULT_LOG_LEVEL;

/**
 * Typr logger factory and registry (sink-pluggable).
 */
export namespace Logger {
    /**
     * Creates or returns a named logger instance.
     *
     * @param label Logger name shown in the log line.
     * @param options Sinks, level, and format options.
     * @returns Typr logger instance.
     */
    export function create(label: string, options: LoggerOptions = {}): TyprLogger {
        const existing = registry.get(label);

        if (existing) {
            existing.callCount += 1;
            return existing.instance;
        }

        const redactionProfile = RedactionProfile.resolve(options.redaction);
        const staticLabels = LoggerStaticLabels.normalize(options.labels);

        const sinks = [...(options.sinks ?? [new ConsoleSink()]), ...globalSinks];
        const hasRemote = sinks.some((sink) => sink.category === "remote");

        const printfConsole = LogLine.generateDefaultPrintfFormat({
            nodeId: options.nodeId,
            stripAnsi: false
        });

        const printfFile = LogLine.generateDefaultPrintfFormat({
            nodeId: options.nodeId,
            stripAnsi: true
        });

        const sharedParts = [
            winston.format.splat(),
            winston.format((info) => {
                info.label = label;
                return info;
            })(),
            CustomSplat.customSplatFormat({ colors: true, redaction: redactionProfile }),
            SecretRedaction.redactSplatArgsFormat(redactionProfile),
            SecretRedaction.redactMessageFormat(redactionProfile),
            LoggerLokiRouting.lokiRoutePromotionFormat(label, hasRemote),
            LoggerLokiRouting.lokiFallbackMessageFormat()
        ];

        const coreFormat = winston.format.combine(...sharedParts);

        const consoleFormat = options.format ?? LogLine.generateConsoleFormat([], printfConsole);
        const fileFormat = LogLine.generateFileFormat([], printfFile);

        const transports = buildTransportsForSinks(sinks, {
            label,
            labels: staticLabels,
            consoleFormat,
            fileFormat
        });

        const level = labelLevelOverrides.get(label) ?? options.level ?? globalLogLevel;

        const instance = winston.createLogger({
            level,
            levels: winston.config.npm.levels,
            format: coreFormat,
            defaultMeta: LoggerStaticLabels.defaultMeta(staticLabels),
            transports
        }) as TyprLogger;

        instance.label = label;
        instance.labels = staticLabels;
        applyLoggerMaxListeners(instance, transports.length);

        attachInstanceMethods(instance, label);

        registry.set(label, {
            instance,
            callCount: 1,
            sinks,
            consoleFormat,
            fileFormat,
            staticLabels
        });

        patchTransportMuteBehavior(instance);

        return instance;
    }

    /**
     * Registers a global sink attached to every new logger.
     *
     * @param sink Sink instance.
     * @returns Nothing.
     */
    export function addGlobalSink(sink: LogSink): void {
        if (globalSinks.includes(sink)) {
            return;
        }

        globalSinks.push(sink);
        attachGlobalSinkToRegistry(sink);
    }

    /**
     * Removes a global sink by reference.
     *
     * @param sink Sink instance to remove.
     * @returns Nothing.
     */
    export function removeGlobalSink(sink: LogSink): void {
        const index = globalSinks.indexOf(sink);

        if (index >= 0) {
            globalSinks.splice(index, 1);
        }

        detachGlobalSinkFromRegistry(sink);
    }

    /**
     * Removes every global sink.
     *
     * @returns Nothing.
     */
    export function removeAllGlobalSinks(): void {
        globalSinks.length = 0;
    }

    /**
     * Mutes a logger label or all loggers when label is "*".
     *
     * @param label Logger label or wildcard.
     * @returns Nothing.
     */
    export function mute(label: string): void {
        if (label === "*") {
            for (const entry of registry.keys()) {
                mutedLoggers.add(entry);
            }

            return;
        }

        mutedLoggers.add(label);
    }

    /**
     * Unmutes a logger label or all loggers when label is "*".
     *
     * @param label Logger label or wildcard.
     * @returns Nothing.
     */
    export function unmute(label: string): void {
        if (label === "*") {
            mutedLoggers.clear();
            return;
        }

        mutedLoggers.delete(label);
    }

    /**
     * Changes the global log level for all loggers without per-label overrides.
     *
     * @param newLevel Target level.
     * @returns Nothing.
     */
    export function changeLevel(newLevel: LogLevel): void {
        if (!isValidLogLevel(newLevel)) {
            return;
        }

        globalLogLevel = newLevel;

        for (const [label, entry] of registry.entries()) {
            if (labelLevelOverrides.has(label)) {
                continue;
            }

            entry.instance.level = newLevel;
        }
    }

    /**
     * Sets a per-label log level override.
     *
     * @param label Logger label.
     * @param newLevel Target level.
     * @returns Nothing.
     */
    export function changeLevelForLabel(label: string, newLevel: LogLevel): void {
        if (!isValidLogLevel(newLevel)) {
            return;
        }

        labelLevelOverrides.set(label, newLevel);
        const entry = registry.get(label);

        if (entry) {
            entry.instance.level = newLevel;
        }
    }

    /**
     * Clears a per-label level override.
     *
     * @param label Logger label.
     * @returns Nothing.
     */
    export function clearLevelOverrideForLabel(label: string): void {
        labelLevelOverrides.delete(label);
        const entry = registry.get(label);

        if (entry) {
            entry.instance.level = globalLogLevel;
        }
    }

    /**
     * Returns all registered logger instances.
     *
     * @returns Logger instances.
     */
    export function all(): TyprLogger[] {
        return [...registry.values()].map((entry) => entry.instance);
    }

    /**
     * Returns all registered logger labels.
     *
     * @returns Label names.
     */
    export function names(): string[] {
        return [...registry.keys()];
    }

    /**
     * Returns lightweight stats per logger.
     *
     * @returns Stats rows.
     */
    export function stats(): Array<{ label: string; callCount: number; transports: number }> {
        return [...registry.entries()].map(([label, entry]) => {
            return {
                label,
                callCount: entry.callCount,
                transports: entry.instance.transports.length
            };
        });
    }

    /**
     * Returns a full introspection snapshot.
     *
     * @returns Introspection object.
     */
    export function describeAll(): LoggerIntrospection {
        const loggers: LoggerInstanceIntrospection[] = [];

        for (const [label, entry] of registry.entries()) {
            const transports: TransportDescriptor[] = entry.instance.transports.map((transport) => {
                const named = transport as winston.transport & { name?: string };

                return {
                    name: named.name ?? transport.constructor.name,
                    level: transport.level ?? entry.instance.level,
                    category: sinkCategories.get(transport) ?? "local",
                    silent: Boolean(transport.silent)
                };
            });

            loggers.push({
                label,
                labels: entry.instance.labels ?? {},
                level: entry.instance.level,
                callCount: entry.callCount,
                muted: mutedLoggers.has(label),
                levelOverride: labelLevelOverrides.get(label) ?? null,
                transports
            });
        }

        return {
            globalLogLevel,
            defaultLogLevel: DEFAULT_LOG_LEVEL,
            mutedLoggers: [...mutedLoggers],
            globalTransportCount: globalSinks.length,
            loggers
        };
    }

    /**
     * Shuts down all sinks for every registered logger.
     *
     * @returns Resolved when sinks are closed.
     */
    export async function shutdownAll(): Promise<void> {
        for (const entry of registry.values()) {
            for (const sink of entry.sinks) {
                await sink.shutdown();
            }
        }

        for (const sink of globalSinks) {
            await sink.shutdown();
        }
    }
}

/**
 * Builds Winston transports for the given sinks and routing context.
 *
 * @param sinks Sink list.
 * @param context Label, labels, and format pipelines.
 * @returns Winston transports ready to attach.
 */
function buildTransportsForSinks(
    sinks: LogSink[],
    context: {
        label: string;
        labels: LoggerLabels;
        consoleFormat: winston.Logform.Format;
        fileFormat: winston.Logform.Format;
    }
): winston.transport[] {
    const transports: winston.transport[] = [];

    for (const sink of sinks) {
        const built = sink.createTransports(context);

        for (const transport of built) {
            LoggerLokiRouting.wrapTransportForLokiRouteFilter(transport, sink.category);
            sinkCategories.set(transport, sink.category);
            transports.push(transport);
        }
    }

    return transports;
}

/**
 * Attaches a global sink to every logger already in the registry.
 *
 * @param sink Global sink instance.
 * @returns Nothing.
 */
function attachGlobalSinkToRegistry(sink: LogSink): void {
    for (const [label, entry] of registry.entries()) {
        if (entry.sinks.includes(sink)) {
            continue;
        }

        const built = buildTransportsForSinks([sink], {
            label,
            labels: entry.staticLabels,
            consoleFormat: entry.consoleFormat,
            fileFormat: entry.fileFormat
        });

        for (const transport of built) {
            entry.instance.add(transport);
            patchTransportMuteBehavior(entry.instance);
        }

        let byLabel = globalSinkTransportsByLabel.get(sink);

        if (!byLabel) {
            byLabel = new Map();
            globalSinkTransportsByLabel.set(sink, byLabel);
        }

        byLabel.set(label, built);

        entry.sinks.push(sink);
        applyLoggerMaxListeners(entry.instance, entry.instance.transports.length);
    }
}

/**
 * Detaches a global sink from registered loggers.
 *
 * @param sink Global sink instance.
 * @returns Nothing.
 */
function detachGlobalSinkFromRegistry(sink: LogSink): void {
    for (const [label, entry] of registry.entries()) {
        const sinkIndex = entry.sinks.indexOf(sink);

        if (sinkIndex < 0) {
            continue;
        }

        entry.sinks.splice(sinkIndex, 1);

        const byLabel = globalSinkTransportsByLabel.get(sink);
        const attached = byLabel?.get(label) ?? [];

        for (const transport of attached) {
            entry.instance.remove(transport);
        }

        byLabel?.delete(label);
    }
}

/**
 * Attaches child/loki/console helpers to a logger instance.
 *
 * @param instance Winston logger.
 * @param label Logger label.
 * @returns Nothing.
 */
function attachInstanceMethods(instance: TyprLogger, label: string): void {
    const winstonChild = (
        winston.Logger.prototype.child as (
            this: winston.Logger,
            defaultMeta: Record<string, unknown>
        ) => winston.Logger
    ).bind(instance);

    instance.child = (childLabel: string): TyprLogger => {
        const parentLabels = instance.labels ?? {};
        const childDefaultMeta = LoggerStaticLabels.defaultMeta(parentLabels) ?? {};
        const child = winstonChild({
            label: childLabel,
            ...childDefaultMeta
        }) as TyprLogger;

        child.label = `${label}:${childLabel}`;
        child.labels = parentLabels;
        attachInstanceMethods(child, child.label);
        patchTransportMuteBehavior(child);

        return child;
    };

    instance.loki = (enabled = true) => {
        return LoggerSidecar.buildSidecarLogger(instance, label, enabled);
    };

    instance.console = (show = true) => {
        if (show) {
            return LoggerSidecar.buildSidecarLogger(instance, label, undefined);
        }

        return LoggerSidecar.buildSidecarLogger(instance, label, true);
    };
}

/**
 * Raises max listeners on the logger to avoid pipe warnings.
 *
 * @param instance Winston logger.
 * @param transportCount Planned transport count.
 * @returns Nothing.
 */
function applyLoggerMaxListeners(instance: winston.Logger, transportCount: number): void {
    const budget = Math.max(20, transportCount * 3 + 5);

    if (instance.getMaxListeners() < budget) {
        instance.setMaxListeners(budget);
    }
}

/**
 * Patches transport silent getter to respect muted labels.
 *
 * @param instance Logger instance.
 * @returns Nothing.
 */
function patchTransportMuteBehavior(instance: TyprLogger): void {
    for (const transport of instance.transports) {
        const transportWithParent = transport as Transport & {
            parent?: TyprLogger;
            _selfMuted?: boolean;
        };

        transportWithParent.parent = instance;

        Object.defineProperty(transport, "silent", {
            get() {
                if (transportWithParent._selfMuted) {
                    return true;
                }

                if (mutedLoggers.has(instance.label)) {
                    return true;
                }

                return false;
            },
            set(val: boolean) {
                transportWithParent._selfMuted = val;
            }
        });
    }
}
