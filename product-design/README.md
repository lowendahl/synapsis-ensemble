# Synapsis · Ensemble — Product Design

Living artifacts. This is where designs **live**, not where they are filed away.

## Structure

- `vision.md` — North star: what is this product actually for?
- `features/` — One file per major feature. Spec-shaped (problem, scope, AC).
- `flows/` — User flows, IA, screen layouts (markdown + excalidraw).
- `components/` — Reusable UI patterns (chips, panes, council bar, etc.).
- `roadmap.md` — Now / Next / Later.

## Working with the voices

- **product-manager** owns `features/*` (scopes + acceptance criteria).
- **ux-designer** owns `flows/*` and `components/*` (layout, IA, microcopy).
- **brand-voice** keeps `vision.md` honest to the Symbiont positioning.
- **developer** translates designs into `src/` and `renderer/` changes.
- **ux-critic** reviews everything before it ships.

Drop into any voice tab and reference these files by path. Doctrine in `../clawpilot/` is auto-injected on every turn.
