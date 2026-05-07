# Feature: Workspace Creation

**Owner:** product-manager
**Status:** Shipped (v0.2.0)

## Problem

A user opening Ensemble for the first time has no project loaded. They need a way to either point at an existing folder or create a new one, scaffolded with the Context Inference Model so voices have something to anchor on.

## Scope

In:
- "Open existing folder…" via system dialog
- "Create new workspace" with a guided modal (name, base path, tier, base truths)
- Tier 0 (light) / Tier 1 (default) / Tier 2 (full CIM) scaffolding
- Recent workspaces list on welcome screen

Out (later):
- Cloud-hosted workspaces
- Workspace templates beyond the bare CIM
- Auto-import from existing Clawpilot project repos

## Acceptance criteria

1. From welcome, user can pick a folder → folder loads and tree renders.
2. From welcome, user can create a new workspace → folder is created with `workspace.yaml`, `clawpilot/{context,conventions,memory}.md`, and an `INDEX.yaml` describing tier.
3. Recents persist across app restarts.
4. Recents can be removed individually.
5. If a recent's folder no longer exists, opening it shows an error toast and removes it.

## Out-of-scope

- Editing the workspace.yaml from inside the app (do it in a text editor today).
- Conflict resolution if a workspace folder is opened by two app instances.
