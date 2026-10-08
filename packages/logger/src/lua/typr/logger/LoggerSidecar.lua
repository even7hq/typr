--- Routes only the next log line (loki / console sidecar).
local LoggerSidecar = {}

local LEVEL_METHODS = {
    "error",
    "warn",
    "info",
    "verbose",
    "debug"
}

--- Builds a sidecar that applies routing only to the next log line.
--- @param instance table Logger instance with level methods.
--- @param loki_route boolean|nil Routing for the next emit (remote only, local only, or all sinks).
--- @returns table Sidecar logger for the next log line.
function LoggerSidecar.build(instance, loki_route)
    local sidecar = {}

    for _, level in ipairs(LEVEL_METHODS) do
        sidecar[level] = function(fmt, ...)
            if loki_route ~= nil then
                instance._set_pending_route(loki_route)
            end

            instance[level](fmt, ...)
        end
    end

    function sidecar.loki(enabled)
        enabled = enabled == nil or enabled == true

        return LoggerSidecar.build(instance, enabled)
    end

    function sidecar.console(show)
        show = show == nil or show == true

        if show then
            return LoggerSidecar.build(instance, nil)
        end

        return LoggerSidecar.build(instance, true)
    end

    return sidecar
end

return LoggerSidecar
