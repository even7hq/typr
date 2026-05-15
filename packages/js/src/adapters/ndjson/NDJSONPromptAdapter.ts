import { randomUUID } from "node:crypto";

import { AbstractAdapter } from "../../models/AbstractAdapter";
import { TUICanceledError } from "../../errors/TUICanceledError";
import { NDJSONStdioTransport } from "../../transports/ndjson/NDJSONStdioTransport";
import {
    NDJSONEventEnvelope,
    NDJSONEnvelope,
    NDJSONKind,
    NDJSONRequestEnvelope,
    NDJSONResponseEnvelope
} from "../../types/ProtocolTypes";
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
} from "../../types/ClackBackedOptions";
import type { NoteSessionOptions } from "../../types/ClackBackedOptions";
import type { TUITaskLogHandle, TUIProgress, TUISpinner } from "../../types/TUITypes";
import {
    eachStringChunk,
    toClackStreamOptions,
    type AdapterLogLine,
    type AdapterLogStreamOptions,
    type TerminalAdapterLog
} from "../../types/AdapterLog";
import { NDJSONWirePayload } from "./NDJSONWirePayload";

/**
 * Prompt adapter that serializes interactions as NDJSON request and response pairs.
 */
export class NDJSONPromptAdapter extends AbstractAdapter {
    private readonly pending = new Map<string, (value: unknown) => void>();

    private _log: TerminalAdapterLog | undefined;

    /**
     * Creates a new NDJSON prompt adapter.
     *
     * @param transport - Shared NDJSON stdio transport.
     */
    constructor(private readonly transport: NDJSONStdioTransport) {
        super();
        this.transport.onMessage((envelope) => this.onInbound(envelope));
    }

    /**
     * Handles inbound envelopes from stdin.
     *
     * @param envelope - Parsed NDJSON envelope.
     * @returns Nothing.
     */
    private onInbound(envelope: NDJSONEnvelope): void {
        if (envelope.kind !== NDJSONKind.RESPONSE) {
            return;
        }

        const response = envelope as NDJSONResponseEnvelope;
        const correlationId = response.correlationId;

        if (!correlationId) {
            return;
        }

        const resolve = this.pending.get(correlationId);

        if (!resolve) {
            return;
        }

        this.pending.delete(correlationId);
        resolve(response.value);
    }

    /**
     * Emits a structured event envelope on stdout.
     *
     * @param event - Event name in uppercase.
     * @param payload - Event payload data.
     * @returns Nothing.
     */
    private emitEvent(event: string, payload: Record<string, unknown>): void {
        const envelope: NDJSONEventEnvelope = {
            kind: NDJSONKind.EVENT,
            timestamp: new Date().toISOString(),
            event,
            payload
        };

        this.transport.send(envelope);
    }

    /**
     * Sends a request envelope and waits for a matching response envelope.
     *
     * @param promptType - Prompt discriminator for hosts.
     * @param payload - Prompt payload data.
     * @returns Resolved value from the host.
     */
    private async request(promptType: string, payload: Record<string, unknown>): Promise<unknown> {
        const correlationId = randomUUID();
        const envelope: NDJSONRequestEnvelope = {
            kind: NDJSONKind.REQUEST,
            correlationId,
            timestamp: new Date().toISOString(),
            promptType,
            payload
        };

        this.transport.send(envelope);

        return await new Promise((resolve) => {
            this.pending.set(correlationId, resolve);
        });
    }

    /**
     * @param options - Text prompt options.
     * @returns Host provided string value.
     */
    public async text(options: TextPromptOptions): Promise<unknown> {
        return await this.request("TEXT", NDJSONWirePayload.fromOptions(options));
    }

    /**
     * @param options - Password prompt options.
     * @returns Host provided string value.
     */
    public async password(options: PasswordPromptOptions): Promise<unknown> {
        return await this.request("PASSWORD", NDJSONWirePayload.fromOptions(options));
    }

