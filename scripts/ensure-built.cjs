const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

/**
 * Locates the TypeScript compiler installed for this repo.
 *
 * @param {string} root Typr repository root.
 * @returns {string | null} Path to `tsc`, or null when it is not installed.
 */
function resolveTscBin(root) {
    const candidates = [
        path.join(root, "node_modules", "typescript", "bin", "tsc"),
        path.join(root, "packages", "js", "node_modules", "typescript", "bin", "tsc")
    ];

    return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

/**
 * Compiles packages/js when dist is missing.
 *
 * Calls tsc directly. `yarn workspace` from this prepare script cannot see the
 * workspace while yarn itself is still installing.
 *
 * @param {string} root Typr repository root.
 * @param {(file: string, args: string[], options: object) => void} [runCommand] Command runner. Tests pass a stub.
 * @returns {void}
 */
function ensureBuilt(root, runCommand = execFileSync) {
    const distIndex = path.join(root, "packages", "js", "dist", "index.js");

    // A fresh checkout has no dist, so prepare must compile before consumers import it
    if (fs.existsSync(distIndex)) {
        return;
    }

    const tscBin = resolveTscBin(root);

    if (!tscBin) {
        throw new Error("TypeScript não encontrado para compilar packages/js");
    }

    runCommand(process.execPath, [tscBin, "-p", "packages/js/tsconfig.build.json"], {
        cwd: root,
        stdio: "inherit",
        env: process.env
    });
}

if (require.main === module) {
    ensureBuilt(path.join(__dirname, ".."));
}

module.exports = {
    resolveTscBin,
    ensureBuilt
};
