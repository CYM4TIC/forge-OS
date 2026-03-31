---
name: init
description: Scaffold a new project from scratch — guided discovery, architecture, specs, build planning
user_invocable: true
---

# /init

Start a new project from scratch with a guided spec-first flow.

## Protocol

### Phase 1: Discovery (Conversation)
1. **"What are we building?"** — Product name, elevator pitch, target user
2. **"Who uses it and why?"** — User personas, key workflows, pain points solved
3. **"What's the technical shape?"** — Stack preferences, integrations, deployment target
4. **"What exists already?"** — Prior art, prototypes, design files, competitor references
5. **"What's the ambition?"** — MVP scope vs. full vision, timeline pressure

### Phase 2: Architecture (Nyx + Kehinde)
6. Propose 5-10 architecture decisions (ADL entries) based on discovery
7. Operator confirms, adjusts, or overrides each decision
8. Decisions lock into `vault/adl/` — the project's law

### Phase 3: Spec Generation (Nyx + Pierce)
9. Draft product spec organized by domain
10. Pierce reviews for gaps and ambiguity
11. Spec gets segmented into buildable pieces

### Phase 4: Build Planning (Nyx)
13. Segments dependency-ordered into layers
14. Layers broken into batches with manifests
15. Gate mapping: which personas review which batches
16. PERSONA-ASSIGNMENT.md generated for each active persona

### Phase 5: Build Ready
17. All vault artifacts generated
18. `/next-batch` works. Full build loop activates.

### MCP Recommendations
After Phase 1, based on detected stack, recommend which MCPs to connect.
