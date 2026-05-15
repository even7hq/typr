import { AbstractAdapter } from "../models/AbstractAdapter";
import { TUICanceledError } from "../errors/TUICanceledError";
import { AutoPolicy } from "../types/ProtocolTypes";
import type {
    AutocompleteMultiselectPromptOptions,
    AutocompletePromptOptions,
    BoxPromptOptions,
    ConfirmPromptOptions,
    DatePromptOptions,
    GroupMultiselectPromptOptions,
    GroupPromptOptions,
    GroupPrompts,
    MultilinePromptOptions,
    MultiselectPromptOptions,
    PasswordPromptOptions,
    PathPromptOptions,
    ProgressPromptOptions,
    SelectKeyPromptOptions,
    SelectPromptOptions,
    SessionCommonOptions,
    SpinnerFactoryOptions,
    TaskLogFactoryOptions,
    TaskRunnerItem,
    TextPromptOptions
} from "../types/ClackBackedOptions";
import type { NoteSessionOptions } from "../types/ClackBackedOptions";
import type {
    AdapterLogLine,
    AdapterLogStreamOptions,
    TerminalAdapterLog
} from "../types/AdapterLog";
import type { TUITaskLogHandle, TUIProgress, TUISpinner } from "../types/TUITypes";

namespace AutoAdapterLog {
    let cached: TerminalAdapterLog | undefined;

    /**
     * Drains an iterable without producing output.
     *
     * @param iterable - Iterable or async iterable of chunks.
     * @returns Promise resolved when iteration completes.
     */
    async function drain(iterable: Iterable<string> | AsyncIterable<string>): Promise<void> {
        if (typeof iterable === "object" && iterable !== null && Symbol.asyncIterator in iterable) {
            for await (const _chunk of iterable as AsyncIterable<string>) {
                // intentionally empty
            }

            return;
        }

        for (const _chunk of iterable as Iterable<string>) {
            // intentionally empty
        }
    }

    /**
     * Builds the shared silent logger surface.
     *
     * @returns Terminal logger implementation.
     */
    function create(): TerminalAdapterLog {
        const streamDrain = (
            iterable: Iterable<string> | AsyncIterable<string>,
            _opts?: AdapterLogStreamOptions
        ): Promise<void> => drain(iterable);

        return {
            write: (_line: AdapterLogLine): void => {
                void _line;
            },

            info: (_message, _options): void => {
                void _message;
                void _options;
            },

            success: (_message, _options): void => {
                void _message;
                void _options;
            },

            step: (_message, _options): void => {
                void _message;
                void _options;
            },

            warn: (_message, _options): void => {
                void _message;
                void _options;
            },

            warning: (_message, _options): void => {
                void _message;
                void _options;
            },

            message: (_message, _options): void => {
                void _message;
                void _options;
            },

            error: (_message, _options): void => {
                void _message;
                void _options;
            },

            stream: {
                message: streamDrain,
                info: streamDrain,
                success: streamDrain,
                step: streamDrain,
                warn: streamDrain,
                warning: streamDrain,
                error: streamDrain
            }
        };
    }

    /**
     * Returns the shared silent logger for AUTO mode.
     *
     * @returns Cached terminal logger.
     */
    export function get(): TerminalAdapterLog {
        if (!cached) {
            cached = create();
        }

        return cached;
    }
}

class AutoSpinner implements TUISpinner {
    public start(_message?: string): void {}

    public message(_message?: string): void {}

    public stop(_message?: string): void {}

    public cancel(_message?: string): void {}

    public error(_message?: string): void {}

    public clear(): void {}

    public readonly isCancelled = false;
}

class AutoProgress implements TUIProgress {
    public start(_message?: string): void {}

    public advance(_step?: number, _message?: string): void {}

    public stop(_message?: string): void {}

    public cancel(_message?: string): void {}

    public error(_message?: string): void {}

    public message(_message?: string): void {}

    public clear(): void {}

    public readonly isCancelled = false;
}

class AutoTaskLog implements TUITaskLogHandle {
    public message(_msg: string, _mopts?: { raw?: boolean }): void {}

