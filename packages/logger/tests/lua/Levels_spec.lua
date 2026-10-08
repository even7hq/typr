package.path = package.path .. ";./src/lua/?.lua"

local Levels = require("typr.logger.Levels")

describe("Levels", function()
    it("assigns priority to level names", function()
        assert.are.equal(6, Levels.PRIORITY.error)
        assert.are.equal(4, Levels.PRIORITY.info)
        assert.are.equal(2, Levels.PRIORITY.verbose)
    end)

    it("filters below minimum level", function()
        assert.is_false(Levels.should_log("debug", "info"))
        assert.is_true(Levels.should_log("warn", "info"))
    end)

    it("maps level names to OTEL severity", function()
        assert.are.equal(17, Levels.otel_severity("error"))
        assert.are.equal(9, Levels.otel_severity("info"))
    end)
end)
