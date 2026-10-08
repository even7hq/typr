package.path = package.path .. ";./src/lua/?.lua"

local SecretRedaction = require("typr.logger.SecretRedaction")

describe("SecretRedaction", function()
    it("redacts bearer tokens", function()
        local output = SecretRedaction.redact_string("Bearer abcdefghijklmnopqrstuvwxyz")

        assert.is_true(output:find("***REDACTED***") ~= nil)
    end)

    it("can be disabled", function()
        SecretRedaction.set_enabled(false)
        local input = "Bearer abcdefghijklmnopqrstuvwxyz"
        local output = SecretRedaction.redact_string(input)

        assert.are.equal(input, output)
        SecretRedaction.set_enabled(true)
    end)
end)
