---
name: audit
description: Full Audit — nuclear quality pass with all personas + Wraith + Sentinel + Meridian
user_invocable: true
---

# /audit

Run the nuclear quality pass — every quality gate the system has.

## Protocol
1. Dispatch `agents/gate-dispatcher.md --full`
2. Gate Dispatcher routes to all relevant personas for the current scope
3. Produces consolidated findings report with PASS / CONDITIONAL PASS / FAIL verdict

For a specific scope: `/audit [scope]` (e.g., `/audit settings`, `/audit auth`, `/audit all`)
