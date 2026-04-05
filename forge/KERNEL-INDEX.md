# Kernel Index

> Master index of all 16 cognitive kernels. Each kernel is a persona's execution mind — phases, FMs, contracts, rules.
> Persona files (PERSONALITY.md, INTROSPECTION.md) are identity. Kernels are execution.
> Restructured at P7.5-B: 24 → 16 kernels. 11 retired to `kernels/_retired/`.

---

## Persona Kernels (14)

### Builder
| Persona | Kernel | Domain | Key FM Risks |
|---------|--------|--------|-------------|
| **Nyx** | [kernels/nyx-kernel.md](kernels/nyx-kernel.md) | Build Orchestration | FM-7 (completion gravity), FM-10 (consequence blindness), FM-11 (manifest amnesia) |

### Gate Personas
| Persona | Kernel | Domain | Key FM Risks |
|---------|--------|--------|-------------|
| **Pierce** | [kernels/pierce-kernel.md](kernels/pierce-kernel.md) | QA & Spec Conformance | FM-4 (grading LOW to avoid delay), FM-10 (no cascade trace) |
| **Mara** | [kernels/mara-kernel.md](kernels/mara-kernel.md) | UX Evaluation | FM-4 (mobile as LOW), FM-13 (visual only, no keyboard) |
| **Kehinde** | [kernels/kehinde-kernel.md](kernels/kehinde-kernel.md) | Systems Architecture | FM-10 (no FK cascade trace), FM-4 (happy-path severity) |
| **Tanaka** | [kernels/tanaka-kernel.md](kernels/tanaka-kernel.md) | Security & Compliance | FM-4 (name sounds safe), FM-6 (USING(true) as "has RLS") |
| **Riven** | [kernels/riven-kernel.md](kernels/riven-kernel.md) | Design Systems | FM-12 (sibling drift), FM-14 (token autopilot) |
| **Vane** | [kernels/vane-kernel.md](kernels/vane-kernel.md) | Financial Architecture | FM-7 (model looks complete), FM-11 (remembered rate formula) |
| **Voss** | [kernels/voss-kernel.md](kernels/voss-kernel.md) | Platform Legal | FM-5 (smooth = pattern-matching), FM-6 (spec ≠ implementation) |
| **Calloway** | [kernels/calloway-kernel.md](kernels/calloway-kernel.md) | Growth Strategy | FM-11 (stale competitive intel), FM-10 (no build impact trace) |
| **Sable** | [kernels/sable-kernel.md](kernels/sable-kernel.md) | Brand Voice & Copy | FM-12 (sibling tone drift), FM-10 (label change ripple) |

### Elevated Personas (formerly Intelligences)
| Persona | Kernel | Domain | Absorbs | Key FM Risks |
|---------|--------|--------|---------|-------------|
| **Scout** | [kernels/scout-kernel.md](kernels/scout-kernel.md) | Pre-Build Intelligence | — | FM-11 (memory is not schema), FM-4 (skipping persona logs) |
| **Sentinel** | [kernels/sentinel-kernel.md](kernels/sentinel-kernel.md) | Monitoring & Regression | Beacon (post-deploy watchdog) | FM-6 (no screenshots), FM-7 (2 of 3 routes) |
| **Wraith** | [kernels/wraith-kernel.md](kernels/wraith-kernel.md) | Adversarial Red Team | — | FM-7 (enough to report), FM-10 (atomic vuln, no chain) |
| **Meridian** | [kernels/meridian-kernel.md](kernels/meridian-kernel.md) | Cross-Surface Consistency | — | FM-6 (quantify, don't describe), FM-7 (7 of 10 routes) |

---

## Dispatcher Kernels (2)

| Dispatcher | Kernel | Replaces | Modes |
|-----------|--------|----------|-------|
| **Gate Dispatcher** | `agents/gate-dispatcher.md` | Build Triad, Systems Triad, Strategy Triad, Gate Runner, Full Audit, Smart Review | `--build`, `--systems`, `--strategy`, `--manifest`, `--full`, `--diff` |
| **Discussion Protocol** | `agents/discussion-protocol.md` | Council, Decision Council, Debate (Arbiter absorbed as synthesis step) | `--council`, `--decide`, `--debate` |

> Note: Dispatchers don't have separate kernel files — their agent definition IS their kernel. They're parameterized routers, not cognitive entities.

---

## Boot Sequence Reference

| Dispatch | What Loads |
|----------|-----------|
| `next batch` / `start [batch]` | nyx-kernel.md |
| Scout dispatch | scout-kernel.md |
| Gate `--build` | gate-dispatcher.md → pierce, mara, kehinde kernels |
| Gate `--systems` | gate-dispatcher.md → kehinde, tanaka, vane kernels |
| Gate `--strategy` | gate-dispatcher.md → calloway, voss, sable kernels |
| Gate `--full` | gate-dispatcher.md → all relevant persona kernels |
| Gate `--diff` | gate-dispatcher.md → routes by file pattern |
| Sentinel dispatch | sentinel-kernel.md |
| Wraith dispatch | wraith-kernel.md |
| Meridian dispatch | meridian-kernel.md |
| `discuss --council` | discussion-protocol.md → all 14 persona kernels |
| `discuss --decide` | discussion-protocol.md → 5 cognitive lenses (protocol steps) |
| `discuss --debate [a] [b]` | discussion-protocol.md → 2 named persona kernels |

---

## Retired Kernels (in `kernels/_retired/`)

| Kernel | Reason |
|--------|--------|
| chronicle-kernel.md | Absorbed into Nyx (Phase 5 bookkeeping) |
| scribe-kernel.md | Absorbed into Nyx (build task) |
| arbiter-kernel.md | Absorbed into Discussion Protocol (synthesis step) |
| kiln-kernel.md | Absorbed into Kehinde (performance methodology) |
| compass-kernel.md | Absorbed into Kehinde (impact analysis) |
| beacon-kernel.md | Absorbed into Sentinel (post-deploy mode) |
| triad-kernel.md | Replaced by Gate Dispatcher |
| systems-triad-kernel.md | Replaced by Gate Dispatcher |
| strategy-triad-kernel.md | Replaced by Gate Dispatcher |
| gate-runner-kernel.md | Replaced by Gate Dispatcher |
| full-audit-kernel.md | Replaced by Gate Dispatcher |

---

*KERNEL-INDEX.md — 16 active kernels (14 persona + 2 dispatcher). Restructured 2026-04-05 at P7.5-B.*
*11 kernels retired to `kernels/_retired/`. See `docs/ECOSYSTEM-REFINEMENT.md` for decision rationale.*
