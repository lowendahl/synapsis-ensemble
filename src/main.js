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

ipcMain.handle("workspace:create", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Create New Workspace — pick parent folder, then name it",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths.length) return null;
  const parent = result.filePaths[0];
  // Ask for a workspace name
  const name = await promptForName();
  if (!name) return null;
  const folder = path.join(parent, name);
  try {
    await fs.mkdir(folder, { recursive: false });
  } catch (e) {
    if (e.code === "EEXIST") {
      const ok = await dialog.showMessageBox(mainWindow, {
        type: "question", buttons: ["Open existing", "Cancel"], defaultId: 0, cancelId: 1,
        message: `"${name}" already exists in that folder. Open it instead?`,
      });
      if (ok.response !== 0) return null;
    } else {
      throw e;
    }
  }
  // Seed default workspace.yaml + README + folders
  const seedYaml = `# Ensemble workspace manifest
name: ${name}
slug: ${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}

# Sources of truth — the doctrine repos and context-engineering folders
# voices should anchor on. Globs are read relative to the workspace root
# unless they start with a drive letter or '/'.
base_truths: []
  # - label: Doctrine
  #   path: doctrine/
  # - label: Context engineering
  #   path: C:/repos/CSU-Context-Engineering

# Voice roster (V0.2 uses the built-ins; per-workspace overrides land in V0.3)
voices:
  - brand
  - ux
  - ds
`;
  const readme = `# ${name}\n\nNew Ensemble workspace.\n\n- Drop your project files here (Markdown, CSVs, images).\n- Edit \`workspace.yaml\` to register Sources of Truth.\n- Open the council bar to broadcast a question to all voices.\n`;
  try {
    await fs.writeFile(path.join(folder, "workspace.yaml"), seedYaml, "utf8");
    await fs.writeFile(path.join(folder, "README.md"), readme, "utf8");
  } catch { /* if files exist already, leave them */ }
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
  currentWorkspace = {
    path: folder,
    slug,
    tree,
    manifest: manifest || null,
    baseTruths,
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
  const { voice: voiceId, prompt, resumeSessionId, model } = args || {};
  const voice = getVoice(voiceId);
  if (!voice) return { ok: false, error: `Unknown voice: ${voiceId}` };
  if (!prompt || !String(prompt).trim()) return { ok: false, error: "Empty prompt" };

  // Build a workspace preamble that anchors the voice on the project
  // and its registered Sources of Truth. Voices use the filesystem MCP
  // already wired into Clawpilot to actually read these.
  let preamble = "";
  if (currentWorkspace) {
    const lines = [];
    lines.push(`Active workspace: ${currentWorkspace.slug}`);
    lines.push(`Workspace root: ${currentWorkspace.path}`);
    if (currentWorkspace.manifest?.name) lines.push(`Project: ${currentWorkspace.manifest.name}`);
    if (currentWorkspace.manifest?.description) lines.push(`Description: ${currentWorkspace.manifest.description}`);
    const bt = (currentWorkspace.baseTruths || []).filter((b) => b.exists);
    if (bt.length) {
      lines.push("");
      lines.push("Sources of truth (anchor your reasoning here when relevant — read with the filesystem MCP):");
      for (const b of bt) lines.push(`  • ${b.label} → ${b.path}${b.external ? " (external)" : ""}`);
    }
    lines.push("");
    lines.push("Use the filesystem MCP to read workspace files. Do not invent file contents — read them. When you cite a file, give its path.");
    preamble = lines.join("\n");
  }
  const fullSystem = preamble
    ? `${voice.systemPrompt}\n\n--- workspace context ---\n${preamble}`
    : voice.systemPrompt;

  return clawpilot.startRun(e.sender, {
    voice: voice.id,
    prompt: String(prompt),
    systemPrompt: fullSystem,
    allowList: voice.allowList && voice.allowList.length ? voice.allowList : undefined,
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
