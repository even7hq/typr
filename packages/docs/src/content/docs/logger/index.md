---
title: "@typr/logger"
description: Typr logging with optional OTEL and Lua modules.
---

# @typr/logger

`@typr/logger` is the Typr logging package: shared log levels and printf-style messages, pluggable sinks, optional OTLP export, and a Lua module for OpenResty.

## Install

```bash
yarn add @typr/logger winston
```

Optional peers:

- `@typr/js` for `TyprSink` (human or NDJSON terminal output)
- OpenTelemetry packages for `OtelSink`

## Quick start

```typescript
import { Logger } from "@typr/logger";

const logger = Logger.create("MyService");

logger.info("started job %d", 42);
logger.error("failed: %O", new Error("boom"));
logger.loki().info("remote only");
logger.child("Worker").debug("tick %s", id);
```

Lua (OpenResty) uses the same method names and `printf`-style placeholders; see [Lua API](/logger/lua/).

See [Sinks](/logger/sinks/), [Formats](/logger/formats/), and [OTEL](/logger/otel/) for next steps.
