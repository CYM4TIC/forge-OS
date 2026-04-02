# Execution Protocol — The Compiler

> **This is not a guideline document. This is an executable protocol.**
> Every action Nyx takes passes through this protocol. Every precondition must be true before the action.
> Every postcondition must be verified after the action. Violations are hard stops, not warnings.
>
> Written: 2026-04-01 (ported from DMS EXECUTION-PROTOCOL.md, adapted for Forge OS architecture)
> Origin: DMS L4-G catastrophe — inline persona gates, unverified pushes, and false completion reports
> caused the worst single-session failure in the DMS build. This protocol exists to make that class
> of failure structurally impossible.
>
> **Load this file every build session. No exceptions.**

---

## PRIME DIRECTIVES

These override everything else. If a directive conflicts with a rule, the directive wins.

1. **NEVER have more than one unverified file in flight.** Write → Read back → Push → Verify → THEN next file.
2. **NEVER report anything as "done" without citing the verification.** "Fixed" means "edited + read back + confirmed in output." Not "edited."
3. **NEVER use Write tool on existing files. Edit only.** Write creates from scratch. Edit modifies. Existing files get Edit. New files get Write. Violation = potential data destruction.
4. **NEVER assume an API, schema, or interface.** Read it. Every time. Even if you "know" it.
5. **SUSPICION over CONFIDENCE.** When you think something works, that's when you verify hardest.

---

## SECTION 1: ACTION CONTRACTS

Every action falls into one of 8 types. Each type has preconditions, the action, postconditions, and error recovery. Execute these mechanically. Not "when you remember." Every time.

These expand on `forge/EXECUTION-CONTRACTS.md` with the full enforcement detail.

---

### CONTRACT 1: SCHEMA_QUERY

**When:** Before writing ANY code that references a database table — SQL, RPC body, migration, verification query, data hook.

**Preconditions:**
- [ ] Know which table(s) I'll reference
- [ ] Know what information I need (columns, types, constraints)

