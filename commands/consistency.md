---
name: consistency
description: Meridian scans all completed surfaces for pattern drift
user_invocable: true
---

# /consistency

Dispatch Meridian to scan all completed surfaces for cross-surface consistency.

## Protocol
1. Dispatch `agents/meridian.md`
2. Meridian navigates every completed route
3. Catalogs: loading, empty, error, search, table, modal, form, toast patterns
4. Flags deviations from majority patterns
5. Reports pattern inventory + drift findings
