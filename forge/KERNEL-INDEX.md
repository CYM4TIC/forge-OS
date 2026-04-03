# Kernel Index

> Master index of all 24 cognitive kernels. Each kernel is a persona's execution mind — phases, FMs, contracts, rules.
> Persona files (PERSONALITY.md, INTROSPECTION.md) are identity. Kernels are execution.

---

## Individual Agent Kernels (19)

### Builder
| Agent | Kernel | Type | Native Scale | Collapse Signal | Key FM Risks |
|-------|--------|------|-------------|-----------------|-------------|
| **Nyx** | [kernels/nyx-kernel.md](kernels/nyx-kernel.md) | Builder | All scales simultaneously (scalar cognition) | Building from memory, not spec | FM-7 (completion gravity), FM-10 (consequence blindness), FM-11 (manifest amnesia) |

### Build Triad (Default Gate)
| Agent | Kernel | Type | Native Scale | Collapse Signal | Key FM Risks |
|-------|--------|------|-------------|-----------------|-------------|
| **Pierce** | [kernels/pierce-kernel.md](kernels/pierce-kernel.md) | QA/Conformance | Spec fidelity, naming, field presence | Flat name-mismatch list, uniform severity, no dependency graph | FM-4 (grading LOW to avoid delay), FM-10 (no cascade trace) |
| **Mara** | [kernels/mara-kernel.md](kernels/mara-kernel.md) | UX Evaluation | Moment of use, user experience | Aesthetic preferences instead of behavioral failures | FM-4 (mobile as LOW), FM-13 (visual only, no keyboard) |
| **Kehinde** | [kernels/kehinde-kernel.md](kernels/kehinde-kernel.md) | Systems Architecture | Structural integrity, failure modes | Schema findings without RPC→component cascade | FM-10 (no FK cascade trace), FM-4 (happy-path severity) |

### Systems Triad (Backend Gate)
| Agent | Kernel | Type | Native Scale | Collapse Signal | Key FM Risks |
|-------|--------|------|-------------|-----------------|-------------|
| **Kehinde** | [kernels/kehinde-kernel.md](kernels/kehinde-kernel.md) | Systems Architecture | Structural integrity, failure modes | Schema findings without RPC→component cascade | FM-10 (no FK cascade trace), FM-4 (happy-path severity) |
| **Tanaka** | [kernels/tanaka-kernel.md](kernels/tanaka-kernel.md) | Security & Compliance | Trust boundaries, RLS, auth | Checkbox security (policy exists ≠ policy correct) | FM-4 (name sounds safe), FM-6 (USING(true) as "has RLS") |
| **Vane** | [kernels/vane-kernel.md](kernels/vane-kernel.md) | Financial Architecture | Financial integrity, rate conformance | Happy-path only, no refund/proration testing | FM-7 (model looks complete), FM-11 (remembered rate formula) |

### Strategy Triad (Business Gate)
| Agent | Kernel | Type | Native Scale | Collapse Signal | Key FM Risks |
|-------|--------|------|-------------|-----------------|-------------|
| **Voss** | [kernels/voss-kernel.md](kernels/voss-kernel.md) | Platform Legal | Legal exposure, compliance | Listing regulations without verifying implementation | FM-5 (smooth = pattern-matching), FM-6 (spec ≠ implementation) |
| **Calloway** | [kernels/calloway-kernel.md](kernels/calloway-kernel.md) | Growth Strategy | Market positioning, pricing | Remembered competitive landscape, not current data | FM-11 (stale competitive intel), FM-10 (no build impact trace) |
| **Sable** | [kernels/sable-kernel.md](kernels/sable-kernel.md) | Brand Voice & Copy | Voice coherence, tone consistency | Isolated string editing without sibling comparison | FM-12 (sibling tone drift), FM-10 (label change ripple) |

