# DEC-2026-05-07-voice-set

**Status:** locked
**Decided by:** patrik

## Decision

The v0.2.x Ensemble ships with a 6-voice roster:

1. `brand` — brand-voice (terracotta)
2. `ux` — ux-critic (blue)
3. `ds` — data-scientist (olive)
4. `dev` — developer (purple) — reads persona from `~/.copilot/voices/developer/persona.md`
5. `pm` — product-manager (orange)
6. `uxd` — ux-designer (pink)

## Why

- Two design voices (`ux` critic + `uxd` maker) — review and make are different jobs.
- `dev` reads from `~/.copilot/voices/` so it stays in sync with the `/voice` skill.
- `pm` and `uxd` use inline system prompts in `src/voices.js` for now; can be migrated to `~/.copilot/voices/` later.
- No more than 6 — the council bar starts to feel crowded past that.

## Consequences

- Adding a new voice requires editing `src/voices.js` and ~10 spots in `renderer/index.html`. v0.3 will introduce a generic registry to avoid this.
- Tab strip can no longer fit all six on a 1500px window without horizontal scroll → this is what motivated the chevron-scroll affordance shipped the same day.
