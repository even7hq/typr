package.path = package.path .. ";./src/lua/?.lua"

local OtlpPayload = require("typr.logger.OtlpPayload")

describe("OtlpPayload", function()
    it("builds resourceLogs structure", function()
        local payload = OtlpPayload.build({
            {
                level = "info",
                message = "hello",
                timestamp = 1,
                attributes = {
                    tenant = "demo"
                }
            }
        }, {
            service_name = "proxygon"
        })

        assert.is_table(payload.resourceLogs)
        assert.are.equal("proxygon", payload.resourceLogs[1].resource.attributes[1].value.stringValue)
    end)
end)
