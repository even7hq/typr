package.path = package.path .. ";./src/lua/?.lua"

local Sprintf = require("typr.logger.Sprintf")

describe("Sprintf", function()
    it("formats strings and integers", function()
        local result = Sprintf.format("hello %s %d", "world", 42)

        assert.are.equal("hello world 42", result)
    end)

    it("escapes percent signs", function()
        local result = Sprintf.format("100%% done")

        assert.are.equal("100% done", result)
    end)

    it("formats shallow and deep objects", function()
        local shallow = Sprintf.format("%o", { a = 1 })
        local deep = Sprintf.format("%O", { a = { b = 2 } })

        assert.matches("a=1", shallow)
        assert.matches("b=2", deep)
    end)

    it("destructures with %t", function()
        local result = Sprintf.format("ctx %t", { id = 9, name = "x" })

        assert.matches("id=9", result)
        assert.matches("name=x", result)
    end)
end)
