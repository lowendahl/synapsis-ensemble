const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const yaml = require("js-yaml");
const clawpilot = require("./clawpilot");
const { getVoice, listVoices } = require("./voices");

let mainWindow = null;
let currentWorkspace = null;

// ── Recent workspaces (persisted to userData) ──────────────────────────────
const recentsPath = () => path.join(app.getPath("userData"), "recent-workspaces.json");

async function loadRecents() {
  try {
    const txt = await fs.readFile(recentsPath(), "utf8");
    const arr = JSON.parse(txt);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

async function saveRecents(list) {
  try {
    await fs.mkdir(path.dirname(recentsPath()), { recursive: true });
    await fs.writeFile(recentsPath(), JSON.stringify(list, null, 2), "utf8");
  } catch (e) { /* best effort */ }
}

async function pushRecent(folder, slug) {
  const list = await loadRecents();
  const filtered = list.filter((r) => r.path !== folder);
  filtered.unshift({ path: folder, slug, lastOpenedAt: Date.now() });
  await saveRecents(filtered.slice(0, 12));
}

function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open Workspace Folder…",
          accelerator: "CmdOrCtrl+O",
          click: () => mainWindow.webContents.send("menu:open-workspace"),
        },
        {
          label: "Recent Workspaces",
          submenu: [{ label: "(coming in v0.2)", enabled: false }],
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Theme",
          accelerator: "CmdOrCtrl+Shift+T",
          click: () => mainWindow.webContents.send("menu:toggle-theme"),
        },
        { type: "separator" },
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "resetZoom" },
      ],
    },
    {
      label: "Voice",
      submenu: [
        { label: "brand-voice", accelerator: "CmdOrCtrl+1", click: () => mainWindow.webContents.send("menu:tab", "brand") },
        { label: "ux-critic", accelerator: "CmdOrCtrl+2", click: () => mainWindow.webContents.send("menu:tab", "ux") },
        { label: "data-scientist", accelerator: "CmdOrCtrl+3", click: () => mainWindow.webContents.send("menu:tab", "ds") },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open repo on GitHub",
          click: () => shell.openExternal("https://github.com/lowendahl/synapsis-ensemble"),
        },
        {
          label: "About Ensemble",
          click: () =>
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Ensemble",
              message: "Ensemble v0.2",
              detail:
                "Many voices. Many instruments. One workspace.\n\nSymbiont · Ensemble — multi-role agent workspace.\nV0.2: Wired to Clawpilot's bundled copilot.exe via JSONL streaming. Each voice runs its own session with persona-as-system-prompt.",
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: "Ensemble",
    backgroundColor: "#3d3b3a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

const TEXT_EXTS = new Set([".md", ".markdown", ".txt", ".csv", ".json", ".yaml", ".yml"]);
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

function classifyFile(name) {
  const ext = path.extname(name).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return "image";
  if (TEXT_EXTS.has(ext)) return "text";
  return "other";
}

ipcMain.handle("workspace:pick", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open Workspace Folder",
    properties: ["openDirectory"],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return await loadWorkspace(result.filePaths[0]);
});

ipcMain.handle("dialog:pick-folder", async (_e, opts = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: opts.title || "Pick folder",
    properties: ["openDirectory", "createDirectory"],
    defaultPath: opts.defaultPath,
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("workspace:create", async (_e, opts) => {
  let name, parent, voices, tier;
  if (opts && typeof opts === "object" && opts.name && opts.parentFolder) {
    name = String(opts.name).trim();
    parent = String(opts.parentFolder);
    voices = Array.isArray(opts.voices) && opts.voices.length ? opts.voices : ["brand", "ux", "ds"];
    tier = (opts.tier === 0 || opts.tier === 2) ? opts.tier : 1;
  } else {
    // Legacy fallback (kept for menu -> open shortcut)
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Create New Workspace — pick parent folder, then name it",
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths.length) return null;
    parent = result.filePaths[0];
    name = await promptForName();
    if (!name) return null;
    voices = ["brand", "ux", "ds"];
    tier = 1;
  }
  if (!name || !parent) return null;
  const safeName = name.replace(/[\\/:*?"<>|]/g, "-").trim();
  if (!safeName) return { error: "Invalid workspace name" };
  const folder = path.join(parent, safeName);
  try {
    await fs.mkdir(folder, { recursive: false });
  } catch (e) {
    if (e.code === "EEXIST") {
      const ok = await dialog.showMessageBox(mainWindow, {
        type: "question", buttons: ["Open existing", "Cancel"], defaultId: 0, cancelId: 1,
        message: `"${safeName}" already exists in that folder. Open it instead?`,
      });
      if (ok.response !== 0) return null;
    } else { throw e; }
  }
  const slug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const today = new Date().toISOString().slice(0, 10);
  const ctxDir = path.join(folder, "clawpilot");
  await fs.mkdir(ctxDir, { recursive: true });

  // workspace.yaml
  const voicesYaml = voices.map((v) => `  - ${v}`).join("\n");
  const seedYaml = `# Ensemble workspace manifest
name: ${safeName}
slug: ${slug}
mission: ""

# Context-inference tier (0=light, 1=default, 2=full domain). See clawpilot/INDEX.yaml.
tier: ${tier}

# Sources of truth — doctrine repos and context-engineering folders voices anchor on.
# Paths are read relative to the workspace root unless absolute.
base_truths: []
  # - label: Doctrine
  #   path: doctrine/
  # - label: Context engineering
  #   path: C:/repos/CSU-Context-Engineering

voices:
${voicesYaml}
`;

  // README
  const readme = `# ${safeName}

New Ensemble workspace.

## Layout

- \`workspace.yaml\` — manifest (mission, base truths, voices)
- \`clawpilot/\` — context-inference model (CIM) the voices auto-load
- _your project files here_

## Loading

When this workspace is opened, every voice receives \`clawpilot/context.md\` and \`clawpilot/conventions.md\` as system context. Long-term preferences belong in \`clawpilot/memory.md\`.
`;

  // ── clawpilot/ Context Inference Model ─────────────────────────────────────
  const contextMd = `<!-- inference-tier: ${tier} -->
# ${safeName} — Context

## Mission
_(One-line statement of what this workspace exists to do. Edit me.)_

## Canonical paths
| What | Where |
|---|---|
| Workspace root | \`${folder.replace(/\\/g, "/")}\` |
| Doctrine | _add base_truths in workspace.yaml_ |

## Key facts
- _Add the things every voice should know before doing anything in this project._
- _e.g. "Audience is enterprise CIOs", "Brand voice is concrete + measured", "Never use the word 'leverage'"._

## On load, do this
1. Read this file.
2. Read \`conventions.md\`.
3. Read \`memory.md\` for accumulated preferences and corrections.
4. Skim the file tree for \`README.md\` and any \`*.md\` at the root.
`;

  const conventionsMd = `# ${safeName} — Conventions

## Edit policy
- Make precise, surgical changes. Don't touch unrelated code.
- Never invent file content — read first.

## Naming
- _Add naming rules._

## Memory namespace
\`[${slug}]\` — prefix scoped facts with this when the user wants something remembered.

## Out of scope
- _Add things this workspace deliberately does NOT cover._

## Never do
- _Add hard rules. The "never" list is more important than the "do" list._
`;

  const memoryMd = `# ${safeName} — Memory

> Long-term notebook for accumulated preferences, repeated corrections, and stable context.
> The voices auto-load this on every turn. Append entries; don't rewrite history.

## Preferences
- _e.g. "Patrik prefers tables over bullet lists for comparisons."_

## Recurring corrections
- _Things you've had to correct more than once. Logging them here means the voices stop making the mistake._

## Stable context
- _Background facts that change rarely but matter._
`;

  // Tier-1 CIM files
  const glossaryMd = `# ${safeName} — Glossary

Project-specific terms. Authoritative — if a term appears here, prefer this definition over general knowledge.

| Term | Meaning | Aliases |
|---|---|---|
| _term_ | _meaning_ | _alias_ |
`;

  const routingMd = `# ${safeName} — Routing

Maps user intents to the right file/skill/MCP.

| Intent | Go to |
|---|---|
| _e.g. "edit a doc"_ | _e.g. "open in Files tree, send to brand-voice"_ |
`;

  const outOfScopeMd = `# ${safeName} — Out of scope

What this workspace deliberately does NOT cover:

- _e.g. "code generation"_
- _e.g. "competitor research"_
`;

  const precedenceMd = `# ${safeName} — Precedence

When sources conflict, this is the order of authority:

1. \`clawpilot/conventions.md\` (project rules)
2. \`clawpilot/context.md\` (project mission + key facts)
3. \`clawpilot/memory.md\` (accumulated preferences)
4. \`workspace.yaml\` base truths
5. Global Clawpilot memory
6. General model knowledge
`;

  const indexYaml = `project: ${slug}
tier: ${tier}
created: ${today}
entry_points:
  context: clawpilot/context.md
  conventions: clawpilot/conventions.md
  memory: clawpilot/memory.md
  glossary: clawpilot/GLOSSARY.md
  routing: clawpilot/ROUTING.md
  precedence: clawpilot/PRECEDENCE.md
  out_of_scope: clawpilot/OUT-OF-SCOPE.md
concepts: []   # [{slug, file, summary}] — populate as the project matures
`;

  const changelogMd = `# ${safeName} — Changelog

## ${today}
- Workspace scaffolded at tier ${tier} via Ensemble Create dialog.
`;

  // Tier-2 extras
  const agentInstructionsMd = `# ${safeName} — Agent Instructions

Long-form instructions for any voice newly loaded into this project.

## Purpose
_(What this project exists to achieve.)_

## Invariants
- _Things that must remain true._

## Do this
- _Default operating mode._

## Don't do this
- _Sharp edges._

## Escalation
- _When to stop and ask._
`;

  const dataSourcesMd = `# ${safeName} — Data Sources

| Source | Path / URL | Trust | Refresh | Owner |
|---|---|---|---|---|
| _name_ | _location_ | _high/medium/low_ | _cadence_ | _person_ |
`;

  const examplesMd = `# ${safeName} — Examples

Worked examples of common requests + ideal responses.

## Example 1: _request_
**Ask:** _user phrasing_
**Ideal response:** _what good looks like_
`;

  const indexByEntityMd = `# ${safeName} — Index by Entity

Alternate index keyed by domain entity.

| Entity | Files |
|---|---|
| _entity_ | _files_ |
`;

  const localSliceMd = `# ${safeName} — Local Slice

What lives only in this workspace vs. what's upstream. Marks PII boundaries.
`;

  const validationMd = `# ${safeName} — Validation

Sanity-check protocols. How to know the inference model is healthy.
`;

  const exitCriteriaYaml = `# Conditions for "this project is done" or "ready to graduate to a higher tier".
done_when: []
graduate_to_tier_${tier + 1}_when: []
`;

  const syncWorkflowMd = `# ${safeName} — Sync Workflow

If this workspace syncs with an external source, document the protocol here.
`;

  const writes = [
    [path.join(folder, "workspace.yaml"), seedYaml],
    [path.join(folder, "README.md"), readme],
    [path.join(ctxDir, "context.md"), contextMd],
    [path.join(ctxDir, "conventions.md"), conventionsMd],
    [path.join(ctxDir, "memory.md"), memoryMd],
  ];
  if (tier >= 1) {
    writes.push(
      [path.join(ctxDir, "GLOSSARY.md"), glossaryMd],
      [path.join(ctxDir, "ROUTING.md"), routingMd],
      [path.join(ctxDir, "OUT-OF-SCOPE.md"), outOfScopeMd],
      [path.join(ctxDir, "PRECEDENCE.md"), precedenceMd],
      [path.join(ctxDir, "INDEX.yaml"), indexYaml],
      [path.join(ctxDir, "CHANGELOG.md"), changelogMd],
    );
  }
  if (tier >= 2) {
    writes.push(
      [path.join(ctxDir, "AGENT-INSTRUCTIONS.md"), agentInstructionsMd],
      [path.join(ctxDir, "DATA-SOURCES.md"), dataSourcesMd],
      [path.join(ctxDir, "EXAMPLES.md"), examplesMd],
      [path.join(ctxDir, "INDEX-by-entity.md"), indexByEntityMd],
      [path.join(ctxDir, "LOCAL-SLICE.md"), localSliceMd],
      [path.join(ctxDir, "VALIDATION.md"), validationMd],
      [path.join(ctxDir, "exit-criteria.yaml"), exitCriteriaYaml],
      [path.join(ctxDir, "SYNC-WORKFLOW.md"), syncWorkflowMd],
    );
  }
  for (const [p, content] of writes) {
    try {
      await fs.access(p);  // skip if exists
    } catch {
      try { await fs.writeFile(p, content, "utf8"); } catch { /* ignore */ }
    }
  }
  return await loadWorkspace(folder);
});

async function promptForName() {
  // Electron has no native prompt; show a modal page via inputbox dialog hack.
  // Use a simple input dialog by leveraging showSaveDialog as a name-picker.
  const saveRes = await dialog.showSaveDialog(mainWindow, {
    title: "Name the new workspace",
    defaultPath: "my-workspace",
    buttonLabel: "Create",
    filters: [],
  });
  if (saveRes.canceled || !saveRes.filePath) return null;
  return path.basename(saveRes.filePath);
}

ipcMain.handle("workspace:open", async (_e, folder) => {
  if (!folder || !fsSync.existsSync(folder)) return { error: "Folder no longer exists" };
  return await loadWorkspace(folder);
});

ipcMain.handle("workspace:recent", async () => loadRecents());

ipcMain.handle("workspace:remove-recent", async (_e, folder) => {
  const list = await loadRecents();
  await saveRecents(list.filter((r) => r.path !== folder));
  return await loadRecents();
});

ipcMain.handle("workspace:reload", async () => {
  if (!currentWorkspace) return null;
  return await loadWorkspace(currentWorkspace.path);
});

// Persist per-voice session state (resumeSessionId + truncated transcript) into
// clawpilot/.session.json so reopening the workspace restores all voice
// conversations. Throttle is up to the renderer (it calls this on each turn).
ipcMain.handle("session:save", async (_e, payload) => {
  if (!currentWorkspace) return { ok: false, error: "no workspace" };
  const ctxDir = path.join(currentWorkspace.path, "clawpilot");
  try {
    await fs.mkdir(ctxDir, { recursive: true });
    const data = {
      voices: payload?.voices || {},
      lastUpdated: new Date().toISOString(),
    };
    await fs.writeFile(path.join(ctxDir, ".session.json"), JSON.stringify(data, null, 2), "utf8");
    if (currentWorkspace) currentWorkspace.sessionState = data;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle("session:clear", async () => {
  if (!currentWorkspace) return { ok: false };
  try {
    await fs.unlink(path.join(currentWorkspace.path, "clawpilot", ".session.json"));
  } catch { /* ignore */ }
  if (currentWorkspace) currentWorkspace.sessionState = { voices: {}, lastUpdated: null };
  return { ok: true };
});

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "out", ".venv", "__pycache__", ".next", "build", ".turbo", ".cache", "coverage"]);
const MAX_TREE_DEPTH = 6;
const MAX_TREE_NODES = 4000;

async function buildTree(root) {
  const nodes = { count: 0 };

  async function walk(dir, depth) {
    if (depth > MAX_TREE_DEPTH) return null;
    if (nodes.count >= MAX_TREE_NODES) return null;
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { return null; }

    const dirs = [];
    const files = [];
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      if (e.isDirectory()) {
        if (IGNORED_DIRS.has(e.name)) continue;
        dirs.push(e);
      } else if (e.isFile()) {
        files.push(e);
      }
    }
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    const children = [];
    for (const d of dirs) {
      if (nodes.count >= MAX_TREE_NODES) break;
      const childPath = path.join(dir, d.name);
      const sub = await walk(childPath, depth + 1);
      if (sub) {
        children.push({ name: d.name, path: childPath, kind: "dir", children: sub });
        nodes.count++;
      }
    }
    for (const f of files) {
      if (nodes.count >= MAX_TREE_NODES) break;
      const full = path.join(dir, f.name);
      children.push({ name: f.name, path: full, kind: classifyFile(f.name) });
      nodes.count++;
    }
    return children;
  }

  const tree = await walk(root, 0);
  return { children: tree || [], truncated: nodes.count >= MAX_TREE_NODES };
}

async function loadWorkspaceManifest(folder) {
  const candidate = path.join(folder, "workspace.yaml");
  try {
    const txt = await fs.readFile(candidate, "utf8");
    const parsed = yaml.load(txt);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return null; }
}

async function resolveBaseTruths(folder, manifest) {
  if (!manifest || !Array.isArray(manifest.base_truths)) return [];
  const resolved = [];
  for (const bt of manifest.base_truths) {
    if (!bt || typeof bt !== "object" || !bt.path) continue;
    const isAbs = path.isAbsolute(bt.path) || /^[A-Za-z]:[\\/]/.test(bt.path);
    const full = isAbs ? bt.path : path.join(folder, bt.path);
    let exists = false;
    let kind = "missing";
    try {
      const stat = await fs.stat(full);
      exists = true;
      kind = stat.isDirectory() ? "dir" : classifyFile(full);
    } catch { /* missing */ }
    resolved.push({
      label: bt.label || path.basename(full),
      path: full,
      relPath: bt.path,
      kind,
      exists,
      external: isAbs,
    });
  }
  return resolved;
}

async function loadWorkspace(folder) {
  const slug = path.basename(folder);
  const tree = await buildTree(folder);
  const manifest = await loadWorkspaceManifest(folder);
  const baseTruths = await resolveBaseTruths(folder, manifest);
  // Load clawpilot/ doctrine files for auto-injection into voice prompts.
  // These are the persistent "operating manual" + long-term memory pattern from
  // the Claude Code transcript: context.md = SOP, conventions.md = rules, memory.md = preferences.
  const ctxDir = path.join(folder, "clawpilot");
  async function readIfExists(name) {
    try { return await fs.readFile(path.join(ctxDir, name), "utf8"); }
    catch { return null; }
  }
  const doctrine = {
    context: await readIfExists("context.md"),
    conventions: await readIfExists("conventions.md"),
    memory: await readIfExists("memory.md"),
    glossary: await readIfExists("GLOSSARY.md"),
    routing: await readIfExists("ROUTING.md"),
    precedence: await readIfExists("PRECEDENCE.md"),
    outOfScope: await readIfExists("OUT-OF-SCOPE.md"),
  };
  // Load persisted council state (per-workspace) — sessionIds + transcripts.
  // Lives in clawpilot/.session.json so it travels with the workspace folder.
  let sessionState = { voices: {}, lastUpdated: null };
  try {
    const txt = await fs.readFile(path.join(ctxDir, ".session.json"), "utf8");
    const parsed = JSON.parse(txt);
    if (parsed && typeof parsed === "object") sessionState = parsed;
  } catch { /* fresh workspace */ }
  currentWorkspace = {
    path: folder,
    slug,
    tree,
    manifest: manifest || null,
    baseTruths,
    doctrine,
    hasDoctrine: !!(doctrine.context || doctrine.conventions),
    sessionState,
  };
  await pushRecent(folder, slug);
  return currentWorkspace;
}

function withinAllowedRoots(filePath) {
  if (!currentWorkspace) return false;
  if (filePath.startsWith(currentWorkspace.path)) return true;
  // Allow files inside any base_truths root (lets voices and the renderer
  // open doctrine docs that live outside the workspace folder).
  for (const bt of currentWorkspace.baseTruths || []) {
    if (bt.exists && filePath.startsWith(bt.path)) return true;
  }
  return false;
}

ipcMain.handle("file:read-text", async (_e, filePath) => {
  if (!withinAllowedRoots(filePath)) throw new Error("Refusing to read outside workspace or base-truth roots");
  return await fs.readFile(filePath, "utf8");
});

ipcMain.handle("file:read-image-data-url", async (_e, filePath) => {
  if (!withinAllowedRoots(filePath)) throw new Error("Refusing to read outside workspace or base-truth roots");
  const buf = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  const mime = ext === "jpg" ? "jpeg" : ext;
  return `data:image/${mime};base64,${buf.toString("base64")}`;
});

ipcMain.handle("base-truth:tree", async (_e, rootPath) => {
  if (!currentWorkspace) return null;
  const allowed = (currentWorkspace.baseTruths || []).some((bt) => bt.exists && bt.path === rootPath);
  if (!allowed) throw new Error("Not a registered base-truth root");
  return await buildTree(rootPath);
});

ipcMain.handle("app:version", async () => {
  return { app: app.getVersion(), electron: process.versions.electron, node: process.versions.node };
});

// ── Clawpilot bridge ────────────────────────────────────────────────────────
ipcMain.handle("clawpilot:status", async () => clawpilot.status());

ipcMain.handle("clawpilot:voices", async () => listVoices().map((v) => ({ id: v.id, label: v.label, accent: v.accent })));

ipcMain.handle("clawpilot:start", async (e, args) => {
  const { voice: voiceId, prompt, resumeSessionId, model, planMode } = args || {};
  const voice = getVoice(voiceId);
  if (!voice) return { ok: false, error: `Unknown voice: ${voiceId}` };
  if (!prompt || !String(prompt).trim()) return { ok: false, error: "Empty prompt" };

  // Build a workspace preamble that anchors the voice on the project
  // and its registered Sources of Truth + clawpilot/ doctrine.
  let preamble = "";
  if (currentWorkspace) {
    const lines = [];
    lines.push(`Active workspace: ${currentWorkspace.slug}`);
    lines.push(`Workspace root: ${currentWorkspace.path}`);
    if (currentWorkspace.manifest?.name) lines.push(`Project: ${currentWorkspace.manifest.name}`);
    if (currentWorkspace.manifest?.mission) lines.push(`Mission: ${currentWorkspace.manifest.mission}`);
    else if (currentWorkspace.manifest?.description) lines.push(`Description: ${currentWorkspace.manifest.description}`);

    // Inline doctrine — voices receive this on every turn (CLAUDE.md pattern).
    const d = currentWorkspace.doctrine || {};
    if (d.context) {
      lines.push("\n--- clawpilot/context.md ---\n" + d.context.trim());
    }
    if (d.conventions) {
      lines.push("\n--- clawpilot/conventions.md ---\n" + d.conventions.trim());
    }
    if (d.memory) {
      lines.push("\n--- clawpilot/memory.md (long-term notebook) ---\n" + d.memory.trim());
    }
    if (d.precedence) {
      lines.push("\n--- clawpilot/PRECEDENCE.md ---\n" + d.precedence.trim());
    }

    const bt = (currentWorkspace.baseTruths || []).filter((b) => b.exists);
    if (bt.length) {
      lines.push("");
      lines.push("Sources of truth (read with the filesystem MCP when relevant):");
      for (const b of bt) lines.push(`  • ${b.label} → ${b.path}${b.external ? " (external)" : ""}`);
    }
    if (d.glossary) lines.push(`\nGlossary lives at clawpilot/GLOSSARY.md — read it before using domain terms.`);
    if (d.routing)  lines.push(`Routing map lives at clawpilot/ROUTING.md.`);
    if (d.outOfScope) lines.push(`Out-of-scope list lives at clawpilot/OUT-OF-SCOPE.md.`);

    lines.push("");
    lines.push("Use the filesystem MCP to read workspace files. Do not invent file contents — read them. Cite paths when referencing files.");
    preamble = lines.join("\n");
  }

  // Plan-mode prefix: voice replies with an approach + risks, no destructive tools.
  const planPrefix = planMode
    ? "\n\n--- PLAN MODE ---\n" +
      "You are in PLAN mode. Do NOT call any tools that mutate files (no edit/write/run). " +
      "You MAY read files to inform the plan. Reply with a numbered approach, the files you'd touch, the risks, and any open questions. " +
      "End with: 'Proceed?' so the human can approve before you act.\n"
    : "";

  const fullSystem = (preamble
    ? `${voice.systemPrompt}\n\n--- workspace context ---\n${preamble}`
    : voice.systemPrompt) + planPrefix;

  return clawpilot.startRun(e.sender, {
    voice: voice.id,
    prompt: String(prompt),
    systemPrompt: fullSystem,
    allowList: planMode ? ["read"] : (voice.allowList && voice.allowList.length ? voice.allowList : undefined),
    resumeSessionId: resumeSessionId || undefined,
    model: model || undefined,
    cwd: currentWorkspace ? currentWorkspace.path : undefined,
  });
});

ipcMain.handle("clawpilot:cancel", async (_e, runId) => clawpilot.cancelRun(runId));

app.whenReady().then(() => {
  createMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
