# Ensemble — Roadmap

## Now (v0.2.x — shipping)

- ✅ Workspace folder picker + recents
- ✅ Tier-1 CIM scaffold on workspace creation
- ✅ Per-voice Clawpilot bridge with `--resume`
- ✅ 6 voices: brand, ux, ds, dev, pm, uxd
- ✅ Auto-inject `clawpilot/` doctrine into every turn
- ✅ Per-workspace state persistence (`clawpilot/.session.json`)
- ✅ Council broadcast bar
- ✅ Tab strip with overlay chevron scroll

## Next (v0.3)

- [ ] Drag-and-drop file/folder add to workspace
- [ ] "Add voice" button (currently V0.3 placeholder in rail)
- [ ] File tree right-click → "ask voice X about this file"
- [ ] In-pane file viewer (markdown + image preview using Chorus's renderer)
- [ ] Real per-voice instrument allowList (today: `[]` = allow-all)
- [ ] Solo / Pipeline / Atelier layouts (today: hidden)

## Later

- [ ] Pipelines runner (`/run` skills with gates) — the decorative tile we removed comes back as the real thing here
- [ ] Workspace templates (pre-scaffolded brand kits, design systems, content workspaces)
- [ ] Multi-user workspace sharing (Loop / SharePoint integration)
- [ ] Voice marketplace — load community-shared personas from `~/.copilot/voices/`
