---
title: Lua API
description: Pure Lua logger and OpenResty adapter.
---

# Lua

Modules live under `src/lua/typr/` in the package.

## Same API as TypeScript

Use the same calls as the TypeScript package:

| TypeScript | Lua |
| --- | --- |
| `Logger.create("Label", options?)` | `Logger.create("Label", { adapter?, level? })` |
| `logger.info("fmt %s", x)` | `log.info("fmt %s", x)` |
| `logger.loki().info(...)` | `log.loki().info(...)` |
| `logger.loki(false).warn(...)` | `log.loki(false).warn(...)` |
| `logger.console(false).info(...)` | `log.console(false).info(...)` |
| `logger.child("Sub")` | `log.child("Sub")` |

Levels: `error`, `warn`, `info`, `verbose`, `debug`. Format placeholders: `%s`, `%d`, `%i`, `%f`, `%o`, `%O`, `%j`, `%I`, `%t`, `%%`.

## Basic usage

```lua
local Logger = require("typr.logger")

local log = Logger.create("MyModule")
log.info("started job %d", job_id)
log.error("failed: %O", err)
```

## OpenResty

```lua
local Logger = require("typr.logger")
local OpenRestyAdapter = require("typr.adapters.OpenRestyAdapter")

local adapter = OpenRestyAdapter.new({
    otel_endpoint = "http://collector:4318",
    otel_export_logs = true,
    extra_headers = { ["x-even-product"] = "PXG" },
    service_name = "proxygon"
})

local log = Logger.create("RequestHandler", { adapter = adapter })
log.loki().info("remote only")
```

## Adapter interface

Optional methods: `get_timestamp`, `get_phase`, `get_request_context`, `enqueue_log`, `flush_logs`, `write_line`.

## OtlpPayload

```lua
local OtlpPayload = require("typr.logger.OtlpPayload")

local payload = OtlpPayload.build(records, { service_name = "proxygon" })
local json = OtlpPayload.encode(payload)
```
