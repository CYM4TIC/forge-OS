# Forge OS — Boot File

> **Read on every activation.** Lean by design — history lives in `build-history/`.

<!-- MACHINE-READABLE STATE -->
```yaml
project: forge_os
architecture: tauri_v2
phase: 8
current_session: 7.5
current_batch: P7.5-D.0
batches_done: 116
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

Last completed: **P7.5-C.1** — Infrastructure Housekeeping.

**Pre-D.0 prep (2026-04-05):** Mined github/awesome-copilot (35 patterns, 14 HIGH). Surveyed 38 repos across 8 orgs (github, microsoft, langchain, MCP, etc.) — 12 HIGH priority. Created `forge/research/PHASE-8-REPO-REFERENCE.md` (Phase 8 manifest reference combining mined patterns + repos to mine, organized by sub-session). Updated `docs/RESEARCH-PERSONA-MAP.md` with Repo Mining Targets per persona. Refined D/E-series manifest: 4-phase process (Load → Conversation → Reference Bank → Profile+Index), three output files per session (reference bank first as source of truth, profile + index derived from it). Updated `docs/KNOWLEDGE-LOADING-ARCHITECTURE.md` with Layer 3 reference bank + index structure and KAIROS ingestion path.

**D.0 in progress (2026-04-05):** Major restructuring decision during guided conversation. Scout, Sentinel, Meridian demoted from personas to Nyx sub-agents — they serve the build loop, not independent domain expertise. Chronicle + Scribe become sub-agents (not absorbed capabilities). Banger-mode added (bounded iterative fix loop). Phase 5 reframed: Scribe posture (synthesis through writing) replaces compliance bookkeeping. E-series collapses from 4 sessions to 1 (Wraith only). Team: 14→11 personas, 20→27 sub-agents.

**Next: P7.5-D.0 — continue** (sub-agent definitions → reference bank → profile + index).

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
| P7.5-B | Ecosystem Refinement (42→14→11 personas) | ✅ DONE |
| P7.5-C | Research Audit (400+ patterns → 14→11 personas) | ✅ DONE |
| P7.5-D.0–D.9 | Guided Profile Sessions — 10 original personas (+ Nyx sub-agent defs) | ⬜ TODO |
| P7.5-E | Guided Profile + Introspection — Wraith | ⬜ TODO |
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

- **Architecture decisions:** `adl/` (per-decision files, index at `adl/INDEX.md`)
- **Build learnings:** `build-learnings/` (per-domain files, index at `build-learnings/INDEX.md`)
- **Full build plan:** `docs/TAURI-BUILD-PLAN.md` (11 phases, 38 sessions)
- **Batch manifests:** `batch-manifests/` (per-phase files, see `batch-manifests/INDEX.md`)
- **Session logs:** `build-history/` (per-phase folders, see `build-history/BATCH-INDEX.md`)
- **Phase 3+ architecture:** `docs/PHASE-3-ARCHITECTURE.md`

---

## Key Context

- **Tauri v2 desktop app** — Rust backend + React frontend inside native window
- **Engine-agnostic** — ModelProvider trait, Claude + OpenAI ship in v1
- Code and build state both live in this repo, pushed to CYM4TIC/forge-OS per batch
