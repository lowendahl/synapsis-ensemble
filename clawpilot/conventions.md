# Conventions — Synapsis · Ensemble

## Stack

- **Electron** main + preload + renderer (vanilla JS — NO React, NO bundler).
- Renderer is a single `renderer/index.html` (~2k lines). All CSS/JS inline.
  This is intentional: zero build pipeline = sub-second iteration.
- IPC: `contextBridge` exposes `window.ensemble.*` from `src/preload.js`.

## Naming

- App: `Synapsis · Ensemble` (with middle dot · — never em-dash).
- npm package: `synapsis-ensemble`.
- Window title: `Ensemble` (short).
- Voice IDs are short slugs: `brand`, `ux`, `ds`. Persona = "voice"; tools = "instruments".

## Theme (Clawpilot tokens)

Always use `var(--cp-*)` — never hardcoded hex. Light + dark themes flip via
`html[data-theme]`. The Symbiont family signal `#3FE0B0` is reserved for
**anchor dot only** — do NOT use it as a UI accent. UI accent is Symbiont
Pale Coral `#F2A48C` (matches Pale Coral in brand).

## Clawpilot bridge

- Spawn `copilot.exe` via `src/clawpilot.js` — it strips `ELECTRON_RUN_AS_NODE`
  before spawn (else copilot.exe crashes).
- Args: `-p "<prompt>" --output-format json` + `--allow-all` if voice
  `allowList` is empty, else `--allow-tool <name>` per entry.
- Resume: pass `--resume <sessionId>` from `clawState.sessions[voice]`.
- System-prompt injection is **per-turn** — the doctrine (context.md +
  conventions.md + memory.md + PRECEDENCE.md) is inlined into every prompt as
  `--- clawpilot/<file> ---` blocks. This is the CLAUDE.md pattern.

## Gotchas (lived through)

1. **`ELECTRON_RUN_AS_NODE=1`** — set by some helper tools. Strip in
   `scripts/launch.js` AND in `src/clawpilot.js` before spawning copilot.exe.
2. **`gh auth token`** — active gh account is `plwendahl_microsoft` but the
   GitHub repo is owned by `lowendahl`. Push needs:
   `$env:GH_TOKEN = (gh auth token --user lowendahl)`.
3. **npm start hangs in Copilot CLI sessions** — when the `task` tool spawns
   npm with no TTY, electron sometimes never gets stdin. Workaround: launch
   `node_modules\electron\dist\electron.exe .` directly via `Start-Process`.
4. **OneDrive lock-files** — never put the repo under `OneDrive\Documents`.
   Use `C:\repos\` (already done).

## Editing rules

- Renderer is one file. Add CSS at the bottom of the `<style>` block, JS at
  the bottom of the `<script>` block. No external assets unless absolutely
  necessary (we want one HTML file = one source of truth).
- Markdown rendering is the small in-house function in `renderMarkdown()`. It
  is intentionally minimal — DO NOT swap in marked/markdown-it without
  weighing the bundle cost. Long-term we may absorb Chorus's renderer.
