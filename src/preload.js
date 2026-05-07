const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ensemble", {
  pickWorkspace: () => ipcRenderer.invoke("workspace:pick"),
  createWorkspace: () => ipcRenderer.invoke("workspace:create"),
  openWorkspace: (folder) => ipcRenderer.invoke("workspace:open", folder),
  recentWorkspaces: () => ipcRenderer.invoke("workspace:recent"),
  removeRecent: (folder) => ipcRenderer.invoke("workspace:remove-recent", folder),
  reloadWorkspace: () => ipcRenderer.invoke("workspace:reload"),
  readText: (filePath) => ipcRenderer.invoke("file:read-text", filePath),
  readImage: (filePath) => ipcRenderer.invoke("file:read-image-data-url", filePath),
  baseTruthTree: (root) => ipcRenderer.invoke("base-truth:tree", root),
  version: () => ipcRenderer.invoke("app:version"),

  clawpilot: {
    status: () => ipcRenderer.invoke("clawpilot:status"),
    voices: () => ipcRenderer.invoke("clawpilot:voices"),
    start: (args) => ipcRenderer.invoke("clawpilot:start", args),
    cancel: (runId) => ipcRenderer.invoke("clawpilot:cancel", runId),
    onEvent: (handler) => {
      const fn = (_e, ev) => handler(ev);
      ipcRenderer.on("clawpilot:event", fn);
      return () => ipcRenderer.removeListener("clawpilot:event", fn);
    },
  },

  onMenu: (handler) => {
    const subs = [
      ["menu:open-workspace", () => handler({ type: "open-workspace" })],
      ["menu:toggle-theme", () => handler({ type: "toggle-theme" })],
      ["menu:tab", (_e, voice) => handler({ type: "tab", voice })],
    ];
    subs.forEach(([ch, fn]) => ipcRenderer.on(ch, fn));
    return () => subs.forEach(([ch, fn]) => ipcRenderer.removeListener(ch, fn));
  },
});
