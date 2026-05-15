import { isTTY } from "@clack/prompts";

import { ClackAdapter } from "../adapters/clack";
import { NDJSONPromptAdapter } from "../adapters/ndjson";
import { AbstractAdapter } from "../models/AbstractAdapter";
import { NDJSONStdioTransport } from "../transports/ndjson";
import { AutoPolicy, RuntimeMode } from "../types/ProtocolTypes";
import { TUIClientSettings } from "../types/TUITypes";
import { AutoAdapter } from "./AutoAdapter";
import { ModeResolver } from "./ModeResolver";

/**
 * Wires environment driven {@link RuntimeMode} selection to a concrete {@link AbstractAdapter}.
 */
export class TUIClient {
    /**
     * Active adapter for prompts, structured logging, spinners, and progress.
     */
    public readonly adapter: AbstractAdapter;

    /**
     * Stdio transport used for JSON mode, when created.
     */
    private readonly transport: NDJSONStdioTransport | null;

    /**
     * Creates a client by resolving {@link RuntimeMode} and constructing the matching adapter.
     *
     * @param settings - Optional overrides for mode, clack guide, and AUTO policy.
     */
    constructor(settings: TUIClientSettings = {}) {
        const resolved = ModeResolver.resolve(settings);
        let transport: NDJSONStdioTransport | null = null;
        let adapter: AbstractAdapter;

        if (resolved === RuntimeMode.JSON) {
            transport = new NDJSONStdioTransport();
            adapter = new NDJSONPromptAdapter(transport);
        } else if (resolved === RuntimeMode.AUTO) {
            if (isTTY(process.stdout)) {
                adapter = TUIClient.createClackAdapter(settings);
            } else {
                adapter = new AutoAdapter(settings.autoPolicy ?? AutoPolicy.SAFE_DEFAULT);
            }
        } else {
            adapter = TUIClient.createClackAdapter(settings);
        }

        this.transport = transport;
        this.adapter = adapter;
    }

    /**
     * Releases stdio listeners when JSON mode created the transport.
     *
     * @returns Nothing.
     */
    public dispose(): void {
        this.transport?.dispose();
    }

    /**
     * Builds a {@link ClackAdapter} and applies optional global clack settings.
     *
     * @param settings - Client settings that may include `withGuide`.
     * @returns Configured clack backed adapter.
     */
    private static createClackAdapter(settings: TUIClientSettings): ClackAdapter {
        const adapter = new ClackAdapter();

        if (settings.withGuide !== undefined) {
            adapter.updateSettings({ withGuide: settings.withGuide });
        }

        return adapter;
    }
}
