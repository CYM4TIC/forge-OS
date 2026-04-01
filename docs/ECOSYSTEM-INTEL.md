# Ecosystem Intel

> Full triage of all external sources informing Forge OS architecture and capabilities.
> Categorized by priority tier. Each entry: what it is, what we take, how it maps to our system.

---

## Tier 1: Core Architecture

These sources define HOW Forge OS works. The same category of tool.

### Claude Code (Anthropic)
- **What:** The CLI tool that Forge OS runs inside. 105K+ lines. TypeScript + React.
- **What we take:**
  - **Tool interface pattern** — Zod schema + run generator + permission model. Our agents inherit this contract.
  - **Coordinator pattern** — Multi-agent dispatch with isolated contexts. Our Hyperdrive.
  - **Skill system** — Bundled + disk-based + MCP skill loading. Our `.claude/skills/` directory.
  - **State management** — Zustand-like store, generator streaming, file state cache.
  - **Permission model** — Three modes (ask/auto/deny), hook-based auto-approve, tool-level validation.
  - **Memory system** — `MEMORY.md` index + topic files. Our BUILD-LEARNINGS.md and BOOT.md are purpose-built variants.
- **Reference files:** `references/claude-code/` (7 pattern files + NOTES.md)
- **How it maps:** We don't rebuild Claude Code. We build the intelligence layer that runs inside it.

### Claude Agent SDK (Anthropic)
- **What:** API patterns for building agents on Claude. Parallel execution, agent spawning, tool use.
- **What we take:**
  - API patterns for provider abstraction (our ModelProvider trait)
  - Parallel execution model (our agent dispatch)
  - Tool use contract (our agent tool declarations)
- **Reference files:** `references/claude-agent-sdk/NOTES.md`
- **How it maps:** Our Rust backend's provider system mirrors the SDK's patterns.

### Forge DMS Vault
- **What:** The first production implementation of the persona-driven development methodology.
- **What we take:**
  - CLAUDE.md turnstile pattern (auto-loaded bridge between tool and project)
  - Persona dispatch system (10 personas, 5-tier activation)
  - Build loop (Scout → Build → Triad → Sentinel)
  - Failure mode catalog (10 documented failure modes with defenses)
  - 41 rules (learned from production build experience)
- **How it maps:** DMS is the proof-of-concept. Forge OS is the genericized, portable version.

---

## Tier 2: Domain Intelligence

These sources make our agents smarter at their specific domains.

### Trail of Bits — Security Skills
- **What:** 18 production security skills from the leading security research firm.
- **What we take:**
  - Semgrep integration methodology (static analysis)
  - Supply chain risk auditing (dependency analysis)
  - Insecure defaults detection (fail-open pattern recognition)
  - Differential security review (PR-level risk classification)
  - Audit context building (ultra-granular code analysis)
- **Persona mapping:** Tanaka (primary), Wraith (attack patterns)
- **Reference files:** `references/trail-of-bits/NOTES.md`
- **Installed as:** security-auditor skill (`.claude/skills/security-auditor/`)

### oh-my-claudecode (18.6k stars)
- **What:** Multi-agent orchestration layer for Claude Code. 20 agents, 37 skills, 11 hook points.
- **What we take:**
  - Deep Interview protocol (Socratic ambiguity scoring + ontology convergence tracking)
  - Ralph persistence loop (PRD-driven completion with testable acceptance criteria)
  - Ralplan-first gate (vague request detection with concrete signal scanning)
  - Worker hierarchy protocol (explicit preamble, no sub-agent spawning)
  - Stage handoff documents (decisions + rejected alternatives + risks)
  - Deslop pass (post-build AI code cleanup)
  - Circuit breakers (3-failure limit on fix cycles)
  - Critic self-audit + realist severity check
  - Pre-mortem analysis (3 failure scenarios before build)
  - Deliverable verification on sub-agent completion
  - PreCompact learning persistence
  - Dispatch queue fairness (snake-order complexity balancing)
  - Idle nudge / watchdog (stuck worker detection and reassignment)
  - Sentinel gate on swarm completion (plausibility check)
  - Atomic write + file locking for state
  - Multi-perspective review lenses (security / new-hire / ops)
  - Intra-task progress tracking
- **Persona mapping:** Nyx (persistence, gates, pre-mortem), Pierce (self-audit, lenses), all agents (circuit breakers, handoffs), swarm system (worker hierarchy, fairness, completion gate)
- **Reference files:** `references/oh-my-claudecode/NOTES.md`
- **Installed as:** 4 protocol docs (`docs/DEEP-INTERVIEW-PROTOCOL.md`, `PERSISTENCE-PROTOCOL.md`, `EXECUTION-GATES.md`, `HANDOFF-PROTOCOL.md`) + SWARM-PROTOCOL.md updates

### UI UX Pro Max
- **What:** 161 reasoning rules, 99 UX guidelines, 67 styles, 161 palettes, 57 font pairings.
- **What we take:**
  - Pre-delivery checklist (15 mandatory items for every frontend surface)
  - Top 30 UX guidelines organized by category
  - Dark theme reference palette for developer tools
  - Font pairing recommendations
  - Design system generation pattern
- **Persona mapping:** Mara (UX evaluation), Riven (design systems)
- **Reference files:** `references/ui-ux-pro-max/NOTES.md`
- **Installed as:** DESIGN-INTELLIGENCE.md (`docs/`)

### Antigravity — Claude Code Skills
- **What:** 5 production skills: Postgres, Security, Next.js, Stripe, Tailwind.
- **What we take:**
  - Postgres best practices (30+ rules, 8 categories) → Kehinde skill
  - Security auditor (12 domains, OWASP/ASVS/STRIDE) → Tanaka skill (merged with Trail of Bits)
  - Next.js best practices (server/client decision tree, caching) → Nyx skill
  - Stripe integration (4 payment flows, webhook handling) → Vane skill
  - Tailwind design system (token hierarchy, component architecture) → Riven skill
