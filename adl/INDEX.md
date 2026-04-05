# Architecture Decision Log — Index

> OS-specific architecture decisions. One file per decision. Load by ID when checking ADL.

---

## Quick Index

| Entry | Domain | Status | One-Line Summary |
|---|---|---|---|
| OS-ADL-001 | architecture | LOCKED | Pretext is the foundation for all OS visual surfaces — canvas rendering primitive |
| OS-ADL-002 | architecture | LOCKED | Hybrid DOM+Canvas architecture — DOM for interaction, Canvas for presentation |
| OS-ADL-003 | architecture | LOCKED | Claude Agent SDK for programmatic session spawning — no CLI shelling |
| OS-ADL-004 | architecture | **SUPERSEDED by OS-ADL-023** | ~~LightRAG for knowledge graph~~ → SQLite-native retrieval engine |
| OS-ADL-005 | architecture | LOCKED | Internal feedback loop — personas propose structural changes via .forge/proposals/ |
| OS-ADL-006 | architecture | LOCKED | Model tiering enforced per agent — opus/sonnet/haiku in agent frontmatter |
| OS-ADL-007 | content | LOCKED | 105 agents are domain-agnostic — no DMS tables, RPCs, or segments in agent files |
| OS-ADL-008 | runtime | LOCKED | Vite + React for dashboard — same stack as DMS frontend for consistency |
| OS-ADL-009 | runtime | LOCKED | Tauri events for real-time dashboard updates — `app.emit()` / `listen()` IPC |
| OS-ADL-010 | content | LOCKED | Dual-output document generation — markdown for Claude, PDF for humans, from same content |
| OS-ADL-011 | platform | LOCKED | /init detects customer-facing surfaces and scaffolds layout-engine package automatically |
| OS-ADL-012 | process | LOCKED | Build Triad dispatched as real subagent — Nyx never simulates persona gates inline (BL-033) |
| OS-ADL-017 | runtime | LOCKED | Dev Server Management via Tauri Shell Plugin — scoped allowlist, health polling, iframe preview |
| OS-ADL-018 | runtime | LOCKED | Service Health Monitoring — HealthCheckManager, per-service checks, aggregate dock pill |
| OS-ADL-019 | architecture | LOCKED | Agent Registry — single command registry, availability gating, capability families |
| OS-ADL-020 | architecture | LOCKED | Proposal System — internal feedback loop, triage, rate limiting, decision tracking |
| OS-ADL-023 | architecture | LOCKED | Retrieval Engine — SQLite-native (sqlite-vec + FTS5 + entity graph), RetrievalBackend trait, hybrid RRF fusion |
| OS-ADL-023b | architecture | LOCKED | Virtual Filesystem — per-persona RBAC pruning, composable mounts, lazy content resolution |
| OS-ADL-023c | visualization | LOCKED | Knowledge Garden — react-three-fiber L-system botanical visualization, observatory aesthetic |

---

*Migrated from monolithic ADL.md on 2026-04-05 (P7.5-C.1 housekeeping).*
