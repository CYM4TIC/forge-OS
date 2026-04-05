## Phase 2: Content Layer (20 batches)

**Session map:** 2.1 = P2-A through P2-D | 2.2 = P2-E through P2-H | 2.3 = P2-I through P2-L | 2.4 = P2-M through P2-P | 2.5 = P2-Q through P2-T
**Prerequisite:** None (PARALLEL TRACK — zero app code dependencies)
**Repo:** CYM4TIC/forge-OS | **Local:** `.`
**Source material:** DMS vault agents at `.claude/agents/`, `.claude/commands/`, `02-team-logs/` personas. Claude Code source at `/tmp/src-explore/src/`.

**Goal:** 105 genericized agents, 13 external reference extractions, model tiering, persona enhancements, 30 commands, quality layer. The complete brain of the OS — project-agnostic, engine-agnostic.

**Genericization rules:**
- Strip ALL DMS-specific references (table names, RPCs, segments, bible paths, Supabase specifics)
- Replace with config-driven references (`{{project.schema}}`, `{{project.spec_dir}}`, etc.)
- Keep methodology, rules, checklists, personality, failure modes, relationships
- Keep tool declarations but make them conditional on project type
- Add `model:` frontmatter to every agent (high/medium/fast)

---

### P2-A: References Directory — Claude Code + Anthropic SDK

**Goal:** Extract architectural patterns from Claude Code source. The most important reference — we're building the same category of tool.

**Files:**
- `references/claude-code/NOTES.md` — Architecture summary, key patterns, design decisions
- `references/claude-code/tool-interface.md` — Tool definition contract (Zod schema + run generator + permission model)
- `references/claude-code/coordinator-pattern.md` — Multi-agent dispatch with isolated contexts
- `references/claude-code/skill-system.md` — Bundled + disk-based + MCP skill loading, `getPromptForCommand()` pattern
- `references/claude-code/state-management.md` — Zustand-like store, generator streaming, file state cache
- `references/claude-code/permission-model.md` — Three modes, hook-based auto-approve, tool-level validation
- `references/claude-code/memory-system.md` — memdir architecture, MEMORY.md index, topic files, truncation
- `references/claude-agent-sdk/NOTES.md` — API patterns, parallel execution, agent spawning

**Source:** `/tmp/src-explore/src/` (Claude Code source zip)
**Gate:** Each NOTES.md has actionable patterns, not just descriptions. Cross-referenced to Forge OS equivalents.
**Depends on:** Nothing
**Push:** Yes

---

### P2-B: References Directory — Security + Design Intelligence

**Goal:** Extract security and UX/design reference material from external repos.

**Files:**
- `references/trail-of-bits/NOTES.md` — Summary of 18 security SKILL.md patterns (static analysis, supply chain, OWASP)
- `references/trail-of-bits/skills/` — Key skill files extracted (top 5-8 most relevant)
- `references/ui-ux-pro-max/NOTES.md` — Summary of 161 reasoning rules, 99 UX guidelines, anti-patterns
- `references/ui-ux-pro-max/reasoning-rules.md` — Curated top 50 rules (most actionable for Forge)
- `references/ui-ux-pro-max/pre-delivery-checklist.md` — Full checklist adapted for Build Triad
- `references/ui-ux-pro-max/palettes.md` — Dark theme palettes relevant to Forge

**Source:** GitHub repos (trailofbits/skills, various UI/UX repos)
**Gate:** Tanaka can reference Trail of Bits. Mara can reference UX Pro Max. Both NOTES.md have "How to use in Forge" sections.
**Depends on:** Nothing
**Push:** Yes

---

### P2-C: References Directory — Skills + Ecosystem Patterns

**Goal:** Extract skill patterns and ecosystem intelligence.

**Files:**
- `references/antigravity/NOTES.md` — Summary of 5 skill directories (postgres, security, nextjs, stripe, tailwind)
- `references/antigravity/skills/` — Extracted skill content (adapted for Forge structure)
- `references/ruflo/NOTES.md` — Token optimization, anti-drift, self-learning loop, agent booster patterns
- `references/wshobson-agents/NOTES.md` — Model tiering rationale, progressive disclosure, plugin eval framework
- `references/rosehill/NOTES.md` — CLAUDE.md turnstile pattern, agent junction, workspace model

