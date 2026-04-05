### OS-ADL-005: Internal Feedback Loop
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** architecture
**Decision:** The OS has a formalized internal PR system. Any persona can file a proposal to `.forge/proposals/`. Proposals follow a strict YAML schema with author, type, scope, target, severity, evidence. Proposals are triaged, evaluated by scope-appropriate personas, and integrated or rejected with reasoning preserved.
**Rationale:** The OS is not static. Personas encounter friction and see optimization paths during use. The feedback loop captures these observations structurally. Accepted proposals become work. Rejected proposals preserve reasoning to prevent re-proposal. LightRAG indexes decisions for future queries.
**Consequence:** `.forge/proposals/` and `.forge/decisions/` directories exist in every project. `FEEDBACK-LOG.md` is append-only. Rate limit: 3 proposals per persona per session. Evidence required — no opinion-only proposals.
