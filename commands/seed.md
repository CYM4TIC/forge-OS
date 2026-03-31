---
name: seed
description: Generate realistic test data matching spec examples for a surface
user_invocable: true
---

# /seed [surface]

Generate realistic seed data for the specified surface.

## Protocol
1. Dispatch `agents/seed-generator.md` with `$ARGUMENTS` as target
2. Agent reads the spec, queries live schema (if available), generates seed data
3. Data themed to the project's domain context
4. Returns SQL or seed scripts ready to apply
