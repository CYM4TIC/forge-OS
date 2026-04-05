---
name: seed
description: Generate realistic test data matching spec examples for a surface
user_invocable: true
---

# /seed [surface]

Generate realistic seed data for the specified surface.

## Protocol
1. Nyx reads the spec + queries live schema (if available)
2. Generate realistic seed data themed to the project's domain context
3. Returns SQL or seed scripts ready to apply

> Converted from Seed Generator agent at P7.5-B. Nyx executes directly.