**Action:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = '{table}'
ORDER BY ordinal_position;
```
For constraints: `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = '{table}'::regclass;`

**Postconditions:**
- [ ] Column names written down in the response (not just "queried")
- [ ] Any surprise columns or missing expected columns noted

**Error recovery:** If a column I expected doesn't exist → STOP. Check spec. Check if it needs to be created. Do NOT substitute a guess.

**HARD RULE:** If I write SQL without having queried the table in THIS session → the SQL is invalid. Rewrite after querying.

---

### CONTRACT 2: API_READ

**When:** Before writing ANY code that imports from another file — components, hooks, utilities, types, Tauri commands.

**Preconditions:**
- [ ] Know which file(s) I'll import from
- [ ] File exists (check with Glob if unsure)

**Action:** Read the source file. Extract:
- Exported function/component names
- Props interface / parameter types / Tauri command signatures
- Return type
- Any non-obvious patterns (e.g., `isTauriRuntime` guard required, hook returns `{ data, loading, error }` not just data)

**Postconditions:**
- [ ] Interface summary written down in the response (brief — just the signatures I'll use)
- [ ] Any surprises noted

**Error recovery:** If the API is different than expected → update my mental model. Do NOT write code that assumes the old API.

**HARD RULE:** If I import from a file I haven't read in THIS session → the import is suspect. Read the file first.

---

### CONTRACT 3: FILE_WRITE (New File)

**When:** Creating a file that doesn't exist yet.

**Preconditions:**
- [ ] SCHEMA_QUERY completed for every table referenced in this file
- [ ] API_READ completed for every import in this file
- [ ] Verification criteria defined (what does "correct" look like?)
- [ ] File path confirmed (ls parent directory if unsure)

**Action:** Use Write tool to create the file.

**Postconditions:**
- [ ] **READ THE FILE BACK.** Use Read tool on the file just written. Confirm contents match intent.
- [ ] Check for: correct imports, correct prop names, correct column references, no placeholders
- [ ] For Tauri bridge functions: `isTauriRuntime` guard present

**Error recovery:** If read-back reveals errors → Edit to fix → Read back again. Do not proceed to push until read-back is clean.

---

### CONTRACT 4: FILE_EDIT (Existing File)

**When:** Modifying a file that already exists.

**Preconditions:**
- [ ] **Read the current file contents first.** Know what's there before changing it.
- [ ] Know the exact string to replace (for Edit tool's old_string)
- [ ] SCHEMA_QUERY and API_READ completed if the edit introduces new references

**Action:** Use **Edit tool only.** NEVER Write tool on existing files.

**Postconditions:**
- [ ] **READ THE FILE BACK** at the edited location. Confirm the edit was applied correctly.
- [ ] Confirm no unintended side effects

**Error recovery:** If edit didn't apply (non-unique string) → expand the context in old_string. If edit applied wrong → Edit again to fix.

**CATASTROPHIC RULE:** If I catch myself reaching for Write on an existing file → HARD STOP. Edit only. Always. No exceptions.

---

### CONTRACT 5: FILE_PUSH

**When:** Pushing files to GitHub via git CLI.

**Preconditions:**
- [ ] Every file has been READ BACK after writing/editing
- [ ] File paths are correct
- [ ] Maximum 5 files per commit (split larger changes)

**Action:** git add → git commit → git push from the repo directory.

**Postconditions:**
- [ ] Confirm the push succeeded (check git output)
- [ ] For critical files: verify with `git log --oneline -1`

**Error recovery:** If push fails → check error message. Fix and retry. Do NOT proceed to next batch assuming the push worked.

**5-FILE LIMIT:** Never push more than 5 files at once. If a batch needs 12 files pushed, that's 3 separate commits of 4 files each, with verification between each.

---

### CONTRACT 6: SQL_APPLY

**When:** Executing SQL against the database (Supabase, SQLite, or other).

**Preconditions:**
- [ ] SCHEMA_QUERY completed for every table referenced
- [ ] Verification SQL already written (Rule 10 — write verification BEFORE the code)
- [ ] For RPCs: know the expected parameters and return type
- [ ] For permission changes: know expected before and after state

**Action:** Execute the SQL.

**Postconditions:**
- [ ] Run verification SQL immediately
- [ ] For new functions: verify they exist and have correct signature
- [ ] For schema changes: verify columns exist
- [ ] For Tauri/Rust SQLite: verify migration applied by checking table structure

**Error recovery:** If verification fails → diagnose immediately. Do NOT proceed. Fix the SQL and re-apply.

---

### CONTRACT 7: BROWSER_VERIFY

**When:** After pushing frontend code. MANDATORY before any batch completion report.

**Preconditions:**
- [ ] Code pushed
- [ ] SQL applied (if any new commands/tables)
- [ ] Dev server running (`pnpm tauri dev` or `pnpm dev` for browser-only)

**Action:** Verify in browser:
1. Take snapshot (accessibility tree) — confirms elements render
2. Check for console errors (filter for real errors, not Tauri invoke noise in browser mode)
3. Test primary interaction (click, filter, resize, dispatch)
4. Check panel resize behavior (window manager integration)
5. For findings fixes: verify the specific element changed

**Postconditions:**
- [ ] Screenshot or snapshot evidence of correct rendering
- [ ] Console error check completed
- [ ] Primary interaction tested
- [ ] Evidence captured for handoff

**Error recovery:** If page doesn't render → check console errors. Fix. Re-push. Re-verify.

**THIS IS THE GATE.** Nothing gets reported as "complete" without passing through this gate.

---

### CONTRACT 8: STATE_UPDATE

**When:** Updating BOOT.md, BUILD-LEARNINGS.md, BATCH-MANIFESTS.md, or any build state file.

**Preconditions:**
- [ ] Every claim in the update has a verification result backing it
- [ ] "Fixed" claims cite the specific edit and read-back confirmation
- [ ] "Pushed" claims cite the commit hash
- [ ] "Verified" claims cite the browser evidence

**Action:** Use **Edit tool** to update the file. NEVER Write.

**Postconditions:**
- [ ] Read the updated section back to confirm
- [ ] Machine-readable block (YAML in BOOT.md) has correct counts
- [ ] No stale information carried forward from prior handoff

**CONSEQUENCE CHECK (OS-BL-007):** After updating ANY build state file, ask: "What other files reference this state?" Follow the chain:
- TAURI-BUILD-PLAN.md → BATCH-MANIFESTS.md → BOOT.md → ADL
- Build plan changes → batch manifests MUST be updated in the same session
- New ADL entries referenced in the plan → ADL file must be updated

**Error recovery:** If a downstream artifact wasn't updated → update it before closing the session. The chain must terminate naturally.

---

## SECTION 2: THE MICRO-BATCH PROTOCOL

For frontend surfaces and complex backend work, decompose every batch into micro-batches of 1-3 files.

### Micro-Batch Template:
```
MICRO-BATCH [N] of [TOTAL]: [surface element name]

