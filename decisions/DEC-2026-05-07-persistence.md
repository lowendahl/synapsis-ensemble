# DEC-2026-05-07-persistence

**Status:** locked
**Decided by:** patrik

## Decision

Per-workspace council state (per-voice resume sessionIds + last 50 turns) persists to `<workspace>/clawpilot/.session.json`. Hidden file. Gitignored.

## Alternatives considered

| Option | Why rejected |
|---|---|
| `clawpilot/session.md` (visible markdown) | Mixes machine state into doctrine. Doctrine is for humans + the agent's prompt; sessions are runtime. |
| `~/.copilot/ensemble-sessions/<slug>.json` (per-user, central) | Breaks "the workspace travels with the folder". Move the folder, lose state. |
| In-app SQLite | Overkill for this volume; harder to diff/inspect. |

## Why hidden + gitignored

- `clawpilot/*.md` is doctrine — meant to be committed, shared, reviewed.
- `.session.json` is conversation history — should not leak into a shared repo without explicit consent.

## Consequences

- Reset state: delete the file (or use `session:clear` IPC handler — not yet wired to UI).
- 50-turn cap per voice keeps file size bounded.
- Future: optional encryption when the workspace contains sensitive content.
