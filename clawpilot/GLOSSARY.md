# Glossary — Synapsis · Ensemble

| Term | Meaning |
|------|---------|
| **Voice** | A persona registered in `src/voices.js` with a system prompt + tool allow-list. Personas: `brand`, `ux`, `ds`. |
| **Instrument** | Tool a voice can use — filesystem, shell, MCP server, or skill. The orchestra metaphor: voices play instruments. |
| **Workspace** | A folder on disk that contains a `workspace.yaml` manifest + content files. Loaded via the welcome screen or File → Open. |
| **Council** | The default layout where all selected voices answer a single prompt in parallel. |
| **Base truth** | A read-only file or folder registered in `workspace.yaml` `base_truths:` that voices treat as authoritative reference (brand book, doctrine, schema). Entries can be local or external, and can declare `inject_for` to inline selected files into specific Voice prompts. |
| **Doctrine** | The contents of `clawpilot/` — context, conventions, memory, glossary, routing, precedence, out-of-scope. Auto-injected per turn (CLAUDE.md pattern). |
| **CIM** | Context Inference Model — same thing as "doctrine"; the structured `clawpilot/` folder. Tier 0 / 1 / 2 from the `/project-add` skill. |
| **Bridge** | `src/clawpilot.js` — spawns `copilot.exe`, parses JSONL events, manages per-voice session resume. Mirrors `clawpilotBridge.ts` from CSU-Compass. |
| **Recents** | Persisted list of previously-opened workspace.yaml paths shown on the welcome screen. |
| **Plan mode** | (deferred) A run mode where the voice proposes the change before executing. Not in v0.2.x. |
| **Task** | (V0.3 backlog) A voice-spawned scoped subtask that inherits full project context, runs to completion, and asks the parent voice for input if blocked. |
