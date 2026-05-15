---
title: Prompt requests
description: promptType values and JSON-serializable payloads for NDJSON mode.
---

The `promptType` field identifies the prompt kind. The body lives in `payload` (object). Wire-friendly types used by the reference JavaScript implementation include: `TEXT`, `PASSWORD`, `CONFIRM`, `DATE`, `MULTILINE`, `PATH`, `SELECT`, `SELECT_KEY`, `MULTISELECT`, `AUTOCOMPLETE`, `AUTOCOMPLETE_MULTISELECT`, `GROUP_MULTISELECT`, `TASKS`. Callback-driven prompts such as `GROUP` cannot be serialized over NDJSON and are rejected by the JSON transport. Dynamic autocomplete option suppliers (`options` as a function) are also rejected over NDJSON and in AUTO mode.

Payloads must be JSON-serializable; when using JSON transport, host-side validation replaces callback fields such as `validate`.

Optional per-call `autoPolicy` overrides the default policy for automatic mode.
