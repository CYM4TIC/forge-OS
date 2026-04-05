# Build Learnings — Runtime

> Mana, dispatch, memory scoring, three-space partitioning, RRF fusion.
> Tags: `[runtime]`

---

### OS-BL-015: Focus Trap Pattern — Extract to useFocusTrap Hook
**Discovered:** 2026-04-03 | **Domain:** frontend | **Severity:** pattern | **Tag:** [FORGE-OS]
**Context:** P7-H — ConfirmationModal is the first true modal. Built inline focus trap (~30 lines: Tab/Shift+Tab cycling, focus-on-mount, focus-restore-on-unmount).
**Problem:** Next modal will duplicate this code. Copy-paste invites divergence.
**Solution:** Extract `useFocusTrap(dialogRef)` hook at second modal usage. ConfirmationModal is the reference implementation.
**Prevention:** Don't extract preemptively. Do extract at second usage.

---

### OS-BL-031: Exponential Decay > Linear Decay for Memory Scoring
**Discovered:** 2026-04-05 | **Domain:** rust, runtime | **Severity:** pattern | **Tag:** `[rust]` `[runtime]`
**Context:** April 5 repo mining — StixDB uses `importance * 2^(-elapsed_hours / half_life_hours)` instead of linear decay. The exponential formula (a) gives a smooth curve vs. cliff at linear cutoff, (b) allows persona-configurable half-life (Pierce remembers longer than ephemeral task agents), (c) is trivially computable in SQLite via `POWER()`.
**Key constants:** Default half-life 48h. Prune threshold 0.05. Archive threshold 0.08. Touch-boost formula: `min(1.0, score * 1.2 + 0.1)` — multiplicative + additive so even near-dead memories revive meaningfully on access.

---

### OS-BL-032: RRF Fusion Beats Score Normalization for Hybrid Search
**Discovered:** 2026-04-05 | **Domain:** rust, runtime | **Severity:** pattern | **Tag:** `[rust]` `[runtime]`
**Context:** April 5 repo mining — GitNexus (22K stars) uses Reciprocal Rank Fusion `1/(K + rank)` where K=60 to merge FTS5 keyword and vector similarity results. RRF naturally balances disparate score scales without normalization. Per-document scores from both systems sum. No tuning needed — K=60 is the standard default. This is the missing fusion layer for KAIROS's FTS5 + sqlite-vec dual retrieval.
**Key insight:** Run both search systems, merge by RRF, then apply touch-boost + importance weighting. Don't pick one system — fuse them.

---

### OS-BL-033: Three-Space Memory Partition Prevents 6 Conflation Failures
**Discovered:** 2026-04-05 | **Domain:** runtime, governance | **Severity:** architecture | **Tag:** `[runtime]` `[governance]`
**Context:** April 5 repo mining — ArsContexta documents exactly 6 failure modes from mixing memory spaces: (1) ops into notes = search pollution, (2) self into notes = schema confusion, (3) notes into ops = knowledge lost at purge, (4) self into ops = orientation fails, (5) ops into self = bloats beyond load capacity, (6) notes into self = domain knowledge doesn't scale in self. Fix: enforce three-space partition in KAIROS via `space` column: `kernel` (identity, slow growth, full load at boot), `garden` (composable knowledge, progressive disclosure), `ops` (coordination, targeted access, purgeable).
**Key insight:** Content moves from temporal to durable (ops -> garden, ops -> kernel) but NEVER reverse. One-directional promotion rule.

---

### OS-BL-034: Similarity Consolidation — 0.88 Cosine Threshold
**Discovered:** 2026-04-05 | **Domain:** rust, runtime | **Severity:** constant | **Tag:** `[rust]` `[runtime]`
**Context:** April 5 repo mining — StixDB merges memory nodes above 0.88 cosine similarity. Merged embedding = normalized average of both parents. Importance = `max(parent_a, parent_b) * 0.95`. Parents archived (not deleted) with `lineage_summary_id` pointing to merged node. This is the condenser's consolidation pass — directly portable via sqlite-vec.
**Key constants:** 0.88 threshold, 0.95 importance preservation, max 64 nodes per consolidation batch, 30s agent cycle interval.

---
