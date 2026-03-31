---
name: next-batch
description: Execute the full Next Batch Protocol — no shortcuts
user_invocable: true
---

# /next-batch

Full build protocol. MANDATORY. NO SHORTCUTS. Every step, every gate.

## Step 1 — IDENTIFY
1. Read build state (BOOT.md) → find current position (last completed batch)
2. Read batch manifests → find the NEXT batch entry
3. State the batch ID and surface name before proceeding

## Step 2 — LOAD CONTEXT
4. Read execution protocol/contracts
5. Read persona gates config → identify ALL required gates
6. Read project ADL
7. Read build learnings → filter by domain
8. Read the spec segment(s) listed in the batch manifest
9. For FRONTEND: decompose into micro-batches (1-3 files each), STATE THE PLAN

## Step 3 — BUILD
10. Write verification SQL FIRST (if database involved)
11. Query live schema before any DML
12. Build the surface per spec:
    - Route wiring
    - Page layout, components, modals, drawers
    - Data hooks wired to real APIs/RPCs
    - State management (filters, search, pagination, tabs)
    - Tier gating + role gating where applicable
    - Error / loading / empty states (all three, every surface)
    - Mobile responsiveness
13. Push all files (max 5 per push)
14. Apply SQL/migrations and run verification

## Step 4 — PERSONA GATES (MANDATORY)
15. Run `/gate` command — full auto-gate pipeline

## Step 5 — REPORT
16. Report: batch ID, files, findings (all resolved), risks, context window, next batch

## Step 6 — UPDATE STATE
17. Update build state (BOOT.md)
18. Log new build learnings (if any)
19. Wait for next command

## HARD RULES
- If ANY gate fails unfixably → STOP and report
- If context window > 70% → STOP, write handoff, recommend fresh window
- NEVER report "all gates passed" without running every gate
- NEVER skip a gate because "it's a simple surface"
