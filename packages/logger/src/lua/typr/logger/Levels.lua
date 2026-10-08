--- Log level names and numeric priority (higher = more severe). Same set as the TypeScript logger.
local Levels = {}

--- Priority used to compare minimum level vs emit level.
Levels.PRIORITY = {
    silly = 0,
    debug = 1,
    verbose = 2,
    http = 3,
    info = 4,
    warn = 5,
    error = 6,
    silent = 7
}

Levels.OTEL_SEVERITY = {
    silly = 1,
    debug = 5,
    verbose = 6,
    http = 7,
    info = 9,
    warn = 13,
    error = 17
}

--- Returns whether a level should emit given the configured minimum level.
--- @param level string
--- @param minimum string
--- @returns boolean True when the level is at or above the minimum.
function Levels.should_log(level, minimum)
    local level_value = Levels.PRIORITY[level]
    local minimum_value = Levels.PRIORITY[minimum]

    if level_value == nil or minimum_value == nil then
        return true
    end

    return level_value >= minimum_value
end

--- Returns OTEL severity for a level name.
--- @param level string
--- @returns number OTEL severity number for the level.
function Levels.otel_severity(level)
    return Levels.OTEL_SEVERITY[level] or 9
end

return Levels
