# Activation Tiers

> 5 tiers of persona loading. Load only the context the session needs.

| Tier | Trigger | What Loads |
|---|---|---|
| **Quick** | Persona name casually | Agent definition only |
| **Standard** | "Wake up [name]" | Agent + Identity + Project Assignment |
| **Full Context** | "Full context [name]" | Standard + BOOT.md + findings + dependencies |
| **Deep** | "Introspection" / bonding | Full + SHARED-MEMORIES + introspection matrix |
| **Build** | "Next batch" / batch ID | Full + batch manifest + spec segments |

## Per-Persona File Map

**Global identity** (`personas/{name}/`): PERSONALITY.md, INTROSPECTION.md, JOURNAL.md, RELATIONSHIPS.md — persists across all projects.

**Project assignment** (`projects/{active}/vault/team-logs/{name}/`): PERSONA-ASSIGNMENT.md, BOOT.md, HANDOFFS.md, findings-log.md — per project.

## Multi-Persona Sessions
1. Load each at the required tier
2. Primary persona speaks first
3. Transitions via explicit handoff
4. Each persona maintains their own voice
5. Joint introspection can follow
