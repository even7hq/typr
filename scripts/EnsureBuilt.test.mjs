import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveTscBin, ensureBuilt } = require("./ensure-built.cjs");

test("resolveTscBin finds the hoisted compiler", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "typr-ensure-built-"));
    const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");

    fs.mkdirSync(path.dirname(tsc), { recursive: true });
    fs.writeFileSync(tsc, "");

    assert.equal(resolveTscBin(root), tsc);

    fs.rmSync(root, { recursive: true, force: true });
});

test("resolveTscBin returns null when typescript is missing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "typr-ensure-built-"));

    assert.equal(resolveTscBin(root), null);

    fs.rmSync(root, { recursive: true, force: true });
});

test("ensureBuilt skips compile when dist already exists", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "typr-ensure-built-"));
    const distIndex = path.join(root, "packages", "js", "dist", "index.js");

    fs.mkdirSync(path.dirname(distIndex), { recursive: true });
    fs.writeFileSync(distIndex, "");

    let calls = 0;

    ensureBuilt(root, () => {
        calls += 1;
    });

    assert.equal(calls, 0);

    fs.rmSync(root, { recursive: true, force: true });
});

test("ensureBuilt throws when dist is missing and typescript is not installed", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "typr-ensure-built-"));

    assert.throws(
        () => ensureBuilt(root, () => {}),
        /TypeScript não encontrado/
    );

    fs.rmSync(root, { recursive: true, force: true });
});

test("ensureBuilt compiles with tsc instead of yarn workspace", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "typr-ensure-built-"));
    const tsc = path.join(root, "packages", "js", "node_modules", "typescript", "bin", "tsc");

    fs.mkdirSync(path.dirname(tsc), { recursive: true });
    fs.writeFileSync(tsc, "");

    /** @type {{ file?: string, args?: string[] }} */
    const seen = {};

    ensureBuilt(root, (file, args) => {
        seen.file = file;
        seen.args = args;
    });

    assert.equal(seen.file, process.execPath);
    assert.deepEqual(seen.args, [tsc, "-p", "packages/js/tsconfig.build.json"]);

    fs.rmSync(root, { recursive: true, force: true });
});