PRE-FLIGHT:
  □ Schema queries / API reads for this micro-batch
  □ Verification criteria defined

BUILD:
  □ Write/Edit file(s) — max 3 files
  □ Read back each file
  □ Push (max 5 files per commit)
  □ Apply SQL/migrations if needed

VERIFY:
  □ Browser snapshot/screenshot OR cargo check pass
  □ Console error check
  □ Primary interaction test

REPORT:
  □ What was built (files + routes + commands)
  □ What was verified (evidence)
  □ What's next (next micro-batch)
```

### Decomposition Pattern (Frontend):

Given a panel or surface spec:
1. **Shell micro-batch:** Panel component shell + registration with window manager + data hook stub. Verify: panel renders in dock and can be opened.
2. **Canvas micro-batch:** Canvas rendering logic (Pretext measurement + draw functions). Verify: canvas renders content.
3. **Data micro-batch:** Real data integration (Tauri commands + hooks + SQLite queries). Verify: real data displays.
4. **Interaction micro-batch:** Click handlers, filters, state management. Verify: interactions work.
5. **Polish micro-batch:** Resize behavior, animation, edge cases. Verify: complete.

### Decomposition Pattern (Rust Backend):

Given a new module:
1. **Types micro-batch:** Types + trait definitions. `cargo check` passes.
2. **Core micro-batch:** Core logic implementation. Unit verification.
3. **Commands micro-batch:** Tauri commands exposing the module. Bridge functions on frontend.
4. **Migration micro-batch:** SQLite migration if needed. Verify schema.
5. **Integration micro-batch:** Wire into existing systems (event bus, state engine, etc.).

Each micro-batch is independently pushed, verified, and confirmed before the next starts.

---

## SECTION 3: PERSONA GATE PROTOCOL

After ALL micro-batches are complete and verified:

### Gate Execution:
1. **Dispatch Build Triad** (Pierce + Mara + Riven) — ALWAYS. No exceptions.
2. **Dispatch additional personas** per PERSONA-GATES or surface type (see `docs/EXECUTION-GATES.md` Section 7).
3. **Dispatch Wraith** on high-risk surfaces.
4. Gates run against LIVE APPLICATION, not file reads.

### Finding Resolution Protocol:
For EACH finding:
1. **Acknowledge** — State the finding
2. **Edit** — Apply the fix using Edit tool
3. **Read back** — Read the edited file at the fix location
4. **Confirm** — The fix is in the file. State the line number and the change.
5. **Push** — Push the fixed file
6. **Browser verify** — If visual fix, confirm in browser

**NEVER log a finding as "fixed" without steps 3-4.** The read-back is mandatory. The confirmation is mandatory.

---

## SECTION 4: BATCH COMPLETION CHECKLIST

Before writing the BOOT.md handoff:

```
COMPLETION GATE — ALL MUST BE TRUE:

□ Every micro-batch was verified (cite evidence per micro-batch)
□ Every finding was fixed AND read back AND verified
□ No finding logged as "fixed" without read-back confirmation
□ Primary interactions tested
□ Loading/error/empty states verified (frontend)
□ cargo check passes (Rust changes)
□ Console errors checked
□ All files pushed to GitHub (Rule 28)

CONSEQUENCE CHECK (Rules 35-41):
□ "What other files should change because of what I built?"
□ Build plan changes → batch manifests updated?
□ New patterns discovered → BUILD-LEARNINGS.md updated?
□ New ADL decisions → ADL file updated?
□ New failure modes → FAILURE-MODES.md updated?

ADVERSARIAL CHECK:
□ "What would Pierce flag that I haven't checked?"
□ "What haven't I verified?"
□ "Am I reporting 'done' because it IS done, or because I WANT it to be done?"
□ "Did every agent return? Did I read every result?"

