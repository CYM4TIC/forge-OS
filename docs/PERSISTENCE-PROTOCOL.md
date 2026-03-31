# Persistence Protocol

> PRD-driven completion verification and cross-iteration state management.
> Adapted from oh-my-claudecode's Ralph skill. Enhances Nyx's execution protocol.

---

## 1. The Problem

"Done" is self-reported. The builder says "all findings fixed, batch complete" but:
- Did every acceptance criterion actually pass?
- Was each verified with fresh evidence (not recalled from memory)?
- Did the verification run against the current code (not a prior version)?

The persistence protocol replaces self-reported completion with **empirical verification**.

---

## 2. Task Crystallization

Before execution, crystallize the task into structured stories with testable criteria.

### Story Format

```json
{
  "id": "S-001",
  "title": "Engine config form saves and persists",
  "description": "Admin can edit engine timing, frequency caps, and channel settings",
  "acceptance_criteria": [
    {
      "id": "AC-001",
      "description": "Config form renders with current values from get_engine_detail",
      "verification": "Browser snapshot shows form fields populated with DB values",
      "verified": false,
      "evidence": null
    },
    {
      "id": "AC-002",
      "description": "Saving config calls update_engine_config and persists to DB",
      "verification": "Execute SQL to confirm updated values after form submit",
      "verified": false,
      "evidence": null
    }
  ],
  "passes": false
}
```

### Rules
- Acceptance criteria must be **testable** — not "implementation is complete" but "function X returns Y when given Z"
- Each criterion has a **verification method** — browser snapshot, SQL query, console check, file read
- Stories are task-specific — no generic scaffolding like "code is clean" or "tests pass"

---

## 3. The Verification Loop

```
FOR each story with passes = false:
  1. IMPLEMENT the story (build code, apply SQL, etc.)
  2. FOR each acceptance_criterion with verified = false:
     a. Execute the verification method
     b. Capture evidence (screenshot, SQL result, console output)
     c. Mark verified = true ONLY if evidence confirms the criterion
     d. If verification fails: fix and re-verify (max 3 attempts per criterion)
  3. IF all criteria verified = true:
     mark story.passes = true
     record in progress log
  4. ELSE:
     identify which criteria failed
     diagnose root cause
     loop back to step 1

CIRCUIT BREAKER:
  If same criterion fails 3+ attempts → STOP
  Escalate: "Criterion AC-XXX has failed 3 times. Root cause may be architectural.
  Evidence from attempts: [list]. Recommend reframe before continuing."
```

### Fresh Evidence Rule

Evidence must be from the **current state** of the code, not from memory or a prior verification run. Re-run the verification method each time. This catches regressions introduced by subsequent changes.

---

## 4. Progress Tracking

### Intra-Task Learning (progress.txt pattern)

During execution, capture discoveries in a progress log:
```markdown
## Progress Log — {task/batch ID}

### Iteration 1
- Discovered: `shop_engine_settings` has no default row — need INSERT ON CONFLICT
- Pattern: All config tables need default-row seeding before UPDATE works
- Codebase convention: Config forms use `useForm` hook with `defaultValues` from RPC

### Iteration 2
- Fixed: AC-002 was failing because RPC returns `updated_at` but form doesn't refresh
- Learning: After mutation RPCs, invalidate React Query cache for the affected key
```

This is different from BUILD-LEARNINGS.md (cross-session, cross-batch). Progress logs capture **within-task discoveries** that feed into the next iteration of the same task.

---

## 5. Deslop Pass

After all stories pass verification, run a mandatory cleanup sweep.

### What Deslop Targets
- **Verbose comments** — AI tends to over-comment. Remove comments that restate the code.
- **Over-abstraction** — Unnecessary helpers, utilities, or wrappers for one-time operations.
- **Defensive over-engineering** — Error handling for impossible cases, fallbacks that can't trigger.
- **Redundant type annotations** — TypeScript can infer most types. Remove explicit annotations where inference works.
- **Import cleanup** — Unused imports, duplicate imports, import ordering.
- **Console.log artifacts** — Debug logging left in production code.

### Deslop Verification
After cleanup, re-run acceptance criteria for all stories. Deslop can break things (removing a "redundant" check that was actually load-bearing). If any criterion regresses, revert that specific cleanup.

### Opt-Out
Operator can skip deslop with `--no-deslop` flag. Useful for time-sensitive batches or when the code is already clean.

---

## 6. State Persistence

### State File Structure
```json
{
  "mode": "persistence",
  "active": true,
  "batch_id": "L4-J.2c",
  "iteration": 2,
  "max_iterations": 10,
  "current_phase": "verification",
  "stories": [...],
  "progress_log": [...],
  "circuit_breaker_hits": {
    "AC-003": 2
  }
}
```

### Resume Semantics
On session restart:
1. Read state file
2. If `active = true` and `current_phase != "complete"`:
   - Resume from current story (first with `passes = false`)
   - Re-verify already-passed stories if code changed since last session
3. If `active = false`: start fresh

### Cleanup
After all stories pass + deslop completes:
1. Write final progress log to BUILD-LEARNINGS.md (cross-session)
2. Clear state file
3. Report completion with evidence summary

---

## 7. Integration with Nyx Build Loop

The persistence protocol wraps Nyx's existing Phase 1 (BUILD) and Phase 2 (GATE):

```
EXISTING:                           WITH PERSISTENCE:
Phase 0: Scout                      Phase 0: Scout
Phase 1: Build                      Phase 1: Build + Verify (per-story loop)
Phase 2: Gate (Triad)               Phase 2: Gate (Triad)
Phase 3: Regression (Sentinel)      Phase 2.5: Deslop Pass (NEW)
Phase 4: Close                      Phase 3: Regression (Sentinel)
                                    Phase 4: Close (with evidence summary)
```

The key change: Phase 1 is no longer "write all code, then verify." It's "write one story, verify it empirically, then write the next." This catches issues earlier and prevents compound errors.

---

## 8. When to Use Full Persistence vs Lightweight

| Scenario | Mode | Rationale |
|----------|------|-----------|
| Complex multi-file surface | Full persistence | Many moving parts, high regression risk |
| Simple DDL batch | Lightweight (verification SQL only) | Low complexity, verification is just SQL |
| High-risk surface (auth, payments) | Full persistence + deliberate mode | Failures are expensive |
| Bug fix | Lightweight | Single criterion: "bug is fixed" |
| Refactor | Full persistence | Many criteria: "everything still works" |
