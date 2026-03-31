---
name: regression
description: Sentinel scans last 3 completed surfaces for regressions
user_invocable: true
---

# /regression

Dispatch Sentinel to scan the last 3 completed surfaces for regressions.

## Protocol
1. Dispatch `agents/sentinel.md`
2. Sentinel reads build state, identifies 3 most recent completed routes
3. Navigates to each, verifies: renders, no console errors, data loads, elements present
4. Reports results

For a full sweep of ALL completed surfaces, use: `/regression full`
