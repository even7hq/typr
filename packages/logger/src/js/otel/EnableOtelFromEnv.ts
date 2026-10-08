import { buildOtelSinkOptionsFromEnv } from "./TelemetryConfig";
import { OtelSink } from "../sinks/OtelSink";

/**
 * Builds an {@link OtelSink} from `OTEL_*` environment variables when enabled.
 *
 * @param env Environment map (defaults to `process.env`).
 * @returns Configured OtelSink or null when OTEL log export is disabled.
 */
export function enableOtelFromEnv(env: NodeJS.ProcessEnv = process.env): OtelSink | null {
    const options = buildOtelSinkOptionsFromEnv(env);

    if (!options) {
        return null;
    }

    return new OtelSink(options);
}
