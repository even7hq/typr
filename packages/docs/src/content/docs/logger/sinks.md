---
title: Logger sinks
description: Console, file, OTEL, Typr, and custom sinks.
---

# Sinks

Sinks are pluggable outputs. Each sink exposes `category: "local" | "remote"` for `loki()` routing.

## ConsoleSink

```typescript
import { Logger, ConsoleSink } from "@typr/logger";

const logger = Logger.create("App", {
  sinks: [new ConsoleSink()]
});
```

## FileSink

Daily rotation with **2 days** retention by default.

```typescript
import { FileSink, Logger } from "@typr/logger";

const logger = Logger.create("App", {
  sinks: [
    new FileSink({
      logDir: "./logs",
      rotation: { maxDays: 2 }
    })
  ]
});
```

## OtelSink

```typescript
import { Logger, OtelSink } from "@typr/logger";

const logger = Logger.create("App", {
  sinks: [
    new OtelSink({
      endpoint: "http://otel-collector:4318",
      serviceName: "my-service",
      extraHeaders: { "x-even-product": "E7" }
    })
  ]
});
```

## TyprSink

Routes through `@typr/js` (`human`) or NDJSON (`ndjson` / `auto`).

```typescript
import { Logger, TyprSink } from "@typr/logger";

const logger = Logger.create("CLI", {
  sinks: [new TyprSink({ mode: "human" })]
});
```

## CustomSink

```typescript
import { CustomSink, Logger } from "@typr/logger";

const logger = Logger.create("App", {
  sinks: [
    new CustomSink({
      level: "error",
      log: (record) => {
        console.error(record.message);
      }
    })
  ]
});
```
