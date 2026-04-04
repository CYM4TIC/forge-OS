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
| OS-ADL-019 | architecture | LOCKED | Agent Registry — single command registry, availability gating, capability families |
| OS-ADL-020 | architecture | LOCKED | Proposal System — internal feedback loop, triage, rate limiting, decision tracking |

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
**Decision:** Nyx never simulates a persona gate inline. All persona gates are dispatched as real subagent sessions via the Agent SDK. Build Triad (Pierce + Mara + Kehinde) runs as 3 parallel sessions. Results come back structured. Nyx fixes findings in the main session. Riven dispatched ad-hoc for design-system-heavy batches.
**Rationale:** BL-033 from DMS build. Self-review is inherently compromised. The same mind that wrote the code evaluating it creates blind spots. Separate sessions provide genuine independent review. Also saves ~15K tokens per gate that were being consumed by inline simulation.
**Consequence:** EXECUTION-PROTOCOL.md Section 8 defines the dispatch loop. The orchestrator manages session lifecycle. The dashboard shows parallel gate sessions in real-time.

---

### OS-ADL-017: Dev Server Management via Tauri Shell Plugin
**Status:** LOCKED | **Date:** 2026-04-02 | **Domain:** runtime
**Decision:** Dev servers are managed through `tauri-plugin-shell` with a scoped command allowlist (19 dev binaries). DevServerManager runs processes as background tasks with stdout/stderr ring buffers (1000 lines), exit monitors, port auto-detection (11 regex patterns + TCP fallback), and health polling (HTTP GET every 5s with Healthy/Degraded/Running transitions). Max 10 concurrent servers. CWD validation prevents path traversal. Agent DOM access via oneshot channel pattern (UUID request_id, 5s timeout) reads same-origin iframe contentDocument.
**Rationale:** Native process management gives control over lifecycle, output capture, and cleanup that browser-based approaches can't match. The allowlist prevents arbitrary command execution. Health polling provides status without requiring the dev server to implement a health endpoint.
**Consequence:** 6 Tauri commands (start/stop/restart/remove/list/get_logs), `detect_server_port` command, `devserver:status-changed` events, `read_preview_dom`/`preview_dom_response` commands. PreviewPanel renders iframe with sandbox + path tracking. Frontend bridge: 8 functions + 4 types, useDevServer hook.

---

### OS-ADL-018: Service Health Monitoring
**Status:** LOCKED | **Date:** 2026-04-02 | **Domain:** runtime
**Decision:** External service health is monitored via HealthCheckManager with per-service implementations (GitHub, Supabase, Cloudflare, Stripe, Typesense, Custom). Background tokio poller emits `connectivity:status-changed` events. Service credentials stored in SQLite (V12 migration, service_configs table) with SSRF prevention on custom URLs. Per-service 5s cooldown on manual checks. Aggregate status in dock pill (green/amber/red badge + unhealthy count). ConnectivityPanel shows expandable service cards with detail key-value pairs. Carried risk: plaintext credentials in SQLite (keyring migration tracked for pre-release).
**Rationale:** Knowing whether GitHub, Supabase, and other services are reachable before attempting operations prevents cryptic failures during builds. The aggregate dock pill gives at-a-glance health without opening the panel. Per-service cooldown prevents rate limiting from manual re-checks.
**Consequence:** 4 Tauri commands (check_service/check_all_services/get_service_status/set_check_interval), useConnectivity hook, ConnectivityPanel (5 states, card grid, expand-to-detail), dock pill aggregate badge. Dev workspace preset includes connectivity panel. 6 total workspace presets.

---

