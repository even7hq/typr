---
title: OTEL export
description: OTLP logs, env helpers, and circuit breaker.
---

# OTEL

`OtelSink` exports logs over OTLP HTTP `/v1/logs` using an internal `LoggerProvider` and `OtlpLogExportProcessor` (batch + circuit breaker).

## From env

```typescript
import { Logger, ConsoleSink, enableOtelFromEnv } from "@typr/logger";

const otelSink = enableOtelFromEnv();

const logger = Logger.create("App", {
  sinks: [new ConsoleSink(), ...(otelSink ? [otelSink] : [])]
});
```

Environment variables:

| Variable | Purpose |
|----------|---------|
| `OTEL_ENABLED` | Master switch |
| `OTEL_ENDPOINT` | Collector base URL |
| `OTEL_BEARER_TOKEN` | Optional Bearer |
| `OTEL_EXPORT_LOGS` | Log export toggle |
| `OTEL_LOG_FLUSH_INTERVAL_MS` | Flush interval |
| `OTEL_LOG_MAX_PENDING_RECORDS` | In-memory queue cap (default 4096) |
| `OTEL_LOG_BATCH_SIZE` | Queue size that triggers immediate flush (default 256) |
| `OTEL_LOG_CIRCUIT_FAILURE_THRESHOLD` | Consecutive export failures before circuit opens (default 3) |
| `OTEL_LOG_CIRCUIT_OPEN_MS` | How long the circuit stays open (default 30000) |
| `OTEL_SERVICE_NAME` | `service.name` |

## extraHeaders

Pass any OTLP headers (for example `x-even-product`):

```typescript
new OtelSink({
  endpoint: "http://collector:4318",
  serviceName: "e7-full",
  extraHeaders: { "x-even-product": "E7" },
  maxPendingRecords: 4096,
  batchSize: 256,
  circuitBreaker: { failureThreshold: 3, openDurationMs: 30_000 }
});
```

## Shutdown

```typescript
import { Logger } from "@typr/logger";

await Logger.shutdownAll();
```
