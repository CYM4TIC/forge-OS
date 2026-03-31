# Build Loop

> The primary build execution cycle. Agent dispatch, not inline simulation.

```
WAKE
  1. Load persona identity + project assignment
  2. Read BOOT.md (position, open risks)
  3. Read forge/METHODOLOGY.md (rules)

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
  20. Dispatch Build Triad (Pierce + Mara + Riven)
  21. Dispatch additional personas per gates
  22. If high-risk → Wraith red team
  23. Fix ALL findings.

REGRESSION CHECK
  24. Dispatch Sentinel → last 3 surfaces
  25. Regressions → STOP

CLOSE
  26. Adversarial check (Rule 27)
  27. Push ALL changes (Rule 28)
  28. Update BOOT.md handoff
  29. Log build learnings
  30. Report results + context window

INTROSPECTION CHECK
  31. Layer exit → suggest introspection
  32. Failure event → suggest targeted introspection
  33. Batch milestone → suggest team check-in
```

## Context Window Management
- Lightweight batches: 3-4 per session
- Heavy batches: 1-2 per session
- Frontend batches: 1 per session
- Stop at 70% context. BOOT.md handoff preserves continuity.
