local OtlpPayload = require("typr.logger.OtlpPayload")

local OpenRestyAdapter = {}
OpenRestyAdapter.__index = OpenRestyAdapter

--- Creates an OpenResty-backed logger adapter.
--- @param options table Adapter configuration.
--- @returns table OpenResty adapter instance.
function OpenRestyAdapter.new(options)
    options = options or {}

    local self = {
        otel_endpoint = options.otel_endpoint,
        otel_export_logs = options.otel_export_logs == true,
        extra_headers = options.extra_headers or {},
        service_name = options.service_name or "proxygon",
        service_version = options.service_version,
        pending_records = {}
    }

    function self.get_timestamp()
        if ngx and ngx.now then
            return ngx.now()
        end

        return os.time()
    end

    function self.get_phase()
        if ngx and ngx.get_phase then
            return ngx.get_phase()
        end

        return nil
    end

    function self.get_request_context()
        if ngx and ngx.ctx and ngx.ctx.request then
            return ngx.ctx.request
        end

        return nil
    end

    function self.enqueue_log(record)
        if not self.otel_export_logs then
            return
        end

        record.severity = require("typr.logger.Levels").otel_severity(record.level)
        self.pending_records[#self.pending_records + 1] = record
    end

    function self.flush_logs()
        if not self.otel_export_logs or #self.pending_records == 0 then
            return
        end

        local payload = OtlpPayload.build(self.pending_records, {
            service_name = self.service_name,
            service_version = self.service_version
        })

        local body = OtlpPayload.encode(payload)
        local http = require("resty.http")
        local client = http.new()

        local headers = {
            ["Content-Type"] = "application/json"
        }

        for key, value in pairs(self.extra_headers) do
            headers[key] = value
        end

        client:request_uri(self.otel_endpoint .. "/v1/logs", {
            method = "POST",
            body = body,
            headers = headers
        })

        self.pending_records = {}
    end

    function self.write_line(line)
        if ngx and ngx.log then
            ngx.log(ngx.INFO, line)
            return
        end

        io.write(line .. "\n")
    end

    return self
end

return OpenRestyAdapter
