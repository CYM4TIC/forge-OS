---
name: launch
description: Pre-launch go/no-go — Strategy Triad + Customer Lens + Wraith + Launch Readiness
user_invocable: true
---

# /launch

Run the full pre-launch go/no-go sequence.

## Protocol
1. Dispatch `agents/launch-sequence.md`
2. Launch Sequence orchestrates: Strategy Triad → Customer Lens → Wraith → Launch Readiness
3. Produces a GO / NO-GO / CONDITIONAL GO verdict

For a specific target: `/launch [target]` (e.g., `/launch beta`, `/launch v1.0`)
