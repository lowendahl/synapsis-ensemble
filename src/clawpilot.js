// src/clawpilot.js — spawn the copilot.exe inside the user's Clawpilot install
// and stream its JSONL events back over IPC. Pattern lifted from CSU-Compass'
// clawpilotBridge.ts. Each voice maintains its own resume sessionId so a
// follow-up turn keeps the persona context alive.
const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

function resolveCopilotExe() {
  const root = process.env.LOCALAPPDATA;
  if (!root) return null;
  const candidates = [
    path.join(root, "Programs", "Clawpilot", "resources", "app.asar.unpacked", "node_modules", "@github", "copilot-win32-x64", "copilot.exe"),
    path.join(root, "Programs", "clawpilot", "resources", "app.asar.unpacked", "node_modules", "@github", "copilot-win32-x64", "copilot.exe"),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

const active = new Map(); // runId → { child, buffer, cancelled, startedAt, voice }

function emit(target, ev) {
  if (target && !target.isDestroyed()) target.send("clawpilot:event", ev);
}

function buildArgs(opts) {
  const fullPrompt = opts.systemPrompt && !opts.resumeSessionId
    ? `<system_instructions>\n${opts.systemPrompt}\n</system_instructions>\n\n${opts.prompt}`
    : opts.prompt;
  const args = ["-p", fullPrompt, "--output-format", "stream-json"];
  if (opts.allowList && opts.allowList.length) {
    for (const t of opts.allowList) args.push("--allow-tool", t);
  } else {
    args.push("--allow-all");
  }
  if (opts.model) args.push("--model", opts.model);
  if (opts.resumeSessionId) args.push(`--resume=${opts.resumeSessionId}`);
  if (opts.mcpConfigPath) args.push("--additional-mcp-config", `@${opts.mcpConfigPath}`);
  if (opts.cwd) args.push("--add-dir", opts.cwd);
  if (Array.isArray(opts.extraDirs)) {
    for (const d of opts.extraDirs) {
      if (d && d !== opts.cwd) args.push("--add-dir", d);
    }
  }
  return args;
}

function startRun(target, opts) {
  const exe = resolveCopilotExe();
  if (!exe) return { ok: false, error: "copilot.exe not found inside Clawpilot install." };
  const runId = randomUUID();
  let child;
  try {
    // CRITICAL: strip ELECTRON_RUN_AS_NODE from the env we pass through —
    // otherwise the spawned copilot.exe (an Electron-packaged binary) will
    // bootstrap as Node instead of running its CLI.
    const env = { ...process.env, COPILOT_NO_TELEMETRY: "1" };
    delete env.ELECTRON_RUN_AS_NODE;
    child = spawn(exe, buildArgs(opts), {
      windowsHide: true,
      env,
      cwd: opts.cwd || process.cwd(),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const run = { runId, child, buffer: "", cancelled: false, startedAt: Date.now(), voice: opts.voice || null };
  active.set(runId, run);

  child.stdout.setEncoding("utf-8");
  child.stdout.on("data", (chunk) => {
    run.buffer += chunk;
    let nl;
    while ((nl = run.buffer.indexOf("\n")) >= 0) {
      const line = run.buffer.slice(0, nl).replace(/\r$/, "");
      run.buffer = run.buffer.slice(nl + 1);
      if (!line.trim()) continue;
      try {
        emit(target, { runId, voice: run.voice, kind: "event", payload: JSON.parse(line) });
      } catch {
        emit(target, { runId, voice: run.voice, kind: "event", payload: { type: "bridge.stderr_text", data: { line } } });
      }
    }
  });

  child.stderr.setEncoding("utf-8");
  child.stderr.on("data", (chunk) => {
    for (const raw of chunk.split(/\r?\n/)) {
      if (!raw.trim()) continue;
      emit(target, { runId, voice: run.voice, kind: "event", payload: { type: "bridge.stderr_text", data: { line: raw } } });
    }
  });

  child.on("error", (err) => {
    emit(target, { runId, voice: run.voice, kind: "error", payload: { message: err.message ?? String(err) } });
  });

  child.on("close", (code, signal) => {
    if (run.buffer.trim()) {
      try { emit(target, { runId, voice: run.voice, kind: "event", payload: JSON.parse(run.buffer) }); }
      catch { /* drop trailing garbage */ }
      run.buffer = "";
    }
    emit(target, {
      runId, voice: run.voice, kind: "closed",
      payload: { exitCode: code, signal, cancelled: run.cancelled, durationMs: Date.now() - run.startedAt },
    });
    active.delete(runId);
  });

  return { ok: true, runId };
}

function cancelRun(runId) {
  const run = active.get(runId);
  if (!run) return { ok: false };
  run.cancelled = true;
  try { run.child.kill(); } catch { /* ignore */ }
  return { ok: true };
}

function status() {
  return {
    installed: resolveCopilotExe() !== null,
    exePath: resolveCopilotExe(),
    activeRuns: Array.from(active.values()).map((r) => ({ runId: r.runId, voice: r.voice, startedAt: r.startedAt })),
  };
}

module.exports = { startRun, cancelRun, status, resolveCopilotExe };
