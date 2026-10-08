const typescript = require("@lemon/linting/typescript.config");
const { localPlugin } = require("@lemon/linting/common.config");

const typescriptWithoutProcessor = typescript.filter(
    (entry) => entry.processor !== "local/filter-indent-return-type-close"
);

/** @type {import("eslint").Linter.Config[]} */
module.exports = [
    {
        plugins: {
            local: localPlugin
        }
    },
    ...typescriptWithoutProcessor,
    {
        ignores: ["dist/**", "node_modules/**"]
    }
];
