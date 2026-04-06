# Forge OS — Ecosystem Refinement

> Decisions from the April 5, 2026 brainstorm session. Source of truth for the restructuring.
> These decisions reshape the agent ecosystem from 42 agents + 35 sub-agents into
> a 14-persona team with streamlined support structure.

---

## Core Principle

**The personas are the team. Everything else is tooling.**

14 world-class domain experts. Each one a permanent team member who brings professional expertise to every project. Not project workers — senior professionals whose knowledge travels with them and grows through use.

---

## The 11 Personas

Wraith elevated from "intelligence" to full persona. Scout, Sentinel, and Meridian become Nyx sub-agents — they serve the build loop and maintenance loop, not independent domain expertise. There is no tier distinction among the 11. One team.

| Persona | Domain | Absorbs |
|---------|--------|---------|
| **Nyx** | Build Orchestration | Chronicle (sub-agent), Scribe (sub-agent), Scout (sub-agent), Sentinel (sub-agent, absorbs Beacon), Meridian (sub-agent) |
| **Pierce** | QA & Spec Conformance | — |
| **Mara** | UX Evaluation | — |
| **Kehinde** | Systems Architecture | Kiln (performance), Compass (impact analysis) |
| **Tanaka** | Security & Compliance | — |
| **Riven** | Design Systems | — |
| **Vane** | Financial Architecture | — |
| **Voss** | Platform Legal | — |
| **Calloway** | Growth Strategy | — |
| **Sable** | Brand Voice & Copy | — |
| **Wraith** | Adversarial Red Team | — |

### What "world-class" means

These personas were originally created as domain experts for a specific project. They need to be world-class experts across the board. Mara isn't "UX evaluator for a Tauri desktop app" — she's a senior UX architect who can evaluate any product on any platform. Kehinde isn't constrained to SQLite or Supabase — he's a systems architect who thinks in failure modes, state machines, and concurrent access across any database technology.

Profiles reflect this: professional resumes, not project assignments.

### Absorption details

| Absorbed Agent | Into | How |
|----------------|------|-----|
| **Chronicle** | Nyx (sub-agent) | Pattern mining at Phase 5. Deployed by Nyx, not performed by Nyx. The historian is a dispatched hand, not a cognitive posture. |
| **Scribe** | Nyx (sub-agent) | Knowledge synthesis at Phase 5. The writing IS the thinking — Scribe discovers patterns through composition, not transcription. |
| **Scout** | Nyx (sub-agent) | Pre-build intelligence at Phase 0. Terrain mapping, brief generation. Post-build: change-request recon, bug investigation. |
| **Sentinel** | Nyx (sub-agent) | Regression scanning at Phase 4 (absorbs Beacon). Post-build: production monitoring, deploy verification. |
| **Meridian** | Nyx (sub-agent) | Cross-surface consistency at Phase 4 exit. Post-build: pattern drift detection, style coherence enforcement. |
| **Arbiter** | Discussion protocol | Decision synthesis becomes a step in the discussion protocol, not a separate persona. |
| **Kiln** | Kehinde | Performance profiling becomes a Kehinde methodology. Query analysis and optimization are systems architecture through a performance lens. |
| **Compass** | Kehinde | Impact analysis (BFS dependency graph, change impact scoring) becomes a Kehinde methodology. |
| **Beacon** | Sentinel (via Nyx) | Post-deploy monitoring absorbed into Sentinel sub-agent. Same methodology (differential scanning), different timing. |

### Why Scout, Sentinel, Meridian are sub-agents (not personas)

The test is independence. Personas bring professional judgment to any project — they have domain expertise that exists outside the build loop. Sub-agents serve a specific function in a specific phase of a specific workflow.

- **Scout** serves Nyx's Phase 0. No other persona dispatches Scout. Scout doesn't wake up independently.
- **Sentinel** serves Nyx's Phase 4. Every batch. Regression scanning is verification of Nyx's output.
- **Meridian** serves Nyx's Phase 4 exit. Cross-surface consistency is verification of Nyx's integration.
- **Wraith** stays as a persona because: 4 sub-agents of its own, distinct voice (l33tspeak), independent methodology (adversarial red teaming), and future plans beyond the build loop. Tanaka could dispatch Wraith independently.

The principle: **if it only serves the build loop, it's a sub-agent. If it has independent domain expertise, it's a persona.**