**Source:** GitHub repos
**Gate:** Each NOTES.md answers: "What does Forge OS take from this?" with specific integration points.
**Depends on:** Nothing
**Push:** Yes

---

### P2-D: References Directory — Integration + Platform Tools

**Goal:** Extract integration platform references and complete the references directory.

**Files:**
- `references/pretext/NOTES.md` — API patterns, measurement primitives, canvas rendering contract
- `references/lightrag/NOTES.md` — MCP tool docs (22 tools), RAG pipeline setup
- `references/n8n/NOTES.md` — Capabilities, MCP bridge, automation patterns
- `references/anthropic-plugins/NOTES.md` — Plugin catalog, connector mapping, SDK patterns
- `references/ecosystem/NOTES.md` — Top 100 triage, categorized by relevance to Forge
- `references/INDEX.md` — Master index of all 13 reference sources with one-line summaries

**Source:** GitHub repos, documentation sites
**Gate:** `references/INDEX.md` exists with all 13 entries. Every subdirectory has NOTES.md.
**Depends on:** P2-A, P2-B, P2-C (for complete index)
**Push:** Yes

---

### P2-E: Core Personas — Nyx + Pierce + Kehinde (3 agents)

**Goal:** Genericize the three build-critical personas. These are the hardest — most DMS-specific.

**Files (per persona):**
- `agents/nyx.md` — Build orchestrator, stripped of DMS tables/RPCs/segments. Config-driven spec refs.
- `agents/pierce.md` — QA/conformance, generic spec-adherence (not DMS bible). Config-driven ADL ref.
- `agents/kehinde.md` — Systems architecture, generic failure mode analysis. Config-driven schema ref.

**Genericization approach:**
- Replace `06-bible-segments/` → `{{project.spec_dir}}/`
- Replace `supabase:execute_sql` → `{{project.db_tool}}` (conditional on project type)
- Replace DMS table names → `{{project.schema}}` pattern references
- Replace `DISTILLED-ADL.md` → `{{project.adl_path}}`
- Keep ALL rules, failure modes, checklists, personality
- Add `model: high` frontmatter to all three

**Gate:** Each agent file compiles as valid Claude Code agent (frontmatter + prompt). No DMS-specific strings remain.
**Depends on:** Nothing
**Push:** Yes

---

### P2-F: Core Personas — Security + Legal + Finance (3 agents)

**Goal:** Genericize Tanaka, Voss, Vane.

**Files:**
- `agents/tanaka.md` — Security/compliance. Generic RLS/auth/PII/TCPA patterns. Wire Trail of Bits ref.
- `agents/voss.md` — Platform legal. Generic TOS/consent/compliance. Remove DMS-specific rulings.
- `agents/vane.md` — Financial architecture. Generic rate/pricing/payment patterns. Remove Forge DMS specifics.

**Genericization approach:**
- Tanaka: Replace DMS RPC names with pattern descriptions. Keep OWASP, RLS, PII scanning methodology.
- Voss: Remove all V-ASSESSMENT rulings. Keep legal review framework, consent patterns, TOS structure.
- Vane: Replace `get_effective_rate()` specifics with generic financial audit patterns. Keep Stripe ref.
- Add `model: high` (Tanaka, Vane), `model: medium` (Voss) frontmatter

**Gate:** No DMS-specific strings. Each agent's domain expertise preserved.
**Depends on:** P2-B (Trail of Bits ref for Tanaka)
**Push:** Yes

---

### P2-G: Core Personas — UX + Design + Brand + Growth (4 agents)

**Goal:** Genericize Mara, Riven, Sable, Calloway.

**Files:**
- `agents/mara.md` — UX evaluation. Generic 10-item checklist. Wire UI UX Pro Max ref.
- `agents/riven.md` — Design systems. Generic token/component/a11y audit. Wire Tailwind ref.
- `agents/sable.md` — Brand voice. Generic voice consistency, copy quality.
- `agents/calloway.md` — Growth strategy. Generic GTM, competitive analysis, pricing.

**Genericization approach:**
- Mara: Replace DMS component refs with generic patterns. Keep a11y, interaction, mobile checklists.
- Riven: Replace `--forge-*` tokens with `{{project.design_tokens}}`. Keep touch target rules, theme checks.
- Sable: Remove DMS voice specifics. Keep voice consistency methodology.
- Calloway: Remove DMS competitors. Keep competitive analysis framework.
- Add `model: medium` frontmatter to all four

