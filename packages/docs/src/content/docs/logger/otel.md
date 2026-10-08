---
title: OTEL export
description: OTLP logs, env helpers, and circuit breaker.
---

# OTEL

`OtelSink` exports logs over OTLP HTTP `/v1/logs` using an internal `LoggerProvider` and a batched OTLP processor with circuit breaker. By default, failed exports are persisted to a SQLite WAL (same idea as LuckyMaker `wal_entries`) and retried in the background.

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
| `OTEL_WAL_ENABLED` | SQLite WAL on failed export (default `true`) |
| `OTEL_WAL_DB` | SQLite file path (default `process.cwd()/typr.db`; may be LM `state.db`) |

## SQLite WAL

When export fails or the circuit is open, log records are written to `wal_entries` in the configured SQLite file. A separate timer retries due rows until export succeeds or `maxAttempts` is reached.

The SQLite file **can be shared** with LuckyMaker application state (`state.db`): same `wal_entries` table; OTLP log backlog uses stream `OTLP_LOGS`, separate from other streams LM stores in that DB. Standalone Typr apps may keep the default `typr.db`; when running inside LM, set `dbPath` or `OTEL_WAL_DB` to the state database path.

```typescript
// Same file as LuckyMaker state (shared wal_entries):
new OtelSink({
  endpoint: "http://collector:4318",
  serviceName: "luckymaker",
  wal: { dbPath: "/path/to/state.db" }
});

new OtelSink({
  endpoint: "http://collector:4318",
  serviceName: "my-service",
  wal: {
    dbPath: "/var/lib/myapp/otel-logs.db",
    maxBacklogEntries: 10_000,
    maxAttempts: 10,
    backlogFlushIntervalMs: 30_000
  }
});
```

Set `wal: false` to use in-memory re-queue only (`OtlpLogExportProcessor`).

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
