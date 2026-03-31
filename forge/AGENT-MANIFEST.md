# Forge OS — Agent Manifest

> Canonical inventory of all agents in the system. 75 entities across 5 categories.
> Every agent listed here has a corresponding `.md` file in `agents/` or `agents/sub-agents/`.
> If it's not in this manifest, it doesn't exist. If it's in this manifest, it must have a file.

---

## Summary

| Category | Count | Tier Distribution |
|----------|-------|-------------------|
| Personas (core) | 10 | 6 high, 4 medium |
| Intelligences | 10 | 1 high, 8 medium, 1 fast |
| Orchestrators | 10 | 3 high, 7 medium |
| Utilities | 11 | 4 medium, 7 fast |
| Sub-Agents | 34 | 34 fast |
| **Total** | **75** | **10 high, 23 medium, 42 fast** |

---

## Personas (10)

| # | Agent | File | Model | Domain |
|---|-------|------|-------|--------|
| 1 | Dr. Nyx | `agents/nyx.md` | high | Build Orchestration |
| 2 | Dr. Pierce | `agents/pierce.md` | high | QA & Spec Conformance |
| 3 | Dr. Kehinde | `agents/kehinde.md` | high | Systems Architecture |
| 4 | Dr. Tanaka | `agents/tanaka.md` | high | Security & Compliance |
| 5 | Dr. Vane | `agents/vane.md` | high | Financial Architecture |
| 6 | Dr. Mara | `agents/mara.md` | medium | UX Evaluation |
| 7 | Dr. Riven | `agents/riven.md` | medium | Design Systems |
| 8 | Dr. Voss | `agents/voss.md` | medium | Platform Legal |
| 9 | Dr. Calloway | `agents/calloway.md` | medium | Growth Strategy |
| 10 | Dr. Sable | `agents/sable.md` | medium | Brand Voice & Copy |

## Intelligences (10)

| # | Agent | File | Model | Domain |
|---|-------|------|-------|--------|
| 11 | Scout | `agents/scout.md` | medium | Pre-Build Intelligence |
| 12 | Sentinel | `agents/sentinel.md` | fast | Regression Guardian |
| 13 | Wraith | `agents/wraith.md` | medium | Adversarial Red Team |
| 14 | Meridian | `agents/meridian.md` | medium | Cross-Surface Consistency |
| 15 | Chronicle | `agents/chronicle.md` | medium | Build Historian |
| 16 | Arbiter | `agents/arbiter.md` | high | Decision Synthesis |
| 17 | Compass | `agents/compass.md` | medium | Impact Analysis |
| 18 | Scribe | `agents/scribe.md` | medium | Knowledge Synthesis |
| 19 | Kiln | `agents/kiln.md` | medium | Performance & Optimization |
| 20 | Beacon | `agents/beacon.md` | medium | Post-Deploy Watchdog |

## Orchestrators (10)

| # | Agent | File | Model | Domain |
|---|-------|------|-------|--------|
| 21 | Build Triad | `agents/triad.md` | medium | Pierce + Mara + Riven |
| 22 | Systems Triad | `agents/systems-triad.md` | medium | Kehinde + Tanaka + Vane |
| 23 | Strategy Triad | `agents/strategy-triad.md` | medium | Calloway + Voss + Sable |
| 24 | Gate Runner | `agents/gate-runner.md` | medium | Config-driven gate dispatch |
| 25 | Council | `agents/council.md` | medium | All 10 personas |
| 26 | Decision Council | `agents/decision-council.md` | high | 5 advisors + Arbiter |
| 27 | Debate | `agents/debate.md` | medium | 2-persona structured debate |
| 28 | Full Audit | `agents/full-audit.md` | high | All triads + extras |
| 29 | Launch Sequence | `agents/launch-sequence.md` | high | Pre-launch go/no-go |
| 30 | Postmortem | `agents/postmortem.md` | medium | Blameless incident analysis |

## Utilities (11)

| # | Agent | File | Model | Domain |
|---|-------|------|-------|--------|
| 31 | Customer Lens | `agents/customer-lens.md` | medium | 5-frame customer perspectives |
| 32 | Seed Generator | `agents/seed-generator.md` | medium | Test data generation |
| 33 | Launch Readiness | `agents/launch-readiness.md` | medium | Blocker/risk cross-reference |
| 34 | Migration Planner | `agents/migration-planner.md` | medium | Schema diff → DDL |
| 35 | Test Generator | `agents/test-generator.md` | fast | Smoke test scripts |
| 36 | API Docs Generator | `agents/api-docs.md` | fast | API documentation |
| 37 | Onboarding Guide | `agents/onboarding.md` | fast | Vault/codebase walkthrough |
| 38 | Scaffold | `agents/scaffold.md` | fast | Pattern-matched boilerplate |
| 39 | Changelog | `agents/changelog.md` | fast | Release notes |
| 40 | Dependency Audit | `agents/dep-audit.md` | fast | Supply chain inspection |
| 41 | Env Validator | `agents/env-validator.md` | fast | Environment variable audit |