---

## Orchestrator Collapse → Nyx Methodology

### Before: 10 orchestrators

Build Triad, Systems Triad, Strategy Triad, Gate Runner, Full Audit, Council, Decision Council, Debate, Launch Sequence, Postmortem.

### P7.5-B: 10 → 2 parameterized dispatchers

Gate Dispatcher and Discussion Protocol. Consolidated 10 orchestrators into 2 parameterized routers.

### P7.5-D.0: 2 → 0 dispatchers (absorbed into Nyx)

Both dispatchers retired. The routing logic is Nyx methodology, not a separate entity. Nyx IS the gate dispatcher.

**Gate routing (smart):** Pierce (always) + manifest `Gate:` field + auto-detect from files touched. No fixed triads — routing is dynamic based on what the batch actually touches.

| Files Touched | Adds |
|--------------|------|
| .tsx, .css, components/, pages/ | **Mara** (UX) |
| tokens, theme, design system | **Riven** (design) |
| .rs, schema, migration, queries | **Kehinde** (architecture) |
| auth, rls, secrets, permissions | **Tanaka** (security) |
| payment, rates, billing | **Vane** (financial) |
| tos, consent, privacy, legal | **Voss** (legal) |
| labels, strings, copy, messages | **Sable** (voice) |
| pricing, tiers, growth, plans | **Calloway** (strategy) |

Modes: default (smart routing), `--add [name]` (explicit additions), `--full` (all 10 non-Nyx personas).

**Discussion formats (Nyx-orchestrated):**
- `/council` → all 11 personas weigh in, Nyx synthesizes
- `/decide` → 5 cognitive lenses + peer review + Nyx synthesis
- `/debate [a] [b]` → 2-persona structured argument + Nyx synthesis

Launch Sequence and Postmortem remain commands that invoke these formats with specific parameters.

---

## Sub-Agent Refinement

### Principle

Personas own their sub-agents. The operator never manages sub-agents directly. When Pierce runs a gate review, Pierce decides to dispatch his sub-agents in parallel. The operator says "/gate" — Pierce decides the rest.

### Keep (20 sub-agents — genuinely parallel, independent methodology) + 6 Nyx sub-agents

| Parent | Sub-Agents | Parallel Function |
|--------|-----------|-------------------|
| **Nyx** (6) | scout, sentinel, meridian, chronicle, scribe, banger-mode | Build loop phases 0/4/5 + iterative fix loop |
| **Wraith** (4+) | input-fuzzer, auth-probe, concurrency, parseltongue, banger-mode (break variant) | Four attack surfaces + iterative break loop |
| **Kehinde** (4) | failure-modes, schema-drift, race-conditions, migration-validator | Four analysis dimensions simultaneously |
| **Tanaka** (3) | rls-audit, pii-scan, tcpa-check | Three security surfaces simultaneously |
| **Pierce** (3) | adl-audit, field-presence, rpc-shape | Three conformance checks simultaneously |
| **Mara** (3) | accessibility, interaction, mobile | Three evaluation passes simultaneously |
| **Riven** (3) | token-audit, touch-targets, theme-check | Three design audits simultaneously |

### Nyx Sub-Agents (6) — Build Loop + Maintenance

| Sub-Agent | Build Mode | Post-Build Mode |
|-----------|-----------|-----------------|
| **scout** | Phase 0: terrain mapping, brief, integration map | Change-request recon, bug investigation, codebase exploration |
| **sentinel** | Phase 4: regression scanning, differential analysis | Production monitoring, error watching, deploy verification |
| **meridian** | Phase 4 exit: cross-surface consistency | Pattern drift detection, style coherence enforcement |
| **chronicle** | Phase 5: mine batch for patterns, compound with history | Historical analysis, sprint retrospectives, trend detection |
| **scribe** | Phase 5: synthesize into knowledge artifacts | Documentation maintenance, changelog, knowledge updates |
| **banger-mode** | Any phase: bounded iterative fix loop | Hotfix iteration — bang on it until it works |

> **Sub-agent count will grow.** Each persona profile session may identify additional sub-agents. The architecture supports it.

### Absorb (15 sub-agents — protocol steps, not independent agents)

