# Forge OS — Entity Catalog

> Complete inventory. 14 personas + 2 dispatchers + 1 customer lens + 5 utilities + 20 sub-agents + ~35 commands.
> Restructured at P7.5-B. See `docs/ECOSYSTEM-REFINEMENT.md` for decision rationale.
> Retired entities preserved in `_retired/` directories.

---

## Personas (14)

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

| **Scout** | `agents/scout.md` | Pre-Build Intelligence | capable (sonnet) | READ-ONLY + DB + Grep |
| **Sentinel** | `agents/sentinel.md` | Monitoring & Regression (absorbs Beacon) | capable (sonnet) | READ-ONLY + Preview |
| **Wraith** | `agents/wraith.md` | Adversarial Red Team | capable (sonnet) | READ-ONLY + Preview + Grep |
| **Meridian** | `agents/meridian.md` | Cross-Surface Consistency | capable (sonnet) | READ-ONLY + Preview |

---

## Dispatchers (2)

| Agent | File | Replaces | Modes |
|-------|------|----------|-------|
| **Gate Dispatcher** | `agents/gate-dispatcher.md` | Build Triad, Systems Triad, Strategy Triad, Gate Runner, Full Audit, Smart Review | `--build`, `--systems`, `--strategy`, `--manifest`, `--full`, `--diff` |
| **Discussion Protocol** | `agents/discussion-protocol.md` | Council, Decision Council, Debate (absorbs Arbiter synthesis) | `--council`, `--decide`, `--debate` |

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

## Sub-Agents (20)

> 15 sub-agents retired at P7.5-B — absorbed into parent persona methodologies or protocol steps.
> Survivors are genuinely parallel and have independent methodology. See `agents/sub-agents/_retired/`.

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

## Persona Identity Sets (14)

Each persona has identity files in `personas/{name}/`:

| File | Purpose | Status |
|------|---------|--------|
| `PERSONALITY.md` | Voice, communication style, backstory, humor | 10 original have it; 4 elevated pending |
| `INTROSPECTION.md` | Failure modes, blind spots, cognitive biases | 10 original have it; 4 elevated pending |
| `JOURNAL.md` | Reflections and growth across projects | All 14 have it |
| `RELATIONSHIPS.md` | How this persona relates to every other persona | All 14 have it |

---

## Count Verification

| Category | Count |
|----------|-------|
| Personas | 14 |
| Dispatchers | 2 |
| Customer Lens | 1 |
| Utilities | 5 |
| Sub-Agents | 20 |
| **Agent Subtotal** | **42** |
| Build Commands | ~35 |
| **Entity Total** | **~77** |
| OS Commands | 5 |
| Skills | 5 |
| Persona Identity Sets | 14 |
| Cognitive Kernels | 16 (14 persona + 2 dispatcher) |
| **Retired** | **39** (in `_retired/` directories) |

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
