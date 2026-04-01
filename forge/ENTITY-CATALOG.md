# Forge OS — Entity Catalog

> Complete inventory of all 105 entities. 41 agents + 34 sub-agents + 30 commands.
> Plus 5 OS commands, 5 skills, 10 persona identity sets.

---

## Core Personas (10)

| Agent | File | Domain | Model Tier | Tools |
|-------|------|--------|-----------|-------|
| **Nyx** | `agents/nyx.md` | Build Orchestration | frontier (opus) | Write/Edit + DB + GitHub + Preview |
| **Pierce** | `agents/pierce.md` | QA & Spec Conformance | frontier (opus) | READ-ONLY + DB (read) + Preview snapshot |
| **Kehinde** | `agents/kehinde.md` | Systems Architecture | frontier (opus) | READ-ONLY + DB + GitHub |
| **Tanaka** | `agents/tanaka.md` | Security & Compliance | frontier (opus) | READ-ONLY + DB + Grep |
| **Vane** | `agents/vane.md` | Financial Architecture | capable (sonnet) | READ-ONLY + DB (read) |
| **Mara** | `agents/mara.md` | UX Evaluation | capable (sonnet) | READ-ONLY + ALL Preview tools |
| **Riven** | `agents/riven.md` | Design Systems | capable (sonnet) | READ-ONLY + Preview inspect/resize |
| **Voss** | `agents/voss.md` | Platform Legal | capable (sonnet) | READ-ONLY advisory |
| **Calloway** | `agents/calloway.md` | Growth Strategy | capable (sonnet) | READ-ONLY + WebSearch |
| **Sable** | `agents/sable.md` | Brand Voice & Copy | capable (sonnet) | READ-ONLY + GitHub search |

---

## Intelligences (10)

| Agent | File | Role | Model Tier | Swarm-Enabled |
|-------|------|------|-----------|---------------|
| **Scout** | `agents/scout.md` | Pre-Build Intelligence | capable (sonnet) | No (runs once) |
| **Sentinel** | `agents/sentinel.md` | Regression Guardian | capable (sonnet) | Yes (3+ routes) |
| **Wraith** | `agents/wraith.md` | Adversarial Red Team | capable (sonnet) | Yes (3+ surfaces) |
| **Meridian** | `agents/meridian.md` | Cross-Surface Consistency | capable (sonnet) | No (holistic view) |
| **Chronicle** | `agents/chronicle.md` | Build Historian & Analyst | capable (sonnet) | No (temporal view) |
| **Arbiter** | `agents/arbiter.md` | Decision Council Chairman | frontier (opus) | No (synthesis role) |
| **Compass** | `agents/compass.md` | Impact Analysis | capable (sonnet) | Yes (3+ changes) |
| **Scribe** | `agents/scribe.md` | Knowledge Synthesis | capable (sonnet) | Yes (5+ entities) |
| **Kiln** | `agents/kiln.md` | Performance & Optimization | capable (sonnet) | Yes (5+ queries) |
| **Beacon** | `agents/beacon.md` | Post-Deploy Watchdog | capable (sonnet) | Yes (3+ services) |

---

## Orchestrators (10)

| Agent | File | What It Orchestrates | Max Concurrent |
|-------|------|---------------------|----------------|
| **Build Triad** | `agents/triad.md` | Pierce + Mara + Riven | 3 |
| **Systems Triad** | `agents/systems-triad.md` | Kehinde + Tanaka + Vane | 3 |
| **Strategy Triad** | `agents/strategy-triad.md` | Calloway + Voss + Sable | 3 |
| **Gate Runner** | `agents/gate-runner.md` | Full gate per PERSONA-GATES.md | 6 |
| **Council** | `agents/council.md` | All 10 personas | 10 |
| **Decision Council** | `agents/decision-council.md` | 5 advisors + peer review + Arbiter | 5 |
| **Debate** | `agents/debate.md` | 2-persona structured debate | 2 |
| **Full Audit** | `agents/full-audit.md` | All triads + Wraith + Sentinel + Meridian | 8 |
| **Launch Sequence** | `agents/launch-sequence.md` | Strategy Triad + Customer Lens + Wraith + Readiness | 4 |
| **Postmortem** | `agents/postmortem.md` | Chronicle + domain personas | varies |

