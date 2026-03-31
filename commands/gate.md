---
name: gate
description: Run the full auto-gate pipeline on a batch — Scout → Triad → Fix → Re-verify → Sentinel
user_invocable: true
---

# /gate [batch]

Full auto-gate pipeline. Runs all persona gates, fixes findings, re-verifies, checks regressions.

## Protocol

### Step 1 — Identify Target
If `$ARGUMENTS` specifies a batch ID, use it.
Otherwise, read the build state (BOOT.md) to find the most recently completed batch.

### Step 2 — Scout (Pre-Gate Intelligence)
Dispatch `agents/scout.md` to confirm:
- All files pushed to repo
- All SQL/migrations applied
- Route renders in browser (if frontend)
- No console errors

### Step 3 — Triad Gate
Dispatch `agents/triad.md` (Pierce + Mara + Riven) against the batch's route.
Returns consolidated findings.

### Step 4 — Additional Gates
Read the project's persona gates config for this batch.
If additional personas required (Kehinde, Tanaka, Vane, Voss):
- Dispatch each as an isolated agent in parallel
- Collect findings

### Step 5 — Fix All Findings
The build orchestrator receives all findings from all personas.
Fix EVERY finding — CRIT through LOW, no deferrals.
Push fixes.

### Step 6 — Re-Verify
Re-dispatch the triad on the fixed code.
Confirm all findings resolved.
Every fix must have read-back evidence AND browser verification.

### Step 7 — Sentinel (Regression Scan)
Dispatch `agents/sentinel.md` to re-verify the last 3 completed surfaces.
Confirm no regressions from the fixes.

### Step 8 — Report
Consolidated gate report:
- Batch ID + surface name
- Findings by persona and severity (all resolved)
- Regression scan result
- Risks carried forward (if any)
- Context window status + recommendation