**Gate:** No DMS-specific strings. Methodology preserved. References wired.
**Depends on:** P2-B (UI UX Pro Max ref for Mara)
**Push:** Yes

---

### P2-H: Intelligences — Scout + Sentinel + Wraith + Meridian + Chronicle (5 agents)

**Goal:** Genericize the 5 build-pipeline intelligences.

**Files:**
- `agents/scout.md` — Pre-build intelligence. Generic schema recon, open findings scan.
- `agents/sentinel.md` — Regression guardian. Generic route verification, post-push checks.
- `agents/wraith.md` — Red team. Generic input fuzzing, auth probing, concurrency attacks.
- `agents/meridian.md` — Cross-surface consistency. Generic pattern cataloging, drift detection.
- `agents/chronicle.md` — Build historian. Generic velocity, finding patterns, retrospectives.

**Genericization approach:**
- Replace DMS route paths with `{{project.routes}}` patterns
- Replace Supabase-specific tools with conditional tool blocks
- Keep all attack vectors (Wraith), scanning patterns (Sentinel), consistency rules (Meridian)
- Add `model: medium` (Scout, Wraith, Meridian, Chronicle), `model: fast` (Sentinel)

**Gate:** No DMS strings. Each intelligence's core methodology intact.
**Depends on:** Nothing
**Push:** Yes

---

### P2-I: Intelligences — Arbiter + Compass + Scribe + Kiln + Beacon (5 agents)

**Goal:** Genericize the 5 analysis/monitoring intelligences.

**Files:**
- `agents/arbiter.md` — Decision council chairman. Already mostly generic. Add `model: high`.
- `agents/compass.md` — Impact analysis. Generic dependency graph mapping. Config-driven schema.
- `agents/scribe.md` — Knowledge synthesis. Generic documentation generation.
- `agents/kiln.md` — Performance. Generic query profiling, bundle analysis, render bottlenecks.
- `agents/beacon.md` — Post-deploy watchdog. Generic error log monitoring, anomaly detection.

**Gate:** No DMS strings. Domain-agnostic analysis patterns.
**Depends on:** Nothing
**Push:** Yes

---

### P2-J: Orchestrators — All 10

**Goal:** Genericize all orchestrator agents that coordinate multi-agent workflows.

**Files:**
- `agents/triad.md` — Build Triad (Pierce+Mara+Kehinde). Default build gate.
- `agents/systems-triad.md` — Systems Triad (Kehinde+Tanaka+Vane). Generic backend gate.
- `agents/strategy-triad.md` — Strategy Triad (Calloway+Voss+Sable). Generic business gate.
- `agents/gate-runner.md` — Full gate orchestrator. Config-driven gate mapping.
- `agents/council.md` — All 10 personas architectural review.
- `agents/decision-council.md` — 5 cognitive-lens advisors + Arbiter. Already mostly generic.
- `agents/debate.md` — 2-persona structured debate. Already generic.
- `agents/full-audit.md` — Nuclear quality pass. Generic all-triads dispatch.
- `agents/launch-sequence.md` — Pre-launch go/no-go. Generic launch checklist.
- `agents/postmortem.md` — Blameless incident analysis. Already mostly generic.

**Genericization approach:**
- Replace DMS-specific gate mappings with config-driven `{{project.gate_config}}`
- Replace specific route/surface references with generic patterns
- Keep dispatch patterns, finding aggregation, severity classification

**Gate:** All 10 orchestrators compile. No DMS strings. Dispatch patterns preserved.
**Depends on:** P2-E through P2-I (personas they orchestrate must exist)
**Push:** Yes

---

### P2-K: Customer Lens + Utilities — 11 agents

**Goal:** Genericize customer lens and all 10 utility agents.

**Files:**
- `agents/customer-lens.md` — Already domain-agnostic. Clean up any DMS examples.
- `agents/seed-generator.md` — Generic test data generation. Config-driven schema.
- `agents/test-generator.md` — Generic smoke test scripts.
- `agents/api-docs.md` — Generic RPC documentation.
- `agents/launch-readiness.md` — Generic blocker/risk cross-reference.
- `agents/onboarding.md` — Generic vault/codebase walkthrough.
- `agents/scaffold.md` — Generic boilerplate generation.
- `agents/changelog.md` — Generic release notes from git history.
- `agents/dep-audit.md` — Generic dependency audit.
- `agents/env-validator.md` — Generic env var checking.
- `agents/migration-planner.md` — Generic migration SQL generation.

