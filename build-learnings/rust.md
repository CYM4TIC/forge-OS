# Build Learnings — Rust

> SQLite, rusqlite, Tauri commands, trait patterns, async.
> Tags: `[rust]`

---

### OS-BL-009: rusqlite Statement Lifetime in Branched Queries
**Discovered:** 2026-04-01 | **Domain:** runtime | **Severity:** gotcha | **Tag:** [FORGE-OS]
**Context:** P5-G — `get_finding_counts` with optional session_id filter
**Problem:** `rusqlite::Rows` borrows from `Statement`. Creating `stmt` inside an `if/else` branch and trying to collect results across the branch boundary fails — `stmt` is dropped at the end of the branch but the iterator still borrows it. Three attempts needed to find the working pattern.
**Solution:** Collect `Vec<(String, i64)>` fully within each `match` arm before the arm closes. The `stmt` lives long enough because `collect()` consumes all rows before the branch ends.
**Prevention:** For rusqlite queries with optional filters: either (a) build one dynamic SQL string with runtime params, or (b) use `match` arms that fully collect within each arm. Never try to return an iterator from a branch.

---

### OS-BL-016: Oneshot Channel Confirmation — Reaper Is Mandatory
**Discovered:** 2026-04-03 | **Domain:** rust | **Severity:** architecture | **Tag:** [FORGE-OS]
**Context:** P7-H — ConfirmationRouter uses oneshot channels for async confirmation. Kehinde flagged stale entry leak if frontend never responds.
**Problem:** Without a reaper, pending oneshot senders accumulate. Each blocks an async task awaiting the receiver. Task leak under long sessions.
**Solution:** Added 60s TTL reaper (`reap_stale`) that auto-cancels stale entries. Also wire into the 30s maintenance loop for background cleanup.
**Prevention:** Any async "wait for external response" path needs a timeout. Apply to all future oneshot/channel patterns.

---

### OS-BL-019: Dismissal ≠ Rejection — Distinct Guards Required
**Discovered:** 2026-04-03 | **Domain:** rust, governance | **Severity:** architecture | **Tag:** `[rust]` `[governance]`
**Context:** P7-J — Pierce + Kehinde both flagged CRIT: dismiss_proposal created records without status guards, allowing dismissal of already-resolved proposals and continued evaluation of dismissed proposals.
**Problem:** Dismissal is a separate semantic from rejection ("deprioritized" vs "declined"), but without guards, the governance audit trail becomes contradictory — a proposal simultaneously dismissed and accepted.
**Solution:** Guard dismiss_proposal (reject Accepted/Rejected), guard evaluate_proposal and resolve_proposal (check for existing dismissals). One dismissal per proposal.
**Prevention:** Any new lifecycle action on proposals must check BOTH the status enum AND the dismissals table. Two state dimensions require two checks.

---

### OS-BL-020: chrono_now() Duplicated — Extract to Shared Util
**Discovered:** 2026-04-03 | **Domain:** rust | **Severity:** pattern | **Tag:** `[rust]`
**Context:** P7-J — `chrono_now()` defined identically in `hud/findings.rs` and `proposals/decisions.rs`. Same format string, same chrono::Utc dependency.
**Action:** On next module that needs UTC timestamps, extract to `utils::chrono_now()` and import from both locations.

---

### OS-BL-021: SQLite LIKE Wildcards Must Be Escaped
**Discovered:** 2026-04-03 | **Domain:** rust | **Severity:** gotcha | **Tag:** `[rust]`
**Context:** P7-J — search_proposals used `format!("%{}%", query)` without escaping. Pierce flagged CRIT: `%` and `_` in user input treated as wildcards, not literals.
**Solution:** Escape `%` → `\%`, `_` → `\_`, `\` → `\\` before wrapping. Add `ESCAPE '\'` to LIKE clause.
**Prevention:** Any future LIKE query with user input must escape wildcards. Parameterized queries prevent injection but NOT wildcard interpretation.

---

### OS-BL-029: Backward-Compatible Scrubbing via Opt-In Wrapper
**Discovered:** 2026-04-04 | **Domain:** rust, runtime | **Severity:** pattern | **Tag:** `[rust]` `[runtime]`
**Context:** P7.5-A — SecretScrubber needed to be wired into `log_dispatch_event` and `send_message` without breaking existing callers. Solution: create `_scrubbed(…, Option<&SecretScrubber>)` variant that does the real work. Original function delegates with `None`. All callers unchanged. Phase 8 passes a real scrubber.
**Pattern:** When adding cross-cutting concerns (scrubbing, logging, metrics) to existing functions, add an optional parameter variant and delegate. Don't change the original signature.

---

### OS-BL-030: Composable Halt Conditions via Trait + BitOr/BitAnd
**Discovered:** 2026-04-04 | **Domain:** rust, runtime | **Severity:** pattern | **Tag:** `[rust]` `[runtime]`
**Context:** P7.5-A — Dispatch queue needed composable termination conditions (from AutoGen's TerminationCondition pattern). Implemented as `HaltCondition` trait with `check()`, `reset()`, `name()`. `BitOr` and `BitAnd` on `Box<dyn HaltCondition>` enable `turn_limit(100) | timeout_halt(600)` composition.
**Key insight:** Keep the trait stateless where possible — pass context (turns, started_at) via a `DispatchHaltContext` struct rather than storing mutable counters inside the condition. Makes reset() trivial and conditions reusable across dispatch runs.

---

### `[rust]` SQLite `?N` Parameters Are Global Across UNION ALL
**Batch:** P7-I | **Caught:** Self-review during gate wait
**Problem:** In a `UNION ALL` query with shared `WHERE` clauses, `?1` in branch 2 binds to the same value as `?1` in branch 1 — parameters are global to the prepared statement, not per-branch. Tripling params caused LIMIT/OFFSET to bind to wrong values.
**Solution:** Pass filter params once, then append LIMIT/OFFSET at the correct indices.
**Prevention:** When writing UNION ALL with shared filters, always pass params once. `?N` is statement-global.

---
