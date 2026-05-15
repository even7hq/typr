import type { AutoPolicy, RuntimeMode } from "./ProtocolTypes";

export type {
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
    NoteSessionOptions,
    PasswordPromptOptions,
    PathPromptOptions,
    ProgressPromptOptions,
    SelectKeyPromptOptions,
    SelectPromptOptions,
    SessionCommonOptions,
    SpinnerFactoryOptions,
    StreamMessageOptions,
    TaskLogFactoryOptions,
    TaskRunnerItem,
    TextPromptOptions,
    WithAutoPolicy
} from "./ClackBackedOptions";

/**
 * Represents a single option in select style prompts (value is string).
 */
export interface TUIOption {
    value: string;
    label: string;
    hint?: string;
    disabled?: boolean;
}

/**
 * Spinner handle contract for terminal backends.
 */
export interface TUISpinner {
    start(message?: string): void;
    message(message?: string): void;
    stop(message?: string): void;
    cancel(message?: string): void;
    error(message?: string): void;
    clear(): void;
    readonly isCancelled: boolean;
}

/**
 * Progress handle contract for terminal backends.
 */
export interface TUIProgress {
    start(message?: string): void;
    advance(step?: number, message?: string): void;
    stop(message?: string): void;
    cancel(message?: string): void;
    error(message?: string): void;
    message(message?: string): void;
    clear(): void;
    readonly isCancelled: boolean;
}

/**
 * Task log handle returned by the terminal adapter `taskLog` factory.
 */
export interface TUITaskLogHandle {
    message(msg: string, mopts?: { raw?: boolean }): void;
    error(message: string): void;
    success(message: string): void;
    group(name: string): {
        message(msg: string, mopts?: { raw?: boolean }): void;
        error(message: string): void;
        success(message: string): void;
    };
}

/**
 * Runtime settings for the `TUIClient` entry point.
 */
export interface TUIClientSettings {
    mode?: RuntimeMode;
    autoPolicy?: AutoPolicy;
    withGuide?: boolean;
}
