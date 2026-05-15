---
title: Envelope kinds
description: REQUEST, RESPONSE, EVENT, and ERROR envelope kinds on the wire.
---

Uppercase string values for `kind`:

| Value | Meaning |
| --- | --- |
| `REQUEST` | Request that requires a host response. |
| `RESPONSE` | Response to the request sharing the same `correlationId`. |
| `EVENT` | One-way notification (spinner, progress, log, intro, outro, etc.). |
| `ERROR` | Structured failure with `code`, `message`, and optional `payload`. |

Suggested common fields: `timestamp` in ISO 8601 and `correlationId` when applicable.
