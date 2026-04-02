# Block 1: Workspace Setup

> **Sessions:** 1 | **Batches:** OS-B1.1 | **Source:** BUILD-PLAN.md Block 1

---

## OS-B1.1: Workspace Setup (Steps 1.1-1.7)

### Scope
Create full local directory structure, copy Phase 1 files from GitHub, set up references directory, update CLAUDE.md.

### Steps

**1.1** Create local directory at `C:\Users\alexb\Documents\Forge OS\forge-os\` (already exists)

**1.2** Clone or copy Phase 1 files from GitHub (`CYM4TIC/forge-OS`)
- CLAUDE.md, 9 methodology docs, 5 commands, settings, architecture plan

**1.3** Create full directory structure:
```
forge-os/
├── .claude/agents/              <- 40 genericized agents
├── .claude/agents/sub-agents/   <- 34 genericized sub-agents
├── .claude/commands/            <- 5 existing + 30 genericized
├── .claude/skills/              <- 5+ Antigravity skills
├── .forge/                      <- internal feedback loop state
│   ├── proposals/
│   ├── decisions/
│   ├── FEEDBACK-LOG.md
│   └── feedback-schema.md
├── personas/                    <- 10 identity sets
├── templates/
│   ├── project/                 <- scaffold templates for /init
│   ├── workflow/                <- session handoff, gate, agent brief
│   ├── persona/                 <- personality, introspection templates
│   └── spec/                    <- spec, segment, ADL templates
├── protocols/                   <- collaboration, party mode, retro
├── examples/                    <- sanitized reference files
├── runtime/
│   ├── src/
│   │   ├── engine/layout/       <- PRETEXT LAYOUT ENGINE
│   │   ├── dashboard/components/
│   │   ├── server/
│   │   │   └── feedback-loop/
│   │   └── integrations/
│   │       ├── lightrag/
│   │       └── document-gen/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── projects/                    <- gitignored, linked vaults here
├── forge/                       <- 9 methodology docs + 2 new
├── docs/                        <- architecture plan + 7 new
├── references/                  <- external source extractions
│   ├── pretext/
│   ├── trail-of-bits/
│   ├── ui-ux-pro-max/
│   ├── antigravity/
│   ├── ruflo/
│   ├── wshobson-agents/
│   ├── rosehill/
│   ├── lightrag/
│   ├── n8n/
│   ├── anthropic-plugins/
│   ├── ecosystem/
│   └── claude-agent-sdk/
├── tools/                       <- index-vault.py, utilities
└── forge-os.config.json
```

**1.4** Update CLAUDE.md for complete structure

**1.5** Push: "Phase 2 workspace ready"

**1.6** Create `references/` directory with all subdirectories

**1.7** Fetch and extract from each source repo (GitHub API):
- Pretext: README.md
- Trail of Bits: 18 security SKILL.md files
- UI UX Pro Max: reasoning rules, guidelines, anti-patterns, checklist, palettes, fonts
- Antigravity: 5 full skill directories
- Ruflo: 4 patterns from README
- wshobson: 3 patterns from docs
- Rosehill: 3 patterns
- LightRAG: README + MCP tools doc
- n8n: capabilities + setup guide
- Anthropic Plugins: plugin catalog
- Ecosystem: top 100 list
- Claude Agent SDK: API reference + parallel execution docs

### Exit Gate
- All directories created
- Phase 1 files present
- `references/` populated
- CLAUDE.md updated
- `pnpm turbo run build` green (or equivalent)
- Pushed to GitHub: "Phase 2 workspace ready"

---
