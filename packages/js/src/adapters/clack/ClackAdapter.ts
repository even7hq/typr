import * as clack from "@clack/prompts";

import { AbstractAdapter } from "../../models/AbstractAdapter";
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
} from "../../types/ClackBackedOptions";
import {
    AdapterLogFormatting,
    eachStringChunk,
    toClackStreamOptions,
    type AdapterLogStreamOptions,
    type TerminalAdapterLog
} from "../../types/AdapterLog";
import type { TUITaskLogHandle, TUIProgress, TUISpinner } from "../../types/TUITypes";
import { ClackPromptMapper } from "./ClackPromptMapper";

/**
 * Strips Typr-only fields before forwarding options to @clack/prompts.
 *
 * @param options - Prompt options that may include `autoPolicy`.
 * @returns Options without `autoPolicy`.
 */
function stripAuto<T extends { autoPolicy?: unknown }>(options: T): Omit<T, "autoPolicy"> {
    const { autoPolicy: _ignored, ...rest } = options;
    return rest;
}

/**
 * Adapter backed by @clack/prompts for interactive terminals.
 */
export class ClackAdapter extends AbstractAdapter {
    private _log: TerminalAdapterLog | undefined;

    /**
     * Updates global clack settings.
     *
     * @param settings - Settings forwarded to clack.
     * @returns Nothing.
     */
    public updateSettings(settings: { withGuide?: boolean }): void {
        clack.updateSettings(settings);
    }

    /**
     * @param options - Text prompt options.
     * @returns Clack result value.
     */
    public async text(options: TextPromptOptions): Promise<unknown> {
        return await clack.text(stripAuto(options));
    }

    /**
     * @param options - Password prompt options.
     * @returns Clack result value.
     */
    public async password(options: PasswordPromptOptions): Promise<unknown> {
        return await clack.password(stripAuto(options));
    }

    /**
     * @param options - Confirm prompt options.
     * @returns Clack result value.
     */
    public async confirm(options: ConfirmPromptOptions): Promise<unknown> {
        return await clack.confirm(stripAuto(options));
    }

    /**
     * @param options - Date prompt options.
     * @returns Clack result value.
     */
    public async date(options: DatePromptOptions): Promise<unknown> {
        return await clack.date(stripAuto(options));
    }

    /**
     * @param options - Multiline prompt options.
     * @returns Clack result value.
     */
    public async multiline(options: MultilinePromptOptions): Promise<unknown> {
        return await clack.multiline(stripAuto(options));
    }

    /**
     * @param options - Path prompt options.
     * @returns Clack result value.
     */
    public async path(options: PathPromptOptions): Promise<unknown> {
        return await clack.path(stripAuto(options));
    }

    /**
     * @param options - Select prompt options.
     * @returns Clack result value.
     */
    public async select(options: SelectPromptOptions): Promise<unknown> {
        const cleaned = stripAuto(options);
        return await clack.select({
            ...cleaned,
            options: ClackPromptMapper.mapSelectOptions(
                cleaned.options.map((o) => ({
                    value: String(o.value),
                    label: String(o.label ?? o.value),
                    hint: o.hint,
                    disabled: o.disabled
                }))
            )
        });
    }

    /**
     * @param options - Select key prompt options.
     * @returns Clack result value.
     */
    public async selectKey(options: SelectKeyPromptOptions): Promise<unknown> {
        const cleaned = stripAuto(options);
        return await clack.selectKey({
            ...cleaned,
            options: ClackPromptMapper.mapSelectOptions(
                cleaned.options.map((o) => ({
                    value: String(o.value),
                    label: String(o.label ?? o.value),
                    hint: o.hint,
                    disabled: o.disabled
                }))
            )
        });
    }

    /**
     * @param options - Multiselect prompt options.
     * @returns Clack result value.
     */
    public async multiselect(options: MultiselectPromptOptions): Promise<unknown> {
        const cleaned = stripAuto(options);
        return await clack.multiselect({
            ...cleaned,
            options: ClackPromptMapper.mapSelectOptions(
                cleaned.options.map((o) => ({
                    value: String(o.value),
                    label: String(o.label ?? o.value),
                    hint: o.hint,
                    disabled: o.disabled
                }))
            )
        });
    }

