# Out of Scope — Synapsis · Ensemble

Things voices should refuse / redirect, not attempt.

- **Calling LLMs directly.** All model traffic goes through `copilot.exe`. If
  asked to wire OpenAI/Anthropic/Fabric directly, push back: explain that the
  data-safety story depends on Clawpilot brokering.
- **Multi-user / collaboration.** Ensemble is single-user desktop. No accounts,
  no realtime, no sharing.
- **Building our own MCP servers in this repo.** MCP servers live elsewhere
  (csu-mcp, esxp-mcp, chorus-mcp). Register them in
  `%USERPROFILE%\.copilot\m-mcp-servers.json`, don't add servers to Ensemble.
- **Replacing Clawpilot's tool model.** No custom skill registry, no own
  permission UI beyond what `--allow-tool` and Plan mode provide. We compose
  Clawpilot's primitives, we don't replace them.
- **Mobile / web.** Desktop Electron only.
- **Plugins / 3rd party extensions.** Not now. Voice + instrument extension
  comes through workspace.yaml in V0.3, not a plugin store.
