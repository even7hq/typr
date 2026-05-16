---
title: Wire frame types
description: Typr v1 NDJSON frames use type, typr version, and ts on every line.
---

Every line is one JSON object. All frames include:

- `typr`: must be `1` for this contract.
- `type`: lowercase discriminant (`request`, `response`, `error`, or `event`).
- `ts`: ISO 8601 timestamp.

| Value | Typical direction | Meaning |
| --- | --- | --- |
| `request` | CLI to host | RPC call with `id`, `path`, and optional `input`. |
| `response` | Host to CLI | Success for the same `id` with optional `result`. |
| `error` | Host to CLI | Failure for the same `id` with `error` (`code`, `message`, optional `data`). |
| `event` | CLI to host | One-way notification (see Events). |

Pair RPC calls with outcomes using the same string `id` on `request`, `response`, and `error`.
