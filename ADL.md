# Forge OS — Architecture Decision Log

> **OS-specific architecture decisions.** Parallel to the DMS ADL (`01-adl/locked-decisions-v2.md`) but scoped to the OS build. DMS ADL entries are not duplicated here — they remain authoritative for DMS. This log captures decisions that are unique to the OS or that diverge from DMS patterns.

---

## Quick Index

| Entry | Domain | Status | One-Line Summary |
|---|---|---|---|
| OS-ADL-001 | architecture | LOCKED | Pretext is the foundation for all OS visual surfaces — canvas rendering primitive |
| OS-ADL-002 | architecture | LOCKED | Hybrid DOM+Canvas architecture — DOM for interaction, Canvas for presentation |
| OS-ADL-003 | architecture | LOCKED | Claude Agent SDK for programmatic session spawning — no CLI shelling |
| OS-ADL-004 | architecture | LOCKED | LightRAG for knowledge graph — hybrid query default, local for entities, global for cross-cutting |
| OS-ADL-005 | architecture | LOCKED | Internal feedback loop — personas propose structural changes via .forge/proposals/ |
| OS-ADL-006 | architecture | LOCKED | Model tiering enforced per agent — opus/sonnet/haiku in agent frontmatter |
| OS-ADL-007 | content | LOCKED | 105 agents are domain-agnostic — no DMS tables, RPCs, or segments in agent files |
| OS-ADL-008 | runtime | LOCKED | Vite + React for dashboard — same stack as DMS frontend for consistency |
| OS-ADL-009 | runtime | LOCKED | Tauri events for real-time dashboard updates — `app.emit()` / `listen()` IPC |
| OS-ADL-010 | content | LOCKED | Dual-output document generation — markdown for Claude, PDF for humans, from same content |
| OS-ADL-011 | platform | LOCKED | /init detects customer-facing surfaces and scaffolds layout-engine package automatically |
| OS-ADL-012 | process | LOCKED | Build Triad dispatched as real subagent — Nyx never simulates persona gates inline (BL-033) |

---

## Entries

### OS-ADL-001: Pretext as OS Rendering Primitive
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** architecture
**Decision:** `@chenglou/pretext` (by Cheng Lou, React co-creator) is the foundation for all OS visual surfaces. Every text measurement, layout computation, and canvas render in the dashboard flows through the layout engine built on Pretext.
**Rationale:** DOM text measurement triggers layout reflow — the browser's most expensive operation. Pretext provides pure JS text measurement without DOM dependency. Two-phase: `prepare()` (one-time, ~19ms/500 texts) + `layout()` (<0.1ms, pure arithmetic). Supports DOM, Canvas, SVG, WebGL targets. The OS uses it and recommends it — eating our own cooking.
**Consequence:** All dashboard visual components use Pretext-measured text. No `getBoundingClientRect` or `offsetHeight` for text sizing. The layout engine package (`runtime/src/engine/layout/`) wraps Pretext with batch prepare, fit-to-container, virtual heights, canvas renderer, and PDF generation.

### OS-ADL-002: Hybrid DOM+Canvas Architecture
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** architecture
**Decision:** The dashboard uses a hybrid rendering approach. DOM for all interactive elements (buttons, inputs, forms, navigation) — accessible, keyboard-navigable. Canvas for all presentation surfaces (pipeline, agent cards, findings, graphs, timelines) — GPU-accelerated, 60fps, pixel-perfect typography via Pretext.
**Rationale:** Pure canvas loses accessibility and keyboard navigation. Pure DOM loses rendering performance and typographic control. The hybrid approach gives both. Interactive surfaces are standard React components. Visual surfaces are Pretext-measured canvas renders.
**Consequence:** Every dashboard component is classified as either DOM (interactive) or Canvas (presentation). Mixed components use DOM for controls and Canvas for display areas.

