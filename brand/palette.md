# Ensemble — Palette

Ensemble does **not** invent a palette. It uses Clawpilot's tokens.

## Source

All colors come from `var(--cp-*)` defined in `renderer/index.html`. See the Clawpilot theme contract:

- Background: `--cp-bg`
- Surface: `--cp-surface`
- Border: `--cp-border`, `--cp-border-strong`
- Text: `--cp-text`, `--cp-text-muted`, `--cp-text-soft`
- Accent: `--cp-accent` (deep crimson light, soft pink dark)
- Status: `--cp-success`, `--cp-danger`, `--cp-warning`

## Voice dot colors (the only "Ensemble colors")

These are the per-voice identity tokens. They're picked to be visually distinct and not steal accent attention.

| Voice | Hex (light + dark) | Notes |
|---|---|---|
| `brand` | `#d97757` | terracotta — anchor color; Symbiont-adjacent warm |
| `ux` | `#2f80a4` | flow-blue |
| `ds` | `#6b8e3d` | data-olive |
| `dev` | `#c084fc` | code-purple |
| `pm` | `#f59e0b` | scope-orange |
| `uxd` | `#ec4899` | design-pink |

All other UI surfaces use Clawpilot tokens. Never hardcode hex outside this list.

## Don't

- No purple gradients. No teal. No "AI blue" (#0066ff family).
- No glassmorphism, no heavy shadows, no neon glows.