    /**
     * @param options - Confirm prompt options.
     * @returns Host provided boolean value.
     */
    public async confirm(options: ConfirmPromptOptions): Promise<unknown> {
        return await this.request("CONFIRM", NDJSONWirePayload.fromOptions(options));
    }

    /**
     * @param options - Date prompt options.
     * @returns Host provided date value.
     */
    public async date(options: DatePromptOptions): Promise<unknown> {
        return await this.request("DATE", NDJSONWirePayload.fromOptions(options));
    }

    /**
     * @param options - Multiline prompt options.
     * @returns Host provided string value.
     */
    public async multiline(options: MultilinePromptOptions): Promise<unknown> {
        return await this.request("MULTILINE", NDJSONWirePayload.fromOptions(options));
    }

    /**
     * @param options - Path prompt options.
     * @returns Host provided string value.
     */
    public async path(options: PathPromptOptions): Promise<unknown> {
        return await this.request("PATH", NDJSONWirePayload.fromOptions(options));
    }

    /**
     * @param options - Select prompt options.
     * @returns Host provided option value.
     */
    public async select(options: SelectPromptOptions): Promise<unknown> {
        return await this.request("SELECT", NDJSONWirePayload.fromOptions(options));
    }

    /**
     * @param options - Select key prompt options.
     * @returns Host provided option value.
     */
    public async selectKey(options: SelectKeyPromptOptions): Promise<unknown> {
        return await this.request("SELECT_KEY", NDJSONWirePayload.fromOptions(options));
    }

    /**
     * @param options - Multiselect prompt options.
     * @returns Host provided values.
     */
    public async multiselect(options: MultiselectPromptOptions): Promise<unknown> {
        return await this.request("MULTISELECT", NDJSONWirePayload.fromOptions(options));
    }

    /**
     * @param options - Autocomplete prompt options.
     * @returns Host provided option value.
     */
    public async autocomplete(options: AutocompletePromptOptions): Promise<unknown> {
        if (typeof options.options === "function") {
            throw new TUICanceledError("AUTOCOMPLETE_DYNAMIC_OPTIONS_UNSUPPORTED_JSON");
        }

        return await this.request("AUTOCOMPLETE", NDJSONWirePayload.fromOptions(options));
    }

    /**
     * @param options - Autocomplete multiselect prompt options.
     * @returns Host provided values.
     */
    public async autocompleteMultiselect(options: AutocompleteMultiselectPromptOptions): Promise<unknown> {
        return await this.request("AUTOCOMPLETE_MULTISELECT", NDJSONWirePayload.fromOptions(options));
    }

    /**
     * @param options - Group multiselect prompt options.
     * @returns Host provided values.
     */
    public async groupMultiselect(options: GroupMultiselectPromptOptions): Promise<unknown> {
        return await this.request("GROUP_MULTISELECT", NDJSONWirePayload.fromOptions(options));
    }

    /**
     * @param prompts - Prompt group definition.
     * @param options - Optional group options.
     * @returns Never: unsupported over NDJSON.
     */
    public async group<T>(_prompts: GroupPrompts<T>, _options?: GroupPromptOptions<T>): Promise<Record<keyof T, unknown>> {
        throw new TUICanceledError("GROUP_UNSUPPORTED_JSON");
    }

    /**
     * @param tasks - Task list.
     * @param opts - Optional common options.
     * @returns Nothing.
     */
    public async tasks(tasks: TaskRunnerItem[], opts?: SessionCommonOptions): Promise<void> {
        const items = tasks.map((t) => ({ title: t.title, enabled: t.enabled }));
        await this.request("TASKS", {
            items,
            opts: NDJSONWirePayload.fromOptions({ ...(opts ?? {}) })
        });
    }

