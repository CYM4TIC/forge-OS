---
name: batch-status
description: Show current build position, open findings, and context window status
user_invocable: true
---

# /batch-status

Quick status check. No build actions, just information.

## Protocol

1. Read build state (BOOT.md) — find current position (last completed batch, next batch)
2. Read open findings/work tracker — count open critical findings
3. Read dependency board — check for blockers on next batch

## Report Format

```
## Build Status

**Position:** [last completed batch] → [next batch]
**Phase:** [current phase/layer]
**Progress:** [X/Y batches]

### Open Critical Findings: [count]
[list each with one-line description]

### Next Batch Blockers
[any dependencies or gates blocking the next batch]

### Context Window
[current usage estimate + recommendation: continue or fresh window]
```