    /**
     * @param options - Autocomplete prompt options.
     * @returns Clack result value.
     */
    public async autocomplete(options: AutocompletePromptOptions): Promise<unknown> {
        const cleaned = stripAuto(options);

        if (typeof cleaned.options === "function") {
            return await clack.autocomplete(cleaned);
        }

        return await clack.autocomplete({
            ...cleaned,
            options: ClackPromptMapper.mapSelectOptions(
                cleaned.options.map((o) => ({
                    value: String(o.value),
                    label: String(o.label ?? o.value),
                    hint: o.hint,
                    disabled: o.disabled
                }))
            )
        });
    }

    /**
     * @param options - Autocomplete multiselect prompt options.
     * @returns Clack result value.
     */
    public async autocompleteMultiselect(options: AutocompleteMultiselectPromptOptions): Promise<unknown> {
        const cleaned = stripAuto(options);

        if (typeof cleaned.options === "function") {
            return await clack.autocompleteMultiselect(cleaned);
        }

        const optionRows = cleaned.options;

        return await clack.autocompleteMultiselect({
            ...cleaned,
            options: ClackPromptMapper.mapSelectOptions(
                optionRows.map((o: (typeof optionRows)[number]) => ({
                    value: String(o.value),
                    label: String(o.label ?? o.value),
                    hint: o.hint,
                    disabled: o.disabled
                }))
            )
        });
    }

    /**
     * @param options - Group multiselect prompt options.
     * @returns Clack result value.
     */
    public async groupMultiselect(options: GroupMultiselectPromptOptions): Promise<unknown> {
        const cleaned = stripAuto(options);
        const mapped: Record<string, ReturnType<typeof ClackPromptMapper.mapSelectOptions>> = {};

        for (const key of Object.keys(cleaned.options)) {
            const list = cleaned.options[key] ?? [];
            mapped[key] = ClackPromptMapper.mapSelectOptions(
                list.map((o) => ({
                    value: String(o.value),
                    label: String(o.label ?? o.value),
                    hint: o.hint,
                    disabled: o.disabled
                }))
            );
        }

        return await clack.groupMultiselect({
            ...cleaned,
            options: mapped
        });
    }

    /**
     * @param prompts - Prompt group definition.
     * @param options - Optional group options.
     * @returns Awaited group results.
     */
    public async group<T>(prompts: GroupPrompts<T>, options?: GroupPromptOptions<T>): Promise<Record<keyof T, unknown>> {
        const result = await clack.group(prompts, options);
        return result as Record<keyof T, unknown>;
    }

    /**
     * @param tasks - Task list.
     * @param opts - Optional common options.
     * @returns Nothing.
     */
    public async tasks(tasks: TaskRunnerItem[], opts?: SessionCommonOptions): Promise<void> {
        await clack.tasks(tasks, opts);
    }

    /**
     * @param options - Task log options.
     * @returns Task log handle.
     */
    public taskLog(options: TaskLogFactoryOptions): TUITaskLogHandle {
        return clack.taskLog(options);
    }

    /**
     * @param opts - Optional spinner options.
     * @returns Spinner handle.
     */
    public spinner(opts?: SpinnerFactoryOptions): TUISpinner {
        const active = clack.spinner(opts);

        return {
            start: (message?: string) => active.start(message),
            message: (message?: string) => active.message(message),
            stop: (message?: string) => active.stop(message),
            cancel: (message?: string) => active.cancel(message),
            error: (message?: string) => active.error(message),
            clear: () => active.clear(),
            get isCancelled() {
                return active.isCancelled;
            }
        };
    }

    /**
     * @param options - Progress options.
     * @returns Progress handle.
     */
    public progress(options: ProgressPromptOptions): TUIProgress {
        const bar = clack.progress(stripAuto(options));

        return {
            start: (message?: string) => bar.start(message),
            advance: (step?: number, message?: string) => bar.advance(step, message),
            stop: (message?: string) => bar.stop(message),
            cancel: (message?: string) => bar.cancel(message),
            error: (message?: string) => bar.error(message),
            message: (message?: string) => bar.message(message),
            clear: () => bar.clear(),
            get isCancelled() {
                return bar.isCancelled;
            }
        };
    }

