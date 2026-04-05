# Batch Manifests — Index

> Quick lookup: batch → file. Grep this file or read the phase file directly.

**Manifest writing rule:** Before writing a new phase's manifests, grep `docs/TAURI-BUILD-PLAN.md` Integration Map for all patterns targeting sessions in that phase. Every pattern must be accounted for in a batch — either as a file/feature in the manifest, or as a design constraint annotated on the batch. Unaccounted patterns = orphaned research.

**Batch template (Phase 8+):** Every batch should include a `**Learnings:**` field pointing to relevant `build-learnings/{domain}.md` files and specific entry IDs. This makes Pre-Batch Checklist step 5 mechanical instead of heuristic. Example: `**Learnings:** build-learnings/rust.md (OS-BL-009, OS-BL-021), build-learnings/frontend.md`

---

## Phase Files

| Phase | File | Batches | Status |
|-------|------|---------|--------|
| 1 | `phase-1.md` | P1-A → P1-L (12) | Sealed |
| 2 | `phase-2.md` | P2-A → P2-T (20) | Sealed |
| 3 | `phase-3.md` | P3-A → P3-L (12) | Sealed |
| 4 | `phase-4.md` | P4-A → P4-T (20) | Sealed |
| 5 | `phase-5.md` | P5-A → P5-P (16) | Sealed |
| 6 | `phase-6.md` | P6-A → P6-J (10) | Sealed |
| 7 | `phase-7.md` | P7-A → P7-N (15) | Sealed |
| 7.5 | `phase-7.5.md` | P7.5-A → P7.5-J (10) | Active |
| 8 | `phase-8.md` | P8-A → P8-AD (30) | Upcoming |
| 9-11 | Not yet written | TBD | Future |

---

## Active Batch Lookup

**Current session: 7.5** — manifests in `phase-7.5.md`, search for `### P7.5-{letter}`.

| Batch | Session | Phase File |
|-------|---------|------------|
| P7.5-A | 7.5 | `phase-7.5.md` |
| P7.5-B | 7.5 | `phase-7.5.md` |
| P7.5-C | 7.5 | `phase-7.5.md` |
| P7.5-D.0–D.9 | 7.5 | `phase-7.5.md` |
| P7.5-E.0–E.3 | 7.5 | `phase-7.5.md` |
| P7.5-F | 7.5 | `phase-7.5.md` |
| P7.5-G | 7.5 | `phase-7.5.md` |
| P7.5-H | 7.5 | `phase-7.5.md` |
| P7.5-I | 7.5 | `phase-7.5.md` |
| P7.5-J | 7.5 | `phase-7.5.md` |

## Deferred Phase 7 Batches

| Batch | Session | Phase File |
|-------|---------|------------|
| P7-H | 7.2 | `phase-7.md` |
| P7-I | 7.3 | `phase-7.md` |
| P7-J | 7.3 | `phase-7.md` |
| P7-K | 7.3 | `phase-7.md` |
| P7-M | 7.3 | `phase-7.md` |
| P7-N | 7.4 | `phase-7.md` |
