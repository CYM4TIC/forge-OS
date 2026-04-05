---
name: launch
description: Pre-launch go/no-go — Strategy Triad + Customer Lens + Wraith + Launch Readiness
user_invocable: true
---

# /launch

Run the full pre-launch go/no-go sequence.

## Protocol
1. Dispatch `agents/gate-dispatcher.md --strategy` + Customer Lens + Wraith + Launch Readiness
2. Gate Dispatcher routes to Calloway + Voss + Sable, then Customer Lens, Wraith, and Launch Readiness in parallel
3. Produces a GO / NO-GO / CONDITIONAL GO verdict

For a specific target: `/launch [target]` (e.g., `/launch beta`, `/launch v1.0`)