**Gate:** All 11 agents compile. No DMS strings.
**Depends on:** Nothing
**Push:** Yes

---

### P2-L: Sub-Agents — All 34

**Goal:** Genericize all focused sub-agent checkers.

**Files (34 total, in `agents/sub-agents/`):**
- Pierce sub-agents (3): `pierce-adl-audit.md`, `pierce-field-presence.md`, `pierce-rpc-shape.md`
- Mara sub-agents (3): `mara-accessibility.md`, `mara-interaction.md`, `mara-mobile.md`
- Riven sub-agents (3): `riven-theme-check.md`, `riven-token-audit.md`, `riven-touch-targets.md`
- Kehinde sub-agents (4): `kehinde-failure-modes.md`, `kehinde-migration-validator.md`, `kehinde-race-conditions.md`, `kehinde-schema-drift.md`
- Tanaka sub-agents (3): `tanaka-pii-scan.md`, `tanaka-rls-audit.md`, `tanaka-tcpa-check.md`
- Sable sub-agents (1): `sable-voice-consistency.md`
- Compass sub-agents (2): `compass-change-impact.md`, `compass-dependency-map.md`
- Kiln sub-agents (2): `kiln-bundle-analyzer.md`, `kiln-query-profiler.md`
- Beacon sub-agents (2): `beacon-error-watch.md`, `beacon-performance-watch.md`
- Calloway sub-agents (1): `calloway-competitive-scan.md`
- Meridian sub-agents (1): `meridian-pattern-scan.md`
- Wraith sub-agents (3): `wraith-auth-probe.md`, `wraith-concurrency.md`, `wraith-input-fuzzer.md`
- Council advisors (5): `council-contrarian.md`, `council-executor.md`, `council-expansionist.md`, `council-first-principles.md`, `council-outsider.md`
- Instrumentation (1): `instrumentation-audit.md`

**Genericization:** Strip DMS table/RPC refs. Keep methodology. Add `model: fast` to all.
**Gate:** All 34 compile. No DMS strings.
**Depends on:** Nothing (sub-agents are self-contained)
**Push:** Yes (2 pushes — max 20 files each)

---

### P2-M: Model Tiering System

**Goal:** Formalize model tiering across all agents. Document rationale. Add enforcement.

**Files:**
- `forge/MODEL-TIERING.md` — Full tiering document:
  - Tier definitions: high (opus-class), medium (sonnet-class), fast (haiku-class)
  - Per-agent tier assignments with rationale
  - Cost estimation model (tokens × tier rate)
  - Override mechanism (user can promote/demote for specific tasks)
  - Validation: agents without `model:` frontmatter = error
- `forge/AGENT-MANIFEST.md` — Complete agent inventory (105 entities, tier, domain, parent)
- Verify ALL agent files have `model:` frontmatter (scan + fix)

**Gate:** `forge/AGENT-MANIFEST.md` lists all 105 entities. Every agent file has valid `model:` frontmatter.
**Depends on:** P2-E through P2-L (all agents must exist)
**Push:** Yes

---

### P2-N: Slash Commands — Build + Quality (15 commands)

**Goal:** Genericize the build and quality slash commands.

**Files (in `commands/`):**
- Build: `gate.md`, `next-batch.md`, `verify.md`, `adversarial.md`, `batch-status.md`, `scaffold.md`
- Quality: `regression.md`, `consistency.md`, `red-team.md`, `audit.md`, `perf.md`
- Analysis: `impact.md`, `deps.md`, `env-check.md`, `postmortem.md`

**Genericization:** Replace DMS-specific build loops with config-driven references. Keep command signatures and dispatch patterns.
**Gate:** All 15 commands have valid frontmatter. No DMS strings.
**Depends on:** P2-E through P2-J (commands dispatch agents)
**Push:** Yes

---

### P2-O: Slash Commands — Persona + Reporting + Operations (15 commands)

**Goal:** Genericize the remaining slash commands.

**Files (in `commands/`):**
- Persona: `wake.md`, `council.md`, `decide.md`, `customer-lens.md`, `findings.md`
- Reporting: `retro.md`, `launch-check.md`, `tech-debt.md`, `demo.md`, `changelog.md`
- Operations: `launch.md`, `onboard.md`, `seed.md`, `api-docs.md`, `parallel-build.md`

