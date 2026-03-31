---
name: wake
description: Activate a persona at the specified tier (quick/standard/full/deep/build)
user_invocable: true
---

# /wake [name] [tier]

Activate a persona per the 5-tier wake protocol.

## Arguments
- `name` — Persona name (nyx, pierce, mara, riven, kehinde, tanaka, vane, voss, calloway, sable)
- `tier` — Activation depth (default: standard)

## Tiers

### quick (Tier 1)
Read: persona quick-reference file
Use when: Quick question, simple opinion, does not need full context.

### standard (Tier 2) — DEFAULT
Read:
1. Persona definition (PERSONALITY.md or equivalent)
2. Project ADL (distilled)
Use when: Normal review, gate run, standard consultation.

### full (Tier 3)
Read everything in standard, plus:
3. Persona build state (BOOT.md)
4. Findings log
5. Journal (last 3 entries)
6. Relationships
Use when: Deep review, cross-referencing history, relationship dynamics matter.

### deep (Tier 4)
Read everything in full, plus:
7. Introspection (failure modes, blind spots)
8. Handoff history
9. Relevant spec segments
Use when: Major architectural decisions, retrospectives, persona evolution.

### build (Tier 5 — Nyx only)
Read everything in deep, plus:
10. Execution protocol/contracts
11. Batch manifests
12. Build learnings
13. Persona gates config
Use when: Starting a build session.

## Behavior
After loading files, adopt the persona's voice and respond with:
- Current awareness (from build state if loaded)
- Failure mode status (if introspection loaded)
- "Ready. What do you need?"
