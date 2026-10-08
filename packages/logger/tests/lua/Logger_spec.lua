package.path = package.path .. ";./src/lua/?.lua"

local Logger = require("typr.logger")

describe("Logger", function()
    it("creates a logger with dot-call level methods", function()
        local lines = {}
        local adapter = {
            otel_export_logs = false,
            write_line = function(line)
                lines[#lines + 1] = line
            end,
            enqueue_log = function()
            end
        }

        local log = Logger.create("Test", { adapter = adapter })

        log.info("hello %s", "world")

        assert.are.equal(1, #lines)
        assert.matches("hello world", lines[1])
    end)

    it("child logger uses parent:child label", function()
        local lines = {}
        local adapter = {
            otel_export_logs = false,
            write_line = function(line)
                lines[#lines + 1] = line
            end,
            enqueue_log = function()
            end
        }

        local parent = Logger.create("Parent", { adapter = adapter })
        local child = parent.child("Child")

        child.warn("nested")

        assert.matches("%[Parent:Child%]", lines[1])
    end)

    it("loki(false) writes local only", function()
        local lines = {}
        local enqueued = 0
        local adapter = {
            otel_export_logs = true,
            write_line = function(line)
                lines[#lines + 1] = line
            end,
            enqueue_log = function()
                enqueued = enqueued + 1
            end
        }

        local log = Logger.create("Route", { adapter = adapter })

        log.loki(false).info("local line")

        assert.are.equal(1, #lines)
        assert.are.equal(0, enqueued)
    end)

    it("loki(true) enqueues remote when otel is enabled", function()
        local lines = {}
        local enqueued = 0
        local adapter = {
            otel_export_logs = true,
            write_line = function(line)
                lines[#lines + 1] = line
            end,
            enqueue_log = function()
                enqueued = enqueued + 1
            end
        }

        local log = Logger.create("Route", { adapter = adapter })

        log.loki().info("remote line")

        assert.are.equal(0, #lines)
        assert.are.equal(1, enqueued)
    end)

    it("console(false) matches remote-only routing", function()
        local lines = {}
        local enqueued = 0
        local adapter = {
            otel_export_logs = true,
            write_line = function(line)
                lines[#lines + 1] = line
            end,
            enqueue_log = function()
                enqueued = enqueued + 1
            end
        }

        local log = Logger.create("Route", { adapter = adapter })

        log.console(false).info("remote via console sidecar")

        assert.are.equal(0, #lines)
        assert.are.equal(1, enqueued)
    end)
end)
