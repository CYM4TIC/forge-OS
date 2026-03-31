---
name: retro
description: Chronicle generates sprint retrospective from build state + findings
user_invocable: true
---

# /retro

Dispatch Chronicle to generate a sprint retrospective.

## Protocol
1. Dispatch `agents/chronicle.md`
2. Chronicle reads: build state history, all findings logs, build learnings
3. Generates: velocity trend, finding patterns, tech debt, what worked, what didn't, what to change
4. Includes progress projection with estimated completion
