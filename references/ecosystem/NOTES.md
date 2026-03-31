# Ecosystem — Top Sources Triage

> Categorized assessment of all external sources informing Forge OS.

## Tier 1: Core Architecture (build the same thing)

| Source | What We Take | Priority |
|--------|-------------|----------|
| **Claude Code source** | Tool interface, coordinator, state, permissions, memory, skills | CRITICAL |
| **Forge DMS vault** | CLAUDE.md turnstile, persona dispatch, build loop, failure modes | CRITICAL |

## Tier 2: Domain Intelligence (make agents smarter)

| Source | What We Take | Priority |
|--------|-------------|----------|
| **Trail of Bits** | Security skill methodology for Tanaka + Wraith | HIGH |
| **UI UX Pro Max** | Design intelligence for Mara + Riven, pre-delivery checklist | HIGH |
| **Antigravity skills** | Postgres/Security/Next.js/Stripe/Tailwind for persona boots | HIGH |

## Tier 3: Patterns & Methodology (how to run agents)

| Source | What We Take | Priority |
|--------|-------------|----------|
| **wshobson/agents** | Model tiering, progressive disclosure, PluginEval framework | HIGH |
| **Ruflo** | Token optimization, anti-drift, self-learning loop | MEDIUM |

## Tier 4: Integration Primitives (what agents connect to)

| Source | What We Take | Priority |
|--------|-------------|----------|
| **Pretext** | Canvas text rendering for living HUD (Phase 3) | MEDIUM |
| **LightRAG** | Knowledge graph RAG for vault queries (Phase 7+) | LOW (future) |
| **n8n-MCP** | External workflow automation (Phase 7+) | LOW (future) |
| **Anthropic plugins** | MCP ecosystem awareness | LOW (reference only) |

## Tier 5: Identity & Process (how agents behave)

| Source | What We Take | Priority |
|--------|-------------|----------|
| **Rosehill** | Workspace model validation (we ARE the reference) | REFERENCE |
| **Claude Agent SDK** | API patterns for provider abstraction | REFERENCE |

## Key Decisions

1. **Claude Code coordinator = our Hyperdrive.** Same pattern, different transport.
2. **wshobson model tiering = our capability tiers.** Adopt 4-tier with cost awareness.
3. **Trail of Bits + Antigravity = persona skills.** Install as `.claude/skills/`, wire into boots.
4. **UI UX Pro Max checklist = Build Triad gate.** Pre-delivery checklist is now mandatory.
5. **Ruflo anti-drift = iteration limits.** All agents get max iterations + timeout bounds.
6. **Pretext = Phase 3 primitive.** Not needed until canvas HUD build.
7. **LightRAG + n8n = Phase 7+ integrations.** Reference captured, build later.