### OS-ADL-003: Provider Abstraction with CLI-First Default
**Status:** LOCKED | **Date:** 2026-03-31 | **Domain:** architecture
**Decision:** The runtime backend uses a `ModelProvider` trait abstraction. The default provider is `ClaudeCodeProvider`, which shells to the locally installed `claude` CLI. This requires no API key — it uses the operator's existing Claude Max plan. API-key providers (`ClaudeProvider`, `OpenAIProvider`) are available as overrides when keys are configured. The Claude Agent SDK remains the target for full agent dispatch (tool permissions, parallel sessions) but is not required for basic LLM access.
**Rationale:** The original decision assumed API key access. The operator runs on a Claude Max plan which includes the `claude` CLI but not API keys. Shelling to `claude -p` provides immediate, zero-cost LLM access using the same authentication the operator already has. The CLI is Anthropic's own maintained tool — not a fragile third-party dependency. API providers remain available for users who have keys or for future Agent SDK integration.
**Consequence:** `ClaudeCodeProvider` is always registered as the default. API-key providers override the default if configured. The provider selector UI shows all available providers. Agent dispatch uses whichever provider is set as default. Future Phase 5+ work will add Agent SDK integration for full tool-permission session management.

### OS-ADL-004: LightRAG for Knowledge Graph
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** architecture
**Decision:** LightRAG (`lightrag-hku`) with MCP bridge (`daniel-lightrag-mcp`, 22 tools) provides the OS's knowledge graph. Query routing: hybrid default, local for entity questions, global for cross-cutting.
**Rationale:** LightRAG indexes vault documents and provides entity-relationship queries that standard search cannot. The MCP bridge exposes it to Claude sessions. The dashboard's GraphViewer visualizes the knowledge graph with Pretext-measured node labels.
**Consequence:** Every project vault gets indexed into LightRAG. Scout uses it for pre-build recon. The feedback loop's dedup system queries it for prior proposals. The dashboard renders the graph with canvas pan/zoom.

### OS-ADL-005: Internal Feedback Loop
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** architecture
**Decision:** The OS has a formalized internal PR system. Any persona can file a proposal to `.forge/proposals/`. Proposals follow a strict YAML schema with author, type, scope, target, severity, evidence. Proposals are triaged, evaluated by scope-appropriate personas, and integrated or rejected with reasoning preserved.
**Rationale:** The OS is not static. Personas encounter friction and see optimization paths during use. The feedback loop captures these observations structurally. Accepted proposals become work. Rejected proposals preserve reasoning to prevent re-proposal. LightRAG indexes decisions for future queries.
**Consequence:** `.forge/proposals/` and `.forge/decisions/` directories exist in every project. `FEEDBACK-LOG.md` is append-only. Rate limit: 3 proposals per persona per session. Evidence required — no opinion-only proposals.

### OS-ADL-006: Model Tiering Enforced
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** content
**Decision:** Every agent file has a `model:` frontmatter field specifying `high`, `medium`, or `fast` (abstracted tiers). The orchestrator reads this and enforces the tier when spawning sessions. No agent runs on a tier higher than specified without explicit override. Tier-to-model mapping lives in `ProviderConfig.model_mappings` (default: high=opus, medium=sonnet, fast=haiku) and can change as models evolve.
**Rationale:** Token cost optimization. Architecture and judgment calls (Nyx, Pierce, Tanaka) need `high`. Implementation and review (Kehinde, Mara, Riven) need `medium`. Utility and formatting tasks (sub-agents, commands) can use `fast`. Documented rationale per agent prevents drift. Abstracted tier names decouple agent definitions from specific model names.
**Consequence:** All 105 agent files include `model:` in frontmatter. The dispatch pipeline must read this field and enforce it — callers should not need to manually pass the tier. See `forge/MODEL-TIERING.md` for the full tier catalog.

