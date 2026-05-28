const typescript = require("@lemon/linting/typescript.config");

/** @type {import("eslint").Linter.Config[]} */
module.exports = [
    ...typescript,
    {
        ignores: ["dist/**", "node_modules/**"]
    }
];