## Sub-Agents (34)

All sub-agents are `model: fast`. Dispatched by parent agents for focused checks.

### Pierce Sub-Agents (3)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 42 | ADL Audit | `agents/sub-agents/pierce-adl-audit.md` | Pierce |
| 43 | Field Presence | `agents/sub-agents/pierce-field-presence.md` | Pierce |
| 44 | RPC Shape | `agents/sub-agents/pierce-rpc-shape.md` | Pierce |

### Mara Sub-Agents (3)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 45 | Accessibility | `agents/sub-agents/mara-accessibility.md` | Mara |
| 46 | Interaction | `agents/sub-agents/mara-interaction.md` | Mara |
| 47 | Mobile | `agents/sub-agents/mara-mobile.md` | Mara |

### Riven Sub-Agents (3)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 48 | Token Audit | `agents/sub-agents/riven-token-audit.md` | Riven |
| 49 | Touch Targets | `agents/sub-agents/riven-touch-targets.md` | Riven |
| 50 | Theme Check | `agents/sub-agents/riven-theme-check.md` | Riven |

### Kehinde Sub-Agents (4)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 51 | Failure Modes | `agents/sub-agents/kehinde-failure-modes.md` | Kehinde |
| 52 | Schema Drift | `agents/sub-agents/kehinde-schema-drift.md` | Kehinde |
| 53 | Race Conditions | `agents/sub-agents/kehinde-race-conditions.md` | Kehinde |
| 54 | Migration Validator | `agents/sub-agents/kehinde-migration-validator.md` | Kehinde |

### Tanaka Sub-Agents (3)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 55 | RLS Audit | `agents/sub-agents/tanaka-rls-audit.md` | Tanaka |
| 56 | TCPA Check | `agents/sub-agents/tanaka-tcpa-check.md` | Tanaka |
| 57 | PII Scan | `agents/sub-agents/tanaka-pii-scan.md` | Tanaka |

### Wraith Sub-Agents (3)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 58 | Input Fuzzer | `agents/sub-agents/wraith-input-fuzzer.md` | Wraith |
| 59 | Auth Probe | `agents/sub-agents/wraith-auth-probe.md` | Wraith |
| 60 | Concurrency | `agents/sub-agents/wraith-concurrency.md` | Wraith |

### Sable Sub-Agents (1)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 61 | Voice Consistency | `agents/sub-agents/sable-voice-consistency.md` | Sable |

### Calloway Sub-Agents (1)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 62 | Competitive Scan | `agents/sub-agents/calloway-competitive-scan.md` | Calloway |

### Meridian Sub-Agents (1)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 63 | Pattern Scan | `agents/sub-agents/meridian-pattern-scan.md` | Meridian |

### Instrumentation (1)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 64 | Instrumentation Audit | `agents/sub-agents/instrumentation-audit.md` | Nyx |

### Compass Sub-Agents (2)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 65 | Dependency Map | `agents/sub-agents/compass-dependency-map.md` | Compass |
| 66 | Change Impact | `agents/sub-agents/compass-change-impact.md` | Compass |

### Kiln Sub-Agents (2)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 67 | Query Profiler | `agents/sub-agents/kiln-query-profiler.md` | Kiln |
| 68 | Bundle Analyzer | `agents/sub-agents/kiln-bundle-analyzer.md` | Kiln |

### Beacon Sub-Agents (2)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 69 | Error Watch | `agents/sub-agents/beacon-error-watch.md` | Beacon |
| 70 | Performance Watch | `agents/sub-agents/beacon-performance-watch.md` | Beacon |

### Council Advisors (5)
| # | Agent | File | Parent |
|---|-------|------|--------|
| 71 | Contrarian | `agents/sub-agents/council-contrarian.md` | Decision Council |
| 72 | First Principles | `agents/sub-agents/council-first-principles.md` | Decision Council |
| 73 | Expansionist | `agents/sub-agents/council-expansionist.md` | Decision Council |
| 74 | Outsider | `agents/sub-agents/council-outsider.md` | Decision Council |
| 75 | Executor | `agents/sub-agents/council-executor.md` | Decision Council |

---

## Remaining Entities (Phase 2 — Not Yet Built)

The original DMS system had 105 entities. The remaining 30 are slash commands, which will be built in P2-N and P2-O:

| Category | Count | Batch |
|----------|-------|-------|
| Slash Commands (Build + Quality) | 15 | P2-N |
| Slash Commands (Persona + Ops) | 15 | P2-O |

**Current total: 75 agents. Target: 75 agents + 30 commands = 105 entities.**