    /**
     * @param options - Task log options.
     * @returns Task log proxy emitting NDJSON events.
     */
    public taskLog(options: TaskLogFactoryOptions): TUITaskLogHandle {
        const id = randomUUID();
        this.emitEvent("TASKLOG_START", { id, ...NDJSONWirePayload.fromOptions(options) });

        return {
            message: (msg: string, mopts?: { raw?: boolean }) => {
                this.emitEvent("TASKLOG_MESSAGE", { id, msg, mopts });
            },

            error: (message: string) => {
                this.emitEvent("TASKLOG_ERROR", { id, message });
            },

            success: (message: string) => {
                this.emitEvent("TASKLOG_SUCCESS", { id, message });
            },

            group: (name: string) => ({
                message: (msg: string, mopts?: { raw?: boolean }) => {
                    this.emitEvent("TASKLOG_GROUP_MESSAGE", { id, name, msg, mopts });
                },

                error: (message: string) => {
                    this.emitEvent("TASKLOG_GROUP_ERROR", { id, name, message });
                },

                success: (message: string) => {
                    this.emitEvent("TASKLOG_GROUP_SUCCESS", { id, name, message });
                }
            })
        };
    }

    /**
     * @param opts - Optional spinner options.
     * @returns Spinner proxy emitting NDJSON events.
     */
    public spinner(opts?: SpinnerFactoryOptions): TUISpinner {
        const id = randomUUID();
        this.emitEvent("SPINNER_CREATE", { id, opts: NDJSONWirePayload.fromOptions({ ...(opts ?? {}) }) });

        return {
            start: (message?: string) => {
                this.emitEvent("SPINNER_START", { id, message });
            },

            message: (message?: string) => {
                this.emitEvent("SPINNER_MESSAGE", { id, message });
            },

            stop: (message?: string) => {
                this.emitEvent("SPINNER_STOP", { id, message, status: "SUCCESS" });
            },

            cancel: (message?: string) => {
                this.emitEvent("SPINNER_CANCEL", { id, message });
            },

            error: (message?: string) => {
                this.emitEvent("SPINNER_STOP", { id, message, status: "ERROR" });
            },

            clear: () => {
                this.emitEvent("SPINNER_CLEAR", { id });
            },

            get isCancelled() {
                return false;
            }
        };
    }

    /**
     * @param options - Progress options.
     * @returns Progress proxy emitting NDJSON events.
     */
    public progress(options: ProgressPromptOptions): TUIProgress {
        const id = randomUUID();

        return {
            start: (message?: string) => {
                this.emitEvent("PROGRESS_START", { id, ...NDJSONWirePayload.fromOptions(options), message });
            },

            advance: (step?: number, message?: string) => {
                this.emitEvent("PROGRESS_ADVANCE", { id, step, message });
            },

            stop: (message?: string) => {
                this.emitEvent("PROGRESS_STOP", { id, message });
            },

            cancel: (message?: string) => {
                this.emitEvent("PROGRESS_CANCEL", { id, message });
            },

            error: (message?: string) => {
                this.emitEvent("PROGRESS_ERROR", { id, message });
            },

            message: (message?: string) => {
                this.emitEvent("PROGRESS_MESSAGE", { id, message });
            },

            clear: () => {
                this.emitEvent("PROGRESS_CLEAR", { id });
            },

            get isCancelled() {
                return false;
            }
        };
    }

    /**
     * @param message - Intro text.
     * @param opts - Optional common options.
     * @returns Nothing.
     */
    public intro(message?: string, opts?: SessionCommonOptions): void {
        this.emitEvent("INTRO", { message, opts: NDJSONWirePayload.fromOptions({ ...(opts ?? {}) }) });
    }

    /**
     * @param message - Outro text.
     * @param opts - Optional common options.
     * @returns Nothing.
     */
    public outro(message?: string, opts?: SessionCommonOptions): void {
        this.emitEvent("OUTRO", { message, opts: NDJSONWirePayload.fromOptions({ ...(opts ?? {}) }) });
    }

