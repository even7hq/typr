import type {
    AutocompleteMultiSelectOptions,
    AutocompleteOptions,
    BoxOptions,
    CommonOptions,
    ConfirmOptions,
    DateOptions,
    GroupMultiSelectOptions,
    LogMessageOptions,
    MultiLineOptions,
    MultiSelectOptions,
    NoteOptions,
    PasswordOptions,
    PathOptions,
    ProgressOptions,
    PromptGroup,
    PromptGroupOptions,
    SelectKeyOptions,
    SelectOptions,
    SpinnerOptions,
    Task,
    TaskLogOptions,
    TextOptions
} from "@clack/prompts";

import type { AutoPolicy } from "./ProtocolTypes";

/**
 * Optional AUTO policy override merged into prompt option bags.
 */
export type WithAutoPolicy<T extends object> = T & {
    autoPolicy?: AutoPolicy;
};

export type TextPromptOptions = WithAutoPolicy<TextOptions>;
export type PasswordPromptOptions = WithAutoPolicy<PasswordOptions>;
export type ConfirmPromptOptions = WithAutoPolicy<ConfirmOptions>;
export type DatePromptOptions = WithAutoPolicy<DateOptions>;
export type MultilinePromptOptions = WithAutoPolicy<MultiLineOptions>;
export type PathPromptOptions = WithAutoPolicy<PathOptions>;
export type SelectPromptOptions = WithAutoPolicy<SelectOptions<string>>;
export type SelectKeyPromptOptions = WithAutoPolicy<SelectKeyOptions<string>>;
export type MultiselectPromptOptions = WithAutoPolicy<MultiSelectOptions<string>>;
export type AutocompletePromptOptions = WithAutoPolicy<AutocompleteOptions<string>>;
export type AutocompleteMultiselectPromptOptions = WithAutoPolicy<AutocompleteMultiSelectOptions<string>>;
export type GroupMultiselectPromptOptions = WithAutoPolicy<GroupMultiSelectOptions<string>>;
export type BoxPromptOptions = BoxOptions;
export type SpinnerFactoryOptions = SpinnerOptions;
export type ProgressPromptOptions = WithAutoPolicy<ProgressOptions>;
export type GroupPromptOptions<T> = PromptGroupOptions<T>;
export type GroupPrompts<T> = PromptGroup<T>;
export type TaskRunnerItem = Task;
export type TaskLogFactoryOptions = TaskLogOptions;
export type StreamMessageOptions = LogMessageOptions;
export type SessionCommonOptions = CommonOptions;
export type NoteSessionOptions = NoteOptions;
