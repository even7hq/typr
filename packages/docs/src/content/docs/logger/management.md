---
title: Logger management
description: Mute, levels, and introspection.
---

# Management

## Mute

```typescript
import { Logger } from "@typr/logger";

Logger.mute("NoisyModule");
Logger.unmute("NoisyModule");

Logger.mute("*");
Logger.unmute("*");
```

## Levels

```typescript
Logger.changeLevel("debug");
Logger.changeLevelForLabel("MyService", "error");
Logger.clearLevelOverrideForLabel("MyService");
```

## Introspection

```typescript
Logger.all();
Logger.names();
Logger.stats();
Logger.describeAll();
```

## Global sinks

```typescript
import { Logger, OtelSink } from "@typr/logger";

Logger.addGlobalSink(new OtelSink({ endpoint: "http://collector:4318", serviceName: "app" }));
Logger.removeAllGlobalSinks();
```