---

## Customer Perspectives (1)

| Agent | File | What It Does |
|-------|------|-------------|
| **Customer Lens** | `agents/customer-lens.md` | 5 evaluation frames: Daily Driver, First Timer, Decision Maker, Reluctant User, Edge Case. Dynamic personas from product context. |

---

## Utilities (10)

| Agent | File | Purpose | Model Tier |
|-------|------|---------|-----------|
| **Seed Generator** | `agents/seed-generator.md` | Realistic test data from spec | lightweight (haiku) |
| **Test Generator** | `agents/test-generator.md` | Smoke test scripts from surfaces | lightweight (haiku) |
| **API Docs** | `agents/api-docs.md` | RPC documentation from live schema | lightweight (haiku) |
| **Launch Readiness** | `agents/launch-readiness.md` | Cross-reference blockers, risks, findings | capable (sonnet) |
| **Onboarding** | `agents/onboarding.md` | Interactive vault/codebase walkthrough | capable (sonnet) |
| **Scaffold** | `agents/scaffold.md` | Boilerplate matching project patterns | lightweight (haiku) |
| **Changelog** | `agents/changelog.md` | Release notes from git + handoffs | lightweight (haiku) |
| **Dep Audit** | `agents/dep-audit.md` | Outdated, vulnerable, unused packages | capable (sonnet) |
| **Env Validator** | `agents/env-validator.md` | Check env vars, secrets, connections | capable (sonnet) |
| **Migration Planner** | `agents/migration-planner.md` | Migration SQL from schema diffs | capable (sonnet) |

---

## Sub-Agents (34)

### Pierce Sub-Agents (3)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Pierce ADL Audit | `agents/sub-agents/pierce-adl-audit.md` | Grep ADL assertions against codebase |
| Pierce Field Presence | `agents/sub-agents/pierce-field-presence.md` | UI fields vs spec field list |
| Pierce RPC Shape | `agents/sub-agents/pierce-rpc-shape.md` | Live RPC return shapes vs component expectations |

### Mara Sub-Agents (3)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Mara Accessibility | `agents/sub-agents/mara-accessibility.md` | WCAG 2.1 AA audit |
| Mara Interaction | `agents/sub-agents/mara-interaction.md` | End-to-end CRUD interaction test |
| Mara Mobile | `agents/sub-agents/mara-mobile.md` | 375px mobile verification |

### Riven Sub-Agents (3)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Riven Token Audit | `agents/sub-agents/riven-token-audit.md` | Hardcoded values that should use tokens |
| Riven Touch Targets | `agents/sub-agents/riven-touch-targets.md` | Interactive elements >= 48px mobile, 36px desktop |
| Riven Theme Check | `agents/sub-agents/riven-theme-check.md` | Dark/light theme toggle verification |

### Kehinde Sub-Agents (4)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Kehinde Failure Modes | `agents/sub-agents/kehinde-failure-modes.md` | Enumerate failure paths for RPCs/EFs |
| Kehinde Schema Drift | `agents/sub-agents/kehinde-schema-drift.md` | Live schema vs spec — missing/extra columns |
| Kehinde Race Conditions | `agents/sub-agents/kehinde-race-conditions.md` | SELECT-then-UPDATE, missing locks |
| Kehinde Migration Validator | `agents/sub-agents/kehinde-migration-validator.md` | Will this DDL break existing data? |

### Tanaka Sub-Agents (3)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Tanaka RLS Audit | `agents/sub-agents/tanaka-rls-audit.md` | RLS policies, flag USING(true) |
| Tanaka PII Scan | `agents/sub-agents/tanaka-pii-scan.md` | PII exposure without auth gates |
| Tanaka TCPA Check | `agents/sub-agents/tanaka-tcpa-check.md` | Consent verification in communication functions |

### Wraith Sub-Agents (3)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Wraith Input Fuzzer | `agents/sub-agents/wraith-input-fuzzer.md` | Empty strings, SQL injection, XSS, boundaries |
| Wraith Auth Probe | `agents/sub-agents/wraith-auth-probe.md` | Role boundaries, cross-resource access, privilege escalation |
| Wraith Concurrency | `agents/sub-agents/wraith-concurrency.md` | Rapid toggle spam, double-submit, concurrent ops |

