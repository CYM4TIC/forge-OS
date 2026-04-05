---
name: impact
description: Kehinde impact analysis — map blast radius of a proposed change
user_invocable: true
---

# /impact

Map the blast radius of a proposed change.

## Protocol
1. Dispatch Kehinde (absorbed Compass's BFS dependency graph + change-impact scoring)
2. Kehinde traces dependency chains from the target entity
3. Produces: affected files, breaking changes, risk assessment

Usage: `/impact [entity]` (e.g., `/impact users.status`, `/impact get_user_detail`, `/impact UserDetailPage`)