**Gate:** All 15 commands compile. No DMS strings. Full 30-command set complete.
**Depends on:** P2-E through P2-J
**Push:** Yes

---

### P2-P: Skills + Quality Layer

**Goal:** Install skills, wire references into agent boots, formalize quality enforcement.

**Files:**
- `.claude/skills/postgres-best-practices/SKILL.md` — Adapted from Antigravity
- `.claude/skills/security-auditor/SKILL.md` — Adapted from Antigravity + Trail of Bits
- `.claude/skills/nextjs-best-practices/SKILL.md` — Adapted from Antigravity
- `.claude/skills/stripe-integration/SKILL.md` — Adapted from Antigravity
- `.claude/skills/tailwind-design-system/SKILL.md` — Adapted from Antigravity
- `docs/DESIGN-INTELLIGENCE.md` — Curated from UI UX Pro Max (for Mara/Riven)
- `docs/ECOSYSTEM-PATTERNS.md` — Ruflo token optimization + anti-drift + self-learning loop
- `docs/ECOSYSTEM-INTEL.md` — Full triage of 13 external sources

**Gate:** Each skill can be invoked. Agent boot sequences reference relevant skills. Quality docs complete.
**Depends on:** P2-B, P2-C (reference sources), P2-E through P2-G (agent wiring)
**Push:** Yes

---

### P2-Q: Persona Identity Sets — Nyx + Pierce + Kehinde + Tanaka + Vane

**Goal:** Export the 5 high-tier persona identity sets from DMS vault.

