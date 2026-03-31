---
name: findings
description: Show open findings from one or all personas
user_invocable: true
---

# /findings [persona|all]

Show open findings from the specified persona or all personas.

## Protocol
1. If `$ARGUMENTS` is a persona name: read their findings log
2. If `$ARGUMENTS` is "all" or empty: read all persona findings logs
3. Filter for OPEN findings only
4. Sort by severity (CRIT → HIGH → MED → LOW)
5. Group by persona

## Output
```
## Open Findings — [Persona/All]

### [Persona Name] — [count] open
| ID | Severity | Summary | Batch | Date |
|----|----------|---------|-------|------|
...

### Total: [count] open findings ([CRIT] / [HIGH] / [MED] / [LOW])
```
