import { RuntimeMode } from "../types/ProtocolTypes";
import { TUIClientSettings } from "../types/TUITypes";

/**
 * Resolves the effective {@link RuntimeMode} from explicit settings and environment variables.
 */
export namespace ModeResolver {
    /**
     * Resolves runtime mode with precedence: explicit `settings.mode`, then `TYPR_TRANSPORT`, then `TYPR_MODE` (or legacy `LEMON_TUI_MODE`), then TUI.
     *
     * @param settings - Optional client settings override.
     * @returns Resolved runtime mode.
     */
    export function resolve(settings?: TUIClientSettings): RuntimeMode {
        if (settings?.mode) {
            return settings.mode;
        }

        const transport = (process.env.TYPR_TRANSPORT ?? "").toUpperCase();

        if (transport === "JSON") {
            return RuntimeMode.JSON;
        }

        const typrMode = (process.env.TYPR_MODE ?? "").toUpperCase();
        const legacyMode = (process.env.LEMON_TUI_MODE ?? "").toUpperCase();

        if (transport === "AUTO" || typrMode === "AUTO" || legacyMode === "AUTO") {
            return RuntimeMode.AUTO;
        }

        return RuntimeMode.TUI;
    }
}
