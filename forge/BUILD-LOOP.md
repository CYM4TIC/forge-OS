# Build Loop

> The primary build execution cycle. Agent dispatch, not inline simulation.

```
WAKE
  1. Read forge/EXECUTION-PROTOCOL.md — THE COMPILER (mandatory, every session)
  2. Load persona identity + project assignment
  3. Read BOOT.md (position, open risks)
  4. Read forge/METHODOLOGY.md (rules — summarized in protocol §9)

LOAD HUD (per batch)
  4. Read batch manifest entry
  5. Read project ADL
  6. Read BUILD-LEARNINGS.md (filter by domain)
  7. Read PERSONA-GATES.md
  8. Read spec segments from manifest

PRE-BUILD (AGENT DISPATCH)
  9. Dispatch Scout → schema recon, open findings, gotchas
  10. Read Scout brief. Do NOT re-query.

BUILD (per micro-batch)
  11. Query live schema before mutations (Rule 17)
  12. Read dependency source before importing (Rule 23)
  13. Write verification tests FIRST (Rule 10)
  14. Write code (1-3 files)
  15. Read back every file (Rule 22)
  16. Push (max 5 files — Rule 24)
  17. Apply DB changes + verification
  18. Browser verify for frontend (Rule 26)
  19. Repeat until surface complete

GATE (AGENT DISPATCH — never inline)
  20. Dispatch Build Triad (Pierce + Mara + Kehinde)
  21. Dispatch additional personas per gates
  22. If high-risk → Wraith red team
  23. Fix ALL findings.

REGRESSION CHECK
  24. Dispatch Sentinel → last 3 surfaces
  25. Regressions → STOP

CLOSE
  26. Adversarial check (Rule 27) — evidence-based, not reasoning-based
  27. Honesty meta-check — "did I fudge any of the above?"
  28. Push ALL changes (Rule 28)
  29. Log build learnings + persona journal
  30. Update BOOT.md handoff — LAST (the seal, not a checkpoint)
  31. Report results + context window

INTROSPECTION CHECK
  32. Layer exit → suggest introspection
  33. Failure event → suggest targeted introspection
  34. Batch milestone → suggest team check-in
```

## Context Window Management
- Lightweight batches: 3-4 per session
- Heavy batches: 1-2 per session
- Frontend batches: 1 per session
- Stop at 70% context. BOOT.md handoff preserves continuity.
- Phase 3+: auto-compact at 85% threshold replaces manual stop (see docs/PHASE-3-ARCHITECTURE.md)

## Micro-Batch Size Definition

A micro-batch is a self-contained unit of work that can be verified independently:

| Type | Files per Micro-Batch | Example |
|------|----------------------|---------|
| Route wiring | 1-2 | Route config + placeholder page |
| Page layout | 2-3 | Page component + hooks + types |
| Component group | 1-3 | Related components (modal + form + list item) |
| Data hook | 1-2 | Hook + types |
| RPC + migration | 1-2 | SQL file + verification SQL |

**Rule:** Each micro-batch must be browser-verifiable before starting the next. Don't stack unverified work.

## Error Recovery Flows

### Scout Fails
```
IF Scout dispatch fails (timeout, crash, empty result):
  1. Log the failure
  2. Proceed with build, but INCREASE verification effort
  3. Query live schema manually (what Scout would have done)
  4. Note "Scout unavailable" in handoff
  DO NOT skip pre-build intelligence entirely
```

### Build Triad Findings Unfixable
```
IF a finding cannot be fixed (architectural constraint, missing dependency):
  1. Classify: is it truly unfixable or just hard?
     - Hard → try harder, escalate approach
     - Truly unfixable → document with rationale
  2. IF unfixable CRIT: STOP. Report to operator. Do not continue.
  3. IF unfixable HIGH: Document, carry as open risk, continue
  4. IF unfixable MED/LOW: Document, continue
  Never mark unfixable findings as "fixed"
```

### Agent Timeout
```
IF agent doesn't return within timeout (per SWARM-PROTOCOL):
  Sub-agent: 2 min
  Persona: 4 min
  Orchestrator: 8 min

  1. Check: did the agent produce partial results?
  2. IF yes: accept partial, note incomplete coverage
  3. IF no: re-dispatch with simplified scope
  4. IF second dispatch also fails: manual review, report to operator
```

### Context Window Emergency
```
IF context > 85% and no auto-compact available:
  1. STOP current micro-batch
  2. Push all pending changes
  3. Write BOOT.md handoff with precise resume point
  4. Report: "Context exhausted. Handoff written. Resume in fresh session."
  DO NOT attempt to finish "just one more thing"
```