**Files (per persona, in `personas/{name}/`):**
- `PERSONA.md` — Identity, rules, checklists (genericized)
- `PERSONALITY.md` — Voice, humor, backstory (kept as-is — personality is universal)
- `INTROSPECTION.md` — Self-awareness, failure modes (genericized)
- `RELATIONSHIPS.md` — Cross-persona dynamics (kept — names don't change)

**Genericization:** Strip DMS batch refs from PERSONA.md. Strip DMS table refs from INTROSPECTION.md. Personality and relationships are already universal.
**Gate:** 5 persona directories, 4 files each = 20 files. No DMS build state.
**Depends on:** Nothing (source is DMS vault, output is Forge OS)
**Push:** Yes

---

### P2-R: Persona Identity Sets — Mara + Riven + Sable + Calloway + Voss

**Goal:** Export the 5 medium-tier persona identity sets.

**Files:** Same structure as P2-Q, 5 personas × 4 files = 20 files.

**Gate:** 5 persona directories complete. No DMS build state.
**Depends on:** Nothing
**Push:** Yes

---

### P2-S: Templates + Protocols

**Goal:** Adapt templates and protocols for Forge OS structure.

**Files:**
- `templates/SESSION-HANDOFF-TEMPLATE.md`
- `templates/GATE-ENFORCEMENT-TEMPLATE.md`
- `templates/AGENT-BRIEF-TEMPLATE.md`
- `templates/BUILD-REPORT-TEMPLATE.md`
- `templates/RETROSPECTIVE-TEMPLATE.md`
- `templates/DECISION-RECORD-TEMPLATE.md`
- `templates/PROJECT-SCAFFOLD-TEMPLATE.md` (includes optional layout-engine when Pretext detected)
- `protocols/COLLABORATION-PROTOCOL.md`
- `protocols/PARTY-MODE.md`
- `protocols/RETROSPECTIVE-PROTOCOL.md`
- `protocols/PERSONALITY-MAINTENANCE.md`
- `examples/sample-adl.md`
- `examples/sample-manifest.md`
- `examples/sample-gate-report.md`
- `examples/sample-build-learnings.md`

**Genericization:** Replace DMS vault paths with Forge OS paths. Replace DMS-specific fields with config-driven placeholders.
**Gate:** All 15 files created. Templates are usable for any project type.
**Depends on:** Nothing
**Push:** Yes

---

### P2-T: CLAUDE.md + Integration Verification

**Goal:** Write the Forge OS CLAUDE.md (the bridge file) and verify all 105 entities work together.

**Files:**
- `CLAUDE.md` — Forge OS version. Auto-loaded by Claude Code. References all agents, commands, skills, protocols, templates. Config-driven project type detection.
- `forge/ACTIVATION-GUIDE.md` — How to activate Forge OS on a new project (`/init` flow)
- `forge/ENTITY-CATALOG.md` — Complete catalog of all 105 entities with descriptions, tiers, dependencies

**Verification:**
- Scan all agent files for residual DMS strings (grep for "forge-dms", "bible", "supabase", etc.)
- Verify all `model:` frontmatter present
- Verify all command → agent dispatch chains
- Verify all sub-agent → parent references
- Count: should be 105 entities (10 personas + 10 intelligences + 10 orchestrators + 1 customer-lens + 10 utilities + 34 sub-agents + 30 commands)

**Gate:** CLAUDE.md loads cleanly. Zero DMS residue. 105 entities cataloged.
**Depends on:** ALL prior P2 batches
**Push:** Yes

---

## Phase 2 Summary

| Batch | Name | Files | Session | Key Dependency |
|-------|------|-------|---------|----------------|
| P2-A | Refs: Claude Code + SDK | 8 | 2.1 | None |
| P2-B | Refs: Security + Design | 6 | 2.1 | None |
| P2-C | Refs: Skills + Ecosystem | 5 | 2.1 | None |
| P2-D | Refs: Integration + Index | 6 | 2.1 | P2-A/B/C |
| P2-E | Personas: Nyx+Pierce+Kehinde | 3 | 2.2 | None |
| P2-F | Personas: Tanaka+Voss+Vane | 3 | 2.2 | P2-B |
| P2-G | Personas: Mara+Riven+Sable+Calloway | 4 | 2.2 | P2-B |
| P2-H | Intelligences: Pipeline 5 | 5 | 2.2 | None |
| P2-I | Intelligences: Analysis 5 | 5 | 2.3 | None |
| P2-J | Orchestrators: All 10 | 10 | 2.3 | P2-E through P2-I |
| P2-K | Customer Lens + Utilities | 11 | 2.3 | None |
| P2-L | Sub-Agents: All 34 | 34 | 2.3 | None |
| P2-M | Model Tiering System | 2 | 2.4 | P2-E through P2-L |
| P2-N | Commands: Build+Quality 15 | 15 | 2.4 | P2-E through P2-J |
| P2-O | Commands: Persona+Ops 15 | 15 | 2.4 | P2-E through P2-J |
| P2-P | Skills + Quality Layer | 8 | 2.4 | P2-B/C, P2-E/G |
| P2-Q | Persona IDs: High-tier 5 | 20 | 2.5 | None |
| P2-R | Persona IDs: Medium-tier 5 | 20 | 2.5 | None |
| P2-S | Templates + Protocols | 15 | 2.5 | None |
| P2-T | CLAUDE.md + Verification | 3 | 2.5 | ALL |
| **Total** | | **~198 files** | **5 sessions** | |

### Session Boundaries

- **Session 2.1 (P2-A → P2-D):** References directory complete. 13 sources extracted. INDEX.md.
- **Session 2.2 (P2-E → P2-H):** 10 core personas + 5 pipeline intelligences genericized.
- **Session 2.3 (P2-I → P2-L):** 5 analysis intelligences + 10 orchestrators + 11 utilities + 34 sub-agents.
- **Session 2.4 (P2-M → P2-P):** Model tiering + 30 commands + 5 skills + quality layer.
- **Session 2.5 (P2-Q → P2-T):** 10 persona identity sets + templates + CLAUDE.md + final verification.

### Parallel Opportunities

- P2-A, P2-B, P2-C can all run in parallel (independent reference extractions)
- P2-E, P2-F, P2-G, P2-H can run in parallel (independent agent genericizations)
- P2-I, P2-K, P2-L can run in parallel (no cross-dependencies)
- P2-Q, P2-R, P2-S can run in parallel (independent content)
- P2-N and P2-O can run in parallel (independent command sets)

### Risk Notes

- **Genericization depth:** Some agents are deeply DMS-entangled (especially Nyx, Pierce). May need iterative passes.
- **Claude Code source:** Extracted to /tmp — ephemeral. P2-A must capture everything needed into references/.
- **105 entity count:** Final count may shift slightly if sub-agents are merged or split during genericization.
- **Config placeholders:** `{{project.*}}` syntax needs to be consistent across all agents. Define schema in P2-T.

---

