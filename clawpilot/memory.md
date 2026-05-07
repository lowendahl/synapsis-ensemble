# Memory — Synapsis · Ensemble

Running log of decisions and corrections. Append-only; oldest at top.

## 2026-05-07

- Renamed working title "Pulse" → "Augur" and "Cadence" → "Stride" — Symbiont
  rebrand locked. Ensemble is the third sibling.
- Layout tabs (Solo/Council/Pipeline/Atelier) hidden in v0.2.x — only Council
  ships. Re-enable when those layouts are real.
- Plan/Act top-bar toggle removed — replaced by per-voice plan/act when V0.3
  Tasks lands. For now voices act with `--allow-all`.
- Right-rail "Instruments" chips are **decorative**. Real tool allow-listing
  is `voices.js` `allowList: []` (= allow-all). Wire real chips when voice
  definitions move into workspace.yaml (V0.3).
- Pipelines panel ("/run pricing-review") is **decorative mockup**. No
  pipeline runner exists yet.
- Welcome screen shows on every cold start (no auto-load of last workspace).
  Recents list shows up to N previous workspace.yaml files.
- `clawpilot/` folder is the project's CLAUDE.md-equivalent. Tier 1 default
  matches `/project-add` skill doctrine.
