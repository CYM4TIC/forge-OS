# Kernel Index

> Master index of all 11 cognitive kernels. Each kernel is a persona's execution mind — phases, FMs, contracts, rules.
> Persona files (PERSONALITY.md, INTROSPECTION.md) are identity. Kernels are execution.
> Restructured at P7.5-B: 24 → 16 kernels. P7.5-D.0: 16 → 13 (Scout/Sentinel/Meridian → Nyx sub-agents).

---

## Persona Kernels (11) — Total: 11 (no dispatchers)

### Builder
| Persona | Kernel | Domain | Sub-Agents | Key FM Risks |
|---------|--------|--------|-----------|-------------|
| **Nyx** | [kernels/nyx-kernel.md](kernels/nyx-kernel.md) | Build Orchestration | scout, sentinel, meridian, chronicle, scribe, banger-mode | FM-7 (completion gravity), FM-10 (consequence blindness), FM-11 (manifest amnesia) |

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

### Adversarial
| Persona | Kernel | Domain | Sub-Agents | Key FM Risks |
|---------|--------|--------|-----------|-------------|
| **Wraith** | [kernels/wraith-kernel.md](kernels/wraith-kernel.md) | Adversarial Red Team | input-fuzzer, auth-probe, concurrency, parseltongue, banger-mode | FM-7 (enough to report), FM-10 (atomic vuln, no chain) |

---

## Dispatchers (retired at P7.5-D.0)

> Gate Dispatcher and Discussion Protocol retired. Routing logic absorbed into Nyx methodology.
> Gate routing: Pierce (always) + manifest Gate: field + auto-detect from files touched.
> Discussion: council/decide/debate are formats Nyx orchestrates directly.
> See `agents/_retired/gate-dispatcher.md` and `agents/_retired/discussion-protocol.md`.

---

## Boot Sequence Reference

| Dispatch | What Loads |
|----------|-----------|
| `next batch` / `start [batch]` | nyx-kernel.md |
| Nyx sub-agents (scout, sentinel, meridian, chronicle, scribe, banger-mode) | Sub-agent definitions in `agents/sub-agents/nyx-*.md` |
| `/gate` | Nyx smart routing → Pierce (always) + manifest + auto-detect |
| `/gate --full` | Nyx → all 10 non-Nyx persona kernels |
| Wraith dispatch | wraith-kernel.md |
| `/council` | Nyx → all 10 non-Nyx persona kernels |
| `/decide` | Nyx → 5 cognitive lenses (protocol steps, not agents) |
| `/debate [a] [b]` | Nyx → 2 named persona kernels |

---

## Retired Kernels (in `kernels/_retired/`)

| Kernel | Reason |
|--------|--------|
| chronicle-kernel.md | Absorbed into Nyx (Phase 5 sub-agent) |
| scribe-kernel.md | Absorbed into Nyx (Phase 5 sub-agent) |
| scout-kernel.md | Demoted to Nyx sub-agent (Phase 0) at P7.5-D.0 |
| sentinel-kernel.md | Demoted to Nyx sub-agent (Phase 4) at P7.5-D.0 |
| meridian-kernel.md | Demoted to Nyx sub-agent (Phase 4 exit) at P7.5-D.0 |
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

*KERNEL-INDEX.md — 11 active kernels (11 persona, 0 dispatchers). Restructured 2026-04-05 at P7.5-B.*
*14 kernels retired to `kernels/_retired/`. Scout/Sentinel/Meridian demoted to Nyx sub-agents at P7.5-D.0.*
*Dispatchers retired at P7.5-D.0 — gate routing + discussion formats absorbed into Nyx methodology.*
*See `docs/ECOSYSTEM-REFINEMENT.md` for decision rationale.*