    /**
     * @param message - Box body.
     * @param title - Optional title.
     * @param opts - Optional box options.
     * @returns Nothing.
     */
    public box(message?: string, title?: string, opts?: BoxPromptOptions): void {
        this.emitEvent("BOX", { message, title, opts: NDJSONWirePayload.fromOptions({ ...(opts ?? {}) }) });
    }

    /**
     * @param message - Note body.
     * @param title - Optional title.
     * @param opts - Optional note options.
     * @returns Nothing.
     */
    public note(message?: string, title?: string, opts?: NoteSessionOptions): void {
        this.emitEvent("NOTE", { message, title, opts: NDJSONWirePayload.fromOptions({ ...(opts ?? {}) }) });
    }

    /**
     * @param message - Cancel message.
     * @param opts - Optional common options.
     * @returns Nothing.
     */
    public cancel(message?: string, opts?: SessionCommonOptions): void {
        this.emitEvent("CANCEL", { message, opts: NDJSONWirePayload.fromOptions({ ...(opts ?? {}) }) });
    }

    /**
     * @returns NDJSON backed logger emitting `LOG` and `STREAM` events.
     */
    public get log(): TerminalAdapterLog {
        if (!this._log) {
            this._log = this.createLog();
        }

        return this._log;
    }

    /**
     * Builds the logger surface emitting NDJSON events.
     *
     * @returns Terminal logger implementation.
     */
    private createLog(): TerminalAdapterLog {
        const emitLogLine = (line: AdapterLogLine): void => {
            const payload: Record<string, unknown> = {
                level: line.level,
                message: line.message
            };

            if (line.label !== undefined && line.label !== "") {
                payload.label = line.label;
            }

            this.emitEvent("LOG", payload);
        };

        const emitStreamChunk = (channel: string, chunk: string, opts?: AdapterLogStreamOptions): void => {
            const payload: Record<string, unknown> = {
                channel,
                chunk,
                ...NDJSONWirePayload.fromOptions((toClackStreamOptions(opts) ?? {}) as object)
            };

            if (opts?.label !== undefined && opts.label !== "") {
                payload.label = opts.label;
            }

            this.emitEvent("STREAM", payload);
        };

        const streamChannel = async (
            channel: string,
            iterable: Iterable<string> | AsyncIterable<string>,
            opts?: AdapterLogStreamOptions
        ): Promise<void> => {
            for await (const chunk of eachStringChunk(iterable)) {
                emitStreamChunk(channel, chunk, opts);
            }
        };

        return {
            write: (line) => emitLogLine(line),

            info: (m, o) => emitLogLine({ level: "INFO", message: m, label: o?.label }),
            success: (m, o) => emitLogLine({ level: "SUCCESS", message: m, label: o?.label }),
            step: (m, o) => emitLogLine({ level: "STEP", message: m, label: o?.label }),
            warn: (m, o) => emitLogLine({ level: "WARN", message: m, label: o?.label }),
            warning: (m, o) => emitLogLine({ level: "WARNING", message: m, label: o?.label }),
            error: (m, o) => emitLogLine({ level: "ERROR", message: m, label: o?.label }),

            message: (m, o) => {
                const { label, ...rest } = o ?? {};
                const payload: Record<string, unknown> = {
                    level: "MESSAGE",
                    message: m,
                    ...NDJSONWirePayload.fromOptions(rest as object)
                };

                if (label !== undefined && label !== "") {
                    payload.label = label;
                }

                this.emitEvent("LOG", payload);
            },

            stream: {
                message: (it, o) => streamChannel("MESSAGE", it, o),
                info: (it, o) => streamChannel("INFO", it, o),
                success: (it, o) => streamChannel("SUCCESS", it, o),
                step: (it, o) => streamChannel("STEP", it, o),
                warn: (it, o) => streamChannel("WARN", it, o),
                warning: (it, o) => streamChannel("WARNING", it, o),
                error: (it, o) => streamChannel("ERROR", it, o)
            }
        };
    }
}
