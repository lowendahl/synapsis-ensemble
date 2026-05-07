const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require("electron");
const path = require("path");
const fs = require("fs/promises");

let mainWindow = null;
let currentWorkspace = null;

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
              message: "Ensemble v0.1",
              detail:
                "Many voices. Many instruments. One workspace.\n\nSymbiont · Ensemble — multi-role agent workspace.\nV0.1: UI shell + real workspace folder picker. Agent subprocesses arrive in V0.2 once Clawpilot ships --headless --jsonl-stream.",
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
  const folder = result.filePaths[0];
  return await loadWorkspace(folder);
});

ipcMain.handle("workspace:reload", async () => {
  if (!currentWorkspace) return null;
  return await loadWorkspace(currentWorkspace.path);
});

async function loadWorkspace(folder) {
  const slug = path.basename(folder);
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.isFile() && !e.name.startsWith(".")) {
      const full = path.join(folder, e.name);
      const stat = await fs.stat(full);
      files.push({
        name: e.name,
        path: full,
        kind: classifyFile(e.name),
        size: stat.size,
        mtime: stat.mtimeMs,
      });
    }
  }
  files.sort((a, b) => {
    const order = { text: 0, image: 1, other: 2 };
    const mdA = a.name.toLowerCase().endsWith(".md") ? -1 : 0;
    const mdB = b.name.toLowerCase().endsWith(".md") ? -1 : 0;
    if (mdA !== mdB) return mdA - mdB;
    if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
    return a.name.localeCompare(b.name);
  });
  currentWorkspace = { path: folder, slug, files };
  return currentWorkspace;
}

ipcMain.handle("file:read-text", async (_e, filePath) => {
  if (!currentWorkspace || !filePath.startsWith(currentWorkspace.path)) {
    throw new Error("Refusing to read outside workspace");
  }
  return await fs.readFile(filePath, "utf8");
});

ipcMain.handle("file:read-image-data-url", async (_e, filePath) => {
  if (!currentWorkspace || !filePath.startsWith(currentWorkspace.path)) {
    throw new Error("Refusing to read outside workspace");
  }
  const buf = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  const mime = ext === "jpg" ? "jpeg" : ext;
  return `data:image/${mime};base64,${buf.toString("base64")}`;
});

ipcMain.handle("app:version", async () => {
  return { app: app.getVersion(), electron: process.versions.electron, node: process.versions.node };
});

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
