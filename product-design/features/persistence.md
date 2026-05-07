# Feature: Per-workspace State Persistence

**Owner:** developer + product-manager
**Status:** Shipped (v0.2.x — 2026-05-07)

## Problem

Voice conversations evaporated when the app closed. Users couldn't trust the workspace as a "place to come back to" — every session started cold.

## Scope

In:
- Persist per-voice `sessionId` (Clawpilot resume token) per workspace.
- Persist last 50 turns per voice (role + text + timestamp).
- Restore both on workspace open: replay turns into voice panes, set sessionId so follow-ups continue the same Clawpilot thread.
- Storage: `<workspace>/clawpilot/.session.json` (gitignored).

Out:
- Per-voice memory beyond the transcript (long-term facts go in `clawpilot/memory.md`).
- Cross-workspace memory (lives in Clawpilot's `~/.copilot/memories/`).
- Editing/redacting persisted turns from the UI.

## Acceptance criteria

1. Send a turn to any voice → `clawpilot/.session.json` exists and contains the turn.
2. Close app, reopen, load same workspace → transcript replays with a "↻ restored N turns" divider.
3. Send another turn → Clawpilot continues the same thread (visible by referring back to prior context).
4. Capped at 50 turns per voice — no unbounded growth.
5. `.session.json` is gitignored — committing the workspace doesn't leak conversation history.