    /**
     * @param message - Intro title.
     * @param opts - Optional common options.
     * @returns Nothing.
     */
    public intro(message?: string, opts?: SessionCommonOptions): void {
        clack.intro(message, opts);
    }

    /**
     * @param message - Outro text.
     * @param opts - Optional common options.
     * @returns Nothing.
     */
    public outro(message?: string, opts?: SessionCommonOptions): void {
        clack.outro(message, opts);
    }

    /**
     * @param message - Box body.
     * @param title - Optional title.
     * @param opts - Optional box options.
     * @returns Nothing.
     */
    public box(message?: string, title?: string, opts?: BoxPromptOptions): void {
        clack.box(message, title, opts);
    }

    /**
     * @param message - Note body.
     * @param title - Optional title.
     * @param opts - Optional note options.
     * @returns Nothing.
     */
    public note(message?: string, title?: string, opts?: NoteSessionOptions): void {
        clack.note(message, title, opts);
    }

    /**
     * @param message - Cancel message.
     * @param opts - Optional common options.
     * @returns Nothing.
     */
    public cancel(message?: string, opts?: SessionCommonOptions): void {
        clack.cancel(message, opts);
    }

    /**
     * @returns Clack backed logger with optional labels and stream helpers.
     */
    public get log(): TerminalAdapterLog {
        if (!this._log) {
            this._log = this.createLog();
        }

        return this._log;
    }

    /**
     * Builds the logger surface backed by clack.
     *
     * @returns Terminal logger implementation.
     */
    private createLog(): TerminalAdapterLog {
        const fmt = AdapterLogFormatting.withLabel;

        const wrapStream = async (
            run: (iterable: Iterable<string> | AsyncIterable<string>, clackOpts?: ReturnType<typeof toClackStreamOptions>) => Promise<void>,
            iterable: Iterable<string> | AsyncIterable<string>,
            opts?: AdapterLogStreamOptions
        ): Promise<void> => {
            const clackOpts = toClackStreamOptions(opts);
            const label = opts?.label;

            if (label !== undefined && label !== "") {
                const mapped = (async function* () {
                    for await (const chunk of eachStringChunk(iterable)) {
                        yield fmt(chunk, label);
                    }
                })();

                await run(mapped, clackOpts);

                return;
            }

            await run(iterable, clackOpts);
        };

        return {
            write: (line) => {
                const text = fmt(line.message, line.label);

                switch (line.level) {
                    case "INFO":
                        clack.log.info(text);
                        break;
                    case "SUCCESS":
                        clack.log.success(text);
                        break;
                    case "STEP":
                        clack.log.step(text);
                        break;
                    case "WARN":
                        clack.log.warn(text);
                        break;
                    case "WARNING":
                        clack.log.warning(text);
                        break;
                    case "ERROR":
                        clack.log.error(text);
                        break;
                    case "MESSAGE":
                        clack.log.message(text);
                        break;
                    default:
                        break;
                }
            },

            info: (m, o) => clack.log.info(fmt(m, o?.label)),
            success: (m, o) => clack.log.success(fmt(m, o?.label)),
            step: (m, o) => clack.log.step(fmt(m, o?.label)),
            warn: (m, o) => clack.log.warn(fmt(m, o?.label)),
            warning: (m, o) => clack.log.warning(fmt(m, o?.label)),
            error: (m, o) => clack.log.error(fmt(m, o?.label)),
            message: (m, o) => clack.log.message(fmt(m, o?.label), toClackStreamOptions(o)),

            stream: {
                message: (it, o) => wrapStream(clack.stream.message, it, o),
                info: (it, o) => wrapStream(clack.stream.info, it, o),
                success: (it, o) => wrapStream(clack.stream.success, it, o),
                step: (it, o) => wrapStream(clack.stream.step, it, o),
                warn: (it, o) => wrapStream(clack.stream.warn, it, o),
                warning: (it, o) => wrapStream(clack.stream.warning, it, o),
                error: (it, o) => wrapStream(clack.stream.error, it, o)
            }
        };
    }
}
