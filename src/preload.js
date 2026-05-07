const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ensemble", {
  pickWorkspace: () => ipcRenderer.invoke("workspace:pick"),
  reloadWorkspace: () => ipcRenderer.invoke("workspace:reload"),
  readText: (filePath) => ipcRenderer.invoke("file:read-text", filePath),
  readImage: (filePath) => ipcRenderer.invoke("file:read-image-data-url", filePath),
  version: () => ipcRenderer.invoke("app:version"),

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
