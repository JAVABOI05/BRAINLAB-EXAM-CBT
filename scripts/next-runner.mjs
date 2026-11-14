import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const command = process.argv[2] || "build";
const passthroughArgs = process.argv.slice(3);

let isNext16OrHigher = false;

try {
  const pkgPath = path.resolve(process.cwd(), "node_modules", "next", "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const major = parseInt(String(pkg.version || "15").split(".")[0], 10);
    if (major >= 16) {
      isNext16OrHigher = true;
    }
  }
} catch {
  // If reading package.json fails, default to Next 15 conventions
}

const args = [command];

if (command === "build") {
  if (isNext16OrHigher) {
    // Next 16+: Turbopack is default for build; pass --webpack for Windows WASM compatibility
    args.push("--webpack");
  } else {
    // Next 15: Webpack is already default; pass --no-lint to skip linting during production build
    args.push("--no-lint");
  }
} else if (command === "dev") {
  if (isNext16OrHigher) {
    // Next 16+: pass --webpack for Windows WASM compatibility
    args.push("--webpack");
  }
  // Next 15: dev uses Webpack by default, no flags needed
}

args.push(...passthroughArgs);

const res = spawnSync("npx", ["next", ...args], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(res.status ?? 0);
