---
title: Transport
description: NDJSON framing, stdio routing, and Typr v1 identifiers.
---

- One message per line, UTF-8, one JSON object per line (NDJSON).
- In JSON mode, the CLI process writes frames to stdout and reads frames from stdin.
- Every frame carries `typr: 1` and `ts` (ISO 8601) so parsers can reject unknown protocol versions.
- Use the same string `id` on `request`, `response`, and `error` to pair RPC calls with host replies.
