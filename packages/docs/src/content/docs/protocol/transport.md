---
title: Transport
description: NDJSON framing, stdio routing, and correlation identifiers.
---

- One message per line, UTF-8, one JSON object per line (NDJSON).
- In JSON mode, the CLI process writes envelopes to stdout and reads envelopes from stdin.
- Use `correlationId` on every request that expects a response so it can be paired with the return line.
