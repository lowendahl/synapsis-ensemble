# Ensemble — Vision

## North star

**A workspace for thinking together with multiple voices.** Not a chat. Not a coding agent. A *room* where a small ensemble of role-shaped agents read the same files, hold the same context, and answer in their own register.

## One-paragraph pitch

Ensemble is the GUI on top of Clawpilot. Where Clawpilot gives you one terminal that can act on your machine, Ensemble gives you a workspace where many voices — brand, ux, ds, dev, pm, uxd — share one project folder, each with their own persona, doctrine, and conversation history. You broadcast to a "council" or talk to one voice solo. Doctrine lives on disk in `clawpilot/`. State persists in `clawpilot/.session.json`. Close the app, reopen, and every voice picks up where it left off.

## Who it's for

- **The operator who already lives in Clawpilot** and wants more than one tab.
- **PMs, designers, and writers** who want their own AI without learning the terminal.
- **Builders working on multi-disciplinary problems** — pricing pages, product specs, brand systems — where the answer needs more than one perspective.

## What it is not

- Not a chatbot.
- Not a coding agent.
- Not a workflow builder (that's Clawpilot Skills + future Pipelines).
- Not a replacement for the underlying Clawpilot CLI — it's a workspace **on top of** it.

## The "many voices" promise

Every voice is:
1. **Shaped** — has its own system prompt + tone + register (`src/voices.js`).
2. **Scoped** — has its own tool allowList (currently `[]` = allow-all in v0.2.x).
3. **Anchored** — auto-receives the workspace's `clawpilot/` doctrine on every turn.
4. **Continuous** — multi-turn `--resume` thread per voice; transcripts persist to `clawpilot/.session.json`.

## Success looks like

- Open a workspace, send "review this file's tone" to brand-voice, "where's the conversion friction" to ux-critic, "scope a v1" to product-manager — three tabs, three threads, one project.
- Close the app. Reopen tomorrow. The threads are still there.
- Pull `clawpilot/` into git → the project's doctrine ships with the repo. Anyone who opens the workspace gets the same operating manual.
