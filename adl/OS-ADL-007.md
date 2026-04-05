### OS-ADL-007: Domain-Agnostic Agents
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** content
**Decision:** All 105 agents are fully genericized. No DMS-specific tables, RPCs, segments, or domain logic in any agent file. Domain knowledge comes from the project vault loaded at session start, not from agent definitions.
**Rationale:** The OS serves any project, not just DMS. Agents encode methodology, rules, checklists, failure modes, and personality — not domain data. When the OS builds DMS, DMS knowledge comes from the linked vault. When the OS builds a different project, it works the same way.
**Consequence:** Agent genericization (Block 3) strips all DMS references while preserving methodology. Domain-specific behavior is injected via vault context at runtime.