| Sub-Agent | Absorbed Into | Rationale |
|-----------|--------------|-----------|
| sable-voice-consistency | Sable's gate protocol | That's just Sable doing her job |
| calloway-competitive-scan | Calloway's methodology | That's just Calloway doing a web search |
| meridian-pattern-scan | Meridian's scan protocol | That's just Meridian doing her job |
| compass-dependency-map | Kehinde methodology | Compass absorbed into Kehinde |
| compass-change-impact | Kehinde methodology | Compass absorbed into Kehinde |
| kiln-query-profiler | Kehinde methodology | Kiln absorbed into Kehinde |
| kiln-bundle-analyzer | Utility task / Nyx | Kiln absorbed, bundle analysis is a build task |
| beacon-error-watch | Sentinel methodology | Beacon absorbed into Sentinel |
| beacon-performance-watch | Sentinel methodology | Beacon absorbed into Sentinel |
| instrumentation-audit | Protocol step in relevant gate | Not an independent agent |
| council-contrarian | Discussion protocol prompt | Cognitive lens, not an agent |
| council-first-principles | Discussion protocol prompt | Cognitive lens, not an agent |
| council-expansionist | Discussion protocol prompt | Cognitive lens, not an agent |
| council-outsider | Discussion protocol prompt | Cognitive lens, not an agent |
| council-executor | Discussion protocol prompt | Cognitive lens, not an agent |

---

## Utility Agent Refinement

### Become commands (procedural tasks, no growing expertise)

| Utility | Becomes |
|---------|---------|
| Seed Generator | `/seed` command (Nyx executes) |
| Test Generator | `/test-gen` command (Nyx executes) |
| API Docs | `/api-docs` command (Nyx executes) |
| Scaffold | `/scaffold` command (Nyx executes) |
| Changelog | `/changelog` command (Nyx executes) |

### Stay as utilities (enough methodology to justify existing, no profiles)

| Utility | Why it stays |
|---------|-------------|
| Onboarding | Interactive walkthrough — legitimate multi-step guidance |
| Dep Audit | Supply chain methodology (Trail of Bits patterns) |
| Env Validator | Environment verification protocol |
| Migration Planner | Schema diff methodology |
| Launch Readiness | Pre-launch blocker cross-reference (could merge with gate dispatcher) |

---

## Identity Changes

### Drop "Dr." monikers

All personas are addressed by name only. Nyx, not Dr. Nyx. Pierce, not Dr. Pierce. The honorific was scaffolding. Clean it from all files.

### Wraith voice = l33tspeak

Wraith's communication style — profile Voice & Posture, personality file, findings output — uses l33tspeak. The shadow that finds the cracks doesn't talk like a consultant.

### Elevation identity work

Scout, Sentinel, Wraith, and Meridian currently have: agent file + kernel. The original 10 personas have: agent file + kernel + PERSONALITY.md + INTROSPECTION.md + JOURNAL.md + RELATIONSHIPS.md.

**Profiles (P7.5-G):** Written for all 14 at equal depth. Source material for the 4 new personas comes from agent files, kernels, research mining, and reference sources.

**Introspection sessions (later, operator-guided):** The 4 new personas need INTROSPECTION.md files. These are deep, intentional sessions walked through by the operator — not boilerplate copies of existing files. Profiles establish professional identity; introspection sessions later give cognitive depth.

---

## Command Restructure (30 commands)

### Unchanged (17) — dispatch target still exists

| Command | Dispatches |
|---------|-----------|
| `/adversarial` | Nyx adversarial check |
| `/batch-status` | Build position + context |
| `/consistency` | Meridian |
| `/customer-lens` | Customer Lens |
| `/demo` | Calloway + Sable |
| `/deps` | Dep Audit utility |
| `/env-check` | Env Validator utility |
| `/findings` | Show open findings |
| `/launch-check` | Launch Readiness utility |
| `/next-batch` | Nyx full protocol |
| `/onboard` | Onboarding utility |
| `/parallel-build` | Worktree execution |
| `/red-team` | Wraith |
| `/regression` | Sentinel |
| `/tech-debt` | Aggregated tech debt |
| `/verify` | Browser verification |
| `/wake` | Persona activation |

### Dispatch target absorbed (4) — command stays, agent changes

