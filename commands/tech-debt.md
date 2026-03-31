---
name: tech-debt
description: Aggregated tech debt from all persona findings + known debt items
user_invocable: true
---

# /tech-debt

Aggregate all known technical debt across the project.

## Protocol
1. Read all persona findings logs — filter for deferred/acknowledged debt items
2. If database available: query access policy status (permissive policies, missing policies)
3. Read build learnings for known debt entries
4. Read open work tracker for tracked debt
5. Categorize: Security debt, UX debt, Design system debt, Schema debt, Performance debt

## Output
```
## Tech Debt Report

| Category | Count | Top Items | Owner |
|----------|-------|-----------|-------|
| Security | X | [items] | Tanaka |
| Design tokens | X | [items] | Riven |
| Missing states | X | [items] | Mara |
| Schema drift | X | [items] | Kehinde |
| Copy quality | X | [items] | Sable |

**Total debt items:** [count]
**Critical:** [count needing immediate attention]
```
