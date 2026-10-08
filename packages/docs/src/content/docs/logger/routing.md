---
title: Loki routing
description: loki() and console() sidecar routing.
---

# Routing

`logger.loki()` and `logger.console()` route the **next** emit only.

## Remote only

```typescript
logger.loki().info("OTEL / Loki only");
```

## Local only

```typescript
logger.loki(false).warn("console and file only");
```

## Fallback

When `loki(true)` is used but no remote sink exists, the line is delivered locally with a `[loki-fallback]` prefix.

## Categories

| Sink | category |
|------|----------|
| ConsoleSink, FileSink, TyprSink | `local` |
| OtelSink | `remote` |

Chain sidecars:

```typescript
logger.loki().info("one shot remote");
logger.console(false).error("one shot remote");
```