    public error(_message: string): void {}

    public success(_message: string): void {}

    public group(_name: string): ReturnType<TUITaskLogHandle["group"]> {
        return {
            message: () => {},
            error: () => {},
            success: () => {}
        };
    }
}

/**
 * Adapter that resolves prompts without user interaction using {@link AutoPolicy}.
 */
export class AutoAdapter extends AbstractAdapter {
    /**
     * Creates a new AUTO adapter.
     *
     * @param policy - Policy applied when defaults are missing.
     */
    constructor(private readonly policy: AutoPolicy) {
        super();
    }

    /**
     * @param options - Text prompt options.
     * @returns Resolved text.
     */
    public async text(options: TextPromptOptions): Promise<string> {
        if (options.defaultValue !== undefined) {
            return options.defaultValue;
        }

        if (this.policy === AutoPolicy.ALWAYS_YES) {
            return "";
        }

        throw new TUICanceledError();
    }

    /**
     * @param options - Password prompt options.
     * @returns Resolved password string.
     */
    public async password(options: PasswordPromptOptions): Promise<string> {
        if (this.policy === AutoPolicy.ALWAYS_YES) {
            return "";
        }

        throw new TUICanceledError("PASSWORD_NO_DEFAULT");
    }

    /**
     * @param options - Confirm prompt options.
     * @returns Resolved confirmation flag.
     */
    public async confirm(options: ConfirmPromptOptions): Promise<boolean> {
        if (options.initialValue !== undefined) {
            return options.initialValue;
        }

        if (this.policy === AutoPolicy.ALWAYS_YES) {
            return true;
        }

        return false;
    }

    /**
     * @param options - Date prompt options.
     * @returns Resolved date.
     */
    public async date(options: DatePromptOptions): Promise<Date> {
        if (options.defaultValue) {
            return options.defaultValue;
        }

        if (options.initialValue) {
            return options.initialValue;
        }

        if (this.policy === AutoPolicy.ALWAYS_YES) {
            return new Date(0);
        }

        throw new TUICanceledError("DATE_NO_DEFAULT");
    }

    /**
     * @param options - Multiline prompt options.
     * @returns Resolved text.
     */
    public async multiline(options: MultilinePromptOptions): Promise<string> {
        if (options.defaultValue !== undefined) {
            return options.defaultValue;
        }

        if (this.policy === AutoPolicy.ALWAYS_YES) {
            return "";
        }

        throw new TUICanceledError("MULTILINE_NO_DEFAULT");
    }

    /**
     * @param options - Path prompt options.
     * @returns Resolved path string.
     */
    public async path(options: PathPromptOptions): Promise<string> {
        if (options.initialValue !== undefined) {
            return options.initialValue;
        }

        if (this.policy === AutoPolicy.ALWAYS_YES) {
            return ".";
        }

        throw new TUICanceledError("PATH_NO_DEFAULT");
    }

    /**
     * @param options - Select prompt options.
     * @returns First option value.
     */
    public async select(options: SelectPromptOptions): Promise<string> {
        const first = options.options[0]?.value;

        if (first !== undefined) {
            return String(first);
        }

        throw new TUICanceledError("SELECT_EMPTY_OPTIONS");
    }

    /**
     * @param options - Select key prompt options.
     * @returns First option value.
     */
    public async selectKey(options: SelectKeyPromptOptions): Promise<string> {
        const first = options.options[0]?.value;

        if (first !== undefined) {
            return String(first);
        }

        throw new TUICanceledError("SELECT_KEY_EMPTY_OPTIONS");
    }

    /**
     * @param options - Multiselect prompt options.
     * @returns Selected values.
     */
    public async multiselect(options: MultiselectPromptOptions): Promise<string[]> {
        if (options.initialValues !== undefined) {
            return options.initialValues.map(String);
        }

        if (this.policy === AutoPolicy.ALWAYS_YES) {
            return options.options.map((o) => String(o.value));
        }

        return [];
    }