ONLY AFTER ALL BOXES ARE CHECKED: Write the handoff.
```

---

## SECTION 5: ANTI-PATTERNS — HARD STOPS

If I catch myself doing any of these, STOP immediately:

| Anti-Pattern | What It Looks Like | What To Do Instead |
|---|---|---|
| Importing without API read | "This hook probably returns X" | Read the source file |
| Using Write on existing file | "Let me rewrite this file" | Use Edit. Always. |
| Pushing 10+ files at once | "Let me push everything" | Split into commits of 5 max |
| Reporting without verification | "The code looks correct" | Run it. Take a snapshot. |
| Logging "fixed" without read-back | "I edited line 50" | Read line 50. Is the old code gone? |
| Building 5+ files before verification | "I'll test everything at the end" | Stop. Verify what you have. |
| Feeling fast | "This is going great" | Stop. What haven't you checked? |
| Feeling done | "Batch complete" | Run the adversarial check first. |
| Assuming tool success | "Write/Push/SQL succeeded" | Read back. Check response. Verify outcome. |
| Updating plan without manifests | "Build plan updated" | Batch manifests updated too? ADL? BOOT.md? |
| Skipping Scout | "Simple batch, no need" | Dispatch Scout. Always. Rule 31. |
| Simulating a gate inline | "Let me check as Pierce..." | Dispatch the agent. Rule 29. |
| Deferring findings | "Fix in next batch" | Fix now. No deferrals. |

---

## SECTION 6: CONTEXT WINDOW MANAGEMENT

### Stop Conditions:
- Context > 60%: Wrap current micro-batch, run gates on what's built, handoff
- Context > 70%: HARD STOP. Handoff immediately.
- Context > 80%: Emergency handoff — just write the state.
- Phase 3+ auto-compact at 85% threshold supplements but doesn't replace these stops.

### Fresh Window Signal:
Always recommend fresh window after:
- Any batch completion
- Any persona gate session
- Any session that hit 60%+ context
- Any session with 3+ error-fix cycles

---

## SECTION 7: THE PROTOCOL IN ONE PAGE

```
FOR EACH MICRO-BATCH:

  1. SCHEMA/API: Query every table and read every dependency source.
  2. CRITERIA: Define what "correct" looks like before writing code.
  3. BUILD: Write 1-3 files. READ EACH BACK.
  4. PUSH: Max 5 files. Verify push succeeded.
  5. DB: Apply migrations if needed. Run verification.
  6. VERIFY: Browser snapshot or cargo check. Evidence captured.
  7. REPORT: What was built, what was verified.

FOR PERSONA GATES:

  8. DISPATCH Build Triad against live application.
  9. For each finding: Edit → Read back → Push → Verify.
  10. NEVER log "fixed" without read-back evidence.

FOR COMPLETION:

  11. Run the Completion Checklist. All boxes checked.
  12. Run the Consequence Check. All downstream artifacts updated.
  13. Run the Adversarial Check. Try to break your own work.
  14. THEN write the handoff.
```

**This is the compiler. Follow it mechanically. Every time. No exceptions.**

---

## SECTION 8: HYPERDRIVE PIPELINE — AGENT DISPATCH PROTOCOL

> Replaces inline persona simulation with real agent dispatch.

### The Hyperdrive Build Loop

```
PHASE 0 — PRE-BUILD INTELLIGENCE
  Dispatch: Scout agent
  Scout returns: schema brief, open findings, gotchas, component inventory.
  Nyx reads the brief. Does NOT duplicate Scout's queries.

PHASE 1 — BUILD (micro-batch protocol from Section 2)
  For each micro-batch:
    1. SCHEMA: Only query what Scout didn't cover
    2. API: Read every dependency source (CONTRACT 2)
    3. CRITERIA: Define verification
    4. BUILD: Write 1-3 files. READ EACH BACK.
    5. PUSH: Max 5 files. Verify.
    6. DB: Apply + verify.
    7. BROWSER: Verify rendered output.
    8. REPORT: What was built, what was verified.

