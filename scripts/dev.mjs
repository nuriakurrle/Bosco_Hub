// scripts/dev.mjs — robust launcher for `next dev`.
// Some shells export NODE_ENV=production globally. Under NODE_ENV=production,
// `next dev` builds the wrong webpack config and fails to parse global CSS
// (Module parse failed at `:root` in app/globals.css). We force development
// here so `npm run dev` always works, regardless of the ambient NODE_ENV.
// Zero dependencies, cross-platform (Windows/macOS/Linux).
import { spawn } from "node:child_process";

process.env.NODE_ENV = "development";

const child = spawn("next", ["dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true, // resolve the `next` bin via node_modules/.bin (and next.cmd on Windows)
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