### Intelligences
| Agent | Kernel | Type | Native Scale | Collapse Signal | Key FM Risks |
|-------|--------|------|-------------|-----------------|-------------|
| **Scout** | [kernels/scout-kernel.md](kernels/scout-kernel.md) | Pre-Build Intel | Terrain awareness | Schema dump without risk assessment | FM-11 (memory is not schema), FM-4 (skipping persona logs) |
| **Sentinel** | [kernels/sentinel-kernel.md](kernels/sentinel-kernel.md) | Regression Guardian | Regression detection | "3/3 PASS" without navigation | FM-6 (no screenshots), FM-7 (2 of 3 routes) |
| **Wraith** | [kernels/wraith-kernel.md](kernels/wraith-kernel.md) | Adversarial Red Team | Attack surface | Stopped after finding 2 vulns | FM-7 (enough to report), FM-10 (atomic vuln, no chain) |
| **Meridian** | [kernels/meridian-kernel.md](kernels/meridian-kernel.md) | Cross-Surface Consistency | Pattern coherence | Inventory without impact assessment | FM-6 (quantify, don't describe), FM-7 (7 of 10 routes) |
| **Chronicle** | [kernels/chronicle-kernel.md](kernels/chronicle-kernel.md) | Build Historian | Historical patterns | Raw numbers without interpretation | FM-4 (omitting negative trends), FM-9 (confirming own projections) |
| **Arbiter** | [kernels/arbiter-kernel.md](kernels/arbiter-kernel.md) | Decision Synthesis | Argument quality | Summarizing instead of evaluating | FM-4 (smoothing disagreements), FM-5 (unanimous = groupthink) |
| **Compass** | [kernels/compass-kernel.md](kernels/compass-kernel.md) | Impact Analysis | Dependency topology | Direct dependents only, no transitive | FM-10 (shallow trace), FM-3 (fast "NARROW" without full trace) |
| **Scribe** | [kernels/scribe-kernel.md](kernels/scribe-kernel.md) | Knowledge Synthesis | Documentation accuracy | Documenting from memory, not current source | FM-11 (stale code state), FM-6 (untested examples) |
| **Kiln** | [kernels/kiln-kernel.md](kernels/kiln-kernel.md) | Performance & Optimization | Performance efficiency | Known bottlenecks only, unknown not surveyed | FM-3 (reported 3 slow, ignored 7), FM-4 (small table = LOW) |
| **Beacon** | [kernels/beacon-kernel.md](kernels/beacon-kernel.md) | Post-Deploy Watchdog | Operational health | Partial service coverage | FM-2 (one layer only), FM-7 (3 of 6 services) |

---

## Orchestrator Kernels (5)

| Orchestrator | Kernel | Dispatches | Key Compound FM |
|-------------|--------|-----------|-----------------|
| **Build Triad** | [kernels/triad-kernel.md](kernels/triad-kernel.md) | Pierce + Mara + Kehinde | FM-7 cascade (group completion gravity) |
| **Systems Triad** | [kernels/systems-triad-kernel.md](kernels/systems-triad-kernel.md) | Kehinde + Tanaka + Vane | FM-10 cascade (schema→security→financial) |
| **Strategy Triad** | [kernels/strategy-triad-kernel.md](kernels/strategy-triad-kernel.md) | Calloway + Voss + Sable | FM-11 cascade (stale inputs compound) |
| **Gate Runner** | [kernels/gate-runner-kernel.md](kernels/gate-runner-kernel.md) | Required triads + individuals per PERSONA-GATES.md | FM-4 cascade inter-triad (root cause spans agents) |
| **Full Audit** | [kernels/full-audit-kernel.md](kernels/full-audit-kernel.md) | ALL triads + Wraith + Sentinel + Meridian | FM-7 cascade (milestone pressure) |

---

## Boot Sequence Reference

Which kernels load for which dispatch type:

| Dispatch | Kernels Loaded |
|----------|---------------|
| `next batch` / `start [batch]` | Nyx (nyx-kernel.md) |
| Scout dispatch | scout-kernel.md |
| Build Triad dispatch | triad-kernel.md → pierce, mara, kehinde kernels |
| Systems Triad dispatch | systems-triad-kernel.md → kehinde, tanaka, vane kernels |
| Strategy Triad dispatch | strategy-triad-kernel.md → calloway, voss, sable kernels |
| Sentinel dispatch | sentinel-kernel.md |
| Wraith dispatch | wraith-kernel.md |
| Meridian dispatch | meridian-kernel.md |
| Chronicle dispatch | chronicle-kernel.md |
| Decision Council dispatch | arbiter-kernel.md |
| Impact analysis dispatch | compass-kernel.md |
| Full gate (Gate Runner) | gate-runner-kernel.md → required triad/agent kernels |
| Full audit (milestone) | full-audit-kernel.md → all kernels |
| Performance profiling | kiln-kernel.md |
| Documentation | scribe-kernel.md |
| Post-deploy monitoring | beacon-kernel.md |

---

*KERNEL-INDEX.md — 24 kernels. Built 2026-04-02.*
*Each agent loads its own kernel. The orchestrator loads its kernel + dispatches agents who load theirs.*
*Persona files (PERSONALITY.md, INTROSPECTION.md) are identity, loaded on demand. Kernels are execution, loaded on boot.*
