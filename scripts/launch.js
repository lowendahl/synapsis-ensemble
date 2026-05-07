// scripts/launch.js
// Electron + electron-builder launcher that strips ELECTRON_RUN_AS_NODE from the
// environment before spawning. That env var (commonly set by tools that want
// Electron's bundled Node for sidecar work) breaks the main-process bootstrap.

const { spawn } = require("child_process");
const path = require("path");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
const buildIdx = args.indexOf("--build");

let cmd, cmdArgs;
if (buildIdx >= 0) {
  const target = args[buildIdx + 1] || "nsis";
  cmd = path.join(__dirname, "..", "node_modules", ".bin", process.platform === "win32" ? "electron-builder.cmd" : "electron-builder");
  cmdArgs = ["--win", target];
} else {
  cmd = path.join(__dirname, "..", "node_modules", "electron", "dist", process.platform === "win32" ? "electron.exe" : "electron");
  cmdArgs = [".", ...args];
}

const child = spawn(cmd, cmdArgs, { env, stdio: "inherit", cwd: path.join(__dirname, "..") });
child.on("exit", (code) => process.exit(code ?? 0));