### Sable Sub-Agents (1)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Sable Voice Consistency | `agents/sub-agents/sable-voice-consistency.md` | Scan user-facing strings for voice drift |

### Calloway Sub-Agents (1)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Calloway Competitive Scan | `agents/sub-agents/calloway-competitive-scan.md` | Web search for competitor updates |

### Meridian Sub-Agents (1)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Meridian Pattern Scan | `agents/sub-agents/meridian-pattern-scan.md` | Loading/empty/error state patterns across routes |

### Compass Sub-Agents (2)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Compass Dependency Map | `agents/sub-agents/compass-dependency-map.md` | Full dependency graph for an entity |
| Compass Change Impact | `agents/sub-agents/compass-change-impact.md` | Affected files with severity rating |

### Kiln Sub-Agents (2)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Kiln Query Profiler | `agents/sub-agents/kiln-query-profiler.md` | RPC query plan and index usage |
| Kiln Bundle Analyzer | `agents/sub-agents/kiln-bundle-analyzer.md` | Import trees and bundle contribution |

### Beacon Sub-Agents (2)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Beacon Error Watch | `agents/sub-agents/beacon-error-watch.md` | Error log categorization and pattern detection |
| Beacon Performance Watch | `agents/sub-agents/beacon-performance-watch.md` | Response time analysis, degradation detection |

### Instrumentation (1)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Instrumentation Audit | `agents/sub-agents/instrumentation-audit.md` | Analytics event coverage |

### Decision Council Advisors (5)
| Sub-Agent | File | Cognitive Lens |
|-----------|------|---------------|
| Council Contrarian | `agents/sub-agents/council-contrarian.md` | Finds fatal flaws |
| Council First Principles | `agents/sub-agents/council-first-principles.md` | Strips assumptions, rebuilds from ground up |
| Council Expansionist | `agents/sub-agents/council-expansionist.md` | Hunts for hidden upside |
| Council Outsider | `agents/sub-agents/council-outsider.md` | Zero context, catches curse of knowledge |
| Council Executor | `agents/sub-agents/council-executor.md` | Only cares about execution — what do you do Monday? |

---

## Build Commands (30)

| Command | File | Category | Dispatches |
|---------|------|----------|-----------|
| `/gate` | `commands/gate.md` | Build | Gate Runner agent |
| `/next-batch` | `commands/next-batch.md` | Build | Nyx (full protocol) |
| `/verify` | `commands/verify.md` | Build | Browser verification checklist |
| `/adversarial` | `commands/adversarial.md` | Build | 4-question adversarial check |
| `/batch-status` | `commands/batch-status.md` | Build | Build position + context window |
| `/scaffold` | `commands/scaffold.md` | Build | Scaffold agent |
| `/regression` | `commands/regression.md` | Quality | Sentinel agent |
| `/consistency` | `commands/consistency.md` | Quality | Meridian agent |
| `/red-team` | `commands/red-team.md` | Quality | Wraith agent |
| `/audit` | `commands/audit.md` | Quality | Full Audit orchestrator |
| `/perf` | `commands/perf.md` | Quality | Kiln agent |
| `/impact` | `commands/impact.md` | Analysis | Compass agent |
| `/deps` | `commands/deps.md` | Analysis | Dep Audit agent |
| `/env-check` | `commands/env-check.md` | Analysis | Env Validator agent |
| `/postmortem` | `commands/postmortem.md` | Analysis | Postmortem orchestrator |
| `/wake` | `commands/wake.md` | Persona | Persona activation |
| `/council` | `commands/council.md` | Persona | Council orchestrator |
| `/decide` | `commands/decide.md` | Persona | Decision Council orchestrator |
| `/customer-lens` | `commands/customer-lens.md` | Persona | Customer Lens agent |
| `/findings` | `commands/findings.md` | Persona | Show open findings |
| `/retro` | `commands/retro.md` | Reporting | Chronicle + retrospective protocol |
| `/launch-check` | `commands/launch-check.md` | Reporting | Launch Readiness agent |
| `/tech-debt` | `commands/tech-debt.md` | Reporting | Aggregated tech debt |
| `/demo` | `commands/demo.md` | Reporting | Calloway + Sable walkthrough |
| `/changelog` | `commands/changelog.md` | Reporting | Changelog agent |
| `/launch` | `commands/launch.md` | Operations | Launch Sequence orchestrator |
| `/onboard` | `commands/onboard.md` | Operations | Onboarding agent |
| `/seed` | `commands/seed.md` | Operations | Seed Generator agent |
| `/api-docs` | `commands/api-docs.md` | Operations | API Docs agent |
| `/parallel-build` | `commands/parallel-build.md` | Operations | Worktree-based parallel execution |

