local SecretRedaction = {}

local enabled = true

local patterns = {
    "Bearer%s+[A-Za-z0-9._~%+/=-]+",
    "gh[spou]_[A-Za-z0-9_]+",
    "xox[bpas]-[A-Za-z0-9%-]+",
    "AKIA[A-Z0-9]+",
    "eyJ[A-Za-z0-9_%-]+%.[A-Za-z0-9_%-]+%.[A-Za-z0-9_%-]+"
}

--- Enables or disables redaction.
--- @param value boolean
function SecretRedaction.set_enabled(value)
    enabled = value == true
end

--- Redacts sensitive substrings in a line.
--- @param text string
--- @returns string Redacted log line.
function SecretRedaction.redact_string(text)
    if not enabled then
        return text
    end

    local result = text

    for _, pattern in ipairs(patterns) do
        result = result:gsub(pattern, "***REDACTED***")
    end

    return result
end

return SecretRedaction
