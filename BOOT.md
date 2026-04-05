# Forge OS — Boot File

> **Read on every activation.** Lean by design — history lives in `build-history/`.

<!-- MACHINE-READABLE STATE -->
```yaml
project: forge_os
architecture: tauri_v2
phase: 8
current_session: 7.5
current_batch: P7.5-D.0
batches_done: 115
phases_complete: [1, 4, 5, 6, 7]
phases_total: 11
sessions_total: 38
environment: claude_code
local_repo: .
last_updated: 2026-04-05
dms_paused_at: L4-J.2c
dms_batches_done: 57
dms_batches_total: 122
```
<!-- END MACHINE-READABLE STATE -->

---

## Current Position

**Session 7.5 — Pre-Phase 8 Intelligence Retrofit.**

Last completed: **P7.5-C** — Research Audit. 400+ patterns mapped to 14 personas across 50+ source documents (3 synthesis, 6 mining, 19 research, 14 references, 5 skills, 2 attack libraries, 6 absorbed agents). Output: `docs/RESEARCH-PERSONA-MAP.md` (784 lines). Dispatcher Research Map added for Arbiter→Discussion Protocol. Pierce gate: 11 findings, all fixed. Sentinel PASS. Gaps identified: Voss, Calloway, Sable (addressable in profile sessions).

**Next: P7.5-D.0 — Guided Profile Session: Nyx** (read research audit → guided conversation → self-author profile).

---

## Carried Risks

| ID | Description | Resolves in |
|----|-------------|-------------|
| K-HIGH-1 | Queue `active_count` not decremented on completion | Phase 8 (orchestration) |
| K-HIGH-2 | `reset_halt` not called — needs orchestration layer | Phase 8 (orchestration) |
| T-HIGH-1 | Scrubber variants ready but not wired to managed state | Phase 8 (state management) |
| T-HIGH-2 | `zeroize` crate deferred — secrets not zeroed on drop | Phase 8 (security hardening) |

---

## Active Batch Table — Session 7.5

| Batch | Name | Status |
|-------|------|--------|
| P7.5-A | Dispatch Queue Intelligence + Secret Scrubbing | ✅ DONE |
| P7.5-B | Ecosystem Refinement (42→14 personas) | ✅ DONE |
| P7.5-C | Research Audit (400+ patterns → 14 personas) | ✅ DONE |
| P7.5-D.0–D.9 | Guided Profile Sessions — 10 original personas | ⬜ TODO |
| P7.5-E.0–E.3 | Guided Profile + Introspection — 4 elevated personas | ⬜ TODO |
| P7.5-F | Design System Governance | ⬜ TODO |
| P7.5-G | Finding Deduplication + Compaction Condenser | ⬜ TODO |
| P7.5-H | KAIROS Composite Scoring + Swarm Event Triggers | ⬜ TODO |
| P7.5-I | Exponential Decay + Touch-Boost + Access Frequency | ⬜ TODO |
| P7.5-J | RRF Hybrid Search + Three-Space + Consolidation Merge | ⬜ TODO |

---

## Phase 7 Batch Table (deferred batches)

| Batch | Name | Session | Status |
|-------|------|---------|--------|
| P7-H | Dispatch Integration + Chat Glyphs | 7.2 | ⬜ TODO |
| P7-I | Proposal Store + SQLite Migration | 7.3 | ⬜ TODO |
| P7-J | Proposal Triage + Decisions + Commands | 7.3 | ⬜ TODO |
| P7-K | Proposal Bridge + Feed Panel | 7.3 | ⬜ TODO |
| P7-M | Phase 7 Integration + Dock + Presets | 7.3 | ⬜ TODO |
| P7-N | Phase 8 Prerequisite Backfill | 7.4 | ⬜ TODO |

> Completed Phase 7 batches (P7-A through P7-G, P7-L): see `batch-manifests/phase-7.md`.

---

## Reference Pointers

- **Architecture decisions:** `ADL.md` (repo root)
- **Build learnings:** `BUILD-LEARNINGS.md` (repo root)
- **Full build plan:** `docs/TAURI-BUILD-PLAN.md` (11 phases, 38 sessions)
- **Batch manifests:** `batch-manifests/` (per-phase files, see `batch-manifests/INDEX.md`)
- **Session logs:** `build-history/` (per-phase folders, see `build-history/BATCH-INDEX.md`)
- **Phase 3+ architecture:** `docs/PHASE-3-ARCHITECTURE.md`

---

## Key Context

- **Tauri v2 desktop app** — Rust backend + React frontend inside native window
- **Engine-agnostic** — ModelProvider trait, Claude + OpenAI ship in v1
- Code and build state both live in this repo, pushed to CYM4TIC/forge-OS per batch
