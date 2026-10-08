--- Typr logger for Lua (OpenResty and standalone). API mirrors the TypeScript package.
local Levels = require("typr.logger.Levels")
local LoggerSidecar = require("typr.logger.LoggerSidecar")
local Sprintf = require("typr.logger.Sprintf")
local SecretRedaction = require("typr.logger.SecretRedaction")

local Logger = {}

local default_adapter = {
    otel_export_logs = false,
    get_timestamp = function()
        return os.time()
    end,
    get_phase = function()
        return nil
    end,
    get_request_context = function()
        return nil
    end,
    enqueue_log = function(_record)
    end,
    flush_logs = function()
    end,
    write_line = function(line)
        io.write(line .. "\n")
    end
}

local function resolve_adapter(adapter)
    if adapter == nil then
        return default_adapter
    end

    local resolved = {}

    for key, value in pairs(default_adapter) do
        if adapter[key] ~= nil then
            resolved[key] = adapter[key]
        else
            resolved[key] = value
        end
    end

    return resolved
end

--- Returns whether the pending emit should hit local sinks.
--- @param route boolean|nil Routing flag for the pending emit.
--- @param adapter table Logger adapter.
--- @returns boolean True when the local sink should receive the line.
local function should_write_local(route, adapter)
    if route == true then
        if adapter.otel_export_logs then
            return false
        end

        return true
    end

    if route == false then
        return true
    end

    return true
end

--- Returns whether the pending emit should be enqueued for remote export.
--- @param route boolean|nil Routing flag for the pending emit.
--- @param adapter table Logger adapter.
--- @returns boolean True when the remote sink should receive the record.
local function should_write_remote(route, adapter)
    if route == false then
        return false
    end

    if route == true then
        return adapter.otel_export_logs
    end

    return adapter.otel_export_logs
end

local function build_instance(name, adapter, options)
    options = options or {}

    local state = {
        name = name,
        label = name,
        adapter = adapter,
        level = options.level or "info",
        pending_route = nil
    }

    local function format_message(fmt, ...)
        local message = Sprintf.format(fmt, ...)
        message = SecretRedaction.redact_string(message)

        return message
    end

    local function emit(level, fmt, ...)
        if not Levels.should_log(level, state.level) then
            return
        end

        local message = format_message(fmt, ...)
        local route = state.pending_route
        state.pending_route = nil

        local remote_only = route == true
        local loki_fallback = remote_only and not adapter.otel_export_logs

        if loki_fallback and not message:find("%[loki%-fallback%]", 1, true) then
            message = "[loki-fallback] " .. message
        end

        local record = {
            level = level,
            message = message,
            timestamp = adapter.get_timestamp(),
            attributes = {
                ["log.source"] = state.label,
                phase = adapter.get_phase()
            }
        }

        local context = adapter.get_request_context()

        if context ~= nil then
            for key, value in pairs(context) do
                record.attributes[key] = value
            end
        end

        record.severity = Levels.otel_severity(level)

        if should_write_remote(route, adapter) then
            adapter.enqueue_log(record)
        end

        if should_write_local(route, adapter) then
            adapter.write_line(string.format("[%s] [%s] %s", state.label, level, message))
        end
    end

    local instance = {}

    function instance._set_pending_route(route)
        state.pending_route = route
    end

    function instance.error(fmt, ...)
        emit("error", fmt, ...)
    end

    function instance.warn(fmt, ...)
        emit("warn", fmt, ...)
    end

    function instance.info(fmt, ...)
        emit("info", fmt, ...)
    end

    function instance.verbose(fmt, ...)
        emit("verbose", fmt, ...)
    end

    function instance.debug(fmt, ...)
        emit("debug", fmt, ...)
    end

    function instance.loki(enabled)
        enabled = enabled == nil or enabled == true

        return LoggerSidecar.build(instance, enabled)
    end

    function instance.console(show)
        show = show == nil or show == true

        if show then
            return LoggerSidecar.build(instance, nil)
        end

        return LoggerSidecar.build(instance, true)
    end

    function instance.child(child_label)
        local child_name = state.label .. ":" .. child_label

        return build_instance(child_name, adapter, {
            level = state.level
        })
    end

    instance.label = state.label

    return instance
end

--- Creates a named logger.
--- @param label string Logger label (log.source).
--- @param options table|nil Optional adapter and minimum level.
--- @returns table Logger instance.
function Logger.create(label, options)
    options = options or {}
    local adapter = resolve_adapter(options.adapter)

    return build_instance(label, adapter, options)
end

Logger.Levels = Levels
Logger.Sprintf = Sprintf
Logger.SecretRedaction = SecretRedaction

return Logger
