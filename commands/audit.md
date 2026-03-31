---
name: audit
description: Full Audit — nuclear quality pass with all triads + Wraith + Sentinel + Meridian
user_invocable: true
---

# /audit

Run the nuclear quality pass — every quality gate the system has.

## Protocol
1. Dispatch `agents/full-audit.md`
2. Full Audit orchestrates: Build Triad → Systems Triad → Strategy Triad → Wraith → Sentinel → Meridian
3. Produces consolidated findings report with PASS / CONDITIONAL PASS / FAIL verdict

For a specific scope: `/audit [scope]` (e.g., `/audit settings`, `/audit auth`, `/audit all`)
