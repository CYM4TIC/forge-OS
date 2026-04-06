---
name: gate
description: Smart-routed quality gate. Pierce always + auto-detect from files + manifest gate field.
user_invocable: true
---

# /gate [batch] [--add persona] [--full]

Quality gate with smart persona routing. No middleman — Nyx dispatches directly.

## Routing Logic

```
GATE = Pierce (always)
     + manifest Gate: field (batch-specific personas)
     + auto-detected (from files touched this batch)
     + --add overrides (operator-specified)
```

### Auto-Detection Table

| Files Touched | Adds |
|--------------|------|
| .tsx, .css, components/, pages/ | **Mara** (UX) |
| tokens, theme, design system files | **Riven** (design) |
| .rs, schema, migration, queries | **Kehinde** (architecture) |
| auth, rls, secrets, permissions | **Tanaka** (security) |
| payment, rates, billing | **Vane** (financial) |
| tos, consent, privacy, legal | **Voss** (legal) |
| labels, strings, copy, messages | **Sable** (voice) |
| pricing, tiers, growth, plans | **Calloway** (strategy) |

### Modes

| Mode | What |
|------|------|
| **default** | Pierce + manifest + auto-detect |
| **--add [name]** | Default + explicit persona(s) |
| **--full** | All 10 non-Nyx personas |

## Protocol

### Step 1 — Identify Target
If `$ARGUMENTS` specifies a batch ID, use it.
Otherwise, read BOOT.md for the most recently completed batch.

### Step 2 — Pre-Gate Check (scout sub-agent)
Dispatch scout to confirm:
- All files pushed to repo
- All SQL/migrations applied
- Route renders in browser (if frontend)
- No console errors

### Step 3 — Route Personas
1. Start with Pierce (always)
2. Read manifest `Gate:` field for this batch — add listed personas
3. Scan files touched this batch — match against auto-detection table, add matches
4. If `--add` specified, add those personas
5. If `--full` specified, dispatch all 10 non-Nyx personas
6. Deduplicate. Log the routing decision.

### Step 4 — Dispatch
Dispatch all routed personas in parallel. Each loads its own kernel.
Each returns findings with severity: CRIT / HIGH / MED / LOW / INFO.

### Step 5 — Fix All Findings
Fix EVERY finding — CRIT through LOW, no deferrals. Rule 43.
Consequence climb on every fix.
Push fixes.

### Step 6 — Re-Verify
Re-dispatch on the fixed code.
Confirm all findings resolved. Every fix needs read-back + browser verification.

### Step 7 — Regression (sentinel sub-agent)
Dispatch sentinel to re-verify the last 3 completed surfaces.
Confirm no regressions from the fixes.

### Step 8 — Report
Consolidated gate report:
- Batch ID + scope
- Routing decision (why these personas)
- Findings by persona and severity (all resolved)
- Regression scan result
- Risks carried forward (if any)
- Context status