### OS-ADL-019: Agent Registry Architecture
**Status:** LOCKED | **Date:** 2026-04-04 | **Domain:** architecture
**Decision:** All agents (105 total: 10 personas, 10 intelligences, 10 orchestrators, 10 utilities, 34 sub-agents, 30 commands, 1 customer-lens) are registered via `AgentRegistry` which scans `agents/` + `sub-agents/` + `commands/` directories for YAML frontmatter (slug, name, description, category, tools, model, reasoning_effort, routing_role). `CommandRegistry` is embedded inside `AgentRegistry` with `CommandDef` structs (slug, name, category, aliases, dispatch_target, availability_when). Availability gating: per-command `AvailabilityCheck` enum (GitChanges/McpConnected/EnvVarSet/ServerRunning/Always) resolved at palette-open time via `check_availability`. Three-tier capability model: Base (file read/write) → Persona (agent-specific tool allow-lists via `get_allowed_tools`) → External MCP. `CapabilityFamily` enum (ReadOnly/WriteCode/WriteVault/Database/External/Destructive) with `default_capabilities(context)` for 5 dispatch contexts. `child_context` intersects capabilities to prevent privilege escalation. `InteractionMode` enum (Spec/Auto/Orchestrator) with `apply_mode_gate` — Spec mode restricts to ReadOnly. Smart Review: 10-rule static routing table with filename isolation for `.md` files.
**Rationale:** A single registry eliminates the agent discovery problem — every dispatched agent, command, and sub-agent is known at startup. Capability families prevent agents from accessing tools outside their scope. Availability gating prevents dispatching commands that can't run (no git repo, no MCP connection). The embedded command registry avoids a second parallel registry with its own lifecycle.
**Consequence:** 5 Tauri commands (get_agent_registry, get_agent_content, refresh_registry, get_command_registry, dispatch_command). `register_builtin!` macro for built-in commands. `LazyHandler` with `OnceLock` for read-once-serve-many content caching. `HandlerStore` for slug-keyed dispatch. `ReasoningEffort`/`ModelClass`/`RoutingRole` enums parsed from YAML frontmatter. `RegisterCommand` trait with `from_yaml` + `from_fn` dual adapter. Frontend: useAgentRegistry hook (cached-then-fresh, working state subscription), TeamPanel (3-tab layout: Team/Dispatch/Actions), ActionPalette (3-section: Orchestrators/Commands/Sub-Agents, underspecification gating).

---

### OS-ADL-020: Proposal System Architecture
**Status:** LOCKED | **Date:** 2026-04-04 | **Domain:** architecture
**Decision:** Internal feedback loop where personas file structural change proposals via `create_proposal`. Proposal lifecycle: Open → Evaluating → Accepted/Rejected, with Dismissal as a separate orthogonal action (not a status). Triage: `auto_assign_evaluators` maps scope keywords (word-boundary matching) to domain experts (security→tanaka, ux→mara, architecture→kehinde, design→riven, financial→vane, legal→voss, copy→sable, growth→calloway). Council fallback for cross-cutting proposals (0 or 3+ domains). Rate limiting: 3 proposals per persona per session (automated exempt). Proposal types: Optimization/Pattern/Rule/Architecture/Skill/Policy. Decision tracking: `resolve_proposal` as atomic SQLite transaction (BEGIN IMMEDIATE + status update + decision INSERT + COMMIT/ROLLBACK) with outcome enum (Success/Partial/Failure). Search: LIKE with wildcard escaping + ESCAPE clause. Feed: paginated UNION ALL chronological across proposals/responses/decisions/dismissals with merge-sort in Rust (N+1 eliminated). Confirmation Router: 9-action `ConfirmationType` taxonomy with oneshot channels, TTL reaper (60s stale auto-cancel), Destructive bypass protection.
**Rationale:** Proposals create a structured record of why the system evolves — not just what changed but who suggested it, who evaluated it, and what the outcome was. Rate limiting prevents runaway automated proposals from flooding the feed. Atomic transactions prevent partial decision states. The triage system ensures domain experts review proposals in their scope. Dismissals are separate from rejection because a dismissed proposal may be valid but ill-timed.
**Consequence:** SQLite V13 (proposals + proposal_responses + decisions tables, 18 columns + indexes) + V14 (dismissals table). 12 Tauri commands (file_proposal, list_proposals, evaluate_proposal, resolve_proposal, dismiss_proposal, get_proposal_feed, get_decision_history, search_proposals, check_specification, dispatch_agent + 2 confirmation commands). useProposalFeed hook (debounced real-time subscription, fetchingRef race guard, MAX_ENTRIES=500 cap). useActionPalette hook (150ms debounce, stale-response protection, underspecification gating). ProposalFeedPanel (timeline layout, 4 card types, FilterBar with persona glyph pills, loading skeleton). ConfirmationModal (focus trap, 4 buttons, aria-describedby). 7 workspace presets including team mode.