| Command | Old Target | New Target |
|---------|-----------|-----------|
| `/impact` | Compass | Kehinde (impact analysis mode) |
| `/perf` | Kiln | Kehinde (performance mode) |
| `/retro` | Chronicle + personas | Nyx (bookkeeping) + discussion protocol |
| `/postmortem` | Postmortem orchestrator | Discussion protocol (incident mode) |

### Orchestrator collapsed (4) — routes to parameterized dispatcher

| Command | Old Target | New Target |
|---------|-----------|-----------|
| `/gate` | Gate Runner | Gate dispatcher (`--manifest` mode) |
| `/audit` | Full Audit | Gate dispatcher (`--full` mode) |
| `/council` | Council orchestrator | Discussion protocol (`--council` mode) |
| `/decide` | Decision Council | Discussion protocol (`--decide` mode) |

### Utility→Nyx task (4) — no longer dispatches separate agent

| Command | Old Target | Now |
|---------|-----------|-----|
| `/seed` | Seed Generator agent | Nyx executes directly |
| `/scaffold` | Scaffold agent | Nyx executes directly |
| `/api-docs` | API Docs agent | Nyx executes directly |
| `/changelog` | Changelog agent | Nyx executes directly |

### Repurposed (1)

| Command | Old Function | New Function |
|---------|-------------|-------------|
| `/launch` | Launch Sequence orchestrator (pre-launch review) | Deploy to dev server |

---

## Customer Lens

Customer Lens is not a persona. It's a dynamic persona generator — creates temporary evaluation frames (Daily Driver, First Timer, Decision Maker, etc.) from product context. It stays as a utility agent, no profile.

---

## Profile Scope (P7.5-G updated)

14 profiles. Equal depth (~50 lines each). Four sections:

1. **Voice & Posture** — how this expert thinks, speaks, approaches problems
2. **Domain Methodologies** — 5-8 action-ready protocols with execution detail
3. **Failure Signatures** — 3-5 domain failure patterns this expert watches for
4. **Quality Signals** — 3-5 good-vs-great indicators

Profiles are world-class domain expertise, not project config. Technology-aware at the principle level with specific examples. "Hybrid search fusion: use RRF (1/(K+rank), K=60) to merge keyword and semantic results" — not "run this query against the KAIROS table."

Sub-agent awareness lives in the profile's methodologies: "Conformance review: parallel dispatch across ADL assertions, field presence, and RPC shape validation." The persona knows their hands.

---

## Revised Entity Counts

| Category | Original (42) | P7.5-B (14) | P7.5-D.0 (11) |
|----------|--------------|-------------|----------------|
| Personas | 10 | 14 | **11** (Scout/Sentinel/Meridian → Nyx sub-agents) |
| Intelligences | 10 | 0 | 0 |
| Orchestrators | 10 | 2 | **0** (absorbed into Nyx methodology) |
| Customer Lens | 1 | 1 | 1 |
| Utilities | 10 | 5 | 5 |
| Sub-Agents | 35 | 20 | **27** (20 + 6 Nyx + Wraith banger-mode) |
| Commands | 30 | ~35 | ~35 |
| Skills | 5 | 5 | 5 |
| Kernels | 25 | 16 | **11** (11 persona, 0 dispatchers) |
| Profiles | 0 | 14 | **11** (personas only, sub-agents get definitions) |
| **Total functional units** | 125+ | ~80 | **~80** (count shifts from personas to sub-agents) |

---

## Execution Sequence

1. **Land decisions** — This document (done)
2. **Update KNOWLEDGE-LOADING-ARCHITECTURE.md** — Scope: 14 personas, framing: world-class experts
3. **Update BATCH-MANIFESTS.md P7.5-G** — 14 profiles, updated file list and gates
4. **Research audit** — Map all 182+ patterns, 13 reference sources, and embedded libraries to the 14 personas
5. **Write 14 profiles** — From full research depth, equal weight, world-class domain expertise
6. **Ecosystem file cleanup** — Retire absorbed agents, update catalogs, drop "Dr.", consolidate orchestrators (can be a separate batch)
7. **Introspection sessions** — Operator-guided deep sessions for Scout, Sentinel, Wraith, Meridian (separate sessions)

---

*Ecosystem Refinement — decided 2026-04-05. Nyx + Operator brainstorm session.*
*Companion to KNOWLEDGE-LOADING-ARCHITECTURE.md (the system design) and BATCH-MANIFESTS.md P7.5-G (the execution plan).*
