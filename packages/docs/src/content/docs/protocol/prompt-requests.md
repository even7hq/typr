---
title: RPC requests
description: path and input for adapter procedures in NDJSON mode.
---

The `path` field names the procedure with dot segments, for example `adapter.text` or `adapter.confirm`. The optional `input` object carries JSON-serializable arguments.

Reference paths used by **`@even7hq/js`**: `adapter.text`, `adapter.password`, `adapter.confirm`, `adapter.date`, `adapter.multiline`, `adapter.path`, `adapter.select`, `adapter.selectKey`, `adapter.multiselect`, `adapter.autocomplete`, `adapter.autocompleteMultiselect`, `adapter.groupMultiselect`, `adapter.tasks`. Callback-heavy prompts such as `group` cannot run over NDJSON and are rejected by the JSON transport. Dynamic autocomplete option suppliers (`options` as a function) are also rejected over NDJSON and in AUTO mode.

Payloads must be JSON-serializable; when using JSON transport, host-side validation replaces callback fields such as `validate`.

Optional per-call `autoPolicy` overrides the default policy for automatic mode.