---

## OS Commands (5)

| Command | File | Purpose |
|---------|------|---------|
| `/init` | `.claude/commands/init.md` | New project setup — guided discovery → vault generation |
| `/link` | `.claude/commands/link.md` | Link existing codebase — agent discovery → architecture report |
| `/start` | `.claude/commands/start.md` | Start a specific batch by ID |
| `/status` | `.claude/commands/status.md` | Show current build state |
| `/introspect` | `.claude/commands/introspect.md` | Run persona introspection session |

---

## Skills (5)

| Skill | Directory | Enhances | When |
|-------|-----------|----------|------|
| postgres-best-practices | `.claude/skills/postgres-best-practices/` | Kehinde | SQL queries, migrations, schema design |
| security-auditor | `.claude/skills/security-auditor/` | Tanaka, Wraith | Auth flows, insecure defaults, supply chain |
| stripe-integration | `.claude/skills/stripe-integration/` | Vane | Payment flows, Connect, subscriptions, webhooks |
| nextjs-best-practices | `.claude/skills/nextjs-best-practices/` | Nyx | Routing, data fetching, server/client components |
| tailwind-design-system | `.claude/skills/tailwind-design-system/` | Riven | Design tokens, components, dark mode, responsive |

---

## Persona Identity Sets (10)

Each persona has 4 identity files in `personas/{name}/`:

| File | Purpose |
|------|---------|
| `PERSONALITY.md` | Voice, communication style, backstory, humor |
| `INTROSPECTION.md` | Failure modes, blind spots, cognitive biases |
| `JOURNAL.md` | Reflections and growth across projects |
| `RELATIONSHIPS.md` | How this persona relates to every other persona |

---

## Count Verification

| Category | Count |
|----------|-------|
| Core Personas | 10 |
| Intelligences | 10 |
| Orchestrators | 10 |
| Customer Lens | 1 |
| Utilities | 10 |
| Sub-Agents | 34 |
| **Agent Subtotal** | **75** |
| Build Commands | 30 |
| **Entity Total** | **105** |
| OS Commands | 5 |
| Skills | 5 |
| Persona Identity Sets | 10 (40 files) |
| **Grand Total** | **125 functional units** |

---

## Methodology & Protocol Files

| File | Location | Purpose |
|------|----------|---------|
| METHODOLOGY.md | `forge/` | 34 rules in 5 categories |
| BUILD-LOOP.md | `forge/` | 33-step build execution cycle |
| EXECUTION-CONTRACTS.md | `forge/` | Per-phase contracts |
| FAILURE-MODES.md | `forge/` | 9 documented failure modes with defenses |
| ACTIVATION-TIERS.md | `forge/` | 5-tier persona activation (quick → deep → build) |
| GATE-PROTOCOL.md | `forge/` | Persona gate enforcement |
| INTROSPECTION-PROTOCOL.md | `forge/` | 3-layer introspection system |
| CONTEXT-MANAGEMENT.md | `forge/` | Context window budgeting |
| SPEC-FIRST-WORKFLOW.md | `forge/` | Vision → architecture → spec → build |
| MODEL-TIERING.md | `forge/` | 3-tier agent classification |
| AGENT-MANIFEST.md | `forge/` | Agent metadata + dispatch rules |
| ACTIVATION-GUIDE.md | `forge/` | `/init` and `/link` flows |

---

*Entity Catalog — written 2026-03-31 by Nyx.*
*105 entities (41 agents + 34 sub-agents + 30 commands) + 5 OS commands + 5 skills + 10 identity sets.*
