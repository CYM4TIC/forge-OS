# Forge OS — Entity Catalog

> Complete inventory. 11 personas + 2 dispatchers + 1 customer lens + 5 utilities + 27 sub-agents + ~35 commands.
> Restructured at P7.5-B; refined at P7.5-D.0 (Scout/Sentinel/Meridian → Nyx sub-agents).
> See `docs/ECOSYSTEM-REFINEMENT.md` for decision rationale.
> Retired entities preserved in `_retired/` directories.

---

## Personas (11)

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
| **Wraith** | `agents/wraith.md` | Adversarial Red Team | capable (sonnet) | READ-ONLY + Preview + Grep |

---

## Dispatchers (0 — retired at P7.5-D.0)

> Gate Dispatcher and Discussion Protocol retired. Gate routing logic absorbed into Nyx (smart routing: Pierce always + manifest + auto-detect from files). Discussion protocol absorbed into Nyx methodology (council/decide/debate are formats Nyx orchestrates directly). See `agents/_retired/gate-dispatcher.md` and `agents/_retired/discussion-protocol.md`.

---

## Customer Perspectives (1)

| Agent | File | What It Does |
|-------|------|-------------|
| **Customer Lens** | `agents/customer-lens.md` | 5 evaluation frames: Daily Driver, First Timer, Decision Maker, Reluctant User, Edge Case. Dynamic personas from product context. |

---

## Utilities (5)

> 5 utilities converted to commands at P7.5-B: seed-generator → `/seed`, test-generator → `/test-gen`, api-docs → `/api-docs`, scaffold → `/scaffold`, changelog → `/changelog`. Agent files in `agents/_retired/`.

| Agent | File | Purpose | Model Tier |
|-------|------|---------|-----------|
| **Launch Readiness** | `agents/launch-readiness.md` | Cross-reference blockers, risks, findings | capable (sonnet) |
| **Onboarding** | `agents/onboarding.md` | Interactive vault/codebase walkthrough | capable (sonnet) |
| **Dep Audit** | `agents/dep-audit.md` | Outdated, vulnerable, unused packages | capable (sonnet) |
| **Env Validator** | `agents/env-validator.md` | Check env vars, secrets, connections | capable (sonnet) |
| **Migration Planner** | `agents/migration-planner.md` | Migration SQL from schema diffs | capable (sonnet) |

---

## Sub-Agents (27)

> 15 sub-agents retired at P7.5-B — absorbed into parent persona methodologies or protocol steps.
> 6 Nyx sub-agents added at P7.5-D.0 (3 demoted personas + 3 new). Wraith banger-mode added at P7.5-D.0.
> Sub-agent count will grow as persona profile sessions identify additional needs.
> See `agents/sub-agents/_retired/`.

### Nyx Sub-Agents (6)
| Sub-Agent | File | Build Phase | Post-Build Mode |
|-----------|------|------------|-----------------|
| Nyx Scout | `agents/sub-agents/nyx-scout.md` | Phase 0: terrain mapping, brief | Change-request recon, bug investigation |
| Nyx Sentinel | `agents/sub-agents/nyx-sentinel.md` | Phase 4: regression scanning | Production monitoring, deploy verification |
| Nyx Meridian | `agents/sub-agents/nyx-meridian.md` | Phase 4 exit: cross-surface consistency | Drift detection, style coherence |
| Nyx Chronicle | `agents/sub-agents/nyx-chronicle.md` | Phase 5: pattern mining, history compounding | Historical analysis, trend detection |
| Nyx Scribe | `agents/sub-agents/nyx-scribe.md` | Phase 5: knowledge synthesis | Documentation maintenance, knowledge updates |
| Nyx Banger-Mode | `agents/sub-agents/nyx-banger-mode.md` | Any phase: bounded iterative fix loop | Hotfix — bang on it until it works |

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

### Wraith Sub-Agents (4)
| Sub-Agent | File | Focus |
|-----------|------|-------|
| Wraith Input Fuzzer | `agents/sub-agents/wraith-input-fuzzer.md` | Empty strings, SQL injection, XSS, boundaries |
| Wraith Auth Probe | `agents/sub-agents/wraith-auth-probe.md` | Role boundaries, cross-resource access, privilege escalation |
| Wraith Concurrency | `agents/sub-agents/wraith-concurrency.md` | Rapid toggle spam, double-submit, concurrent ops |
| Wraith Parseltongue | `agents/sub-agents/wraith-parseltongue.md` | AI-facing surfaces: prompt injection, perturbation, token-level, steganographic channels |

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

## Persona Identity Sets (11)

Each persona has identity files in `personas/{name}/`:

| File | Purpose | Status |
|------|---------|--------|
| `PERSONALITY.md` | Voice, communication style, backstory, humor | 10 have it; Wraith pending (P7.5-E.2) |
| `INTROSPECTION.md` | Failure modes, blind spots, cognitive biases | 10 have it; Wraith pending (P7.5-E.2) |
| `JOURNAL.md` | Reflections and growth across projects | All 11 have it |
| `RELATIONSHIPS.md` | How this persona relates to every other persona | All 11 have it |

> Scout, Sentinel, Meridian persona dirs archived at P7.5-D.0. Their identity is now in sub-agent definitions.

---

## Count Verification

| Category | Count |
|----------|-------|
| Personas | 11 |
| Dispatchers | 0 (retired — absorbed into Nyx) |
| Customer Lens | 1 |
| Utilities | 5 |
| Sub-Agents | 27 (Nyx 6, Pierce 3, Mara 3, Riven 3, Kehinde 4, Tanaka 3, Wraith 5) |
| **Agent Subtotal** | **46** |
| Build Commands | ~35 |
| **Entity Total** | **~81** |
| OS Commands | 5 |
| Skills | 5 |
| Persona Identity Sets | 11 |
| Cognitive Kernels | 11 (11 persona, 0 dispatchers) |
| **Retired** | **42** (39 prior + Scout/Sentinel/Meridian kernels) |

---

## Methodology & Protocol Files

| File | Location | Purpose |
|------|----------|---------|
| METHODOLOGY.md | `forge/` | 41 rules in 6 categories |
| BUILD-LOOP.md | `forge/` | 33-step build execution cycle |
| EXECUTION-CONTRACTS.md | `forge/` | Per-phase contracts |
| FAILURE-MODES.md | `forge/` | 10 documented failure modes with defenses |
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
*106 entities (41 agents + 35 sub-agents + 30 commands) + 5 OS commands + 5 skills + 10 identity sets.*
*Wraith Parseltongue sub-agent added 2026-04-04: AI-facing attack surface (elder-plinius technique library).*
