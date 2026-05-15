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
    NoteSessionOptions,
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
import type { TerminalAdapterLog } from "../types/AdapterLog";
import type { TUITaskLogHandle, TUIProgress, TUISpinner } from "../types/TUITypes";

/**
 * Pluggable terminal adapter for interactive UI, NDJSON, or automation.
 * This abstract class provides a method surface mirroring common CLI prompt libraries
 * without mandating a specific implementation.
 */
export abstract class AbstractAdapter {
    /**
     * Prompts for a single line of text input.
     * @param options Options for the text prompt.
     * @returns A promise resolving to the user's input.
     */
    abstract text(options: TextPromptOptions): Promise<unknown>;

    /**
     * Prompts for password input.
     * @param options Options for the password prompt.
     * @returns A promise resolving to the password entered.
     */
    abstract password(options: PasswordPromptOptions): Promise<unknown>;

    /**
     * Prompts for a yes/no or boolean-style confirmation.
     * @param options Options for the confirm prompt.
     * @returns A promise resolving to whether the user confirmed.
     */
    abstract confirm(options: ConfirmPromptOptions): Promise<unknown>;

    /**
     * Prompts the user to enter a date.
     * @param options Options for the date prompt.
     * @returns A promise resolving to the chosen date.
     */
    abstract date(options: DatePromptOptions): Promise<unknown>;

    /**
     * Prompts for multiline text input.
     * @param options Options for the multiline prompt.
     * @returns A promise resolving to the input text.
     */
    abstract multiline(options: MultilinePromptOptions): Promise<unknown>;

    /**
     * Prompts for a filesystem path.
     * @param options Options for the path prompt.
     * @returns A promise resolving to the selected path.
     */
    abstract path(options: PathPromptOptions): Promise<unknown>;

    /**
     * Prompts the user to select one item from a list.
     * @param options Options for the select prompt.
     * @returns A promise resolving to the selected value.
     */
    abstract select(options: SelectPromptOptions): Promise<unknown>;

    /**
     * Prompts the user to select one item based on a key.
     * @param options Options for the select key prompt.
     * @returns A promise resolving to the selected key value.
     */
    abstract selectKey(options: SelectKeyPromptOptions): Promise<unknown>;

    /**
     * Prompts for multiple selections from a list.
     * @param options Options for the multiselect prompt.
     * @returns A promise resolving to the selected items.
     */
    abstract multiselect(options: MultiselectPromptOptions): Promise<unknown>;

    /**
     * Prompts with autocomplete for a single selection.
     * @param options Options for the autocomplete prompt.
     * @returns A promise resolving to the selection.
     */
    abstract autocomplete(options: AutocompletePromptOptions): Promise<unknown>;

    /**
     * Prompts with autocomplete for multiple selections.
     * @param options Options for the autocomplete multiselect prompt.
     * @returns A promise resolving to the selected items.
     */
    abstract autocompleteMultiselect(options: AutocompleteMultiselectPromptOptions): Promise<unknown>;

    /**
     * Prompts for multiple group-based selections.
     * @param options Options for the group multiselect prompt.
     * @returns A promise resolving to the selected groups or items.
     */
    abstract groupMultiselect(options: GroupMultiselectPromptOptions): Promise<unknown>;

    /**
     * Prompts the user with a group of prompts.
     * @param prompts An object mapping keys to prompt definitions.
     * @param options Optional options for the group prompt.
     * @returns A promise resolving to a map of answers keyed by prompt name.
     */
    abstract group<T>(
        prompts: GroupPrompts<T>,
        options?: GroupPromptOptions<T>
    ): Promise<Record<keyof T, unknown>>;

    /**
     * Runs a sequence of tasks with an optional configuration.
     * @param tasks Array of task runner items.
     * @param opts Optional common session options.
     * @returns A promise that resolves when all tasks have completed.
     */
    abstract tasks(tasks: TaskRunnerItem[], opts?: SessionCommonOptions): Promise<void>;

    /**
     * Creates a handle to log task progress.
     * @param options Options for the task log factory.
     * @returns A handle for updating task log status.
     */
    abstract taskLog(options: TaskLogFactoryOptions): TUITaskLogHandle;

    /**
     * Creates a spinner UI component.
     * @param opts Optional spinner factory options.
     * @returns The created spinner object.
     */
    abstract spinner(opts?: SpinnerFactoryOptions): TUISpinner;

    /**
     * Creates a progress UI component.
     * @param options Options for the progress prompt.
     * @returns The created progress UI handle.
     */
    abstract progress(options: ProgressPromptOptions): TUIProgress;

    /**
     * Displays an introductory message.
     * @param message Optional intro message.
     * @param opts Optional session options.
     */
    abstract intro(message?: string, opts?: SessionCommonOptions): void;

    /**
     * Displays an outro or closing message.
     * @param message Optional outro message.
     * @param opts Optional session options.
     */
    abstract outro(message?: string, opts?: SessionCommonOptions): void;

    /**
     * Displays a box containing a message.
     * @param message Message content.
     * @param title Optional box title.
     * @param opts Optional box options.
     */
    abstract box(message?: string, title?: string, opts?: BoxPromptOptions): void;

    /**
     * Displays a note or notice message.
     * @param message The note content.
     * @param title Optional note title.
     * @param opts Optional note session options.
     */
    abstract note(message?: string, title?: string, opts?: NoteSessionOptions): void;

    /**
     * Cancels the current session.
     * @param message Optional cancellation message.
     * @param opts Optional session options.
     */
    abstract cancel(message?: string, opts?: SessionCommonOptions): void;

    /**
     * Structured logger with levels, optional labels, and stream helpers.
     *
     * @returns Logger surface for this adapter.
     */
    public abstract get log(): TerminalAdapterLog;
}