### OS-ADL-007: Domain-Agnostic Agents
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** content
**Decision:** All 105 agents are fully genericized. No DMS-specific tables, RPCs, segments, or domain logic in any agent file. Domain knowledge comes from the project vault loaded at session start, not from agent definitions.
**Rationale:** The OS serves any project, not just DMS. Agents encode methodology, rules, checklists, failure modes, and personality — not domain data. When the OS builds DMS, DMS knowledge comes from the linked vault. When the OS builds a different project, it works the same way.
**Consequence:** Agent genericization (Block 3) strips all DMS references while preserving methodology. Domain-specific behavior is injected via vault context at runtime.

### OS-ADL-008: Vite + React for Dashboard
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** runtime
**Decision:** The dashboard is a React + Vite application. Same stack as DMS frontend.
**Rationale:** Known stack, proven patterns, BL entries from DMS build transfer directly. Vite provides fast HMR for development. React provides the component model for hybrid DOM+Canvas architecture.
**Consequence:** `runtime/` is a Vite project with React. Canvas components use React refs to canvas elements. DOM components are standard React. State management through React context + Tauri events (per OS-ADL-009).

### OS-ADL-009: Tauri Events for Real-Time Updates
**Status:** LOCKED | **Date:** 2026-03-30 | **Updated:** 2026-04-01 | **Domain:** runtime
**Decision:** The backend pushes state changes to the dashboard via Tauri's built-in event system (`app.emit()` / `listen()`). This is functionally superior to WebSocket for a desktop app — no server setup, typed events, built-in IPC.
**Rationale:** Polling is wasteful and introduces latency. The dashboard needs real-time visibility into build progress, agent status, and findings as they arrive. Tauri events provide push semantics natively without the overhead of a WebSocket server.
**Consequence:** Backend uses `app.emit("event-name", &payload)`. Frontend uses `listen("event-name", callback)`. Events: `chat:stream`, `agent:result`, `swarm-message`. No separate WebSocket server needed.

### OS-ADL-010: Dual-Output Document Generation
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** content
**Decision:** The document generation engine produces two outputs from the same content: markdown files for Claude to read, and Pretext-rendered PDFs for human stakeholders.
**Rationale:** Claude needs markdown. Humans need typeset documents. Maintaining two separate content sources creates drift. Single-source dual-output ensures both versions are always in sync.
**Consequence:** `/init` produces a vault markdown Project Brief AND a PDF version. Gate completions produce vault gate report AND PDF. Retrospectives produce vault markdown AND interactive timeline. Build reports export as typeset PDFs with proper page breaks.

### OS-ADL-011: Pretext Detection in /init
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** platform
**Decision:** During `/init`, the discovery conversation scans for customer-facing surfaces (website, storefront, mobile app, ecommerce). If detected, the scaffold includes a `layout-engine/` package in the project repo based on the OS's own engine as template. Pretext evaluation rules are added to Mara/Riven assignments. The batch manifest notes: first sub-batch builds layout-engine.
**Rationale:** Pretext solves real problems (CLS, layout shift, text fitting) that every customer-facing surface encounters. Detecting this at project creation ensures the right foundation is laid before UI work begins.
**Consequence:** `/init` has a Pretext detection step. Projects with customer-facing surfaces get layout-engine scaffolded. Projects without (pure API, CLI, backend) skip it.

### OS-ADL-012: No Inline Persona Simulation
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** process
**Decision:** Nyx never simulates a persona gate inline. All persona gates are dispatched as real subagent sessions via the Agent SDK. Build Triad (Pierce + Mara + Riven) runs as 3 parallel sessions. Results come back structured. Nyx fixes findings in the main session.
**Rationale:** BL-033 from DMS build. Self-review is inherently compromised. The same mind that wrote the code evaluating it creates blind spots. Separate sessions provide genuine independent review. Also saves ~15K tokens per gate that were being consumed by inline simulation.
**Consequence:** EXECUTION-PROTOCOL.md Section 8 defines the dispatch loop. The orchestrator manages session lifecycle. The dashboard shows parallel gate sessions in real-time.

---