    /**
     * @param options - Autocomplete prompt options.
     * @returns First option value when available.
     */
    public async autocomplete(options: AutocompletePromptOptions): Promise<string> {
        if (typeof options.options === "function") {
            throw new TUICanceledError("AUTOCOMPLETE_DYNAMIC_UNSUPPORTED_AUTO");
        }

        return await this.select(options as unknown as SelectPromptOptions);
    }

    /**
     * @param options - Autocomplete multiselect prompt options.
     * @returns Selected values.
     */
    public async autocompleteMultiselect(options: AutocompleteMultiselectPromptOptions): Promise<string[]> {
        return await this.multiselect(options as unknown as MultiselectPromptOptions);
    }

    /**
     * @param options - Group multiselect prompt options.
     * @returns Selected values.
     */
    public async groupMultiselect(options: GroupMultiselectPromptOptions): Promise<string[]> {
        if (options.initialValues?.length) {
            return options.initialValues.map(String);
        }

        if (this.policy === AutoPolicy.ALWAYS_YES) {
            const all: string[] = [];

            for (const list of Object.values(options.options)) {
                for (const o of list) {
                    all.push(String(o.value));
                }
            }

            return all;
        }

        return [];
    }

    /**
     * @param prompts - Prompt group definition.
     * @param options - Optional group options.
     * @returns Aggregated results.
     */
    public async group<T>(prompts: GroupPrompts<T>, options?: GroupPromptOptions<T>): Promise<Record<keyof T, unknown>> {
        void options;
        const keys = Object.keys(prompts) as (keyof T)[];
        const partial: Partial<Record<keyof T, unknown>> = {};
        const out = {} as Record<keyof T, unknown>;

        for (const key of keys) {
            const fn = prompts[key];
            const value = await fn({ results: partial as never });
            out[key] = value;
            partial[key] = value;
        }

        return out;
    }

    /**
     * @param tasks - Task list.
     * @param opts - Optional common options.
     * @returns Nothing.
     */
    public async tasks(tasks: TaskRunnerItem[], opts?: SessionCommonOptions): Promise<void> {
        void opts;

        for (const item of tasks) {
            if (item.enabled === false) {
                continue;
            }

            await item.task(() => {});
        }
    }

    /**
     * @param options - Task log options.
     * @returns Silent task log handle.
     */
    public taskLog(options: TaskLogFactoryOptions): TUITaskLogHandle {
        void options;
        return new AutoTaskLog();
    }

    /**
     * @param opts - Optional spinner options.
     * @returns Silent spinner handle.
     */
    public spinner(opts?: SpinnerFactoryOptions): TUISpinner {
        void opts;
        return new AutoSpinner();
    }

    /**
     * @param options - Progress options.
     * @returns Silent progress handle.
     */
    public progress(options: ProgressPromptOptions): TUIProgress {
        void options;
        return new AutoProgress();
    }

    /**
     * @param message - Intro text.
     * @param opts - Optional common options.
     * @returns Nothing.
     */
    public intro(message?: string, opts?: SessionCommonOptions): void {
        void message;
        void opts;
    }

    /**
     * @param message - Outro text.
     * @param opts - Optional common options.
     * @returns Nothing.
     */
    public outro(message?: string, opts?: SessionCommonOptions): void {
        void message;
        void opts;
    }

    /**
     * @param message - Box body.
     * @param title - Optional title.
     * @param opts - Optional box options.
     * @returns Nothing.
     */
    public box(message?: string, title?: string, opts?: BoxPromptOptions): void {
        void message;
        void title;
        void opts;
    }

    /**
     * @param message - Note body.
     * @param title - Optional title.
     * @param opts - Optional note options.
     * @returns Nothing.
     */
    public note(message?: string, title?: string, opts?: NoteSessionOptions): void {
        void message;
        void title;
        void opts;
    }

    /**
     * @param message - Cancel message.
     * @param opts - Optional common options.
     * @returns Nothing.
     */
    public cancel(message?: string, opts?: SessionCommonOptions): void {
        void message;
        void opts;
    }

    /**
     * @returns Silent logger that drains streams without emitting output.
     */
    public get log(): TerminalAdapterLog {
        return AutoAdapterLog.get();
    }
}
