local Sprintf = {}

local function inspect_shallow(value)
    if type(value) ~= "table" then
        return tostring(value)
    end

    local parts = {}

    for key, entry in pairs(value) do
        parts[#parts + 1] = tostring(key) .. "=" .. tostring(entry)
    end

    return "{" .. table.concat(parts, ", ") .. "}"
end

local function inspect_deep(value, depth, seen)
    if depth <= 0 then
        return "[Object]"
    end

    if type(value) ~= "table" then
        return tostring(value)
    end

    seen = seen or {}
    if seen[value] then
        return "[circular]"
    end

    seen[value] = true
    local parts = {}

    for key, entry in pairs(value) do
        parts[#parts + 1] = tostring(key) .. "=" .. inspect_deep(entry, depth - 1, seen)
    end

    return "{" .. table.concat(parts, ", ") .. "}"
end

local function destructure(value)
    if type(value) ~= "table" or value == nil then
        return tostring(value)
    end

    local parts = {}

    for key, entry in pairs(value) do
        parts[#parts + 1] = tostring(key) .. "=" .. tostring(entry)
    end

    return "(" .. table.concat(parts, ", ") .. ")"
end

local function encode_json(value)
    if type(value) ~= "table" then
        return tostring(value)
    end

    local ok, encoded = pcall(function()
        return require("cjson").encode(value)
    end)

    if ok then
        return encoded
    end

    return inspect_shallow(value)
end

--- Formats a log message with Typr placeholders (%s %d %i %f %o %O %j %I %t).
--- @param fmt string Format string.
--- @param ... any Values interpolated into the format string.
--- @returns string Formatted message.
function Sprintf.format(fmt, ...)
    local args = { ... }
    local arg_index = 1

    local function next_arg()
        if arg_index > #args then
            return nil
        end

        local value = args[arg_index]
        arg_index = arg_index + 1

        return value
    end

    local result = fmt

    result = result:gsub("%%I(%d*)", function(depth_text)
        local arg = next_arg()

        if arg == nil then
            return "%I" .. depth_text
        end

        local depth = tonumber(depth_text)

        if depth == nil or depth < 0 then
            depth = 6
        end

        return inspect_deep(arg, depth)
    end)

    result = result:gsub("%%(.)", function(kind)
        if kind == "%" then
            return "%"
        end

        local arg = next_arg()

        if arg == nil then
            return "%" .. kind
        end

        if kind == "s" then
            return tostring(arg)
        end

        if kind == "d" or kind == "i" then
            return tostring(tonumber(arg) or 0)
        end

        if kind == "f" then
            return tostring(tonumber(arg) or 0)
        end

        if kind == "j" then
            return encode_json(arg)
        end

        if kind == "o" then
            return inspect_shallow(arg)
        end

        if kind == "O" then
            return inspect_deep(arg, math.huge)
        end

        if kind == "t" then
            return destructure(arg)
        end

        return "%" .. kind
    end)

    return result
end

return Sprintf
