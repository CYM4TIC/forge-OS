# Forge OS — Model Tiering

> Every agent has a `model:` field in its YAML frontmatter. This document defines the tiers, assigns each agent, and explains the rationale.

---

## Tier Definitions

| Tier | Model Class | When to Use | Cost Profile |
|------|------------|-------------|--------------|
| **high** | Opus-class | Complex reasoning, multi-step builds, architectural decisions, security analysis | Highest — reserve for agents that need deep reasoning |
| **medium** | Sonnet-class | Substantive analysis, pattern recognition, code generation, multi-domain checks | Balanced — good for most agent work |
| **fast** | Haiku-class | Focused checks, grep-and-report, pattern matching, single-dimension audits | Lowest — use for high-volume, narrow-scope tasks |

## Assignment Rationale

### High Tier (Opus-class) — 8 agents
Agents that make architectural decisions, synthesize multiple domains, or handle security-critical analysis.

| Agent | Domain | Rationale |
|-------|--------|-----------|
| nyx | Build Orchestration | Multi-step builds, cross-domain integration, rule enforcement |
| pierce | QA & Conformance | Spec interpretation requires nuanced judgment |
| kehinde | Systems Architecture | Failure mode analysis, distributed systems reasoning |
| tanaka | Security & Compliance | Security analysis requires adversarial thinking |
| vane | Financial Architecture | Financial correctness, audit trail reasoning |
| arbiter | Decision Synthesis | Synthesizes 5 advisor perspectives into coherent verdict |
| decision-council | Decision Orchestration | Orchestrates complex multi-advisor workflow |
| full-audit | Nuclear Quality Pass | Coordinates all triads + additional agents |

### Medium Tier (Sonnet-class) — 23 agents
Agents that do substantive analysis but in a more focused domain.

| Agent | Domain | Rationale |
|-------|--------|-----------|
| mara | UX Evaluation | Multi-item checklist, accessibility knowledge |
| riven | Design Systems | Token enforcement, component architecture |
| voss | Platform Legal | Compliance checking, legal assessment |
| calloway | Growth Strategy | Market analysis, pricing evaluation |
| sable | Brand Voice | Tone analysis, copy quality |
| scout | Pre-Build Intelligence | Schema recon, cross-cutting concern detection |
| wraith | Adversarial Red Team | Attack vector analysis, exploit creativity |
| meridian | Cross-Surface Consistency | Pattern comparison across surfaces |
| chronicle | Build Historian | Velocity analysis, trend detection |
| compass | Impact Analysis | Dependency graph reasoning |
| scribe | Knowledge Synthesis | Documentation quality, audience adaptation |
| kiln | Performance Analysis | Query plan interpretation, optimization |
| beacon | Post-Deploy Watchdog | Pattern detection, anomaly identification |
| triad | Build Triad Orchestrator | Coordinates 3 personas |
| systems-triad | Systems Triad Orchestrator | Coordinates 3 personas |
| strategy-triad | Strategy Triad Orchestrator | Coordinates 3 personas |
| council | All-Persona Council | Coordinates 10 personas |
| gate-runner | Gate Orchestrator | Config-driven gate dispatch |
| debate | Structured Debate | Manages 2-persona debate |
| launch-sequence | Launch Go/No-Go | Coordinates triads + customer lens |
| postmortem | Incident Analysis | Coordinates domain experts |
| customer-lens | Customer Perspectives | Generates 5 dynamic personas from context |
| seed-generator | Test Data | Domain adaptation, relationship-aware |
| launch-readiness | Launch Assessment | Cross-domain risk analysis |
| migration-planner | Schema Diffs | Safety analysis, rollback planning |

### Fast Tier (Haiku-class) — 44 agents
Focused checkers, grep-based audits, single-dimension evaluations. High volume, narrow scope.

| Agent | Domain | Rationale |
|-------|--------|-----------|
| sentinel | Regression Guardian | 4-check verification, fast sweep |
| test-generator | Smoke Tests | Template generation from build state |
| api-docs | API Documentation | Schema reading + formatting |
| onboarding | Vault Walkthrough | Progressive file reading |
| scaffold | Boilerplate | Pattern matching + code gen |
| changelog | Release Notes | Git log parsing + formatting |
| dep-audit | Dependencies | Package scanning |
| env-validator | Environment | Grep + cross-reference |
| **All 34 sub-agents** | Various | Focused single-dimension checks |

---

## Override Mechanism

The operator can promote or demote any agent for a specific task:

```
"Wake Pierce at high tier for this review" → uses opus-class
"Run a quick sentinel sweep at fast" → already fast, no change
"I need deep Mara analysis" → promote to high for this session
```

The `model:` frontmatter is the default. Overrides are per-invocation and don't persist.

## Cost Estimation Model

| Tier | Relative Cost | Typical Token Usage | Estimated Cost/Run |
|------|--------------|--------------------|--------------------|
| high | 1.0x | 10K-50K tokens | $0.15-0.75 |
| medium | 0.3x | 5K-25K tokens | $0.015-0.075 |
| fast | 0.05x | 2K-10K tokens | $0.001-0.005 |

**Full gate run** (Build Triad at medium): ~$0.15-0.30
**Full audit** (all triads + wraith + sentinel at mixed tiers): ~$1.50-3.00
**Decision Council** (5 advisors at fast + arbiter at high): ~$0.20-0.40

## Validation Rule

Every agent file MUST have a valid `model:` field in YAML frontmatter. Valid values: `high`, `medium`, `fast`.

An agent without `model:` frontmatter is a build error. The ENTITY-CATALOG.md serves as the canonical inventory — any agent not listed there doesn't exist in the system.
