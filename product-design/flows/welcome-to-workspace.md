# Flow: Welcome → Workspace

## Goal

Get a first-time or returning user into a working ensemble in under 10 seconds.

## States

```
[welcome]
  ├─ recents present?
  │    yes → show list, click any → [workspace loaded]
  │    no  → show empty state with two CTAs
  │
  ├─ click "Open existing folder…" → [system dialog] → folder picked → [workspace loaded]
  │
  └─ click "Create new workspace…" → [create modal]
        ├─ enter name + pick base path
        ├─ pick tier (0/1/2) — default tier 1
        ├─ pick voices (default: brand+ux+ds+dev)
        ├─ pick base_truths (optional)
        └─ submit → folder scaffolded → [workspace loaded]

[workspace loaded]
  - Mission line populated from workspace.yaml
  - File tree on left
  - Base truths card list
  - Voice tabs reset (no mockup transcripts)
  - .session.json restored → transcripts replayed
  - Council bar enabled
```

## Empty states

- **No recents**: large hero with "Welcome to Ensemble" + the two CTAs.
- **No workspace.yaml mission**: "No mission set. Add a `mission:` field to `workspace.yaml`."
- **No base_truths**: rail explains how to add them.
- **No clawpilot/**: doctrine indicator hidden; voices still work but without auto-injection.

## Error states

- **Folder gone**: toast "Folder no longer exists" + remove from recents.
- **Permission denied on scaffold**: toast with the OS error.
- **Clawpilot not detected**: status badge goes red; voices fall back to mock replies.

## Microcopy

- Welcome H1: "Open a workspace"
- Welcome H2 / sub: "A folder is a workspace. Pick one with a `workspace.yaml`, or make a new one."
- Recents header: "Recent"
- Empty recents: "No workspaces yet."
