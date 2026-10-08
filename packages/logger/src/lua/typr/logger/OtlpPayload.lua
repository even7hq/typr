local OtlpPayload = {}

local function str_attr(key, value)
    if value == nil then
        return nil
    end

    return {
        key = key,
        value = {
            stringValue = tostring(value)
        }
    }
end

--- Builds OTLP /v1/logs payload table (encode with OtlpPayload.encode).
--- @param records table[] Log records to export.
--- @param options table|nil Resource and scope metadata.
--- @returns table OTLP payload table.
function OtlpPayload.build(records, options)
    options = options or {}

    local service_name = options.service_name or "typr-logger"
    local service_version = options.service_version or "1.0.0"
    local scope_name = options.scope_name or "typr.logger"

    local log_records = {}

    for _, record in ipairs(records) do
        local attributes = {}

        for key, value in pairs(record.attributes or {}) do
            local attr = str_attr(key, value)

            if attr then
                attributes[#attributes + 1] = attr
            end
        end

        log_records[#log_records + 1] = {
            timeUnixNano = tostring((record.timestamp or os.time()) * 1000000000),
            severityNumber = record.severity or 9,
            severityText = record.level or "info",
            body = {
                stringValue = record.message or ""
            },
            attributes = attributes
        }
    end

    return {
        resourceLogs = {
            {
                resource = {
                    attributes = {
                        {
                            key = "service.name",
                            value = {
                                stringValue = service_name
                            }
                        },
                        {
                            key = "service.version",
                            value = {
                                stringValue = service_version
                            }
                        }
                    }
                },
                scopeLogs = {
                    {
                        scope = {
                            name = scope_name
                        },
                        logRecords = log_records
                    }
                }
            }
        }
    }
end

--- Encodes a payload table as JSON (requires cjson in the host runtime).
--- @param payload table
--- @returns string JSON-encoded OTLP payload.
function OtlpPayload.encode(payload)
    local cjson = require("cjson")

    return cjson.encode(payload)
end

return OtlpPayload