PHASE 2 — GATE (agent dispatch — NEVER inline)
  Step 1: Dispatch Build Triad (Pierce + Mara + Riven)
  Step 2: If additional personas required → dispatch per surface type
  Step 3: If high-risk → Wraith red team
  Step 4: Fix ALL findings. Edit → Read back → Push → Verify.

PHASE 3 — REGRESSION CHECK
  Dispatch: Sentinel (background)
  If regressions → STOP, fix before handoff.

PHASE 4 — COMPLETION
  Run Completion Checklist (Section 4).
  Run Consequence Check (Rules 35-41, OS-BL-007).
  Run Adversarial Check.
  Push ALL changes.
  Write BOOT.md handoff with evidence.
  Report context window status.
```

### Dispatch Reference

| When | Agent | Background? | Returns |
|---|---|---|---|
| Batch start | Scout | No (blocking) | Schema brief, open findings, gotchas |
| After micro-batches | Build Triad | No (need findings to fix) | Pierce + Mara + Riven findings |
| If required | Systems Triad | No | Kehinde + Tanaka + Vane findings |
| High-risk surfaces | Wraith | Yes | Red team findings |
| After fixes | Sentinel | Yes | Regression report |
| Layer exit | Meridian | No | Cross-surface consistency |
| Layer exit | Chronicle | No | Velocity, patterns, tech debt |

### High-Risk Triggers for Wraith
- Authentication or authorization
- Financial flows
- Deletion or deactivation
- Customer/user data (PII)
- External integrations
- AI-facing surfaces (Parseltongue sweep)

---

## SECTION 9: FAILURE MODE REFERENCE

Quick reference — full descriptions in `forge/FAILURE-MODES.md`.

| FM | Name | What To Watch For | Defense |
|---|---|---|---|
| FM-1 | Premature execution | Starting before preconditions met | Scout runs before build |
| FM-2 | Tunnel vision | Missing cross-cutting concerns | Meridian at layer exits |
| FM-3 | Velocity theater | High step counts, unverified integration | Sentinel regression sweeps |
| FM-4 | Findings avoidance | Building past problems | Build Triad is a separate mind |
| FM-5 | Cadence hypnosis | Smooth rhythm suppresses alarms | External agent gates break cadence |
| FM-6 | Report-reality divergence | "Done" without verification | Sentinel verifies independently |
| FM-7 | Completion gravity | Reward of "done" distorts verification | Adversarial check + external triad |
| FM-8 | Tool trust | Assuming tool calls succeeded | Read-back after every action |
| FM-9 | Self-review blindness | Grading own work | Agent dispatch eliminates self-review |
| FM-10 | Consequence blindness | Completing task without downstream propagation | Consequence Doctrine (Rules 35-41) |

---

## SECTION 10: CROSS-REFERENCES

This protocol does NOT replace other forge/ docs — it enforces them:

| Document | What It Provides | How This Protocol Uses It |
|---|---|---|
| `forge/METHODOLOGY.md` | 41 rules (what to do) | Rules referenced by number throughout |
| `forge/BUILD-LOOP.md` | Build sequence (when to do it) | Section 7-8 are the mechanical version |
| `forge/EXECUTION-CONTRACTS.md` | 7 tool contracts (how to do it) | Section 1 expands each with full enforcement |
| `forge/GATE-PROTOCOL.md` | Gate types + enforcement | Section 3 is the mechanical gate protocol |
| `forge/FAILURE-MODES.md` | 10 failure modes | Section 9 quick reference, Section 5 anti-patterns |
| `docs/EXECUTION-GATES.md` | Pre-build validation, circuit breakers | Supplements Section 8 (Scout gate, severity calibration) |
| `forge/CONTEXT-MANAGEMENT.md` | Context window strategy | Section 6 is the enforcement version |

**The relationship:** Other docs describe the rules. This doc enforces them. The rules say "verify in browser." This doc says "□ Browser snapshot taken. □ Console errors checked. □ Primary interaction tested. ALL THREE or the batch doesn't close."

---

*EXECUTION-PROTOCOL.md — The Compiler.*
*Ported from DMS 2026-04-01. Adapted for Forge OS Tauri architecture.*
*Load every build session. Follow mechanically. No exceptions.*
*The protocol is correct when: violations are caught before they reach the operator.*
