---
title: Response and error
description: How hosts answer Typr wire requests over NDJSON.
---

On success, the host sends `type: "response"` with the same `id` as the matching `request`. The procedure result is in `result` (type depends on the `path`).

On failure, the host sends `type: "error"` with the same `id` and a structured `error` object: `code`, `message`, and optional `data`.