- **Reference files:** `references/antigravity/NOTES.md`
- **Installed as:** 5 skills in `.claude/skills/`

---

## Tier 3: Patterns & Methodology

These sources inform how we run and optimize our agent system.

### wshobson/agents — Multi-Agent Patterns
- **What:** Model tiering, progressive disclosure, PluginEval framework.
- **What we take:**
  - **Model tiering** — 3-tier system (high/medium/fast) with cost awareness. 10 high-tier agents, 23 medium, 42 fast.
  - **Progressive disclosure** — Agent complexity scales with task complexity. Quick tier → Standard → Full → Deep.
  - **PluginEval** — Framework concept for evaluating agent effectiveness. Our retrospective + Chronicle analysis.
- **Reference files:** `references/wshobson-agents/NOTES.md`
- **Installed as:** `forge/MODEL-TIERING.md` + `forge/AGENT-MANIFEST.md`

### Ruflo — Agent Orchestration
- **What:** Enterprise multi-agent framework. 6000+ commits, 108 agents, 313 tools.
- **What we take:**
  - **Token optimization** — Worker count discipline, stall detection, schedule relaxation
  - **Anti-drift** — Task source allowlists, iteration limits, safety bounds
  - **Self-learning loop** — Reward calculation, graceful degradation, re-engagement prompts
- **Reference files:** `references/ruflo/NOTES.md`
- **Installed as:** ECOSYSTEM-PATTERNS.md (`docs/`)

---

## Tier 4: Integration Primitives

Future integration targets. Reference captured, build deferred.

### Pretext (@chenglou/pretext)
- **What:** Hybrid DOM+Canvas text rendering. Zero CLS. For customer-facing rich text.
- **When:** Phase 3 (Canvas HUD). L5-B in DMS.
- **What we take:** Rendering approach for the Canvas panel and any living document display.
- **Reference files:** `references/pretext/NOTES.md`

### LightRAG
- **What:** Knowledge graph RAG for natural language queries over structured data.
- **When:** Phase 7+ (Knowledge Layer).
- **What we take:** RAG pattern for vault queries — ask questions about your project in natural language.
- **Reference files:** `references/lightrag/NOTES.md`

### n8n-MCP
- **What:** External workflow automation. 1000+ integrations via MCP bridge.
- **When:** Phase 7+ (Workflow Automation).
- **What we take:** Connection pattern for Slack, Notion, email, calendar, CRM, etc.
- **Reference files:** `references/n8n/NOTES.md`

### Anthropic Plugin Ecosystem
- **What:** MCP ecosystem awareness. Official + community servers.
- **What we take:** Awareness of available MCPs for project configuration.
- **Reference files:** `references/anthropic-plugins/NOTES.md`

---

## Tier 5: Identity & Process

Reference implementations that validate our approach.

### Rosehill (Cursor Workspace Model)
- **What:** Workspace management for AI-assisted development.
- **Assessment:** We ARE the reference implementation for this category. Rosehill validates the concept, we exceed the execution.
- **Reference files:** `references/rosehill/NOTES.md`

### Claude Agent SDK (API Patterns)
- **What:** Official API for building Claude-powered agents.
- **Assessment:** Our provider abstraction in the Tauri backend mirrors these patterns. Used for validation, not adoption.
- **Reference files:** `references/claude-agent-sdk/NOTES.md`

---

## Key Architectural Decisions from Ecosystem Analysis

1. **Claude Code coordinator = our Hyperdrive.** Same dispatch-and-isolate pattern, different transport (internal agent system vs Claude Code's subprocess model).

2. **wshobson model tiering = our capability tiers.** Adopted as 3-tier (high/medium/fast) with cost awareness built into every agent's frontmatter.

3. **Trail of Bits + Antigravity = persona skills.** Installed as `.claude/skills/`, wired into persona boot sequences. Each skill enhances a specific persona.

4. **UI UX Pro Max checklist = Build Triad gate.** The 15-item pre-delivery checklist is now a mandatory gate item for every frontend surface.

5. **Ruflo anti-drift = iteration limits + stall detection.** All agents get max iterations and timeout bounds. Documented in ECOSYSTEM-PATTERNS.md.

6. **Pretext = Phase 3 primitive.** Canvas rendering for the HUD panel. Not needed until Phase 3.

7. **LightRAG + n8n = Phase 7+ integrations.** Knowledge graph and workflow automation. Reference captured, build deferred.

8. **oh-my-claudecode = execution discipline layer.** 17 patterns extracted: deep interview (ambiguity gating), ralph persistence (empirical completion), ralplan gate (vague request detection), worker hierarchy, handoff documents, deslop pass, circuit breakers, self-audit, pre-mortem, deliverable verification, precompact persistence, review lenses, dispatch fairness, idle nudge, sentinel completion gate, atomic writes, intra-task progress. Installed as 4 protocol docs + swarm updates.

---

## Source Count

| Tier | Sources | Priority |
|------|---------|----------|
| Tier 1: Core Architecture | 3 | CRITICAL |
| Tier 2: Domain Intelligence | 4 | HIGH |
| Tier 3: Patterns & Methodology | 2 | HIGH/MEDIUM |
| Tier 4: Integration Primitives | 4 | MEDIUM/LOW |
| Tier 5: Identity & Process | 2 | REFERENCE |
| **Total** | **15** | |

All 15 sources extracted into `references/`. 5 skills in `.claude/skills/`. 7 methodology docs in `docs/`. 17 OMC patterns integrated across 4 protocol docs + swarm protocol updates.
