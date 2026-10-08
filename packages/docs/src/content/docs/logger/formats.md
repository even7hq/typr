---
title: Logger formats
description: Placeholders, redaction, and custom printf lines.
---

# Formats

Default line shape:

```text
YYYY-MM-DD HH:mm:ss [nodeId] label [level]: message
```

## Placeholders

Supported in `logger.info("...", ...)` style calls:

| Token | Meaning |
|-------|---------|
| `%s` | string |
| `%d` `%i` | integer |
| `%f` | float |
| `%o` | inspect depth 4 |
| `%O` | deep inspect |
| `%j` | JSON |
| `%t` | destructure object `(key=value)` |

## Redaction

`SecretRedaction` redacts splat args and the final message (Bearer, GitHub, AWS, Slack, JWT, and more). Disable per logger:

```typescript
Logger.create("App", {
  redaction: { enabled: false }
});
```

## Custom format

Pass a Winston format to replace the default pipeline:

```typescript
import winston from "winston";
import { Logger } from "@typr/logger";

const logger = Logger.create("App", {
  format: winston.format.simple()
});
```

Use `nodeId` in options to override the `[nodeId]` segment.
