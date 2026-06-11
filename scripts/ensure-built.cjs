const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const distIndex = path.join(root, "packages", "js", "dist", "index.js");

if (!fs.existsSync(distIndex)) {
    execSync("yarn build", {
        cwd: root,
        stdio: "inherit",
        env: process.env
    });
}
