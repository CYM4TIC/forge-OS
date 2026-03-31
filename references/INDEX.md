# References Index — 13 External Sources

> Master index of all reference material informing Forge OS design and persona capabilities.

| # | Source | Directory | Domain | Tier | Persona |
|---|--------|-----------|--------|------|---------|
| 1 | Claude Code source | `claude-code/` | Architecture, tools, state, permissions | Core | All |
| 2 | Claude Agent SDK | `claude-agent-sdk/` | API patterns, agent spawning | Core | Nyx |
| 3 | Trail of Bits | `trail-of-bits/` | Security skills (8 of 18) | Intelligence | Tanaka, Wraith |
| 4 | UI UX Pro Max | `ui-ux-pro-max/` | 161 rules, 99 guidelines, checklist | Intelligence | Mara, Riven |
| 5 | Antigravity | `antigravity/` | 5 domain skills (Postgres, Security, Next.js, Stripe, Tailwind) | Intelligence | All |
| 6 | Ruflo | `ruflo/` | Token optimization, anti-drift, self-learning | Methodology | Nyx |
| 7 | wshobson/agents | `wshobson-agents/` | Model tiering, progressive disclosure, PluginEval | Methodology | All |
| 8 | Rosehill | `rosehill/` | CLAUDE.md turnstile, workspace model | Methodology | Nyx |
| 9 | Pretext | `pretext/` | Text measurement, canvas rendering | Integration | Riven |
| 10 | LightRAG | `lightrag/` | Knowledge graph RAG, 22 MCP tools | Integration | All (future) |
| 11 | n8n-MCP | `n8n/` | Workflow automation, 1,396 nodes | Integration | All (future) |
| 12 | Anthropic Plugins | `anthropic-plugins/` | MCP ecosystem catalog | Reference | All |
| 13 | Ecosystem | `ecosystem/` | Tiered triage of all sources | Reference | All |

## File Count

- 13 directories, 19 NOTES.md files (claude-code has 7 sub-docs)
- Total: ~25 reference documents

## How Agents Use References

Agents reference these docs via boot sequence wiring:
- Tanaka boots → reads `trail-of-bits/NOTES.md` + `antigravity/NOTES.md` (security-auditor)
- Mara boots → reads `ui-ux-pro-max/NOTES.md` (pre-delivery checklist)
- Riven boots → reads `antigravity/NOTES.md` (tailwind-design-system)
- Kehinde boots → reads `antigravity/NOTES.md` (postgres-best-practices)
- Vane boots → reads `antigravity/NOTES.md` (stripe-integration)
- Nyx boots → reads `claude-code/NOTES.md` + `ruflo/NOTES.md` (patterns)
