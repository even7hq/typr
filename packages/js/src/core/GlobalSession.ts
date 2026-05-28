import { ClackAdapter } from "../adapters/clack";
import type { AbstractAdapter } from "../models/AbstractAdapter";
import type {
    AutocompletePromptOptions,
    BoxPromptOptions,
    ConfirmPromptOptions,
    MultiselectPromptOptions,
    NoteSessionOptions,
    SelectPromptOptions,
    SessionCommonOptions,
    SpinnerFactoryOptions,
    TextPromptOptions
} from "../types/ClackBackedOptions";
import type { AdapterLogStream, TerminalAdapterLog } from "../types/AdapterLog";
import type { TUIClientSettings, TUISpinner } from "../types/TUITypes";
import { TUIClient } from "./TUIClient";

let client: TUIClient | undefined;

/**
 * Returns the global Typr adapter, creating a default session on first use.
 *
 * @returns Active {@link AbstractAdapter} instance.
 */
function getGlobalAdapter(): AbstractAdapter {
    if (!client) {
        client = new TUIClient();
    }

    return client.adapter;
}

/**
 * Builds a proxy so `log.info` / `log.stream.message` always hit the current global adapter.
 *
 * @returns Clack-compatible logger surface.
 */
function createLogProxy(): TerminalAdapterLog {
    return new Proxy({} as TerminalAdapterLog, {
        get(_target, prop: string | symbol) {
            const adapterLog = getGlobalAdapter().log;

            if (prop === "stream") {
                return new Proxy({} as AdapterLogStream, {
                    get(_streamTarget, streamProp: string | symbol) {
                        const stream = adapterLog.stream;
                        const value = stream[streamProp as keyof AdapterLogStream];

                        if (typeof value === "function") {
                            return (value as (...args: unknown[]) => unknown).bind(stream);
                        }

                        return value;
                    }
                });
            }

            const value = adapterLog[prop as keyof TerminalAdapterLog];

            if (typeof value === "function") {
                return (value as (...args: unknown[]) => unknown).bind(adapterLog);
            }

            return value;
        }
    });
}

/**
 * Global structured logger (same ergonomics as `clack.log`).
 */
export const log = createLogProxy();

/**
 * Initializes or replaces the global Typr session (call once at process entry).
 *
 * @param settings - Optional client settings (mode, withGuide, auto policy).
 * @returns Nothing.
 */
export function initTypr(settings: TUIClientSettings = {}): void {
    client?.dispose();
    client = new TUIClient(settings);
}

/**
 * Disposes the global session and releases JSON transport listeners when present.
 *
 * @returns Nothing.
 */
export function disposeTypr(): void {
    client?.dispose();
    client = undefined;
}

/**
 * Updates clack global settings when the active adapter is clack-backed.
 *
 * @param settings - Clack global settings.
 * @returns Nothing.
 */
export function updateSettings(settings: { withGuide?: boolean }): void {
    const adapter = getGlobalAdapter();

    if (adapter instanceof ClackAdapter) {
        adapter.updateSettings(settings);
    }
}

/**
 * @param options - Confirm prompt options.
 * @returns User answer or symbol cancel value.
 */
export function confirm(options: ConfirmPromptOptions): Promise<unknown> {
    return getGlobalAdapter().confirm(options);
}

/**
 * @param options - Text prompt options.
 * @returns User input or symbol cancel value.
 */
export function text(options: TextPromptOptions): Promise<unknown> {
    return getGlobalAdapter().text(options);
}

/**
 * @param options - Select prompt options.
 * @returns Selected value or symbol cancel value.
 */
export function select(options: SelectPromptOptions): Promise<unknown> {
    return getGlobalAdapter().select(options);
}

/**
 * @param options - Multiselect prompt options.
 * @returns Selected values or symbol cancel value.
 */
export function multiselect(options: MultiselectPromptOptions): Promise<unknown> {
    return getGlobalAdapter().multiselect(options);
}

/**
 * @param options - Autocomplete prompt options.
 * @returns Selected value(s) or symbol cancel value.
 */
export function autocomplete(options: AutocompletePromptOptions): Promise<unknown> {
    return getGlobalAdapter().autocomplete(options);
}

/**
 * @param opts - Optional spinner factory options.
 * @returns Spinner handle.
 */
export function spinner(opts?: SpinnerFactoryOptions): TUISpinner {
    return getGlobalAdapter().spinner(opts);
}

/**
 * @param message - Note body.
 * @param title - Optional title.
 * @param opts - Optional note session options.
 * @returns Nothing.
 */
export function note(message?: string, title?: string, opts?: NoteSessionOptions): void {
    getGlobalAdapter().note(message, title, opts);
}

/**
 * @param message - Cancellation message.
 * @param opts - Optional session options.
 * @returns Nothing.
 */
export function cancel(message?: string, opts?: SessionCommonOptions): void {
    getGlobalAdapter().cancel(message, opts);
}

/**
 * @param message - Optional intro title.
 * @param opts - Optional session options.
 * @returns Nothing.
 */
export function intro(message?: string, opts?: SessionCommonOptions): void {
    getGlobalAdapter().intro(message, opts);
}

/**
 * @param message - Optional outro text.
 * @param opts - Optional session options.
 * @returns Nothing.
 */
export function outro(message?: string, opts?: SessionCommonOptions): void {
    getGlobalAdapter().outro(message, opts);
}

/**
 * @param message - Box body.
 * @param title - Optional title.
 * @param opts - Optional box options.
 * @returns Nothing.
 */
export function box(message?: string, title?: string, opts?: BoxPromptOptions): void {
    getGlobalAdapter().box(message, title, opts);
}
