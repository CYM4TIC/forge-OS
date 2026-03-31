# Anthropic Plugins — Ecosystem Catalog

> Plugin catalog and connector mapping for Claude Code ecosystem.

## Sources

- Claude Code built-in plugins (bundledSkills.ts — see claude-code/ reference)
- MCP server registry (modelcontextprotocol/servers)
- Community plugins (punkpeye/awesome-mcp-servers)

## Plugin Architecture

Claude Code plugins come in two types:
1. **Skill plugins** — Register new `/commands` (disk-based or bundled)
2. **Hook plugins** — Register lifecycle hooks (pre-query, post-tool, etc.)

Three loading sources:
- **Bundled:** Compiled into binary
- **Disk-based:** `~/.claude/skills/` or `~/.claude/plugins/`
- **MCP-based:** External MCP servers

## Key MCP Categories

| Category | Examples | Forge OS Use |
|----------|----------|--------------|
| Database | Supabase, Postgres, SQLite | Schema queries, migrations |
| Version Control | GitHub, GitLab | Code push, PR management |
| Cloud | Cloudflare, AWS, Vercel | Deployment, DNS, CDN |
| Communication | Slack, Email, Discord | Notifications, alerts |
| Knowledge | LightRAG, Notion, Confluence | Documentation, knowledge graph |
| Automation | n8n, Zapier | Workflow orchestration |
| AI | Claude API, OpenAI, Ollama | Provider abstraction |
| File | PDF Tools, S3, Local FS | Document handling |
| Browser | Chrome, Preview | Visual verification |

## How to Use in Forge OS

**MCP integration layer:** Forge OS inherits Claude Code's MCP client. All MCP servers work unchanged. The value-add is our persona layer on top — agents know WHEN to use which MCP based on their domain expertise.

**Plugin development:** Follow the skill frontmatter pattern (see wshobson-agents/ reference). Forge OS skills should be compatible with both Forge desktop and Claude Code CLI.
