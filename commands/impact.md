---
name: impact
description: Compass impact analysis — map blast radius of a proposed change
user_invocable: true
---

# /impact

Map the blast radius of a proposed change.

## Protocol
1. Dispatch `agents/compass.md`
2. Compass traces dependency chains from the target entity
3. Produces: affected files, breaking changes, risk assessment

Usage: `/impact [entity]` (e.g., `/impact users.status`, `/impact get_user_detail`, `/impact UserDetailPage`)
