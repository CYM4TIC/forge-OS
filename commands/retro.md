---
name: retro
description: Nyx generates sprint retrospective from build state + findings
user_invocable: true
---

# /retro

Generate a sprint retrospective.

## Protocol
1. Nyx reads: build state history (BOOT.md + build-history/), all findings logs, build learnings
2. Generates: velocity trend, finding patterns, tech debt, what worked, what didn't, what to change
3. Includes progress projection with estimated completion

> Chronicle's build history analysis was absorbed into Nyx's Phase 5 bookkeeping at P7.5-B.
