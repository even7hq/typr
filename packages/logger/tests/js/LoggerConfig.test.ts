import { describe, expect, it } from "vitest";

import { buildOtelSinkOptionsFromEnv, isOtelLogsExportEnabled, readTelemetryConfig } from "../../src/js/otel/TelemetryConfig";

describe("TelemetryConfig", () => {
    it("returns null when OTEL is disabled", () => {
        const config = readTelemetryConfig({
            OTEL_ENABLED: "false"
        });

        expect(config).toBeNull();
    });

    it("parses OTEL config when enabled", () => {
        const config = readTelemetryConfig({
            OTEL_ENABLED: "true",
            OTEL_ENDPOINT: "http://collector:4318",
            OTEL_EXPORT_LOGS: "true",
            OTEL_SERVICE_NAME: "test-service"
        });

        expect(config).not.toBeNull();
        expect(config?.endpoint).toBe("http://collector:4318");
        expect(config?.serviceName).toBe("test-service");
        expect(isOtelLogsExportEnabled({
            OTEL_ENABLED: "true",
            OTEL_ENDPOINT: "http://collector:4318",
            OTEL_EXPORT_LOGS: "true"
        })).toBe(true);
    });

    it("buildOtelSinkOptionsFromEnv returns null when logs export is off", () => {
        const options = buildOtelSinkOptionsFromEnv({
            OTEL_ENABLED: "true",
            OTEL_ENDPOINT: "http://collector:4318",
            OTEL_EXPORT_LOGS: "false"
        });

        expect(options).toBeNull();
    });

    it("parses OTEL processor tuning from env", () => {
        const options = buildOtelSinkOptionsFromEnv({
            OTEL_ENABLED: "true",
            OTEL_ENDPOINT: "http://collector:4318",
            OTEL_EXPORT_LOGS: "true",
            OTEL_LOG_MAX_PENDING_RECORDS: "1024",
            OTEL_LOG_BATCH_SIZE: "64",
            OTEL_LOG_CIRCUIT_FAILURE_THRESHOLD: "5",
            OTEL_LOG_CIRCUIT_OPEN_MS: "60000"
        });

        expect(options?.maxPendingRecords).toBe(1024);
        expect(options?.batchSize).toBe(64);
        expect(options?.circuitBreaker?.failureThreshold).toBe(5);
        expect(options?.circuitBreaker?.openDurationMs).toBe(60000);
    });
});
