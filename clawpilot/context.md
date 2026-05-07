# Synapsis · Ensemble — Project Context

**Tagline:** Many voices. Many instruments. One workspace.

## What Ensemble is

Ensemble is a desktop **agent workspace** built on Electron that wraps Clawpilot
(the local agentic CLI) into a multi-voice "council" UI. Instead of one
chatbot, the user has many specialised voices (brand, UX, data, …) responding
in parallel, all sharing the same project context (the workspace folder), the
same doctrine (`clawpilot/`), and the same instruments (filesystem, shell,
MCP servers).

Ensemble is the third Symbiont sibling:

| Surface | Codename | Purpose |
|---------|----------|---------|
| Sense   | **Augur**     | Read & explain CSU signals |
| Act     | **Stride**    | Plan & deliver |
| Hold    | **Chorus**    | Markdown reading + agent commenting |
| **Compose** | **Ensemble** | Multi-voice agent workspace |

Always qualified externally as **"CSU · Symbiont Ensemble"**.

## What we're building right now (V0.2.x)

- ✅ V0.1: Electron shell + workspace folder picker + MD/CSV/PNG live render
- ✅ V0.2: Clawpilot bridge (spawn `copilot.exe`, JSONL parse, per-voice resume) + workspace.yaml + base-truths panel + recursive nav + welcome screen + recents
- ✅ V0.2.1: Create-workspace modal + tier-0/1/2 CIM scaffold + doctrine auto-injection (CLAUDE.md pattern)
- 🔜 V0.3 backlog:
  - Drag-and-drop / "Add file" / "Add folder" into workspace from the tree
  - "Add base truth" picker (point at any folder OR repo on disk to register as read-only context)
  - Tasks tab — per-voice spawned subtasks with full context inheritance, asks back via the voice that spawned it
  - Real instrument allowlists (today the right-rail "Instruments" chips are decorative — actual tool gating uses `voices.js` allowList which is `[]` = allow-all)
  - Per-workspace voice definitions (override built-ins via workspace.yaml `voices:`)
  - Context-window pressure UI (token meter, "Compact now" button)
  - Use Chorus's MRSF sidecar for review threads on workspace MD files (today: not wired)

## Repos involved

- **Main:** `C:\repos\synapsis-ensemble` — this Electron app
- **Reference (bridge pattern):** `C:\Users\plwendahl\repos\CSU-Compass\app\src\main\clawpilotBridge.ts` — the pattern Ensemble's `src/clawpilot.js` was ported from
- **Reference (MD editor + sidecar):** `C:\repos\md-viewer` (publishes Chorus) — Ensemble currently does NOT use the Chorus MD editor; renderer/index.html has its own minimal markdown renderer. Wiring Chorus's editor + MRSF sidecar is V0.3+.
- **Reference (skill source-of-truth for the CIM tier scaffolder):** `~\.copilot\m-skills\project-add\SKILL.md`

## Brand reference

See `base-truths/symbiont-brand.md` (mirrored from the locked Symbiont rebrand
decisions). Surface name = **Ensemble**. Eyebrow = **CSU · SYMBIONT** (all caps,
non-negotiable). Family signal accent = `#3FE0B0` anchor dot. Wordmark = Source
Serif 4. Headings/body = Segoe UI Variable.

## Out of scope (deliberate)

- We do NOT call any LLM directly. All model work goes through `copilot.exe`
  (Clawpilot host). This is Microsoft-data-safe by inheritance.
- We do NOT ship our own MCP servers. Voices use whatever MCP servers Clawpilot
  has registered in `%USERPROFILE%\.copilot\m-mcp-servers.json`.
- Ensemble is a **single-user desktop app** — no collaboration, no sync, no
  account model. Multi-user is explicitly out of scope.
