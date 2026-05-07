# Synapsis · Ensemble

> Many voices. Many instruments. One workspace.

Sibling to Chorus. Multi-role agent workspace wrapping Clawpilot.

## Run V0.1 (Electron)

```powershell
npm install
npm start
```

Then **File → Open Workspace Folder…** (or `Ctrl+O`) and pick any folder with markdown / png / csv files.

## V0.1 scope

- ✅ Electron shell with Solo / Council / Pipeline / Atelier layouts
- ✅ Real workspace folder picker
- ✅ Live MD / CSV / PNG rendering in the doc pane
- ✅ Tabbed voice panes (`brand-voice` / `ux-critic` / `data-scientist`) with Ctrl+1/2/3 shortcuts
- ✅ Council broadcast bar with safe-mode preview gate
- ⏳ **Stubbed**: agent replies are mocked. Real Clawpilot subprocess wiring lands in V0.2 once `clawpilot --headless --jsonl-stream` ships.
- ⏳ **Stubbed**: Base Truths section in left rail is static — workspace YAML loader lands in V0.2.

## Files

- `src/main.js` — Electron main process (window, menu, IPC, fs)
- `src/preload.js` — contextBridge → `window.ensemble`
- `renderer/index.html` — single-file renderer (works standalone in browser too)
- `PRODUCT-DESIGN.md` — full product design doc
- Live web mockup: <https://lowendahl.github.io/synapsis-ensemble/>

## Build a portable / installer

```powershell
npm run dist          # NSIS installer
npm run dist:portable # portable .exe
```

