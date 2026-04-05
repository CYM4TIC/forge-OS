# Forge — Tauri Desktop App Build Plan

## Execution Protocol

**Every build session loads `forge/EXECUTION-PROTOCOL.md` — The Compiler.** This is not optional. The protocol mechanically enforces all 41 rules, 7 contracts, 10 failure modes, and the Hyperdrive pipeline. Without it, builds run on discipline and memory. Discipline drifts. Memory is lossy.

The protocol is referenced in:
- `CLAUDE.md` Boot Sequence (step 2) and Build Loop WAKE (step 1)
- `forge/BUILD-LOOP.md` WAKE sequence
- 8 Protocol Enforcement Points throughout this build plan (see Phases 5, 7, 8)

**All 8 enforcement points in this plan map to specific protocol sections:**
| Point | What It Enforces | Protocol Section | Phase |
|---|---|---|---|
| #1 | Gate dispatch is a pipeline stage, not optional | §8 (Hyperdrive Pipeline) | 7.3, 8.2 |
| #2 | Findings get IDs + severity + status in SQLite | §3 (Persona Gate Protocol) | 5.2 |
| #3 | Batch decomposition validated before phase start | §2 (Micro-Batch Protocol) | 8.2 |
| #4 | Diff-aware gate routing from file changes | §8 (Dispatch Reference) | 8.2 |
| #5 | Read-back verification in audit trail | §1 Contract 3/4 (FILE_WRITE/EDIT) | 8.2 |
| #6 | Context window hard stop at 70% | §6 (Context Window Management) | 8.1 |
| #7 | Handoff integrity (BOOT.md after last push) | §1 Contract 8 (STATE_UPDATE) | 8.1 |
| #8 | Ambient accountability via HUD visualization | §4 (Completion Checklist) | 5.1 |

---

## Context

Forge OS was originally planned as a Claude Code extension system (methodology docs + genericized agents + a React dashboard). Today's design conversation fundamentally changed the vision: **Forge is a standalone Tauri desktop application** — a native program you load up and build with. It features a chat interface for directing AI agents, a Pretext-powered living canvas HUD, an embedded dev server preview, connectivity monitoring, and agent presence visualization. This is not a dashboard bolted onto a terminal — it's a spatial, animated, living workspace where the entire build process is visible and directed from one window.

**App name:** Forge
**Repo:** CYM4TIC/forge-OS (existing Phase 1 repo, Tauri added around it)
**Local workspace:** This repo root. **GitHub:** CYM4TIC/forge-OS
**Engine policy:** Engine-agnostic. Provider abstraction supports Claude, OpenAI-compatible, CLI-accessible models, and local models (Ollama). Agents request capability tiers (high/medium/fast), providers map to their best models. Claude is the default but not a dependency.

**Existing Phase 1 work (already on GitHub):** CLAUDE.md (17.9KB), README.md, forge-os.config.json, .gitignore, .claude/settings.json (4 hooks), 5 commands (/init, /link, /status, /start, /introspect), 9 methodology docs in forge/ (METHODOLOGY, BUILD-LOOP, EXECUTION-CONTRACTS, ACTIVATION-TIERS, FAILURE-MODES, GATE-PROTOCOL, CONTEXT-MANAGEMENT, SPEC-FIRST-WORKFLOW, INTROSPECTION-PROTOCOL), docs/ARCHITECTURE-PLAN.md.

**E2B sandbox:** Account active (alexbarrett42@gmail.com, 20 concurrent limit). Used by Wraith (red-team), Nyx (migration testing), Kiln (profiling). Tier 3 MCP.

**Customer Simulator Generator:** Mara capability. During /init, auto-generates 3-5 project-specific customer simulation agents from discovered user roles. Genericized from 4 DMS-specific sims (Jeff Owner, Tech Mike, Customer Jane, Fleet Manager).

---

## Phase 1: Tauri Shell + Chat (3 sessions)

**Goal:** A running desktop app where Alex opens it and talks to an AI agent.

### Session 1.1 — Tauri Scaffold
- Install Rust toolchain via rustup (prerequisite)
- Initialize pnpm monorepo: `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- Create `apps/desktop/` with Tauri v2:
  - `src-tauri/`: Cargo.toml, tauri.conf.json, main.rs, lib.rs
  - `src/`: React 19, Vite 6, Tailwind CSS 4 (dark theme), main.tsx, App.tsx
- Create `packages/shared/` with core TypeScript types
- Copy Phase 1 files from existing repo root into appropriate locations
- **Proof of life:** `pnpm tauri dev` opens a native dark window with "Forge" displayed
- Push to GitHub

### Session 1.2 — Multi-Panel Layout + SQLite
- ~~Install react-resizable-panels for six-panel resizable layout~~ **SUPERSEDED by Phase 4 Window Manager.** Phase 1 shipped with react-resizable-panels as interim. Phase 4 Session 4.1 replaces with floating window manager + dock bar. Panel content components are unchanged — only the container system changes.
- Panel structure: Chat (left), Canvas HUD (center), Preview (right), Connectivity (bottom-right), Team (right sidebar)
- SQLite initialization via Tauri SQL plugin:
  - Tables: sessions, messages, settings, panel_layout, agent_state, findings
- Custom titlebar (frameless window with Tauri drag regions)
- System tray with basic menu
- Five panels are labeled dark placeholders; Chat panel gets input stub
- Push to GitHub

### Session 1.3 — Chat Panel + Model Provider System
- Rust-side model provider abstraction: `src-tauri/src/providers/`
  - `ModelProvider` trait: `send_message()`, `name()`, `supports_streaming()`, `max_context()`, `capability_tier()`
  - **Claude provider** (reqwest HTTP + SSE streaming) — default, primary
  - **OpenAI-compatible provider** (covers GPT, Gemini, Mistral, any OpenAI-shaped API)
  - **CLI provider** (shells out to `claude`, `ollama run`, `aider`, etc. — captures stdout)
  - **Ollama provider** (localhost HTTP — local models)
  - Provider registry: add/remove/configure providers in settings
  - Capability tiers: `high` / `medium` / `fast` (agents request a tier, provider maps to its best model)
  - Session 1.3 ships Claude + OpenAI providers. CLI + Ollama added in a later session.
- Tauri commands: `send_message`, `list_sessions`, `get_session`, `list_providers`, `set_default_provider`
- System prompt assembly from agent files (reads `.claude/agents/` directory)
- Chat panel React components:
  - MessageList with markdown rendering
  - MessageInput with submit
  - PersonaSelector dropdown (populated from agent directory scan)
  - ProviderSelector (which engine to use — persisted in settings)
  - Session sidebar (history from SQLite)
- Messages persist to SQLite, stream in real-time via Tauri events
- **Proof of life:** Alex types a message, selects Nyx persona, picks Claude as provider, gets a streaming response. Switches to OpenAI — still works.
- Push to GitHub

**Dependencies:** Rust toolchain installed. At least one API key configured (Claude or OpenAI).
**ADL updates:** OS-ADL-003 (Agent SDK → provider abstraction), OS-ADL-008 (React inside Tauri), OS-ADL-009 (WebSocket → Tauri IPC)
**New ADL:** OS-ADL-013 (Tauri v2), OS-ADL-014 (SQLite), OS-ADL-015 (Tauri IPC), OS-ADL-019 (engine-agnostic providers)

---

## Phase 2: Content Layer (5 sessions) — PARALLEL TRACK

**Goal:** 105 genericized agents, 12 external reference extractions, 5 skills, model tiering, persona enhancements. The complete brain of the OS.

**This phase has ZERO dependencies on app code.** Can run alongside any other phase.

### Session 2.1 — References Directory + Core Personas (10 agents)
- Create `references/` directory with 12 subdirectories
- Fetch and extract from each source repo:
  - `references/pretext/` — @chenglou/pretext README + API patterns
  - `references/trail-of-bits/` — 18 security SKILL.md files from trailofbits/skills
  - `references/ui-ux-pro-max/` — 161 reasoning rules, 99 UX guidelines, anti-patterns, pre-delivery checklist, 161 palettes, 57 font pairings
  - `references/antigravity/` — 5 full skill directories (postgres, security, nextjs, stripe, tailwind)
  - `references/ruflo/` — 4 pattern docs (token optimization, anti-drift, self-learning loop, agent booster)
  - `references/wshobson-agents/` — 3 pattern docs (model tiering, progressive disclosure, plugin eval)
  - `references/rosehill/` — 3 pattern docs (CLAUDE.md turnstile, agent junction, workspace model)
  - `references/lightrag/` — README + MCP tool docs (22 tools) + setup guide
  - `references/n8n/` — capabilities doc + setup guide
  - `references/anthropic-plugins/` — plugin catalog + connector mapping
  - `references/ecosystem/` — top 100 list + triage
  - `references/claude-agent-sdk/` — API patterns + parallel execution
- Write NOTES.md for each subdirectory
- 10 personas genericized: strip DMS tables, RPCs, segments. Keep methodology, rules, checklists, personality, failure modes.

### Session 2.2 — Intelligences + Orchestrators + Model Tiering (21 agents)
- 11 intelligences genericized
- 10 orchestrators genericized
- Add `model:` frontmatter to all agent files:
  - `model: high` (opus) — Nyx, Pierce, Kehinde, Tanaka, Vane, Arbiter
  - `model: medium` (sonnet) — Mara, Riven, Voss, Calloway, Sable, Scout, Wraith, Meridian, Chronicle
  - `model: fast` (haiku) — Sentinel, Beacon, sub-agents
- Write `forge/MODEL-TIERING.md` documenting rationale

### Session 2.3 — Utilities + Sub-agents + Persona Enhancements (44 agents)
- 10 utilities + 34 sub-agents genericized
- Replace hardcoded vault paths with config-driven references
- **Persona enhancements:**
  - Tanaka: Trail of Bits static analysis patterns, supply chain awareness (wire `references/trail-of-bits/NOTES.md` into boot)
  - Mara: UI UX Pro Max design intelligence, SEO awareness, Pretext/CLS evaluation rules (wire `references/ui-ux-pro-max/NOTES.md` into boot)
  - Riven: Canvas rendering token compliance, Tailwind skill ref
  - Kehinde: Postgres best practices skill ref
  - Nyx: Next.js skill ref for applicable projects, Rust awareness
  - Vane: Stripe integration skill ref
- Write `docs/DESIGN-INTELLIGENCE.md` (curated from UI UX Pro Max for Mara/Riven)
- Write `docs/ECOSYSTEM-PATTERNS.md` (Ruflo token optimization + anti-drift + self-learning loop)

### Session 2.4 — Commands + Skills + Quality Layer (30 commands + 5 skills)
- 30 slash commands genericized
- Install 5 Antigravity skills to `.claude/skills/`:
  - postgres-best-practices, security-auditor, nextjs-best-practices, stripe-integration, tailwind-design-system
- Wire skill refs into agent boot sequences
- **Quality layer formalization:**
  - Pre-delivery checklist mapped to Build Triad (from UI UX Pro Max)
  - Ruflo anti-drift patterns documented as enforcement rules
  - Model tiering enforcement (agents without `model:` frontmatter = error)
- Write `docs/ECOSYSTEM-INTEL.md` (full triage of 12 external sources)

### Session 2.5 — Personas + Templates + Protocols
- 10 persona identity sets exported from DMS vault to `personas/`:
  - PERSONA.md, PERSONALITY.md, INTROSPECTION.md, RELATIONSHIPS.md
  - Journals trimmed (keep key entries, remove DMS-specific details)
- 15 templates adapted for OS structure
- 4 protocols genericized (collaboration, party mode, retrospective, personality maintenance)
- Sanitized examples directory (sample ADL, manifest, gate report, build learnings)
- Project scaffold template includes optional `layout-engine/` package when Pretext detected
- Identity verification tests (each persona responds in character)

**Absorbs:** Original Blocks 1 (workspace), 2 (reference docs), 3 (genericization), 4 (personas/templates)

---

## Phase 3: Agent Runtime (3 sessions) — REORDERED

> **Phase reorder (2026-03-31):** Original Phase 3 (Pretext) moved to Phase 4.
> Runtime systems are more critical than rendering — the OS needs to think before it can draw.
> Architecture roadmap: `docs/PHASE-3-ARCHITECTURE.md`
> Batch manifests: `BATCH-MANIFESTS.md` (P3-A through P3-L, 12 batches)

**Goal:** The 5 CRITICAL runtime systems that make Forge OS intelligent.

### Session 3.1 — Foundation: SQLite + Agent Dispatch (P3-A through P3-D)
- P3-A: Verify `pnpm tauri dev` works + SQLite v2 migration (6 new tables)
- P3-B: Agent Dispatch Core — `src-tauri/src/dispatch/` (forked agent lifecycle, prompt cache, isolation)
- P3-C: Agent Dispatch UI — TeamPanel components (status panel, agent cards, dispatch log)
- P3-D: Build State Manager — `src-tauri/src/build_state/` (batch/finding/risk CRUD, BOOT.md generator)

### Session 3.2 — Memory + Communication (P3-E through P3-H)
- P3-E: KAIROS Daily-Log Memory — `src-tauri/src/memory/` (append-only logs, 4-type taxonomy, index)
- P3-F: Dream Consolidation Engine — background Rust task (Orient → Gather → Consolidate → Prune)
- P3-G: Swarm Mailbox — `src-tauri/src/swarm/` (5 message types, permission flow)
- P3-H: Communication UI — permission modal, message feed, agent presence

### Session 3.3 — Compaction + Integration (P3-I through P3-L)
- P3-I: Auto-Compact Engine — `src-tauri/src/compact/` (token counter, 85% threshold, 9-section summary)
- P3-J: Context Management UI — context meter, compaction indicator, summary viewer
- P3-K: TeamFile Manager + Persistent Sessions — per-persona config, crash recovery
- P3-L: Integration Testing — end-to-end verification of all 5 systems

**Depends on:** Phase 1 (Tauri shell, SQLite v1, provider system)

---

## Phase 4: Runtime Upgrades + Window Manager + Pretext + Document Generation (5 sessions) — MOVED FROM PHASE 3

**Goal:** Harden the Phase 3 runtime with patterns from repo mining (Hermes, OpenClaw, Paperclip), then build the spatial foundation (floating window manager), the canvas rendering primitive (Pretext), AND the dual-output document engine. Every visual component in Phases 5-9 depends on this phase being right.

### Session 4.0 — Runtime Upgrades (Post-Phase-3 Hardening)

Retroactive enhancements to Phase 3 systems based on repo mining (Hermes Agent, OpenClaw, Paperclip). These touch the Rust backend only — no UI changes.

**1. ContextEngine Trait Extraction (from OpenClaw pattern)**

Extract a formal `ContextEngine` trait from KAIROS, making memory management pluggable:

```rust
trait ContextEngine {
    fn bootstrap(&mut self, params: BootstrapParams) -> Result<()>;
    fn maintain(&mut self, params: MaintenanceParams) -> Result<MaintenanceResult>;
    fn ingest(&mut self, entry: MemoryEntry) -> Result<IngestResult>;
    fn after_turn(&mut self, params: TurnParams) -> Result<()>;
    fn assemble(&self, budget: TokenBudget) -> Result<AssembledContext>;  // token-budget-aware
    fn compact(&mut self, params: CompactParams) -> Result<CompactResult>;
    fn prepare_subagent_spawn(&self, params: SpawnParams) -> Result<SpawnPreparation>;
    fn on_subagent_ended(&mut self, params: SubagentEndParams) -> Result<()>;
    fn dispose(&mut self) -> Result<()>;
}
```

KAIROS becomes `KairosEngine: ContextEngine`. Future memory strategies (per-persona context assembly, project-specific memory, retrieval engine-backed) implement the same trait. The dispatch pipeline calls `ContextEngine` methods — never KAIROS directly.

**2. Cache-TTL Context Pruning (from OpenClaw pattern)**

Add TTL metadata to stored tool results. Different tool types get different lifetimes:

| Tool Type | Default TTL | Rationale |
|-----------|-------------|-----------|
| Schema query (`information_schema`) | 10 min | Schema changes are rare within a session |
| File read | 5 min | Files change during builds |
| Browser snapshot | 2 min | UI state is volatile |
| Architecture decision (ADL) | Session lifetime | Decisions persist |
| Build learnings query | Session lifetime | Reference data |
| Agent dispatch result | 30 min | Findings stay relevant longer |

Two-phase compaction:
1. **TTL prune** (free, no LLM call): scan stored tool results, remove any past their TTL. Replace with one-line placeholder: `[Pruned: schema query for shop_settings, expired 8m ago]`
2. **LLM summarize** (expensive): only if still over threshold after TTL prune

This reduces LLM compaction calls significantly — most context bloat is stale tool results.

**3. Iterative Compression with Structured Handoff (from Hermes pattern)**

Upgrade the compact engine's summary system:
- Store `previous_summary` in SQLite alongside the session
- On re-compaction, pass previous summary as context with instruction: "PRESERVE existing info still relevant. ADD new progress. Move 'In Progress' → 'Done' when completed. REMOVE info that is now stale."
- Structured template (merge of our 9-section format + Hermes template):
  - Primary Request / Goal
  - Architecture Constraints (from ADL/spec)
  - Progress: Done / In Progress / Blocked
  - Key Decisions Made This Session
  - Files Read or Modified (with paths)
  - Active Findings (unresolved)
  - Tool Surprises / Workarounds
  - Current Work State
  - Next Steps
- **Orphaned tool pair sanitization**: after compression removes middle messages, detect and fix orphaned `tool_call`/`tool_result` pairs. Remove orphaned results; insert stub results for orphaned calls. Prevents API rejection from mismatched IDs.

**4. FTS5 Full-Text Search on Sessions (from Hermes pattern)**

SQLite migration (v6): add FTS5 virtual table on session messages.

```sql
CREATE VIRTUAL TABLE messages_fts USING fts5(
    content, role, session_id,
    content='messages', content_rowid='id'
);
```

Enables cross-session recall: "What did Pierce flag last time we built a settings page?" Scout can query past sessions during pre-build recon. Chronicle can search build history without reading every BOOT.md. Personas can remember past interactions across projects.

New Tauri command: `search_sessions(query, limit)` → returns matching messages with session context.

**5. Atomic Task Checkout (from Paperclip pattern)**

Add checkout semantics to the findings table:

```sql
ALTER TABLE findings ADD COLUMN checked_out_by TEXT;
ALTER TABLE findings ADD COLUMN checked_out_at TEXT;
CREATE UNIQUE INDEX idx_findings_checkout
    ON findings(id) WHERE checked_out_by IS NOT NULL AND resolved_at IS NULL;
```

Prevents two dispatched agents from working on the same finding during parallel Triad gates. Nyx checks out a finding before fixing it; if another agent tries to claim it, the DB rejects the duplicate.

**Verification:** `cargo check` clean. All 5 SQLite migrations apply cleanly. Existing Phase 3 tests still pass.

---

### Session 4.1 — Window Manager + Dock Bar

**Architecture pivot:** Drop `react-resizable-panels` (linked split panes). Replace with a floating window manager where every panel is independently sizable, movable, and detachable.

**Panel model — 4 states:**
1. **Docked** — default on first launch. Sensible layout (chat left, canvas center, team right). Panels occupy regions but can be undocked.
2. **Floating** — drag a panel's handle to undock. Free-position, free-size. Click-to-raise z-ordering. No linked resizing — moving one panel never reshapes another.
3. **Minimized** — collapse to dock bar pill. One click restores to previous position/size.
4. **Popped out** — detach to a native OS window via Tauri multi-window API. Lives on any monitor. Communicates back to main app via Tauri IPC events.

**ForgeWindowManager** — `src/window-manager/`
- `manager.ts` — panel instance registry, z-order stack, position/size state, dock/float/pop-out transitions
- `panel.ts` — PanelContainer component: drag handle (titlebar region), resize handles (8 edges/corners), minimize/pop-out/close buttons, size-aware content slot
- `dock.ts` — DockBar component: horizontal bar at bottom of app frame. One pill per registered panel type. Active = lit, minimized = dim with restore click, closed = dim with reopen click. Unread badges, activity pulse animations. Scales to 20+ panel types.
- `snapping.ts` — edge-snap engine: 8px magnetic snap to app frame edges, other panel edges, and dock bar. Optional — can be toggled off.
- `groups.ts` — tabbed panel groups: drag one panel's tab onto another to create a tab group. Keeps related panels together (e.g., Findings + Agent Board as tabs in one floating window).
- `presets.ts` — workspace presets: named layout snapshots. Ships with 3 defaults:
  - **Build Mode** — canvas big, chat + team docked
  - **Review Mode** — findings + preview big, canvas minimized
  - **Focus Mode** — chat only, everything else minimized to dock
  - Custom presets saveable by operator
- `persistence.ts` — saves full layout state to SQLite on every change: panel positions, sizes, z-order, dock/float/popped-out state, which monitor for pop-outs, active workspace preset. Restores exactly on app relaunch.
- `types.ts` — PanelId, PanelState, PanelPosition, PanelSize, WorkspacePreset, DockItem, TabGroup

**Tauri multi-window integration** — `src-tauri/src/commands/windows.rs`
- `create_panel_window(panel_id, position, size)` — opens native OS window for a popped-out panel
- `close_panel_window(panel_id)` — returns panel to floating state in main window
- `sync_panel_state(panel_id, state)` — IPC bridge: popped-out panels emit state changes back to main process
- Window close event → auto-return panel to floating in main window (not lost)

**SQLite migration** — `panel_layout` table upgraded:
- `panel_id TEXT PRIMARY KEY` — unique panel instance ID
- `panel_type TEXT` — type (chat, canvas_hud, team, preview, findings, vault_browser, etc.)
- `state TEXT` — docked/floating/minimized/popped_out
- `x INTEGER, y INTEGER, width INTEGER, height INTEGER` — position/size
- `z_order INTEGER` — stacking order
- `monitor INTEGER` — which display (for pop-outs)
- `tab_group_id TEXT` — null or group ID if tabbed with other panels
- `tab_order INTEGER` — position within tab group
- `workspace_preset TEXT` — which preset this belongs to

**Default layout** (first launch):
- Chat: docked left, 320px wide
- Canvas HUD: docked center, fills remaining
- Team Panel: docked right, 300px wide
- Preview: docked bottom-right, 50% of right column height
- Dock bar: bottom edge, all 6 panel types as pills

**Migration from Phase 1:** The existing 6-panel layout built with react-resizable-panels is replaced. All panel content components (ChatPanel, TeamPanel, etc.) are unchanged — only the container that hosts them changes from split-pane slots to window-manager PanelContainers.

### Session 4.2 — Core Pretext Engine
- `packages/layout-engine/` — the Pretext wrapper
  - `prepare.ts` — batch prepare for arrays of text blocks, font caching, memoization
  - `measure.ts` — single + multi-breakpoint measurement (375/768/1280), height-for-width
  - `fit.ts` — fit-to-container solver: given text + width + min/max font, binary search over layout() (<1ms)
  - `canvas.ts` — canvas text renderer: draw prepared text with line breaks, colors, alignment, styled spans (bold, color, badges)
  - `virtual.ts` — pre-compute heights for virtualized lists (react-window/react-virtuoso compatible)
  - `types.ts` — PreparedText, LayoutResult, MeasureOptions, FitResult, VirtualHeightMap
- Install `@chenglou/pretext` as dependency
- **All components must be size-aware from day one.** The window manager means any component can render at any size. Pretext handles this naturally (measure → layout at any width) but every consumer must accept dynamic dimensions, not hardcoded panel slots.
- Unit tests for measurement accuracy

### Session 4.3 — Canvas Components Library
- `packages/canvas-components/` — reusable canvas-rendered UI primitives
  - StatCard (number + label + trend indicator)
  - ProgressArc (circular gauge, batch progress)
  - StatusBadge (green/amber/red with pulse animation)
  - FlowParticle (animated dot traveling along a bezier path)
  - NodeCard (rounded rect with text, icon, status indicator, dynamic font sizing)
  - ConnectionLine (animated bezier between two nodes)
  - TokenGauge (pre-measured number displays — "$4.23" → "$4.24" without element shifting, widest-possible-value space reservation)
  - ContextMeter (per-session context window fill gauge)
  - **DockPill** (dock bar item: icon + label + badge + activity pulse, canvas-rendered)
- All components use Pretext for text measurement, render to canvas
- **Every component accepts `width` and `height` props** — no assumptions about container size. The window manager can resize any panel at any time.
- Test page inside the Tauri app

### Session 4.4 — Document Generation Engine (Pretext Editorial Quality)
- `packages/document-gen/` — dual-output from single content, Pretext-powered editorial layout
  - `pdf.ts` — page-break calculator: given content blocks + page dimensions, compute per-page. Render to canvas, export as PDF blob.
  - `editorial.ts` — multi-column flow via `multiColumnText()` for body content, obstacle routing via `flowAroundObstacles()` for text around charts/images, pull quotes as positioned obstacles that text routes around, drop caps via Pretext `fitToContainer()` for section headers
  - Gate report template: title, **persona glyph attribution per finding**, findings table (severity/persona/description/evidence/fix), summary stats, **multi-column body text flowing around severity distribution charts**, **pull quotes from Pierce/Mara/Kehinde findings**
  - Project brief template: project name, architecture decisions, batch plan, persona assignments, **persona glyphs in team roster**, **editorial two-column layout**
  - Build report template: batch progress, findings resolved, risks, token usage, **text-density timeline showing session activity**
  - Retrospective template: timeline, learnings, failure modes, recommendations, **persona glyph attribution on each learning**
- **Dual output:** markdown for Claude to read, Pretext-rendered editorial-quality PDF for humans
- **Pretext features used:** multiColumnText, flowAroundObstacles, fitToContainer (drop caps), shrinkwrapText (pull quote sizing), PersonaGlyph rendering in reports
- Test: generate PDF from sample data, verify page breaks, multi-column flow, and persona glyph rendering

**Depends on:** Phase 1 (project structure), Phase 3 (SQLite for layout persistence)
**New ADL:** OS-ADL-016 (floating window manager — panels are independent, not linked), OS-ADL-020 (dual-output document generation), OS-ADL-021 (dock bar as panel registry UI — scales to 20+ panel types)

---

## Phase 5: Living Canvas HUD (3 sessions) — WAS PHASE 4

**Goal:** The Canvas HUD panel becomes an animated, GPU-accelerated visualization of system state. Every visual component uses the layout engine from Phase 4. Canvas for presentation, DOM for interaction. All components are size-aware — the operator can resize, float, or pop out the Canvas HUD panel to any dimension via the window manager.

### Session 5.1 — Build State Topology + Core Gauges
- `PipelineCanvas` — canvas-rendered pipeline with animated stage transitions:
  - Pipeline stages as nodes: Scout → Build → Triad → Sentinel
  - **Persona glyphs inside active pipeline nodes** — when Scout is dispatched, the Scout glyph (not an emoji) renders inside the node, animated in 'speaking' state
  - Nodes pulse when active, dim when idle, glow on completion
  - Agent names perfectly centered at any zoom via Pretext measurement
  - **Living text flow:** labels, stats, and status text flow around nodes using `flowAroundObstacles()`. As agents activate and nodes expand, surrounding labels reflow to accommodate — editorial engine pattern applied to pipeline visualization
  - **Responds to panel resize** — nodes reflow to fill available space
- `BatchProgress` — layer visualization, animated counters, percentage arc gauge
- `TokenGauge` — pre-measured number displays, zero-shift updates
- `ContextMeter` — per-session context window fill gauge + **text density visualization**: actual text content rendered as progressively denser typography as usage climbs. Early context = spacious text. At 85% = compressed, tight lineHeight. Compaction = text dissolves and re-emerges sparser. Animated lineHeight/maxWidth transitions via Pretext.
- Reads state from BOOT.md (parsed by Rust backend, emitted as Tauri events)
- Ambient idle animation (subtle node drift, pulse, **persona glyph ember states**)
- **Protocol enforcement point #8 — Ambient accountability:** The HUD visualizes protocol compliance in real time. Pipeline stages glow when active, dim when skipped. Findings feed shows unresolved items with a count badge that cannot be hidden. The operator glances at the canvas and knows instantly if a gate was skipped, a finding was unresolved, or a step was out of sequence. Transparency replaces trust.

### Session 5.2 — Agent Board + Findings Feed
- **Agent Board and Findings Feed are separate panel types** — each registers with the window manager and can be floated, tabbed, minimized, or popped out independently. They don't have to live inside the Canvas HUD.
- `AgentBoard` — canvas-rendered agent cards:
  - Status (idle/running/complete/error), model tier badge
  - Animated state transitions (fade in on dispatch, pulse on activity)
  - Dynamic font sizing for variable name lengths via Pretext fit()
  - Click to expand → shows last finding, domain health
  - **Reflows card grid** based on panel dimensions (1-col narrow, 2-col medium, 3-col wide)
- `FindingsFeed` — virtualized scrolling list:
  - Pretext pre-computed heights for zero-jank scroll (hundreds of findings, no lag)
  - **Findings as typographic severity:** P-CRIT renders at max weight + max size + glow. P-LOW renders smaller, dimmer, lighter weight. Pretext computes optimal layout from severity distribution — visual hierarchy IS the data. A wall of P-CRITs looks physically different from a clean report.
  - **Persona glyph attribution:** each finding card shows the glyph of who found it (Pierce crosshair, Mara eye, etc.). Scan a list and colors + shapes tell you instantly which persona flagged what.
  - **Shrinkwrap finding cards:** each card width computed via `shrinkwrapText()` for zero wasted pixels
  - Color-coded: P-CRIT red, P-HIGH orange, P-MED yellow, P-LOW blue
  - Filterable by persona, severity, status
  - Findings persist to SQLite
  - **Pop-out friendly** — great candidate for second monitor during gate reviews
- `SessionTimeline` — **Text river:** a flowing stream of commit messages, finding summaries, and gate verdicts. Text density = activity density. Dense clusters = busy sessions. Sparse stretches = quiet periods. Read history by scanning typography. Pretext-measured, flowing left-to-right with time. Not bars on a gantt chart.

### Session 5.3 — Flow Visualization + Graph
- Semi-transparent overlay on the Canvas HUD panel
- When agents dispatch/communicate, **persona glyphs streak across the canvas as particle trails:**
  - Scout glyph → Nyx bolt (pre-build intel delivery)
  - Nyx bolt → Build Triad glyphs: crosshair + eye + nested-brackets (gate dispatch — three glyphs streak in formation)
  - Triad glyphs → Nyx bolt (findings return — severity-colored trail)
  - Wraith probe paths hitting system surfaces
- **Dispatch is visible as motion:** dispatching the Build Triad shows three glyphs (Pierce crosshair + Mara eye + Kehinde nested-brackets) accelerating along bezier paths toward the target surface. The personas are characters in the visualization, not just labels.
- Bezier curves with moving particles, color-coded by type (dispatch=blue, findings=orange/red, context=green)
- Triggered by real dispatch events from the orchestration engine
- Toggleable visibility, replayable from session history
- `VaultBrowser` — **separate panel type.** Tree view (DOM for interaction) with content panel (canvas-rendered for consistent typography), pre-computed document heights for virtual scroll. Registers with window manager — can float or pop out.
- `GraphViewer` — **separate panel type.** Knowledge graph with Pretext-measured labels on every node and edge, canvas pan/zoom, entity highlighting. Registers with window manager.
- **Intelligence glyphs — DEFERRED TO PHASE 8.** 10 intelligences get visual identities alongside the 10 persona glyphs. IntelligenceGlyph component + IntelligenceNetwork panel require Phase 8's event bus and intelligence chains to have real data. Building visualization before data source exists would mean placeholder data that needs rewiring. Glyph designs (colors/shapes) are preserved below for Phase 8 implementation:

  | Intelligence | Glyph | Color | Hex |
  |---|---|---|---|
  | Scout | `⊙` | electric green | `#39FF14` |
  | Sentinel | `◈` | ice cyan | `#00E5FF` |
  | Wraith | `ψ` | crimson | `#DC143C` |
  | Meridian | `⊕` | silver/white | `#C0C0C0` |
  | Chronicle | `⧖` | deep violet | `#8A2BE2` |
  | Arbiter | `⚖` | gold | `#FFD700` |
  | Compass | `✦` | emerald | `#50C878` |
  | Scribe | `℘` | soft teal | `#20B2AA` |
  | Kiln | `🜂` | flame orange | `#FF6B35` |
  | Beacon | `✧` | signal white | `#F5F5F5` |

**New panel types registered in this phase:** Canvas HUD, Agent Board, Findings Feed, Session Timeline, Vault Browser, Graph Viewer, Intelligence Network (7 new, bringing total to ~13)

**Protocol enforcement foundation:** P5-G (findings SQLite) is enforcement point #2 from the Protocol Enforcement Vision — every gate finding gets an ID, severity, and status in SQLite. A batch cannot close with `status = 'open'` rows. The database is the proof, not commit messages. See `memory/project_os_protocol_enforcement.md` for the full 8-point enforcement plan.

**Depends on:** Phase 4 (window manager + Pretext + canvas components + document gen)

---

## Phase 6: Dev Server Preview + Connectivity (2 sessions) — WAS PHASE 5

**Goal:** Embedded live application preview and service health monitoring. Both are independent panel types in the window manager — floatable, pop-outable, minimizable.

### Session 6.1 — Dev Server Preview Panel
- **Registers as panel type** with window manager. Multiple preview panels allowed (one per dev server or viewport).
- Tauri sidecar/shell API for dev server process management
  - Start/stop/restart dev servers
  - Process stdout/stderr capture
  - Port detection and health polling
- Embedded `<webview>` inside a PanelContainer pointing to localhost:PORT
- Viewport controls (desktop/tablet/mobile presets, custom dimensions)
- URL bar for navigation within the preview
- Agent-accessible: agents can read the preview DOM state via Tauri commands
  - No screenshot round-trips — the rendered app is a first-class citizen
- **Pop-out use case:** detach preview to second monitor for side-by-side building. Main window has chat + canvas, second monitor has live app.

### Session 6.2 — Connectivity Panel
- **Registers as panel type** with window manager.
- Rust-side health checks (async, periodic):
  - Supabase: ping project URL, count tables/RPCs
  - GitHub: check repo access, last push timestamp
  - Cloudflare: worker status
  - Stripe: env var presence + API key validation
  - Typesense: cluster health
- Each service rendered as a StatusBadge (from canvas components)
  - Green = healthy, Amber = degraded, Red = unreachable
  - Animated pulse on heartbeat
  - Click to expand → shows details
- Auto-refresh interval (configurable, default 60s)
- **Compact mode:** when minimized to dock, the dock pill itself shows aggregate status (green = all healthy, amber = degraded, red = down)

**New panel types registered in this phase:** Dev Server Preview (supports multiple instances), Connectivity Panel (2 new, total ~14)

**Depends on:** Phase 1 (Tauri shell), Phase 4 (window manager + canvas components)
**New ADL:** OS-ADL-017 (dev server management via Tauri sidecar)

---

## Phase 7: Team Panel + Agent Presence + Action Palette + Proposals (3 sessions, 14 batches) — WAS PHASE 6

**Goal:** Personas as first-class visible entities with state, direct dispatch, and a contextual action palette that surfaces available commands based on persona selection. Multi-select personas to discover orchestrator combinations. The Team Panel is a window-manager panel type — floatable, pop-outable, can be tabbed with other panels.

### Session 7.1 — Agent Registry + Team Panel

**Rust backend: Agent Registry** — new module `src-tauri/src/commands/registry.rs`

The registry scans `.claude/agents/`, `.claude/agents/sub-agents/`, and `.claude/commands/` on first request, parses YAML frontmatter (name, description, tools, model, user_invocable), and builds a structured in-memory registry cached as `Arc<Mutex<AgentRegistry>>` in Tauri managed state.

Key data structures:
- `RegistryEntry` — slug, name, description, category (persona/intelligence/orchestrator/utility/sub_agent/command), tools list, parent agent (for sub-agents), file path, **availability_check** (see below)
- `AgentRegistry` — all entries + orchestrator membership map + **CommandRegistry** (single source of truth for all commands)
- `PaletteAction` — slug, name, description, action type (command/sub_agent/orchestrator), dispatch target slug
- `PaletteResponse` — individual actions + matched orchestrator actions

Sub-agent ownership derived from filename prefix convention: `mara-mobile.md` → parent `mara`, `kehinde-race-conditions.md` → parent `kehinde`.

**Tool Availability Gating (from Hermes `check_fn` pattern)**

Each `RegistryEntry` has an optional `availability_check` — a runtime condition that determines whether the agent/tool is available right now:

| Agent/Tool | `availability_check` | Effect When Unavailable |
|---|---|---|
| Kehinde's schema tools | Supabase MCP connected | Tools don't appear in Action Palette |
| Mara's browser tools | Preview MCP running | Tools don't appear |
| Tanaka's RLS audit | Supabase MCP connected | Agent card shows "needs connection" |
| Wraith's red-team | Preview MCP + Chrome MCP | Agent card dimmed |
| Beacon post-deploy | Cloudflare MCP connected | Agent card dimmed |
| Vane's Stripe tools | Stripe env vars set | Tools don't appear |

Checks run on registry refresh (called on mount + when connectivity panel detects changes). Failed checks don't error — tools/agents silently disappear or dim. No config file edits needed.

**Dispatch-Scoped Capability Grants (from Excalibur spellbook model)**

Tool availability gating (above) is layer 1 — binary connectivity checks. Dispatch scoping is layer 2 — even when a tool is technically available, the dispatch may restrict it for this specific run.

Each `DispatchRequest` includes a `granted_capabilities: Vec<CapabilityFamily>` field:

```rust
enum CapabilityFamily {
    ReadOnly,       // file reads, schema queries, grep — always granted
    WriteCode,      // file edits, new files — build dispatches only
    WriteVault,     // vault articles, BUILD-LEARNINGS, ADL — compile/consolidation
    Database,       // migrations, DML — requires explicit grant
    External,       // web search, API calls — mana-costed
    Destructive,    // delete, drop, red-team — requires explicit operator grant
}
```

- Gate review dispatches get `ReadOnly` only — personas find, Nyx fixes
- Build dispatches get `ReadOnly + WriteCode`
- Dreamtime ritual gets `ReadOnly + WriteVault`
- Red-team (Wraith) gets `ReadOnly + Destructive` only with operator approval
- The dispatch audit trail records which capabilities were granted per run

**Two-layer capability control:**
1. **Connectivity gating** (existing): Is the MCP connected? Binary.
2. **Dispatch scoping** (new): Is this capability *granted for this run*? Per-dispatch.

**Single Command Registry (from Hermes `CommandDef` pattern)**

All slash commands, agent actions, and keyboard shortcuts defined once in a `CommandRegistry` struct. Every consumer auto-derives from this single source:
- Action Palette entries (Phase 7.2)
- Dock bar context menu actions
- Keyboard shortcut bindings
- Help/documentation text
- CLI dispatch (if ever added)

Adding a new command = one `CommandDef` entry. Propagates to all surfaces automatically.

```rust
struct CommandDef {
    slug: String,
    name: String,
    description: String,
    category: CommandCategory,  // build, persona, quality, analysis, reporting, operations
    aliases: Vec<String>,
    dispatch_target: String,    // agent slug or handler
    available_when: Option<AvailabilityCheck>,
    keyboard_shortcut: Option<String>,
}
```

**Smart Review Command (from Block `sq agents review` pattern)**

A unified dispatch command that analyzes changes and routes to the right agents automatically. Operator types `/review`, the system figures out who to dispatch.

New `CommandDef` in the registry:
```rust
CommandDef {
    slug: "review",
    name: "Smart Review",
    description: "Diff-aware dispatch — analyzes changes, routes to relevant agents",
    category: CommandCategory::Build,
    aliases: vec!["sr".into()],
    dispatch_target: "orchestrator:smart-review",
    available_when: Some(AvailabilityCheck::GitChanges),
    keyboard_shortcut: None,
}
```

New orchestrator agent file: `agents/smart-review.md`. Reads `git diff`, maps file types to personas using a static routing table:

| File Pattern | Auto-Assigned Personas |
|---|---|
| `*.rs`, `src-tauri/**` | Kehinde |
| `*.tsx`, `*.css`, `*.html` | Mara + Riven |
| `*.sql`, `migrations/**` | Tanaka + Kehinde |
| `*auth*`, `*permission*`, `*rls*` | Tanaka |
| `*.md` (specs/ADL) | Pierce |
| `*price*`, `*rate*`, `*payment*` | Vane |
| `*tos*`, `*privacy*`, `*consent*` | Voss |

The routing table is defined here as a static mapping. Phase 8.2 upgrades it with full pipeline intelligence (enforcement, blocking, audit trail, diff-aware gate routing — enforcement point #4). Until then, Smart Review provides immediate value as a convenience dispatch.

**Agent Working State (from Factory-AI DroidWorkingState — 5-state turn-level lifecycle)**

`AgentWorkingState` enum: Idle, Streaming, WaitingForConfirmation, ExecutingTool, Compacting. Per-agent turn-level state. Emitted via Tauri events (`agent:working-state-changed`). This is the TURN-LEVEL state machine — it drives the React UI (show spinner during Streaming, show confirmation modal during WaitingForConfirmation, show compaction indicator during Compacting). SEPARATED from mission-level MissionState (Session 7.3) — which drives orchestration (dispatch queue, milestone gates). Two-layer state machine: never collapse these into one enum.

**2-Axis Dispatch Gate (from Factory-AI InteractionMode × AutonomyLevel)**

`InteractionMode` enum: Spec (read-only, no writes), Auto (standard execution), Orchestrator (mission decomposition with workers). Orthogonal to existing `CapabilityFamily` — mode controls structural access, family controls per-action capability:
- `Spec` mode → only `ReadOnly` valid, regardless of other grants
- `Auto` mode → capabilities as granted by dispatch context (existing behavior)
- `Orchestrator` mode → enables mission features (worker spawn, feature decomposition, MissionState transitions)

This refines P7-C.1's capability gating from single-axis (family) to dual-axis (mode × family). Mode is set per-session. Family is set per-dispatch.

Six Tauri commands:
- `get_agent_registry()` → full registry (called once on mount, refreshable)
- `get_agent_content(slug)` → full markdown body for system prompt construction
- `get_palette_actions(selected_slugs)` → resolved actions for current persona selection (filters by availability)
- `get_command_registry()` → all commands with current availability state
- `smart_review_routing(diff_summary)` → resolved persona list from diff analysis (used by smart-review orchestrator)
- `get_agent_working_state(slug)` → current turn-level state for a specific agent

**Team Panel rebuild** — right sidebar showing all registered agents:
- Grouped by role: Personas (10), Intelligences (10), Orchestrators (10), Utilities (10)
- **Persona glyphs replace emoji icons:** each persona's presence shows their canvas-rendered glyph (bolt, crosshair, eye, grid, brackets, hex, ledger, pilcrow, wave, cursor) at 24px in their signature color. Animation state reflects dispatch state (idle/thinking/speaking/finding/complete/error). The presence bar becomes a row of living, breathing glyphs.
- Each agent card shows: **persona glyph** + name, model tier badge (high/medium/fast), status (idle/active/findings-pending), domain health indicator, last finding or recommendation (truncated), time since last activity
- **Unavailable agents dimmed** with reason tooltip ("Needs Supabase connection") — glyph dims to ember
- Click agent → expand to see full recent history
- **Chat message avatars:** when a persona sends findings or messages, their glyph appears as the avatar next to the message bubble. **Shrinkwrap bubbles** via `shrinkwrapText()` — zero-waste widths, no `max-width: 80%` dead space. When Pierce sends findings, you see the red crosshair next to a tight bubble.

### Session 7.2 — Action Palette + Multi-Select

**Persona multi-select** — the 10 persona pills in the presence bar become clickable toggle buttons:
- Click a pill to select/deselect (multi-select by default, no modifier keys needed)
- Selected pills get `ring-1 ring-accent` visual feedback
- Selection state managed via `usePersonaSelection` React hook (session-scoped `Set<string>`)

**Orchestrator recognition** — static membership table hardcoded in Rust (10 orchestrators with known compositions):

| Selection | Recognized As |
|-----------|--------------|
| `{pierce, mara, kehinde}` | Build Triad |
| `{kehinde, tanaka, vane}` | Systems Triad |
| `{calloway, voss, sable}` | Strategy Triad |
| `{pierce, mara, kehinde, tanaka, vane, wraith, sentinel, meridian}` | Full Audit |
| `{calloway, voss, sable, wraith}` | Launch Sequence |
| `{all 10 personas}` | The Council |
| `{pierce, mara, kehinde}` | Gate Runner (dispatches Triad) |
| `{chronicle}` | Postmortem (+ relevant domain personas) |
| Any 2+ personas | Debate (context-dependent, always available) |
| Any 2+ personas | Decision Council (cognitive-lens, always available) |

Matching algorithm: for each orchestrator, check if the selected persona set is a superset of (or equal to) the orchestrator's member list. Return all matches sorted by member count ascending — most specific first (Build Triad before Council). Empty-member orchestrators (Debate, Decision Council) always appear when 2+ personas are selected.

**Action Palette component** — renders as a third tab ("Actions") in the Team Panel, with a count badge showing number of selected personas:
- **Empty state** (nothing selected): "Select personas above to browse actions"
- **Orchestrators section** (when multi-select matches): recognized orchestrator actions with their full command set
- **Commands section**: user-invocable slash commands relevant to the selected personas
- **Sub-Agents section**: specialized deep-dive sub-agents owned by the selected personas (e.g., selecting Mara shows `mara-accessibility`, `mara-mobile`, `mara-interaction`)
- Each action row: name + short description, single click dispatches immediately (no confirmation step)

**Dispatch flow** (click an action):
1. `useActionPalette` hook calls `get_agent_content(action.dispatch_slug)` → gets full markdown
2. Constructs a `DispatchRequest` with markdown as system prompt
3. Calls existing `dispatch_agent` Tauri command
4. Agent appears in Dispatch tab with status tracking

**Tool Confirmation Router (from Goose + Agent Browser + Factory-AI ToolConfirmation system).** Destructive tool calls (file delete, SQL DROP, credential access) require operator confirmation before execution. Implemented via oneshot channels — dispatch pipeline sends confirmation request to frontend, awaits operator response via oneshot `Receiver`, then proceeds or aborts. Non-blocking to the pipeline: other dispatches continue while awaiting confirmation.

**Confirmation taxonomy (from Factory-AI, 9 action types):** `ConfirmationType` enum — FileEdit, FileCreate, ShellExec, ApplyPatch, McpTool, AskUser, ExitSpecMode, ProposeMission, StartMissionRun. Each type carries action-specific detail (FileEdit: path + diff; ShellExec: command; McpTool: server + tool name). Enables the modal to show context-appropriate information.

**Confirmation outcomes (from Factory-AI, 8 response types):** `ConfirmationOutcome` enum — ProceedOnce, ProceedAlways, ProceedAutoLow, ProceedAutoMedium, ProceedAutoHigh, ProceedEdit, Cancel. `ProceedAlways` whitelists the tool for the session. `ProceedAuto*` maps to AutonomyLevel — at `ProceedAutoHigh`, all future calls of this type auto-approve. `ProceedEdit` allows the operator to modify the action before execution. Router tracks `auto_approved: HashSet<ConfirmationType>` — once whitelisted, future requests for that type skip the modal.

(Goose: ToolConfirmationRouter with oneshot channels) **(Agent Browser: 3rd validation — Action Policy with Allow/Deny/Confirm trichotomy. Policy precedence: deny > confirm > allow > default. Maps to CapabilityFamily: `Destructive` → RequiresConfirmation, `ReadOnly` → Allow, blocked tools → Deny.)**

**AST Transform Plugin Pipeline (from just-bash) — DEFERRED TO PHASE 8.2.** Before any dispatch executes tool calls, the action passes through a transform pipeline. Each transform is a pure function: `fn transform(action: &ToolCall, ctx: &DispatchContext) -> TransformResult` (Pass/Block/Modify). Pipeline stages: (1) capability gate — reject tools not in persona's allow-list, (2) injection scan — flag suspicious patterns in arguments, (3) audit log — file echo for every tool call before execution. Transforms are composable — intelligences register new stages without modifying the core pipeline. Phase 7 delivers the Tool Confirmation Router (critical safety gate); Phase 8.2 adds the full composable transform pipeline alongside the orchestration engine. (just-bash: AST transform plugin pipeline for action audit)

**Underspecification Gating (from oh-my-codex + AiDesigner dual-lane routing).** When an operator types a vague command (e.g., bare `/review` or `/audit` without scope), detect underspecification before dispatching heavy orchestrators. Heuristic: <15 effective words AND no well-specified signals (file paths, code blocks, numbered steps) → redirect to planning prompt instead of dispatch. Two-layer gating: (1) `AvailabilityCheck` — is the command available? (2) `SpecificationCheck` — is the request specified enough? Both pass before Action Palette dispatches. **(AiDesigner: dual-lane routing with automatic complexity escalation — don't just block underspecified requests, route them: simple/well-scoped → single-persona lightweight review (Quick Lane), complex/multi-surface → full triad orchestration (Complex Lane). Same output format from both paths. No manual switching — complexity detection is automatic.)** (oh-my-codex: underspecification gate with 15-word + signal-detection heuristic)

**React files:**
- `src/hooks/usePersonaSelection.ts` — toggle/clear/isSelected over `Set<string>`
- `src/hooks/useActionPalette.ts` — fetches palette on selection change (150ms debounce), exposes `dispatch(action)` handler
- `src/components/team/ActionPalette.tsx` — grouped action list with click-to-dispatch rows
- Modified: `AgentPresence.tsx` (click-to-select), `TeamPanel.tsx` (third tab + hook wiring), `tauri.ts` (new types + invoke wrappers)

### Session 7.3 — Agent Orchestration UI + Agora

**Dispatch Queue:**
- **Dispatch Queue** — **separate panel type.** What's pending, what's running. Can float alongside Canvas HUD or pop out.
- **Priority queue model (from ByteRover ToolInvocationQueue).** 4 tiers: Critical/High/Normal/Low. Dispatches sorted by priority first, FIFO within tier. Configurable concurrency limit (default 3 for triad, 1 for sequential stages). Returns execution statistics (count, duration, failures).
- **Internal dispatch tracking (from Agent Browser WebSocket multiplexer).** ID-correlated oneshot pattern — each dispatch gets unique ID, completion resolves via oneshot sender. Multiple dispatches in-flight concurrently. 60s timeout with cleanup of pending entries.
- Parallel execution indicator (e.g., "3 Triad agents running")
- Gate status display (pass/fail/in-progress per gate)
- **Checkpoint validation (from AiDesigner).** Before batch advancement, explicit checkpoint: progress recap + numbered options for next direction. `canAdvance` gates on: Triad dispatched + zero open findings + checkpoint acknowledged.
- Session timeline (horizontal, shows BOOT.md handoffs as milestones)
- "Export Report" button → generates PDF via document generation engine
- **Protocol enforcement point #1:** Gate dispatch is a pipeline stage, not an option. The dispatch queue refuses to advance a batch past "Build" until Triad agents have been dispatched and the findings table (P5-G) shows zero open items. No silent skipping.

**Agora — ADL-005 Implementation (Internal Feedback Loop)**

The OS has a formalized internal communication system where personas propose changes, evaluate each other's proposals, and build organizational judgment collectively. This is the "social media for agents" — a visible feed of inter-agent reasoning.

**Rust backend:** `src-tauri/src/proposals/`

- `store.rs` — CRUD for proposals. Schema enhanced with Factory-AI MissionFeature patterns:
  ```rust
  struct Proposal {
      id: Ulid,
      author: String,           // persona slug
      source: ProposalSource,   // Persona (manual) | Automated (policy evolution) | Consortium (conflict resolution)
      proposal_type: ProposalType, // Optimization | Pattern | Rule | Architecture | Skill | Policy
      scope: String,            // what area this affects
      target: String,           // specific file/system/surface
      severity: Severity,       // how urgent
      title: String,
      body: String,             // full proposal with evidence
      evidence: Vec<String>,    // links to traces, findings, build learnings
      preconditions: Vec<String>,      // (Factory-AI MissionFeature) conditions that must be true before implementation
      verification_steps: Vec<String>, // (Factory-AI MissionFeature) how to verify completion
      fulfills: Option<Vec<String>>,   // (Factory-AI MissionFeature) higher-level requirements this satisfies
      status: ProposalStatus,   // Open | Evaluating | Accepted | Rejected
      evaluators: Vec<String>,  // persona slugs assigned to evaluate
      responses: Vec<ProposalResponse>, // threaded evaluation responses
      created_at: String,
      resolved_at: Option<String>,
      decision_trace_id: Option<Ulid>, // links to context graph trace on resolution
  }
  ```

  **`MissionState` enum (from Factory-AI, 6-state mission-level lifecycle):** AwaitingInput → Initializing → Running → Paused → OrchestratorTurn → Completed. This is the MISSION-LEVEL state machine — it drives the Dispatch Queue (P7-L) and orchestration flow. SEPARATED from `AgentWorkingState` (Session 7.1) which drives turn-level UI. Mission state emits `mission:state-changed` Tauri events.

  **`ProposalOutcome` enum (from Factory-AI FeatureSuccessState):** Success, Partial, Failure. Stored on decision resolution — `Partial` means accepted and partially implemented (verification incomplete). Enables outcome quality tracking over time.
- `triage.rs` — auto-routes proposals to scope-appropriate personas for evaluation. Security proposal → Tanaka evaluates. UX proposal → Mara evaluates. Architecture → Kehinde. Cross-cutting → Council. Uses Agent Registry (7.1) for persona→domain mapping. Proposals can also be manually assigned. **(ByteRover: Policy Engine with first-match-wins rule evaluation informs the triage mechanism — ordered rules route proposals by scope pattern, first match determines evaluator assignment.)**
- `decisions.rs` — accepted proposals become decisions in `.forge/decisions/`. Rejected proposals preserve reasoning (why not). Both indexed by retrieval engine (Phase 8.3) when available. Decision schema mirrors proposal but adds: resolution rationale, implementing batch, outcome tracking, **`outcome: ProposalOutcome`** (Success/Partial/Failure from Factory-AI FeatureSuccessState).
  - **`DismissalRecord` struct (from Factory-AI DismissalRecord pattern):** `{ dismissal_type: DismissalType, source_proposal_id, summary, justification }`. `DismissalType` enum: DiscoveredIssue, CriticalContext, IncompleteWork. When a proposal is dismissed rather than resolved, the dismissal is recorded with explicit justification. No silent drops — every dismissed item has a paper trail. Dismissals are distinct from rejections: rejection = "evaluated and declined"; dismissal = "acknowledged but deprioritized with documented reasoning." Dismissals visible in the Agora with distinct visual treatment.
  - Tauri command: `dismiss_proposal(id, dismissal_type, justification) -> DismissalRecord`
- `feed.rs` — aggregates proposals + responses + decisions into a chronological feed. Supports pagination, filtering, search. Emits Tauri events on new activity.
- Rate limit enforcement: 3 proposals per persona per session (per ADL-005). Automated proposals (Phase 8.3b policy evolution) are exempt from rate limit but tagged `source: Automated`.
- SQLite migration: `proposals` table, `proposal_responses` table, `decisions` table.
- Tauri commands: `list_proposals`, `file_proposal`, `evaluate_proposal`, `resolve_proposal`, `get_proposal_feed`, `get_decision_history`, `search_proposals`

**Agora panel** — new panel type, registrable with window manager:
- Timeline/feed layout — newest at top, infinite scroll with virtualized rendering
- **Persona glyph attribution** on every entry — author's glyph (bolt, crosshair, eye, etc.) renders next to their proposal/response
- Proposal cards: author glyph + title + proposal type badge + severity badge + status indicator
- **Evaluation threads:** when personas evaluate, their responses appear as threaded replies with their own glyphs. Example flow:
  - Pierce (crosshair) files proposal: "Auth RPCs should require `security_definer` — 3 gate failures in last 5 batches lacked it"
  - Tanaka (hex shield) responds: "Concur. T-HIGH. This pattern matches OWASP A01:2021. Proposing mandatory Tanaka sub-check."
  - Mara (eye) responds: "Adds friction to the auth flow — need to verify UX impact before blanket enforcement"
  - Arbiter (scales) synthesizes: "Security-favored resolution. Mara's UX concern addressed by scoping to server-side RPCs only."
- Decision outcomes inline — accepted proposals show what changed (skill created, rule added, ADL updated). Rejected proposals show reasoning.
- **Filterable:** by author persona, proposal type, status, source (persona vs automated vs consortium)
- **Pop-out friendly** — great for monitoring during builds. Dock pill shows unresolved proposal count badge.
- Canvas-rendered cards with Pretext text measurement for zero-waste layouts

**New panel types registered in this phase:** Team Panel (rebuilt, with Action Palette as internal tab), Dispatch Queue, Agora (3 net new panel types, total ~18)

**Factory-AI Integration Summary (Session 7.3):**
- `MissionState` (6-state orchestrator lifecycle) drives Dispatch Queue and overall build orchestration
- `ProposalOutcome` (Success/Partial/Failure) tracks implementation quality on decision resolution
- `DismissalRecord` with `DismissalType` + justification — no silent drops of proposals or findings
- `MissionFeature`-inspired fields on proposals: `preconditions`, `verification_steps`, `fulfills`
- `FeedEntry` enum extended with `ProposalDismissed` variant for feed visibility
- Tauri commands: `dismiss_proposal`, `get_mission_state`, `update_mission_state`

**Depends on:** Phase 4 (window manager + canvas), Phase 1 (chat), Phase 3 (agent runtime + document gen for export)

---

## Pre-Phase 8 Patch: Intelligence Retrofit (Session 7.5) — ADDED 2026-04-04

> **Source:** April 4 repo mining (CrewAI, AutoGen, OpenHands). Patterns that can be backfilled into existing Phase 1-7 code before Phase 8. Phase 8 inherits cleaner infrastructure.

**3 batches, 1 session.** Backward-compatible extensions to 6 existing modules:

1. **P7.5-A: Dispatch Queue Intelligence + Secret Scrubbing** — `HaltCondition` trait with `&`/`|` combinators on `DispatchQueue`. `SecretScrubber` on all persisted payloads (dispatch_events, mailbox). Phase 8 plugs `ManaBudgetExhausted` into this trait.
2. **P7.5-B: Finding Deduplication + Condenser Architecture** — FTS5-based finding similarity detection + pattern clustering with systemic severity escalation. `Condenser` trait + `CondenserPipeline` refactor of existing compaction. Phase 8 adds `ObservationMaskingCondenser` and `LLMSummarizingCondenser` to this pipeline.
3. **P7.5-C: KAIROS Composite Scoring + Swarm Event Triggers** — `composite_score()` (semantic * 0.5 + recency * 0.3 + importance * 0.2) for memory recall. `TriggerRegistry` for event-driven agent dispatch from swarm mailbox. Phase 8's intelligence chains (P8-N) inherit this trigger system.

**New files:** halt.rs, sanitize.rs, condenser.rs, triggers.rs. **Edited:** queue.rs, queries.rs, mailbox.rs, findings.rs, engine.rs, dream.rs, lib.rs. **Migration:** V15b. **New commands:** 3.

**Gate:** Halt conditions compose. Secrets scrubbed. Findings deduplicate. Condenser pipeline produces identical compaction to pre-refactor. Composite scoring reorders recall. Triggers fire on matching events.

**Depends on:** Phase 7 complete

---

## Phase 8: Intelligence Foundation (6 sessions) — RESTRUCTURED 2026-04-04

> **Restructure (2026-04-04):** Original Phase 8 (9 sessions) split into Phase 8 (6), Phase 9 (5), Phase 10 (4), Phase 11 (2-3). Phase 8 expanded from 4 to 6 sessions to include persona evolution engine (8.5) and messaging gateway (8.6).
> Research sources: `docs/RESEARCH-AGENTIC-DEV-ENVIRONMENTS.md` (5 products, 52 patterns), `docs/RESEARCH-POETENGINEER-OBSERVATORY-AESTHETICS.md` (30 visual patterns), Karpathy LLM Wiki (vault/ritual/sigil convergence validation). **April 4 repo mining:** CrewAI (14 patterns), AutoGen (14 patterns), OpenHands (15 patterns) — composable halt conditions, condenser pipelines, progress ledgers, stuck detection, handoff-as-tool, SocietyOfMind nesting, intervention handlers, delegation budget partitioning, error classification, event-sourced state. Full reports: `research/{crewai,autogen,openhands}-mining-report.md`.
> Reason: original Phase 8 contained ~37 Rust modules, 13 SQLite tables, 7 new panel types, ~15K LOC Rust, ~60 Tauri commands across 4 distinct architectural layers. Split by layer: intelligence foundation → observatory+predictions → platform integration → integration testing.

**Goal:** The core runtime systems the OS needs to think — vault watching, dispatch pipeline, knowledge graph, project onboarding, persona evolution, messaging gateway. Everything downstream depends on this phase being solid.

### Session 8.1 — Vault Watcher + State Engine + Skills Crystallization

**Protocol enforcement points #6 and #7:**
- **#6 Context window hard stop:** useContextUsage (Phase 3) enforces 70% as a hard gate — state engine emits warning event, blocks new batch start, forces handoff write. The agent cannot ignore context limits.
- **#7 Handoff integrity check:** State engine verifies BOOT.md was updated AFTER the last git push. If BOOT.md timestamp precedes the last push, the batch is flagged as incomplete. Catches sequencing errors that cause state drift.

- Rust `notify` crate for filesystem watching
  - Watch BOOT.md, BUILD-LEARNINGS.md, agent files, INTROSPECTION.md files
  - Parse BOOT.md YAML frontmatter → emit state updates
  - **(AiDesigner: phase detection via filesystem state — watcher verifies BOOT.md phase claims against expected artifacts. If BOOT.md says "Phase 7" but Phase 7 artifact directories don't exist, flag integrity error.)**
- Build state aggregator (combines vault state + SQLite metrics)
- Session management (create, resume, archive)
- **Auto-memory extraction (Mem0-inspired):**
  - After every BOOT.md write, auto-scan session for:
    - Tool surprises or workarounds → BUILD-LEARNINGS.md
    - Persona failure patterns → flag for introspection
    - Implicit architecture decisions → document in ADL
    - Reusable patterns → BUILD-LEARNINGS.md
  - Failure mode evaluation: persona-inherent (propagate globally) vs. project-specific (stay local)

- **Mana Economy (from Excalibur + Meta-Harness Pareto research)**
  - Every dispatch run has a mana budget. Mana governs how much expansion (tool calls, emanations, depth reads) the run can perform.
  - `src-tauri/src/mana/` — Rust module:
    - `economy.rs` — `ManaEconomy` struct: load grimoire, price lookups, budget allocation
    - `tracker.rs` — per-run mana tracking: starting budget, current balance, spend log
    - `grimoire.rs` — parse `GRIMOIRE.md` (repo root) for cost definitions
  - **Grimoire format** (`GRIMOIRE.md`): single file defining all mana costs (file read=0, artifact write=0, depth read=1, web search=2, doc gen=2, retrieval engine=3, emanation=10-20, image gen=3) and run budgets (interactive=120, heartbeat=60, dreamtime=40, scrying=40, automated=60). **(AiDesigner: profile-based environment separation — grimoire supports dev/staging/prod profiles with inheritance. Production profile restricts Destructive capabilities entirely. Profile auto-detected via env vars or git branch.)** **(Agent Browser: hierarchical config merge — 4-tier cascade (per-dispatch > per-persona > project grimoire > system defaults) with additive extension arrays for capability accumulation.)**
  - **Mana gradient shapes behavior:** Free (local reads, artifact writes) → Low (depth reads) → Medium (external, generation) → High (emanations, deep retrieval queries). Agents self-optimize toward cheap paths.
  - **Pareto frontier tracking (from Meta-Harness + Lighthouse scoring):**
    - `pareto.rs` — track mana spent vs finding quality per persona per surface type
    - Empirical frontier: "At 40 mana, Pierce's gate pass rate is 78%. At 80 mana: 94%. At 120 mana: 96%."
    - Grimoire exposes operator-selectable operating point: velocity mode (constrained) vs quality mode (full budget)
    - Canvas HUD: mana allocation sparkline with Pareto frontier overlay
    - **Log-normal scoring (from Lighthouse).** Quality metrics scored on log-normal distribution curves rather than linear thresholds. Two control points define each curve: p10 (median, score=0.5) and p25 (poor, score→0). Control points derived empirically from the project's own history — `finding_density` p10 from project median, p25 from worst quartile. Log-normal weights improvements at the poor end more heavily — going from 8 findings/batch to 4 produces more score improvement than 2 to 1. Control points recalculated by dreamtime as history accumulates. (Lighthouse: log-normal scoring with percentile control points)
  - **Provider Factory Registry (from Goose + Agent Browser engine abstraction — 5th validation).** Dual registration for AI providers: each provider registers both its capabilities (model list, rate limits, pricing) and a factory function for creating client instances. `ProviderRegistry` maps provider slug → `ProviderFactory`. At dispatch time, the mana economy selects the provider based on the agent's `model_class` metadata and current rate-limit state. Hot-swap via `SharedProvider` double-Arc — provider can be swapped mid-session without dropping active dispatches. (Goose: provider factory registry + SharedProvider double-Arc)
  - **Recipe System (from Goose).** Recipes are reusable dispatch templates defined in YAML with typed parameters and persona scoping. Example: a "gate-review" recipe specifies which personas to dispatch, in what order, with what capability grants, at what mana budget — all configurable per project. Recipes compose with skills: a recipe references skills by slug, skills provide the procedural knowledge. Recipes live in `vault/recipes/` alongside rituals. (Goose: recipe system with YAML + typed params + scoping)
  - **Network Allow-List + Header Injection (from just-bash).** External API calls from agent dispatches are gated by a URL allow-list. Each persona's capability grants include a list of allowed domains. Calls to unlisted domains are blocked and logged. For allowed domains, the dispatch pipeline auto-injects required headers (auth tokens, API keys) from the credential store — agents never see raw credentials in their context. (just-bash: network allow-list + header injection for API security)
  - Tauri commands: `get_mana_balance`, `get_grimoire`, `update_grimoire_entry`, `get_pareto_frontier`

- **Context Graph: Decision Trace Store (v2 addition)**
  - Every meaningful action produces a structured decision trace: `observation → reasoning → action → outcome`. This is the atomic unit of organizational judgment.
  - `src-tauri/src/context_graph/` — Rust module:
    - `store.rs` — append-only JSONL + SQLite FTS5 index. Trace schema: id (ULID), source (domain adapter), type, timestamp, observation (what/where/evidence), reasoning (why/references/confidence), action (what/who/artifacts), outcome (result/validated/learned), graph edges (caused_by/leads_to/related_to), tags, signals_emitted.
    - `query.rs` — query by time range, source, type, tags. Edge traversal: given a trace, walk the causal chain recursively. Full-text search on observation + reasoning.
    - `backfill.rs` — parse BOOT.md handoffs into DecisionTrace objects. Run once during `/link` to seed graph from project history.
  - Domain-agnostic schema. Development traces ("3 P-CRITs in auth surface") and future business traces ("deal velocity dropped 30%") use the same structure.
  - SQLite migration: `traces` table + FTS5 virtual table + triggers.
  - Tauri commands: `file_trace`, `query_traces`, `get_trace`, `walk_causal_chain`.

- **Echo Ledger (from Meta-Harness + Excalibur daily thread)**
  - Raw execution traces — echoes — are the highest-fidelity record of what happened. Meta-Harness proved echoes beat LLM-generated summaries by +15.1 accuracy points.
  - `src-tauri/src/echoes/` — Rust module:
    - `ledger.rs` — append-only daily JSONL. Path: `vault/echoes/<YYYY-MM-DD>.jsonl`
    - Each line is a structured echo: `{ timestamp, type, source, data }`
    - Types: `dispatch`, `finding`, `tool_call`, `checkpoint`, `gate_result`, `operator_query`, `ritual_event`
    - Never summarized-then-discarded. Retained for full history queries.
    - `query.rs` — grep-style access: filter by type, source, date range, keyword. Supports the Meta-Harness filesystem-access pattern — agents query echoes selectively, not monolithically.
  - **Relationship to decision traces:** Decision traces (above) are *structured summaries* of meaningful actions. Echoes are *raw event streams*. The dreamtime ritual reads echoes and *alchemizes* them into decision traces, vault articles, and sigils. Both are retained.
  - **ATIF Trajectory Serialization (from AutoAgent).** Echo entries follow the ATIF (Action-Thought-Input-Feedback) trajectory format for structured serialization: each echo captures the agent's action (what tool was called), thought (reasoning that led to the call), input (arguments passed), and feedback (result received). This structured format enables downstream pattern mining — the dreamtime ritual can identify recurring action sequences, the reasoning engine can compare trajectories across batches, and the persona evolution engine can detect reasoning drift. (AutoAgent: ATIF trajectory format for echo serialization)
  - **Page Reconstruction from Chunks (from ChromaFs).** When echo ledger entries or vault articles are stored as indexed chunks (for FTS5 search), reconstruction on read assembles the full document from its chunks. First assembly is cached — subsequent reads return the cached version until the source chunks change. This supports the two-stage query pattern: coarse search over chunk indexes (fast, SQLite FTS5), then fine-grained search over reconstructed full documents (accurate, in-memory grep). (ChromaFs: page reconstruction from chunks for echo/vault assembly)
  - **(Agent Browser: content boundary markers with cryptographic nonces for prompt injection prevention when agents read external content. AI-friendly error translation — translate Tauri/Rust errors into actionable guidance personas can reason about: "connection refused" → "Check if the dev server is running", "timeout" → "Page may still be loading".)**
  - Tauri commands: `append_echo`, `query_echoes`, `get_echo_stats`

- **Vault Sigils — Auto-Maintained Indexes (from Karpathy)**
  - Sigils are compact index files — one-line entries with tags and file references. They serve as the cheap navigation layer that eliminates RAG dependency for structured queries.
  - Generated by the dreamtime ritual. Never manually edited.
  - **(ByteRover: persistent context tree validates sigils + KAIROS. 96.1% retrieval accuracy on LoCoMo benchmark provides target for our three-tier access.)**
  - **Sigil files:** `vault/sigils/BUILD-LEARNINGS-INDEX.md`, `vault/sigils/SKILLS-INDEX.md`, `vault/sigils/ADL-INDEX.md`, `vault/sigils/FINDINGS-INDEX.md`, `vault/sigils/ECHOES-INDEX.md`
  - **Three-tier knowledge access (mana-aware):**
    - Sigils: 0 mana — index scan ("what do we know about auth?")
    - Articles: 1 mana — full article read ("what does ADL-017 say?")
    - Ley lines (retrieval engine): 3 mana — cross-article query ("what connects auth to payments?")
  - **Three-tier context assembly model (from oh-my-codex, validates KAIROS + enriches dispatch prompts):**
    - **PRIORITY tier** (replaced per dispatch): kernel + current goal + dispatch grants + capability metadata. Fresh every time — no stale context.
    - **WORKING tier** (append-only, prunable by dreamtime): echoes + recent findings + active traces + in-flight dispatch state. Grows during session, pruned nightly.
    - **MANUAL tier** (permanent reference): vault articles + ADL + grimoire + skills. Only changes via explicit operator or ritual action.
    - Context assembly for each dispatch selects from all three tiers based on the agent's declared `required_artifacts`. The PRIORITY tier is always included. WORKING and MANUAL are filtered by relevance. (oh-my-codex: three-section notepad model — priority/working/manual)
  - Tauri commands: `get_sigil`, `list_sigils`, `regenerate_sigils`

- **Ritual System (from Excalibur + Karpathy + background-agents lifecycle + ByteRover/Agent Browser daemon validation)**
  - Rituals are scheduled automated jobs with purpose, mana budgets, and governance. **(ByteRover CLI + Agent Browser: both use persistent daemon architecture for background state — validates our ritual engine's daemon-like model. Idle timeout, crash detection via process monitoring, and session multiplexing patterns apply.)**
  - `src-tauri/src/rituals/` — Rust module:
    - `engine.rs` — ritual scheduler. Reads ritual specs from `vault/rituals/`. Manages cron triggers, mana allocation, timeout enforcement. **All scheduling logic implemented as pure decision functions (from background-agents):** `should_fire_ritual(last_run, cron_expr, now)`, `should_pause_ritual(consecutive_failures, threshold)`, `evaluate_circuit_breaker(recent_failures, window, max)`, `evaluate_mana_budget(remaining, required)`. No side effects in decision layer — engine calls decisions, then acts. Fully unit-testable.
    - `spec.rs` — ritual spec parser (markdown with YAML frontmatter)
    - `guard.rs` — ritual governance: read-only enforcement (rituals cannot modify their own spec), mana cap enforcement, timeout kill. **Circuit breaker (from background-agents + Agent Browser transient error classification):** 3 consecutive failures within window → circuit opens → ritual auto-pauses with logged reason. Window-based reset — failures older than the window don't count. **Auto-pause threshold:** configurable (default: 3). Successful run resets counter. Manual re-enable resets counter and recalculates next run time. **(Agent Browser: errors classified as transient vs permanent. Transient (connection refused, broken pipe, EAGAIN, EOF, reset) → retry with 200ms exponential backoff, 5 attempts. Permanent → fail immediately. Platform-specific error codes: macOS 35/54/61, Linux 11/104/111, Windows 10061/10054. Only transient failures increment the circuit breaker counter.)**
    - `warming.rs` — **proactive context warming (from background-agents).** Pre-assembles ritual context before scheduled fire time: 5 minutes before dreamtime → load vault state, sigil indexes, recent echoes. 5 minutes before heartbeat → load BOOT.md state, recent dispatches. Reduces cold-start latency from "load everything" to "context already assembled."
  - **Three built-in rituals:**
    - `vault/rituals/heartbeat.md` — hourly (`0 * * * *`), 60 starting mana, 120 cap, 45min timeout, `[ReadOnly, WriteVault]`. Purpose: incremental frontier advances, checkpoint progress, surface urgent findings. **First action: recovery sweep (from background-agents)** — detect dispatches stuck in "running" > timeout → mark failed and file echo, detect rituals stuck in "executing" > timeout → force cancel and increment failure counter, detect stale sigil indexes > 24 hours → flag for dreamtime. The heartbeat IS the recovery mechanism.
    - `vault/rituals/dreamtime.md` — 2am daily (`0 2 * * *`), 40 starting mana, 80 cap, 90min timeout, `[ReadOnly, WriteVault]`. Purpose: full alchemy pass — read day's echoes, compile vault articles, regenerate sigils, generate ley lines, trigger persona evolution, prune stale knowledge.
    - `vault/rituals/scrying.md` — 3am Monday (`0 3 * * 1`), 40 starting mana, 80 cap, 60min timeout, `[ReadOnly, WriteVault, External]`. Purpose: vault integrity — find contradictions, stale skills, unvalidated ADL decisions, knowledge gaps. Impute via web search where appropriate.
  - **Ritual governance:** all disabled by default (operator enables explicitly), read-only during execution, mana-bounded, timeout-guarded, capability-scoped
  - Tauri commands: `list_rituals`, `enable_ritual`, `disable_ritual`, `get_ritual_status`, `get_ritual_history`

- **Context Graph: Signal Store + Collector (v2 addition)**
  - Signals are numeric time-series extracted from decision traces. Domain-agnostic: just a metric name, value, timestamp, and scope.
  - `src-tauri/src/signals/` — Rust module:
    - `store.rs` — SQLite table: `signals(id, source, metric, value, timestamp, scope, trace_id, tags)`. Time-indexed. Retention: raw 90 days, daily aggregates kept indefinitely.
    - `aggregator.rs` — running windows per metric (last 10/30/90 values). Daily aggregation (min/max/avg/p50/p90). Used by TimesFM client and dashboard charts.
    - `collector.rs` — subscribes to trace-filed events. For each trace, extracts signals based on the active domain adapter's signal definitions. Development adapter: batch-completion → `finding_count`, `finding_density`, `files_changed`, `batch_duration_ms`, `token_usage`, `gate_pass`, `risk_delta`.
  - SQLite migration: `signals` table + `signal_daily_agg` table.
  - Tauri commands: `get_signal_window`, `get_signal_daily`, `list_signal_metrics`.

- **Domain Adapter Architecture (v2 addition)**
  - The development pipeline is the first domain adapter. The core doesn't know about "batches" — it knows about events, signals, traces, and forecasts. Domain adapters translate.
  - `src-tauri/src/adapters/` — Rust module:
    - `adapter.rs` — `DomainAdapter` trait: event types, signal definitions, trace types, agent mapping, forecast thresholds.
    - `development.rs` — built-in adapter. Events: `action.completed`, `gate.blocked`, `timer.fired`. Signals: 11 build metrics. Traces: `batch-completion`, `gate-review`, `finding-resolution`, `architecture-decision`, `build-learning`.
  - Future adapters (operations, support, sales) implement the same trait. Same event bus, same signal store, same forecast engine.
  - **Why domain-agnostic:** TimesFM isn't sized for build metrics — it's sized for running companies at scale. Revenue forecasting, churn prediction, support volume projection, sales pipeline velocity. Build metrics are the training wheels. The sidecar stays the same. The signals multiply.

- **Self-Improving Skills System (from Hermes pattern + ByteRover Hub & Connectors validation)**
  - **(ByteRover: Hub & Connectors extensible skill bundles validates our skills marketplace. Their connector abstraction maps to our MCP integration tiers. Dynamic install/enable/compose pattern.)**
  - Skills are markdown files in `skills/` with YAML frontmatter:
    ```yaml
    ---
    name: supabase-rpc-pattern
    description: How to create and verify a Supabase RPC
    created_by: nyx
    requires_tools: [supabase]
    platforms: [build]
    version: 3
    last_improved: 2026-04-15
    ---
    ```
  - **Auto-crystallization:** After a build batch completes, if the session involved 5+ tool calls with a novel pattern (not already in skills/), the auto-extract step creates a new skill file. Example: after building the first settings page, crystallize the settings-page-pattern skill.
  - **Self-improvement loop:** When an agent follows a skill and discovers it's incomplete or wrong, it patches the skill immediately via a `skill_manage(action='patch')` tool call. Version increments, `last_improved` updates.
  - **Skill injection:** During prompt assembly, the context engine scans the skills index for relevant skills (matched by `requires_tools` and current project context) and injects them as context. Agents see the skills index before every reply.
  - **Conditional activation:** Skills with `requires_tools: [supabase]` only activate when Supabase MCP is connected. Skills with `platforms: [frontend]` only activate during frontend batches.
  - **Cross-project persistence:** Skills live in the OS directory (not per-project), so patterns learned in DMS carry to the next project.
  - **Atomic skill decomposition (from Block Skills Marketplace pattern):** When auto-crystallization produces a skill exceeding 8 steps, the system proposes splitting it into atomic sub-skills with a composition record linking them. The split proposal files through `.forge/proposals/` (ADL-005 feedback loop, Phase 7.3) as type `Skill`. Operator approves the decomposition or keeps the monolithic skill. Atomic sub-skills are independently versionable and composable — `rpc-discovery` + `rpc-creation` + `rpc-verification` + `rpc-rls-check` instead of one `supabase-rpc-pattern`. Target: hundreds of fine-grained skills, not dozens of large ones.
  - **Skills Browser panel** (registered in Phase 8 panel types): marketplace-style browsable view of all available skills. Filterable by domain, `requires_tools`, `platforms`. Shows usage frequency (how often injected), last-improved date, version history. Agents can browse before builds, not just receive via injection. Search via FTS5 on skill name + description + body.
  - **Enhancements from Meta-Harness + Excalibur + just-bash + AutoAgent + Goose research:**
    - **Algorithmic skills, not prompt skills.** Skills describe procedures (retrieve → compare → classify → verify), not personality prompts ("you are an expert at..."). Algorithmic skills generalize across projects. Prompt-based skills overfit. (Meta-Harness: code-space regularization)
    - **Generalization testing.** When auto-crystallization produces a new skill, verify it works on a different surface/batch before setting `version: 1`. A skill crystallized from a payment RPC batch must also work on an auth RPC batch. (Meta-Harness: held-out model testing)
    - **Mana cost per skill injection.** Skills injected into agent context consume mana proportional to their token size. The grimoire prices skill injection. Large skills cost more to load — incentivizes atomic decomposition. (Excalibur: charge economy)
    - **Execution limits per persona.** Hard caps on tool calls, file reads, and output size per dispatch — configurable profiles per persona role. Scout gets tight limits (fast recon). Nyx gets wide limits (full build). Gate personas get read-heavy profiles. (just-bash: 18 configurable execution limits)
    - **Thinking budget control.** Explicit reasoning token allocation per persona via grimoire. High-reasoning personas (Pierce, Kehinde, Nyx) get larger thinking budgets. Fast-lane personas (Scout, Sable) get minimal thinking allocation. (AutoAgent: thinking token budget parameter)
    - **Fast model fallback.** When mana is low or the task is lightweight, auto-route to a cheaper/faster model instead of failing. SharedProvider double-Arc enables hot-swapping without dispatch restart. (Goose: fast model fallback + SharedProvider hot-swap)
  - **Research enrichments (2026-04-04):**
    - **`supports_native_compaction()`** on ContextEngine trait — when a provider's model supports built-in context compaction (e.g., Codex), the auto-compact engine defers to the model rather than running its own LLM summarization. Saves mana and produces better compaction. (From Codex research — model-trained compaction beats scaffolding)
    - **Query-to-vault promotion (from Karpathy LLM Wiki pattern):** When the reasoning engine (Phase 9.3) produces a high-quality recommendation synthesis, the dreamtime ritual evaluates whether to promote it to a permanent vault article. Criteria: recommendation was approved AND outcome was validated → auto-promote with full citation chain. `promote_to_vault(recommendation_id)` Tauri command. The vault grows from its own intelligence.
    - **Provider factory with hot-swap** validated by 2 additional sources: Zed (15 separate provider crates) and T3 Code (adapter registry + provider service). Our ModelProvider trait + ProviderRegistry approach independently confirmed by 4 products.

### Session 8.2 — Agent Dispatch Pipeline + Goal Ancestry + Injection Scanning

**Protocol enforcement points #1, #3, #4, #5:**
- **#1 Gate dispatch as pipeline stage:** The orchestration engine enforces Scout → Build → Triad → Sentinel as mandatory stages. The pipeline will not advance past Build until Triad agents have been dispatched and all findings in SQLite are resolved. This is the central enforcement mechanism — the system physically cannot skip gates.
- **#3 Batch decomposition validation:** Before a phase begins, the pipeline validates that every batch in the manifest has gate assignments. No assignments = phase won't start. Prevents batches shipping without gate coverage.
- **#4 Diff-aware gate routing:** The pipeline knows what files changed per batch. Rust files → auto-assign Kehinde. TSX/CSS → auto-assign Mara + Riven. SQL/migrations → auto-assign Tanaka. Auth code → auto-assign Tanaka. Gate map partially automated from file diffs. **(AiDesigner: dual-lane routing — simple batches (1-2 files, single domain) get lightweight single-persona review. Complex batches (multi-domain, 5+ files) auto-escalate to full triad. Complexity threshold configurable in grimoire.)**
- **#5 Read-back verification in audit trail:** The dispatch audit trail verifies that for every file written during a batch, a corresponding read-back occurred. If not, the batch is flagged incomplete before gates can run.

- Orchestration engine in Rust:
  - Sequential: Scout → Build → Gate → Sentinel
  - Parallel: 3 Triad agents simultaneously (3 concurrent provider streams)
  - Each agent's `model:` frontmatter determines capability tier → routed to configured provider's best model
  - Mixed-provider dispatch: Nyx on Claude Opus, sub-agents on GPT-4, Sentinel on fast local model
  - Gate enforcement: parse findings, determine pass/fail
  - **Handoff Schema (from Factory-AI).** Workers produce structured completion packets: `Handoff { salientSummary, whatWasImplemented, whatWasLeftUndone, verification{commandsRun[], interactiveChecks[]}, tests{added[], updated[], coverage}, discoveredIssues[], skillFeedback? }`. Stored as structured JSON in SQLite. Parsed at the receiving end by the orchestrator or next worker in chain.
  - **ProgressLogEntry (from Factory-AI, 11-type append-only audit log).** Every dispatch action appends to an immutable audit log: MissionAccepted, MissionPaused, MissionResumed, MissionRunStarted, WorkerStarted, WorkerSelectedFeature, WorkerCompleted, WorkerFailed, WorkerPaused, HandoffItemsDismissed, MilestoneValidationTriggered. Each entry timestamped. Source of truth for what happened and when. `WorkerCompleted` includes `returnToOrchestrator: bool` — when `false`, the next worker chains directly without an orchestrator turn (chaining optimization). When `true`, the orchestrator reviews the handoff before dispatching next.
  - **JSONL-over-stdio transport (from Factory-AI).** Agent subprocesses communicate via newline-delimited JSON on stdin/stdout with JSON-RPC 2.0 envelopes. Write serialization via `tokio::sync::Mutex` on `BufWriter<ChildStdin>` prevents byte interleaving. Sticky error propagation: once `AgentError` is set, all subsequent writes fail immediately — no silent message loss after process death. Injectable transport trait enables test mocks and custom IPC.
  - **Bidirectional JSON-RPC (from Factory-AI).** Server-to-client requests for permission and user input. When an agent needs confirmation, it sends a `request_permission` message with a correlation ID. The Rust backend dispatches to the `ConfirmationRouter` (Phase 7.2), awaits the oneshot response, then writes the response envelope back to the agent's stdin. Non-blocking to the pipeline.
  - **(Agent Browser: AX tree snapshot as observation model — Mara evaluates structured accessibility tree with deterministic element refs (@e1, @e2) instead of raw outerHTML. Compact mode strips non-interactive lines for token efficiency. RoleNameTracker deduplicates identical elements. Multi-tier resolution: cached ID → role/name re-query → CSS fallback.)**
  - **Audit Base Class (from Lighthouse).** Each persona's gate check implements a standardized audit contract: `meta` (check ID, description, severity tier, `required_artifacts` list), `audit(artifacts) -> GateResult` (structured output with findings array, pass/fail, confidence). The `required_artifacts` declaration constrains context assembly — the dispatch pipeline only injects what the audit declared, not everything. Enables pre-flight validation: are the required artifacts available before dispatching the persona? Standardized output enables automated aggregation, conflict detection (→ Arbiter CONSORTIUM), and historical comparison. (Lighthouse: audit base class pattern with meta + requiredArtifacts + audit method)
  - Auto-fix loop: findings → Nyx fix → re-verify
  - **Confound Isolation (from Meta-Harness qualitative analysis)**
    - When gate findings require fixes, each fix is isolated: one finding → one fix → one verification
    - Fixes are applied and verified independently before proceeding to the next
    - If multiple fixes are applied and a regression occurs, the confound is identifiable
    - Additive modifications (new code) preferred over subtractive (rewriting existing code)
    - This extends Rule 25 (micro-batches) to the fix level
    - Meta-Harness empirical evidence: bundled changes created confounds that required 6 iterations to untangle. Isolated changes produced wins on the first attempt.
- **Pipeline Stage Interface (from oh-my-codex).** The dispatch pipeline is a sequence of typed stages, each implementing a `PipelineStage` trait: `fn name()`, `async fn run(ctx) -> Result<StageResult>`, `fn can_skip(ctx) -> bool`. Stages: Scout → Build → ConsequenceClimb → Gate → Regression → Close. Each stage persists artifacts (findings, echoes, traces) to SQLite. On session restart, resume from last completed stage. `can_skip` enables experienced builders to skip Scout when context is already loaded. Artifacts pass forward via `StageContext`. (oh-my-codex: PipelineStage with checkpoint/resume)
- **Formal State Machine (from oh-my-codex).** Typed `BuildPhase` enum with enforced transitions: `PreBuild → Build → ConsequenceClimb → Gate → Regression → Close → Complete/Failed/Cancelled`. The Gate → Fix → Re-verify loop (max N attempts, configurable) maps to the `team-fix` pattern. Terminal phases enforce `session.active = false` + BOOT.md handoff. (oh-my-codex: formal state machine with fix loop)
- **Phase-Based Agent Composition (from oh-my-codex).** `get_phase_agents(phase)` returns recommended personas per build phase: Phase 0 → Scout + Kehinde, Phase 1 → Nyx, Phase 3 → Pierce + Mara + Kehinde + domain-specific, Phase 4 → Sentinel + Meridian, Phase 5 → Nyx. Same file change triggers different personas depending on whether we're in Build vs Gate vs Regression phase. (oh-my-codex: getPhaseAgents)
- **Worker Allocation Scoring (from oh-my-codex).** When orchestrators assign sub-tasks, score personas across three dimensions: role match (domain alignment), scope overlap (prior findings in this surface area → familiarity), load (remaining mana budget → availability). Highest composite score wins. Prevents over-dispatching to one persona while others idle. (oh-my-codex: three-dimension scoring)
- **Dispatch Lifecycle Hooks (from OpenCLI + ByteRover plugin architecture).** Extension points: `on_before_dispatch` (inject goal ancestry, check capabilities, validate mana budget), `on_after_dispatch` (file echo, update traces, check for triggered chains). Hooks registered by intelligence modules — Sentinel registers `on_after_dispatch` for regression checks, Beacon registers for signal extraction. **(ByteRover: critical design — before-hooks run SEQUENTIALLY (each can modify args for the next, any can block with `proceed: false`). After-hooks run in PARALLEL (fire-and-forget, errors silenced). Before: capability gate → injection scan → context injection (blocking chain). After: echo logging → state update → notification (non-blocking fan-out).)** Failing before-hook blocks dispatch. Failing after-hook logged but doesn't block. (OpenCLI: lifecycle hooks before/after/startup)
- **Typed Event Condition Registry (from background-agents).** Formal condition evaluation layer on event subscriptions. Sentinel subscribes to `action.completed` with condition `{ path_glob: "src-tauri/**/*.rs" }` → only triggers on Rust file changes. Beacon subscribes to `signal.threshold` with condition `{ metric: "finding_density", operator: "gt", value: 0.5 }`. Conditions stored as typed JSON in SQLite, evaluated by a registry of condition handlers. (background-agents: typed condition system)
- **Dispatch Queue with Serial Execution (from background-agents).** One dispatch per persona at a time. If a ritual fires while a dispatch is running, it queues. FIFO queue persisted in SQLite for crash recovery. Status lifecycle: `queued → dispatching → running → completed/failed/cancelled`. (background-agents: SessionMessageQueue)
- **Strategy Cascade for Capability Grants (from OpenCLI).** When dispatch context is ambiguous, try `ReadOnly` first. If the agent needs to write, escalate to `ReadOnly + WriteCode`. Never start with `Destructive`. Auto-discovers minimum-privilege execution path. (OpenCLI: strategy cascade minimum privilege)
- **Runtime Overlay Injection (from oh-my-codex + ByteRover session overrides).** Marker-bounded sections in dispatch prompt templates. Base template contains stable sections (kernel, rules, contracts). Per-dispatch context (goal ancestry, findings, capability grants, phase-specific persona recs) injects at marked boundaries. Template stays stable; dispatch-specific content is ephemeral. **(ByteRover: immutable baseline via structuredClone + per-session overrides. Persona kernels are the baseline. Per-dispatch context (grants, mana, ancestry) are session overrides. structuredClone prevents config corruption across concurrent triad dispatches — essential when 3 personas share a kernel.)** Converges with the adapter boundary pattern from AutoAgent. (oh-my-codex: marker-bounded context injection)
- **Large Response Handler (from Goose).** Context overflow guard for agent responses that exceed expected size. Truncation with structured summary preservation — large outputs are chunked and the dispatch pipeline retains the structured portion (findings, decisions) while truncating verbose reasoning. (Goose: large response handler)
- Pipeline state emitted to frontend via Tauri events
- Provider fallback: rate-limit or error → auto-fallback to next provider at same tier (from Hermes/OpenClaw pattern — cooldown tracking per API key profile)
- **Emanation Mana Semantics (from Excalibur)**
  - When the dispatch pipeline spawns sub-agents (emanations), each emanation draws mana from the parent run's budget:
  - Emanation cast cost: 0 (spawning is free)
  - Emanation mana allocation: drawn from parent (default: 20 per emanation)
  - Parent's remaining mana decreases by allocation amount
  - Child's mana budget equals allocation amount
  - `max_emanation_depth: 2` — no recursive chains beyond 2 levels
  - **Example:** Triad dispatch at 120 mana. 3 emanations × 20 mana = 60 allocated to children. Orchestrator retains 60 for integration and fix cycles.
  - Canvas HUD visualization: emanation flows render as mana streams flowing from parent node to child nodes. Stream width proportional to mana allocation.
- Document generation triggers: auto-generate gate report PDF on gate completion
- **Goal Ancestry Injection (from Paperclip pattern)**
  - When dispatching any agent, auto-build and inject the "why" chain:
    - Current task (batch goal + specific surface)
    - Layer goal (e.g., "L4: Build all DMS frontend surfaces")
    - Project goal (from STARTUP.md or PROJECT.json)
    - ADL constraints (filtered by domain relevance)
  - Agents always know WHY they're doing something. Scout's recon is shaped by the goal. Pierce's conformance checks are scoped to the goal's constraints. No agent operates in a vacuum.
  - Constructed automatically by the dispatch pipeline — operator doesn't assemble this manually
- **Intelligence Interaction Chains (v2 addition)**
  - The 10 intelligences are nodes in a network, connected through registries (shared state), event bus (reactive triggers), and the context graph (accumulated judgment).
  - Each intelligence has a formal spec: what it READS, WRITES, EMITS, SUBSCRIBES TO, and TRIGGERS. Wired during dispatch pipeline setup.
  - **Event subscriptions wired here:**
    - Sentinel subscribes to `action.completed` (git-push) → auto-dispatched baseline comparison
    - Sentinel subscribes to `gate.completed` → captures verified-green baseline
    - Meridian subscribes to `gate.completed` → cross-surface consistency scan
    - Beacon subscribes to `trace.filed` → signal extraction + anomaly check
    - Beacon subscribes to `signal.threshold` → reasoning engine activation
    - Compass subscribes to `action.completed` (migration) → dependency graph update
  - **Chain orchestration:** cascading triggers (push → Sentinel → regression → Beacon → recommendation) with max depth (5), cycle detection, and chain_id tracing for dashboard visualization.
  - **Five canonical chains:**
    1. Predictive Loop: Kiln measures → Beacon forecasts → reasoning engine → recommendation → operator → outcome → Kiln
    2. Regression Chain: push → Sentinel → anomaly → Beacon → Compass (blast radius) → fix
    3. Consistency Chain: gate → Meridian → drift → Riven/Sable → fix → Meridian updates registry
    4. Learning Chain: Wraith finds vuln → Tanaka absorbs → Scout flags proactively → fewer vulns (validated)
    5. Ground Truth Chain: conflicting findings → Arbiter CONSORTIUM synthesis → operator decides → accuracy tracked
  - Full intelligence interaction model documented in `docs/INTELLIGENCE-INTERACTION-MODEL.md`.

- **Arbiter CONSORTIUM Synthesis (v2 addition, from G0DM0D3)**
  - When the Build Triad or any multi-agent gate produces conflicting severity rulings on the same finding, the findings aggregator detects the conflict and dispatches Arbiter.
  - Arbiter collects all positions + evidence, queries retrieval engine for similar past conflicts, and synthesizes ground truth: "Tanaka says CRIT because X, Mara says LOW because Y — considering both threat models, the ground truth is Z. Confidence: high — 3 prior similar cases resolved this way."
  - The synthesis AND the raw positions are both preserved. Arbiter synthesizes for the operator. Arbiter never overrides a persona.
  - Outcome tracking: was Arbiter's synthesis correct? Filed as a decision trace with `validated` field updated after N batches.
  - **Trade-Off Pattern Index (from Block engineering research — inter-agent negotiation)**
    - When Arbiter resolves a conflict, the resolution files as a typed decision trace with conflict-specific fields:
      - `conflict_type` — taxonomy of recurring trade-off patterns: `security-vs-ux`, `performance-vs-correctness`, `compliance-vs-simplicity`, `security-vs-velocity`, `consistency-vs-pragmatism` (extensible, new types auto-created when Arbiter encounters novel conflicts)
      - `domain` — surface area: auth, frontend, schema, API, financial, etc.
      - `positions` — array of `{ persona, severity, reasoning }` preserving each persona's raw stance
      - `resolution` — direction chosen + reasoning + scope constraints
      - `validated` — updated after N batches (configurable, default: 3) with outcome data
    - New Tauri command: `get_tradeoff_pattern(conflict_type, domain)` → returns all prior resolutions for that conflict type in that domain + win/loss record + empirical confidence score
    - Arbiter's CONSORTIUM prompt auto-includes pattern data when available: "In auth-surface security-vs-ux conflicts, security-favored resolutions held 83% of the time (5/6 validated). UX-favored resolutions held 50% (1/2 validated). Recommend security-favored with UX scoping constraints."
    - Over time, the system develops **empirical trade-off judgment** — not just "what should we do" but "what has worked when we faced this before, and how confident are we"
    - Resolutions also file to `.forge/decisions/` through the Agora (Phase 7.3) with `source: Consortium` — visible in the feed as resolved inter-agent conflicts
    - SQLite: `tradeoff_patterns` view aggregating from `traces` table filtered by `trace_type = 'conflict-resolution'`

- **Injection Scanning on Context Files (from Hermes pattern)**
  - Before loading any context file (AGENTS.md, .cursorrules, SOUL.md, project vault files), scan for:
    - 13+ prompt injection regex patterns (role override, instruction override, ignore-previous)
    - Invisible unicode characters (zero-width spaces, RTL marks)
    - HTML comment injection (`<!-- -->` with embedded instructions)
    - Base64-encoded instruction blocks
    - Secret exfiltration patterns (URLs with data params)
  - Blocked files produce explicit `[BLOCKED: injection detected in {file}]` in prompt instead of silent drop
  - Tanaka sub-agent `tanaka-injection-scan` wraps this as a dispatchable check
  - Runs automatically in Scout's pre-build recon for every loaded segment file
- **Research enrichments (2026-04-04):**
  - **Git worktree isolation for parallel dispatches.** `DispatchRequest` gains `isolation: Option<WorktreeIsolation>`. When Swarm dispatches parallel Triad agents, each gets its own worktree (read-only, destroyed after gate). Build dispatches get persistent worktrees. Worktrees share `.git` history with zero copy cost. (From Codex/Zed/T3 Code convergence — 3/5 researched products independently arrived at worktrees as the multi-agent isolation primitive)
  - **Batch checkpoints.** Pre-batch git tag + `BatchCheckpoint` struct in SQLite. One-command revert via `revert_to_checkpoint(batch_id)`. Checkpoint statuses: ready/missing/error. (From T3 Code)
  - **`DispatchTransport` enum:** `Internal` (existing Rust dispatch) | `ACP` (external agent via ACP, Phase 10.2) | `Terminal` (inject into terminal pane, Phase 10.1). Build the enum and `Internal` transport now. ACP and Terminal transports implemented when those phases land.
  - **Plan mode as explicit `InteractionMode::Plan`.** `/plan` command in CommandRegistry. Maps to existing `Spec` mode with a UI surface — operator explicitly requests read-only analysis before execution. (From Codex/T3 Code — both offer plan mode as first-class user choice)

### Session 8.3 — Retrieval Engine + Knowledge Garden + Vault as Virtual Filesystem
- SQLite-native retrieval via `sqlite-vec` crate (Rust bindings for C extension) + `fastembed` crate (ONNX embedding). No Python dependencies. No external processes.
- Configure with Claude API backend
- `tools/index-vault.py` for batch indexing
- Query routing: hybrid default, local for entity questions, global for cross-cutting
- Index OS's own docs as test → verify queries
- Wire into Scout's pre-build recon (retrieval engine query for batch-relevant entities)
- Wire into GraphViewer (Phase 5.3) — retrieval engine entities with Pretext-measured labels
- Auto-index when `/init` or `/link` creates a new vault
- **Temporal edges (from MiroFish pattern):** relationships in the knowledge graph carry `valid_from` / `valid_until` timestamps. Architecture decisions that get superseded have their edges invalidated rather than deleted. Scout can query "what was true about auth at the time L2 was built" vs "what's true now." Enables historical reasoning.
- **Ley Line Generation (from Karpathy backlink pattern)**
  - During retrieval engine indexing, generate bidirectional ley lines (backlinks) between vault articles:
  - When article A references article B, both articles get ley line entries
  - Ley lines stored in `vault/ley-lines/<article-slug>.json` — array of `{ target, relationship, context }`
  - Vault browser panel (Phase 5.3) renders ley lines as a "Referenced By" section on each article
  - Graph Viewer (Phase 5.3) renders ley lines as edges between vault article nodes
  - Dreamtime regenerates ley lines nightly alongside sigils
- **Virtual Filesystem over Indexed Content (from ChromaFs + just-bash)**
  - The vault exposes itself as a virtual filesystem to agents — familiar navigation (ls/cat/grep) backed by SQLite storage with controlled access at the boundary.
  - **Path tree from sigils (from ChromaFs):** sigil index files ARE the compressed JSON path tree. Zero-cost navigation — agents browse vault structure without loading content.
  - **Per-persona vault tree pruning (from ChromaFs RBAC):** each persona sees a different vault tree based on domain and capabilities. Tanaka sees auth + security surfaces. Mara sees frontend + UX surfaces. Pruned content doesn't exist in their tree, not "permission denied." (ChromaFs: per-user RBAC at FS level)
  - **Composable filesystem mounts (from just-bash MountableFs):** vault components (skills, ADL, echoes, sigils) are independently mountable. A read-only gate dispatch mounts skills + ADL but not echoes. A dreamtime ritual mounts everything. Mount composition defined at dispatch time via capability grants.
  - **Lazy content resolution pointers (from ChromaFs):** large artifacts (PDFs, gate reports, full echo ledgers) stored as lightweight pointer entries in the vault tree. Materialized to full content only on explicit read. Prevents vault browsing from loading multi-MB artifacts into context.

### Session 8.4 — /init + /link Flows + Customer Simulator Generator
- `/init` command: guided project creation wizard
  - **Platform Orientation first** — explains full system: personas, 105 agents, tiered MCPs (4 tiers incl. E2B + Composio), trigger words, commands
  - 5-phase discovery: Discovery → Architecture → Spec Generation (Pierce reviews) → Build Planning → Build Ready
  - **Pretext detection:** when customer-facing surfaces detected, auto-scaffold `layout-engine` package in project repo, add Pretext/CLS evaluation rules to Mara/Riven assignments
  - **Customer Simulator Generator:** Mara auto-generates 3-5 sim-agents from discovered user roles
  - **PDF Project Brief** generated via document engine (dual-output: markdown + PDF)
  - retrieval engine auto-indexes new vault
  - **Mandatory Security Circle (from Excalibur Warden pattern)**
    - "Configure security audit schedule" — operator sets Tanaka and Wraith dispatch frequency
    - Default: Tanaka runs on every gate. Wraith runs on high-risk surfaces (auth, payments, PII).
    - Operator can enable automated Tanaka dispatch as a ritual (weekly security sweep)
    - No project completes `/init` without explicit security audit configuration — the circle must be closed
  - **Ritual Configuration (from Excalibur invocation ceremony)**
    - Present three built-in rituals: heartbeat, dreamtime, scrying
    - Explain purpose and mana cost of each
    - Operator enables/disables each explicitly
    - Disabled rituals can be enabled later via `enable_ritual` command
    - All ship disabled by default — no accidental autonomous behavior
- `/link` command: connect existing repo
  - Agent discovery: Scout, Kehinde, Mara, Tanaka scan in parallel
  - Architecture report (canvas-rendered + PDF export)
  - Stack-specific MCP recommendations
  - Pretext detection + recommendation for applicable repos
  - Customer simulator generation from detected surfaces
  - retrieval engine auto-indexes generated vault
- Both flows render as guided wizards in the Chat panel
- **/init v2 additions:**
  - Domain adapter selection during discovery: "What functions will this system support?" Default: development. Future: operations, support, sales. Each adapter registers its event types, signals, and trace types.
  - Per-domain signal configuration: which metrics to track, what thresholds trigger recommendations
  - Forecast baseline note: "TimesFM needs 32 data points per metric. For a new project, forecasting activates after ~32 batches. Z-score fallback until then."
- **/link v2 additions:**
  - **Backfill engine** runs automatically. `backfill.rs` parses BOOT.md handoffs into decision traces, seeds the signal store with extracted metrics. Not perfectly structured (handoffs are prose), but sufficient to seed the graph.
  - If project has 32+ batches of history, TimesFM calibration runs immediately. First forecasts available within minutes.
  - Dashboard shows data maturity: "Backfilled 57 traces. 47 data points for finding_density (forecasting active). 12 for batch_duration_ms (need 20 more)."
- **Research enrichments (2026-04-04):**
  - **Issue-tracker-as-dispatch awareness.** During /init, detect connected Linear/GitHub MCPs. If present, configure dispatch surface for issue-originated tasks. During /link, scan for existing issues tagged for automation. (From Codex — tasks originate from GitHub Issues, Linear, Jira via @mentions)

**Phase 8 Gate:** Vault infrastructure stable. Skills crystallizing. Projects onboardable via /init and /link. Dispatch pipeline operational with worktree isolation. SQLite-native retrieval engine (sqlite-vec + FTS5 + entity graph) indexing and querying. Knowledge Garden renders. All ritual specs present (disabled by default). Mana economy tracking with composable halt conditions. Batch checkpoints operational. Plan mode available. Condenser pipeline compresses context. Progress ledger assesses dispatch turns. Stuck detector catches 5 loop patterns. Persona evolution engine accumulates experience and detects drift. Messaging gateway sends outbound notifications with inbound approval.

**Depends on:** Phase 1 (Tauri shell, SQLite, provider system), Phase 3 (agent runtime, KAIROS, Swarm), Phase 4 (ContextEngine trait, FTS5), Phase 7 (agent registry, command registry, capability families, Agora)

---

## Phase 9: Observatory + Predictions (5 sessions) — NEW 2026-04-04

> **Source:** `docs/RESEARCH-POETENGINEER-OBSERVATORY-AESTHETICS.md` (30 visual patterns from Kat Zhang / @poetengineer__), `docs/RESEARCH-AGENTIC-DEV-ENVIRONMENTS.md` (graph panel customizability from Obsidian), Karpathy LLM Wiki (vault convergence validation).
> **Aesthetic register:** OBSERVATORY — data glows from void, brightness IS hierarchy, motion IS life. Not nightclub, not corporate dashboard. A place where you watch living systems.

**Goal:** Making intelligence visible. The observatory visual foundation transforms flat panels into living topological surfaces. Predictive intelligence adds the forward-looking dimension. Persona evolution adds the temporal dimension. The graph panel becomes a tunable physics sandbox with 4 topography views.

### Session 9.1 — Observatory Visual Foundation

**The Canvas 2D observatory foundation.** Apply the first 10 patterns from poetengineer__ research across ALL existing canvas panels. No WebGL required — pure Canvas 2D operations that make every panel immediately feel alive.

**Shared rendering infrastructure** (`packages/canvas-components/observatory/`):
- `feedback.ts` — feedback trail system: semi-transparent overlay instead of clearRect. Configurable fade rate (0.02-0.15 alpha). Toggle per panel.
- `noise.ts` — Perlin/simplex noise field generator. Drives idle drift, flow fields, terrain. Wraps `simplex-noise` npm package.
- `spring.ts` — damped spring physics for value transitions. `SpringValue` class: target, current, velocity, stiffness, damping. Auto-updates each frame.
- `flow.ts` — flow field particle system (2-10K particles). Noise-angle velocity, trail persistence, glow sprite stamping. Particle pool for event bursts.
- `glow.ts` — pre-rendered glow sprite system. Canvas-rendered soft circles at various sizes/colors cached to offscreen canvases. Stamp via `drawImage` (10-50x faster than arc+shadowBlur).
- `phaser.ts` — phase-staggered animation. `phaser(progress, elementIndex * delay, edgeWidth)` for cascade effects on data arrival.
- `breathing.ts` — global breathing system. `sin(time * speed)` drives scale, glow, opacity oscillation. Can sync to real metrics (build heartbeat, dispatch rate).
- `palette.ts` — observatory color system. The full palette from poetengineer__ research (void layer, luminous layer, energy layer, atmosphere layer). Glow hierarchy functions: `fullBloom(color)`, `softBloom(color)`, `dimGlow(color)`, `flat(color)`.
- `transitions.ts` — 6-state visibility machine: WILL_APPEAR → APPEARING → VISIBLE → WILL_DISAPPEAR → DISAPPEARING → INVISIBLE. Fractional interpolation during transitions. (From DBraun/MediaPipe state machine)
- `composite.ts` — `globalCompositeOperation = 'lighter'` additive blending wrapper. Toggle per layer.

**Apply to existing panels:**
- Pipeline Canvas (Phase 5.1): + feedback trails on node movement, + flow particles along pipeline direction, + breathing pulse on active nodes, + event particle bursts on dispatch
- Agent Board (Phase 5.2): + spring physics on status changes, + glow hierarchy (active=full bloom, idle=dim), + noise drift on idle cards
- Findings Feed (Phase 5.2): + feedback trail on scroll, + severity-driven particle bursts on P-CRIT arrival, + spring physics on filter changes
- Session Timeline (Phase 5.2): + flow field as background current
- Canvas HUD (Phase 5.1): + aurora background (animated gradient), + global breathing synced to build heartbeat

**Performance budget:** Each panel renders at 60fps with observatory effects enabled. Toggle "Observatory rendering: Full / Canvas only / Minimal" in settings. Profile: <16ms frame time with all effects active on a mid-range GPU.

### Session 9.2 — Graph Panel Overhaul (Obsidian Controls + Graph Tabs)

**The graph panel becomes a tunable physics sandbox with 4 topography views.** Inspired by Obsidian's Graph View customizability + poetengineer__'s data landscape aesthetic.

**Obsidian-style control sidebar** (`src/components/panels/graph/GraphControls.tsx`):
- **Groups panel:**
  - "New group" button → name + color picker + filter rule (by type, persona, domain, tag)
  - Nodes matching filter get group color. Multiple groups. Priority: first match wins.
  - Groups persist to SQLite per graph tab.
  - Default groups auto-created per tab (e.g., Grimoire auto-groups by persona role).
- **Display controls:**
  - Node size slider (0.5x - 3x, default 1x)
  - Link thickness slider (0.5 - 5px, default 1px)
  - Text fade threshold slider (zoom level where labels appear/disappear)
  - Arrows toggle (show/hide edge direction)
  - Labels toggle (show/hide always vs. hover-only)
- **Forces controls:**
  - Center force slider (0 - 1)
  - Repel force slider (0 - 2)
  - Link force slider (0 - 1)
  - Link distance slider (20 - 500px)
  - All sliders update force simulation in real-time as you drag
- **Animate button** — freeze/unfreeze force simulation. Frozen graph still breathes (noise drift from 9.1).
- **Search/filter** — text input highlights matching nodes, fades non-matches. Connected nodes at reduced opacity.
- **Linked mentions** — sidebar showing backlinks for selected node (like Obsidian's right panel). Powered by ley lines (Phase 8.3).

**Graph tabs** (`src/components/panels/graph/GraphTabs.tsx`):

| Tab | Data Source | Default Physics | Node Types |
|-----|-----------|-----------------|------------|
| **Grimoire** | Agent Registry + persona_relationships | Tight clusters (high link force, low repel) | Personas (10), intelligences (10), orchestrators (10), sub-agents (34) — colored by role |
| **Vault** | Vault file tree + sigil indexes | Medium spread | Files, ADL entries, build learnings, skills — colored by domain tag |
| **Ley Lines** | retrieval engine entities + ley-line JSON | Wide spread (high repel, low link) | Vault articles, concepts, entities — colored by type. Temporal edges show valid_from/until |
| **Scrying** | Intelligence interaction model + signal store | Orbital (high center, low repel) | 10 intelligences as orbital nodes. Central Arbiter. Event subscriptions as edges. Chain activations as animated pulse. |

**Shared graph engine** (`packages/canvas-components/graph/`):
- `simulation.ts` — upgraded from existing `graph-layout.ts`. Configurable force parameters exposed as reactive state.
- `renderer.ts` — canvas graph renderer with observatory effects: node glow hierarchy, edge glow with pulse, curl noise idle drift, feedback trails.
- `tabs.ts` — tab data loaders. `loadData(tab) -> { nodes: GraphNode[], edges: GraphEdge[] }` fetches from Tauri backend.
- `groups.ts` — CRUD for groups. Filter application. SQLite persistence per tab.
- `controls.ts` — all slider/toggle state. Persisted per tab.

**New Tauri commands:**
- `get_graph_data(tab: GraphTab) -> GraphData`
- `save_graph_groups(tab, groups)` / `get_graph_groups(tab)`
- `save_graph_settings(tab, settings)` / `get_graph_settings(tab)`

**Observatory rendering (from poetengineer__ patterns):**
- Domain-warped noise background (pattern 24) — subtle alchemical swirl behind the void
- Curl noise idle drift (pattern 17) — frozen nodes still breathe
- Glow hierarchy — high-degree nodes glow brighter (brightness = importance)
- Edge glow with animated data-flow pulse — dispatches/findings travel edges as light pulses
- Event particle emission from active nodes (pattern 14)
- Voronoi territory overlays (pattern 20) on Grimoire tab — persona domains as soft colored regions

### Session 9.3 — Predictive Intelligence Layer

*(Was Session 8.3b — content unchanged, renumbered)*

- **TimesFM Python sidecar** (`sidecar/timesfm/`): FastAPI on port 8787, ~200M params, point forecasts + 10 quantile bands, anomaly detection. Launched by Tauri backend on app start.
- **TimesFM Rust client** (`src-tauri/src/predictive/timesfm_client.rs`): reqwest, retry, cache (5-min TTL), z-score fallback when sidecar down or <32 datapoints.
- **Anomaly detector** (`src-tauri/src/predictive/anomaly.rs`): on every new signal → TimesFM `/anomaly` → emit `signal.threshold` event if anomalous.
- **Reasoning engine** (`src-tauri/src/predictive/reasoning.rs`): triggered by `signal.threshold`. Step 1: query retrieval engine for similar past traces. Step 2: extract reasoning + outcomes. Step 3: compose recommendation. Step 4: file to store + emit `forecast.alert`. Non-Markovian credit assignment — reads full echo history, not just recent window.
- **Recommendation store** (`src-tauri/src/predictive/recommendations.rs`): pending → approved/overridden/dismissed. Outcome tracking after N actions.
- **Incident-driven policy evolution** (`src-tauri/src/predictive/policy_evolution.rs`): pattern detection when finding type repeats N times across M batches → compose policy proposal → file through Agora with `source: Automated`.
- **Scrying ritual extension:** vault integrity scan (contradictions, stale skills, unvalidated ADL, knowledge gaps). Impute via web search. File through Agora.
- **Dashboard surfaces:** RecommendationSurface, SignalCharts, TraceExplorer, ContextHealth — all rendered with observatory effects from 9.1 (spring physics on values, noise terrain for signal charts, glow hierarchy on anomaly markers).
- Tauri commands: `list_recommendations`, `resolve_recommendation`, `get_recommendation_accuracy`, `list_policy_proposals`, `get_pattern_history`, `get_policy_evolution_stats`, `get_signal_window`, `get_signal_daily`, `list_signal_metrics`

### Session 9.4 — Persona Evolution Engine

*(Was Session 8.5 — content unchanged, renumbered)*

- **Layer 1: Experience Accumulation** (per-session, automatic) — what they did, learned, what surprised them, confidence calibration, skill deviations (`SkillFeedback` struct from Factory-AI). Written to `personas/{name}/JOURNAL.md` as timestamped entries. Append-only.
- **Layer 2: Personality Drift** (periodic, triggered) — strictness creep, blind spot formation, expertise deepening, relationship strengthening, domain adaptation. Triggers: layer boundaries, milestone batches (~15-20), project switches, explicit `/introspect`. Meta-agent hill-climbing loop: snapshot → benchmark on held-out surface → compare findings against ground truth → keep or revert. Dreamtime-gated — evolution only runs during dreamtime, not inline.
- **Layer 3: Temporal Relationship Graph** (from MiroFish) — `persona_relationships` SQLite table: persona_a, persona_b, relationship_type (trust/tension/deference/mentorship/rivalry), strength (0.0-1.0), valid_from, valid_until, project_id. Queryable history. Relationships feed back into dispatch context.
- **Layer 4: Global vs Project-Local** — failure modes and expertise = global (follow persona to all projects). Domain knowledge = project-local. Tool quirks = global. Calibration data = global.
- **Dreamtime alchemy** integration: read day's echoes → compile articles → regenerate sigils → generate ley lines → trigger persona evolution → prune stale knowledge.
- **Schema co-evolution** (from Karpathy LLM Wiki): kernels aren't just periodically updated — they co-evolve with the domain. The drift detection mechanism IS the co-evolution. Each successful adaptation makes the kernel more domain-adapted.
- **Canvas visualization:** Relationship graph as Scrying tab data (9.2). Growth timeline sparklines with observatory rendering. Drift alerts as amber node pulse.
- Tauri commands: `get_relationship_history(a, b)`, `get_strongest_relationships(persona)`, `get_relationship_state_at(a, b, timestamp)`, `trigger_evolution(persona)`

### Session 9.5 — Observatory WebGL Enhancement (Tier 3 Patterns)

**Upgrade from Canvas 2D to WebGL for panels that need it.** Not all panels — only those where Canvas 2D hits performance limits or where GPU effects are essential.

- `packages/canvas-components/webgl/` — shared WebGL infrastructure:
  - `bloom.ts` — full-screen bloom post-processing (threshold → Gaussian blur → additive composite). The canonical neon glow effect.
  - `heightfield.ts` — GPU heightfield with contour shader. Vertex displacement from data texture. Fragment shader contour lines via `fract(height * N)` + smoothstep edge detection.
  - `particles-gpu.ts` — GPU particle system (50K+) via ping-pong textures. Position texture → physics shader → render shader. Same architecture as TouchDesigner particlesGPU.
  - `domain-warp.ts` — domain-warped noise background shader. `noise(p + noise(p))` — the alchemical swirl. Single most impactful shader for the Forge aesthetic.
  - `sdf.ts` — SDF rendering for resolution-independent glow shapes. Smooth union for metaball merging. `sdf-2d` npm package or custom fragment shader.

- **Apply to panels that benefit:**
  - Intelligence Network (Scrying tab): GPU particles for chain activation (10K+ particles flowing between intelligence nodes)
  - Signal Charts: GPU heightfield for metric-as-terrain (vertex displacement, contour lines at threshold values)
  - Pipeline Canvas: bloom post-processing for full neon glow on dispatch events
  - Graph Viewer: domain-warped noise background on all tabs

- **Performance budget:** WebGL effects are optional. Each panel detects GPU capability via `WebGL2RenderingContext` availability. Fallback to Canvas 2D equivalents (from 9.1) on low-end hardware. Toggle in settings: "Observatory rendering: Full / Canvas only / Minimal."

**New panel types registered in Phase 9:** RecommendationSurface, SignalCharts, TraceExplorer, ContextHealth (4 new)

**Phase 9 Gate:** All panels render with observatory effects at 60fps. Graph panel has 4 working tabs with Obsidian-style controls. TimesFM sidecar operational with anomaly detection. Persona evolution Layer 1 producing journal entries. Predictions surfacing on RecommendationSurface. WebGL effects active on capable hardware with graceful fallback.

**Depends on:** Phase 8 (vault, dispatch, retrieval engine, onboarding), Phase 5 (existing canvas panels to upgrade), Phase 4 (canvas-components infrastructure)

---

## Phase 10: Platform Integration (4 sessions) — NEW 2026-04-04

> **Source:** `docs/RESEARCH-AGENTIC-DEV-ENVIRONMENTS.md` — embedded terminal (from Ghostty/cmux research), ACP host (from Zed research), WASM plugin sandbox (from Zed).

**Goal:** How the OS connects to the world — terminal embedding, external agent protocol, messaging, media generation, self-modification.

### Session 10.1 — Embedded Terminal (ghostty-web)

- `packages/terminal/` — React package wrapping ghostty-web WASM (~400KB, canvas 60fps, xterm.js-compatible API):
  - `terminal-instance.ts` — manages a single ghostty-web WASM instance. Canvas setup, resize events, input forwarding, theme sync.
  - `terminal-panel.tsx` — PanelContainer-registered terminal panel. Multiple instances (one per PTY). Canvas-rendered at 60fps.
  - `terminal-store.ts` — Zustand store: active terminals, focus state, scrollback config, connection status.
  - `terminal-theme.ts` — maps Forge OS observatory palette (void background, luminous text) to ghostty color config.
- `src-tauri/src/terminal/` — Rust PTY management:
  - `pty.rs` — spawn PTY processes via `portable-pty` crate. Read/write via async channels. Resize. Shell detection (bash/zsh/fish/powershell).
  - `session.rs` — terminal session lifecycle: create, attach, detach, destroy. Sessions persist across panel minimize/restore.
  - `bridge.rs` — WebSocket bridge between Rust PTY and React webview. Binary frames for terminal data (high throughput). JSON frames for control messages.
  - `multiplexer.rs` — manage N concurrent PTY sessions. Session ID routing. Max configurable (default: 8).
- **Terminal as echo source:** all terminal output piped to echo ledger as `type: terminal_output` entries. Agent commands become audit trail.
- **Agent-accessible:** dispatch pipeline can route agent commands to visible terminal panes. Operator sees what agents do in real-time.
- **Observatory rendering:** Terminal panel gets observatory palette. Breathing on idle terminal. Glow on active output.
- Tauri commands: `terminal_create(shell, cwd, env) -> SessionId`, `terminal_write(session_id, data)`, `terminal_read(session_id, lines) -> String`, `terminal_resize(session_id, cols, rows)`, `terminal_close(session_id)`, `terminal_list() -> Vec<TerminalSession>`

### Session 10.2 — ACP Host + Agent Following

**Agent Client Protocol (ACP) — the open standard for connecting external agents to editors.** JSON-RPC 2.0 over stdio. Adopted by Zed, JetBrains. Supported by Claude Code, Codex, Gemini CLI, Goose.

- `src-tauri/src/acp/` — Rust ACP host:
  - `host.rs` — spawn external agent as subprocess, communicate via stdin/stdout JSON-RPC pipes. Lifecycle: connect → ready → running → disconnected.
  - `protocol.rs` — ACP message types: `initialize`, `tools/list`, `tools/call`, `agent/progress`, `agent/done`. Streaming via JSON-RPC notifications.
  - `mediator.rs` — all file/terminal access mediated by the host. External agents request actions — mediator checks `CapabilityFamily` grants before executing. ACP agents get the same governance as internal personas.
  - `registry.rs` — discovered ACP agents registered alongside internal personas in Agent Registry (Phase 7.1). ACP agents appear in Team Panel with "external" badge. Glyph: generic agent icon.
  - `following.rs` — agent following mode. When an ACP agent navigates files, the terminal panel (10.1) shows its activity in real-time. File opens → linked preview. Terminal commands → visible execution. (From Zed ACP spec)
- **Dispatch integration:** `DispatchTransport::ACP` implemented (enum from Phase 8.2). The dispatch pipeline can now route work to external agents as easily as internal personas.
- **Supported agents at launch:** Claude Code (via `claude` CLI + ACP adapter), Codex (via `codex` CLI), Goose (native ACP support).
- **Mana integration:** ACP dispatches consume mana from parent run's budget. Token usage tracked via agent's response metadata when available, estimated from response length when not.
- ACP Agent Viewer panel type — shows following mode output.
- Tauri commands: `acp_connect(agent_path, args) -> AgentId`, `acp_disconnect(agent_id)`, `acp_send(agent_id, message)`, `acp_list_agents() -> Vec<AcpAgent>`, `acp_follow(agent_id, enabled)`

### Session 10.3 — Messaging Gateway + Media Generation

*(Consolidated from original Sessions 8.6 + 8.8)*

**Messaging Gateway:**
- `src-tauri/src/notifications/` — `NotificationAdapter` trait: `send()`, `poll_responses()`, `name()`.
- Outbound: gate completion, batch completion, P-CRIT alerts, regression detection, evolution milestones, task completion.
- Selective inbound: approval requests ("Wraith wants destructive red-team. Approve?" → operator replies in Telegram → proceed), quick commands ("status", "pause").
- Adapters: Telegram (grammY), Discord (serenity), Slack (webhook).
- **Issue-tracker inbound dispatch:** Linear issue assigned to Forge OS → creates thread → routes to persona(s) → executes → posts result back to issue. GitHub Issues via @mention. (From Codex pattern)
- Configuration in settings: which events → which channels, severity thresholds.

**Media Generation Pipeline:**
- `src-tauri/src/media/` — `MediaProvider` trait: `name()`, `media_type()`, `capabilities()`, `generate()`, `is_available()`.
- `MediaProviderRegistry` — register providers, select by type + preference, fallback chain.
- Content-addressed cache (BLAKE3 hash of request → result). Persona portraits generated once, cached indefinitely.
- Tier 1: Diagrams (Mermaid + D2, fully local, 0 mana)
- Tier 2: Images (HF Inference + fal.ai + Together free tiers, 3 mana each)
- Tier 3: Audio (Edge TTS + local FM synthesis via rodio+hound, 2/0 mana)
- Tier 4: Video/GIF (FFmpeg compositing, fully local, 1 mana)
- Atelier panel (media gallery). CapabilityFamily::MediaGen.
- Auto-generation triggers: Kehinde → architecture diagrams, Riven → mockups, persona portraits during /init, gate report diagrams, ritual sounds.
- Tauri commands: `generate_image`, `generate_diagram`, `generate_tts`, `generate_ui_sound`, `composite_video`, `list_cached_media`, `get_persona_portrait`

### Session 10.4 — Self-Modification Architecture

- **Config layer** (instant, no rebuild): `dashboard-config.json`, signal chart definitions, intelligence surface visibility, domain adapter toggles. Rust module `src-tauri/src/self_modify/config.rs`: schema-validated reads/writes, change validation, decision trace on every modification.
- **Source layer** (Sentinel-guarded): When config isn't expressive enough, the OS edits its own source. Sentinel captures baseline → OS writes edit → Vite HMR hot-reloads → Sentinel re-verifies → automatic rollback on crash/regression → decision trace filed.
- **Plugin layer — WASM sandboxing via Wasmtime + WIT** (from Zed pattern):
  - Replaces React error-boundary-only approach with true WASM sandbox isolation.
  - Plugin contract defined via WebAssembly Interface Types (WIT). Versioned API (v0.1.0+).
  - Plugins compile to `wasm32-wasip2`. Run in Wasmtime on the Rust side.
  - Failures contained — can reload without restarting. Memory isolation, capability restriction, resource limits.
  - Plugin directory: `runtime/plugins/` (built-in) + `projects/{name}/plugins/` (project-specific).
  - A crashing plugin doesn't take down the app. Disabled + trace filed.
- **Composable pipeline stages** (from cmux philosophy): individual pipeline stages (Scout, Build, Gate, Sentinel) exposed as independently invocable commands via CommandRegistry. Advanced operators can compose custom workflows. The mandatory 6-phase pipeline is the default; composability enables experienced operators to skip/reorder for specific use cases.
- Anti-corruption guarantees: Sentinel guard on source, schema validation on config, WASM sandbox on plugins. Every self-modification produces a decision trace.
- Tauri commands: `update_dashboard_config`, `get_dashboard_config`, `list_plugins`, `enable_plugin`, `disable_plugin`

**New panel types registered in Phase 10:** Terminal (multi-instance), ACP Agent Viewer, Atelier (Media Gallery) (3 new)

**Phase 10 Gate:** Terminal panes rendering at 60fps with ghostty-web. ACP host connecting to Claude Code. Messaging notifications delivering to configured channels. Media generation producing diagrams + portraits. Self-modification config layer functional. Plugin loading via WASM sandbox.

**Depends on:** Phase 8 (dispatch pipeline, capability families, mana economy), Phase 9 (observatory visual foundation for terminal/panel rendering), Phase 6 (dev server sidecar infrastructure)

---

## Phase 11: Integration Test + DMS Reconnection (2-3 sessions) — RENUMBERED FROM PHASE 9

**Goal:** Prove the full system works end-to-end, including all capabilities from Phases 8-10.

### Session 11.1 — Fresh Project Test
- `/init test-project` → verify all panels activate via window manager
- Chat with multiple personas across different providers
- Canvas HUD shows pipeline stages, animated with observatory effects (breathing, flow particles, feedback trails)
- PDF project brief generated
- Retrieval engine indexes vault, Graph Viewer renders entities across all 4 tabs (Grimoire / Vault / Ley Lines / Scrying)
- Graph panel: Obsidian controls functional — adjust forces, create groups, search/filter, freeze/animate
- Connectivity panel shows GitHub
- Agent dispatch → Scout → Build → Triad gate (with worktree isolation for parallel agents)
- Gate report PDF generated
- Customer simulator agents created by Mara
- All 105 agents have `model:` frontmatter
- Tanaka has Trail of Bits enhancements + injection scanning
- Mara has design intelligence + Pretext/CLS evaluation
- Pretext detection scaffolds layout-engine when customer-facing surfaces detected
- **Observatory verification:** feedback trails, spring physics, glow hierarchy, breathing all active on all panels. Toggle to "Minimal" → clean degradation. Toggle back to "Full" → effects restore.
- **Terminal:** open 4 terminal panes → verify 60fps rendering, echo capture, observatory palette
- **ACP:** connect Claude Code via ACP → dispatch read-only task → verify capability mediation blocks writes → agent appears in Team Panel with "external" badge → agent following shows real-time navigation
- **Worktree isolation:** parallel Triad with separate worktrees → findings reference correct paths → worktrees cleaned up after gate
- **TimesFM:** signal charts show forecast overlay with terrain rendering (if 32+ datapoints)
- **Media:** Kehinde diagram generation, persona portraits in Team Panel, TTS narration, pipeline GIF export
- **Agora:** Pierce files proposal → Tanaka evaluates → response in feed → accept → skill auto-generated
- **Smart Review:** changes across Rust + TSX → `/review` auto-dispatches correct personas
- **Plan mode:** `/plan` enters read-only analysis before execution
- **Skills:** ContextEngine trait swap mid-session → no data loss. FTS5 cross-session search → results. Complex task → skill auto-crystallized.

### Session 11.2 — DMS Reconnection
- `/link` the Forge DMS vault
- Verify BOOT.md parsing → Canvas HUD shows L4-J.2c position
- retrieval engine indexes 146 segments + ADL + build learnings (with temporal edges on superseded decisions)
- Scout recon against DMS Supabase (with retrieval engine query + injection scan)
- Build Triad gate (3 parallel sessions across configured providers, worktree-isolated)
- Gate report in Findings Feed AND exported as PDF
- Dev server preview showing DMS app
- Terminal pane showing DMS dev server
- **Observatory effects on DMS data:** finding density drives terrain elevation, persona activity drives particle density
- **Graph Ley Lines tab** renders DMS vault relationships with temporal edges
- **Intelligence chain visualization** in Scrying tab (chain pulse animation)
- **Persona evolution test:** all 10 personas' DMS-era journal entries and relationships loaded. Pierce remembers Nyx from L0-L4. Mara remembers mobile findings from L4-H.
- **Backfill engine:** 57 DMS BOOT.md handoffs → decision traces → signal store seeded
- **TimesFM:** calibrated on real DMS history (47+ data points for finding_density). SignalCharts show actual trends with forecast overlay as terrain.
- **Intelligence chain test:** push code → Sentinel detects regression → Beacon projects impact → Compass maps blast radius → recommendation surfaces → IntelligenceNetwork shows chain pulse
- **Policy evolution:** 3 repeated finding patterns → auto-proposes new check → appears in Agora with `source: Automated` → approve → skill generated
- **CONSORTIUM:** Triad with conflicting findings → Arbiter synthesizes → trade-off pattern filed → empirical data available → resolution in Agora with `source: Consortium`
- **Self-modification:** Modify dashboard-config.json → panels reorder instantly. Source edit → Sentinel guard → HMR → verify → success. Plugin → renders → crash test → boundary catches → disable.
- **Proof:** Forge can resume building the DMS, personas remember their history, skills carry forward, the system predicts where the build is headed.

### Session 11.3 — Observatory Stress Test (NEW)
- Load 1000+ nodes in Graph Viewer, all 4 tabs — verify force simulation performance
- 50K+ GPU particles on Intelligence Network (Scrying tab) — verify WebGL fallback on low-end
- Toggle observatory effects on/off — verify clean degradation across all panels
- Resize all panels to minimum/maximum — verify observatory rendering scales
- Pop-out panel to second monitor — verify observatory state transfers
- Accessibility audit: screen reader functional with observatory effects, keyboard navigation, `prefers-reduced-motion` disables particle systems and breathing
- Terminal: 8 concurrent PTY sessions — verify multiplexer handles load
- ACP: 3 concurrent external agents — verify dispatch routing and mana tracking

**Depends on:** All prior phases complete

---

## Deferred to Post-v1

- Visual regression system (Sentinel baseline capture/comparison) — partially covered by intelligence chains
- Scheduled tasks (periodic agent dispatch — stale findings, build progress, persona evolution)
- n8n integration (workflow automation)
- CLI provider implementation (shells out to arbitrary CLI tools)
- Ollama provider implementation (local model hosting)
- Additional domain adapters beyond development (operations, support, sales) — architecture is ready, adapters built on demand
- Customer simulation scaffolding during /init (sim-{role}.md auto-generation)
- Competitive monitor (Calloway scheduled scans)

---

## Summary

| Phase | Sessions | Deliverable |
|-------|----------|-------------|
| 1. Tauri Shell + Chat | 3 | Running app, multi-engine streaming, chat works (COMPLETE) |
| 2. Content Layer | 5 | 105 agents + 12 reference extractions + 5 skills + model tiering + persona enhancements (COMPLETE, parallel) |
| 3. Agent Runtime | 3 | KAIROS memory + Swarm + dispatch + compact + SQLite state (COMPLETE) |
| 4. Runtime Upgrades + Window Manager + Pretext + Docs | 5 | ContextEngine trait + TTL pruning + iterative compression + FTS5 + floating window manager + dock bar + layout engine + canvas components + PDF generation |
| 5. Canvas HUD | 3 | Living build state + agent board + findings + flow viz + graph (all as independent panel types) |
| 6. Preview + Connectivity | 2 | Embedded dev server + service health (as independent panel types) |
| 7. Team + Presence + Palette + Proposals | 3 | Agent registry + tool gating + command registry + **smart review dispatch** + multi-select + action palette + orchestration UI + **proposal feed (ADL-005)** |
| 7.5. Intelligence Retrofit (pre-Phase 8) | 1 | HaltCondition trait + SecretScrubber + Condenser trait/pipeline + finding dedup/clustering + composite memory scoring + TriggerRegistry |
| 8. Intelligence Foundation | 6 | Vault + dispatch (worktree isolation, batch checkpoints, composable halt, progress ledger, stuck detection, condenser pipeline) + retrieval engine + Knowledge Garden + onboarding + persona evolution + messaging gateway |
| 9. Observatory + Predictions | 5 | Visual foundation (30 patterns) + graph overhaul (4 tabs, Obsidian controls) + TimesFM + persona evolution + WebGL |
| 10. Platform Integration | 4 | Embedded terminal (ghostty-web) + ACP host + messaging/media + self-modification (WASM plugins) |
| 11. Integration Test | 2-3 | Fresh project + DMS reconnection + observatory stress test |
| **Total** | **37-39** | **~32-34 on critical path (Phase 2 parallel)** |

### Panel Type Registry (grows across phases)

| Phase | New Panel Types | Running Total |
|-------|----------------|---------------|
| 1 (done) | Chat, Canvas HUD (placeholder), Team (placeholder), Preview (placeholder) | 4 |
| 4 | Dock Bar (always visible, not a panel) | 4 + dock |
| 5 | Canvas HUD (real), Agent Board, Findings Feed, Session Timeline, Vault Browser, Graph Viewer, **Intelligence Network** | ~11 |
| 6 | Dev Server Preview (multi-instance), Connectivity | ~12 |
| 7 | Team Panel (rebuilt), Action Palette, Dispatch Queue, **Agora** | ~16 |
| 8 | Knowledge Garden, Vault Watcher, Skills Browser | ~19 |
| 9 | **RecommendationSurface, SignalCharts, TraceExplorer, ContextHealth** | ~23 |
| 10 | **Terminal (multi-instance), ACP Agent Viewer, Atelier (Media Gallery)** | ~26 |
| 11+ | Per-agent detail views, document previews, report viewers... | 26+ |

### Repo Mining Integration Map

Patterns adopted from external repo analysis (2026-04-01):

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| ContextEngine trait (pluggable memory) | OpenClaw | **DONE** — Phase 4 Session 4.0 (shipped) |
| Cache-TTL context pruning | OpenClaw | **DONE** — Phase 4 Session 4.0 (shipped) |
| Iterative compression + structured handoff | Hermes Agent | **DONE** — Phase 4 Session 4.0 (shipped) |
| Orphaned tool pair sanitization | Hermes Agent | **DONE** — Phase 4 Session 4.0 (shipped) |
| FTS5 full-text session search | Hermes Agent | **DONE** — Phase 4 Session 4.0 (shipped) |
| Atomic task checkout (DB partial unique index) | Paperclip | **DONE** — Phase 4 Session 4.0 (shipped) |
| Tool availability gating (`check_fn`) | Hermes Agent | Phase 7 Session 7.1 |
| Single command registry (`CommandDef`) | Hermes Agent | Phase 7 Session 7.1 |
| Self-improving skills system | Hermes Agent | Phase 8 Session 8.1 |
| Goal ancestry injection | Paperclip | Phase 8 Session 8.2 |
| Injection scanning on context files | Hermes Agent | Phase 8 Session 8.2 |
| Provider fallback chain with cooldowns | Hermes/OpenClaw | Phase 8 Session 8.2 |
| Temporal relationship edges | MiroFish | Phase 8 Sessions 8.3 + 8.5 |
| Persona evolution engine | Novel (inspired by MiroFish temporal + Hermes skills) | Phase 8 Session 8.5 |
| Messaging notification layer | Hermes/OpenClaw gateway | Phase 8 Session 8.6 |
| Composable halt conditions (HaltCondition trait with &/| combinators) | AutoGen TerminationCondition | Phase 8 Session 8.1 (P8-B) |
| Rolling condenser pipeline (composable context compression) | OpenHands Condenser | Phase 8 Session 8.1 (P8-F) |
| Proactive condensation request tool | OpenHands CondensationRequestTool | Phase 8 Session 8.1 (P8-F) |
| Progress ledger per dispatch turn (structured assessment + stall detection) | AutoGen MagenticOne | Phase 8 Session 8.2 (P8-M) |
| Stuck detection — 5 loop patterns with recovery | OpenHands StuckDetector | Phase 8 Session 8.2 (P8-N) |
| Handoff-as-tool protocol (persona transfers via tool calls) | AutoGen Swarm | Phase 8 Session 8.2 (P8-K) |
| SocietyOfMind nested missions (team-as-agent) | AutoGen SocietyOfMindAgent | Phase 8 Session 8.2 (P8-P emanations) |
| InterventionHandler middleware stack (dispatch interception) | AutoGen InterventionHandler | Phase 8 Session 8.2 (P8-K hooks) |
| Delegation budget partitioning (mana snapshot for child) | OpenHands AgentController | Phase 8 Session 8.2 (P8-P emanations) |
| Error classification for self-correction (LLM-fixable vs controller-handled) | OpenHands exception hierarchy | Phase 8 Session 8.2 (P8-K) |
| Event-sourced state with view projection | OpenHands EventStream + View | Phase 8 Session 8.1 (P8-C echoes) |
| Secret scrubbing on event persistence | OpenHands EventStream._replace_secrets | Phase 8 Session 8.1 (P8-C echoes) |
| Composite memory scoring (semantic + recency + importance) | CrewAI UnifiedMemory | Phase 8 Session 8.3 (P8-R retrieval) |
| Exploration budget loop (confidence-based iterative deepening) | CrewAI RecallFlow | Phase 8 Session 8.3 (P8-R retrieval) |
| Parallel speaker dispatch (fan-out multiple personas per turn) | AutoGen BaseGroupChatManager | Phase 8 Session 8.2 (P8-L composition) |
| Decision trace data model | Novel (from Block letter + context graph research) | Phase 8 Session 8.1 |
| Signal streams + time-series store | Novel (from context graph research) | Phase 8 Session 8.1 |
| Domain adapter architecture | Novel (organizational substrate vision) | Phase 8 Session 8.1 |
| TimesFM forecasting sidecar | google-research/timesfm | Phase 9 Session 9.3 |
| Anomaly detection via quantile bands | google-research/timesfm | Phase 9 Session 9.3 |
| Reasoning engine (retrieval + forecast → recommendation) | Novel (synthesis of context graph + TimesFM) | Phase 9 Session 9.3 |
| Intelligence interaction model (10 specs + 5 chains) | Novel | Phase 8 Session 8.2 |
| Arbiter CONSORTIUM synthesis | elder-plinius/G0DM0D3 | Phase 8 Session 8.2 |
| Wraith Parseltongue (adversarial input perturbation) | elder-plinius/G0DM0D3 + P4RS3LT0NGV3 + L1B3RT4S + ST3GG + GLOSSOPETRAE | **DONE** — agents/wraith.md Section 5 + wraith-kernel.md FM-15 + sub-agents/wraith-parseltongue.md (2026-04-04) |
| Tanaka AI/LLM Security (blue-team defense catalog) | elder-plinius/L1B3RT4S + ST3GG/ALLSIGHT + CL4R1T4S + P4RS3LT0NGV3 + OBLITERATUS | **DONE** — tanaka.md Section 10 (7 defense areas) + tanaka-kernel.md Phase 1b, FM-15/16, AI zero-tolerance (2026-04-04) |
| Kehinde AI Pipeline Architecture | elder-plinius/OBLITERATUS + ST3GG + G0DM0D3 + P4RS3LT0NGV3/Tokenade | **DONE** — kehinde.md Section 9 (failure modes, defense-in-depth, data flow, resource arch) (2026-04-04) |
| Scout AI Attack Surface Pre-Scan | elder-plinius/CL4R1T4S + G0DM0D3 + L1B3RT4S | **DONE** — scout.md Section 6 (AI cross-cutting concern + output format) (2026-04-04) |
| Pierce AI Behavioral Conformance | elder-plinius/CL4R1T4S + AutoRedTeam + L1B3RT4S | **DONE** — pierce.md checks 6-10 (output constraints, permissions, prompt integrity, labeling, input validation) (2026-04-04) |
| Sentinel Security + AI Regression | elder-plinius/ST3GG/ALLSIGHT + P4RS3LT0NGV3/Mutation Lab | **DONE** — sentinel.md checks 5-8 (auth regression, security errors, AI behavioral, input handling) (2026-04-04) |
| Mara AI UX Safety | elder-plinius/G0DM0D3 + OBLITERATUS | **DONE** — mara.md checks 11-15 (transparency, failure UX, hallucination, consent, interaction patterns) (2026-04-04) |
| Sable AI Content Quality (STM-derived) | elder-plinius/G0DM0D3/STM + CL4R1T4S | **DONE** — sable.md checks 9-14 (labeling, hedge detection, filler detection, prompt leakage, fabrication, voice consistency) (2026-04-04) |
| Meridian Security + AI Pattern Consistency | elder-plinius/L1B3RT4S + CL4R1T4S | **DONE** — meridian.md Sections 6-7 (security UI consistency, AI interaction consistency) (2026-04-04) |
| Tanaka Cryptographic Audit (primitives, anti-patterns, library recs) | sobolevn/awesome-cryptography | **DONE** — tanaka.md Section 10g (12 anti-patterns, Rust + JS/TS library tables) (2026-04-04) |
| Wraith Cryptographic Attacks (padding oracle, timing, JWT, PRNG, downgrade) | sobolevn/awesome-cryptography + Cryptopals + CryptoHack | **DONE** — wraith.md Section 6 (10 attack vectors) (2026-04-04) |
| Kehinde Cryptographic Architecture (key mgmt, rotation, cert lifecycle, post-quantum) | sobolevn/awesome-cryptography | **DONE** — kehinde.md Section 10 (9 architectural requirements) (2026-04-04) |
| Vane Financial Cryptography (PCI DSS crypto, audit trail integrity, non-repudiation) | sobolevn/awesome-cryptography | **DONE** — vane.md Section 9 (7 financial crypto checks) (2026-04-04) |
| Pierce Cryptographic Conformance | sobolevn/awesome-cryptography | **DONE** — pierce.md checks 11-14 (primitives, cert validation, CSPRNG, WebCrypto) (2026-04-04) |
| Sentinel Cryptographic Regression | sobolevn/awesome-cryptography | **DONE** — sentinel.md check 9 (crypto downgrade detection) (2026-04-04) |
| Voss Encryption Compliance (GDPR Art 32, crypto deletion, portability) | sobolevn/awesome-cryptography + Databunker | **DONE** — voss.md check 8 (encryption compliance) (2026-04-04) |
| Self-modification architecture (config/source/plugin) | Novel | Phase 10 Session 10.4 |
| Intelligence glyphs + colors | Novel | Phase 5 Session 5.3 |
| Smart Review unified dispatch (`sq agents review`) | Block engineering | Phase 7 Session 7.1 |
| Agora / agent social media (ADL-005) | Block engineering + ADL-005 | Phase 7 Session 7.3 |
| Atomic skill decomposition (Skills Marketplace) | Block engineering | Phase 8 Session 8.1 |
| Inter-agent trade-off pattern index | Block engineering + Novel | Phase 8 Session 8.2 |
| Incident-driven policy evolution | Block engineering | Phase 9 Session 9.3 |
| Extension type registry + tool whitelist | Block Goose | Phase 10 Session 10.4 (deferred from P7-C — plugin system prerequisite) |
| Three-tier capability layering (preset/custom/MCP) | AutoAgent | Phase 7 P7-C patch |
| Lazy-loading command registry | just-bash (Vercel Labs) | Phase 7 P7-C patch |
| Command allow-list per instance | just-bash (Vercel Labs) | Phase 7 P7-C patch |
| Factory-based tool registration (per-persona) | AutoAgent | Phase 7 P7-C patch |
| Built-in extension macro (DuplexStream in-process) | Block Goose | Phase 10 Session 10.4 (deferred from P7-C — streaming transport for plugin system) |
| ToolConfirmationRouter (oneshot channels) | Block Goose | Phase 7 Session 7.2 |
| AST transform plugin pipeline (action audit) | just-bash (Vercel Labs) | Phase 8 Session 8.2 (deferred from 7.2 — dispatch audit infrastructure) |
| Configurable execution limits (per-persona profiles) | just-bash (Vercel Labs) | Phase 8 Sessions 8.1/8.2 |
| SharedProvider double-Arc (hot-swap models) | Block Goose | Phase 8 Session 8.1 |
| Provider factory registry (dual registration) | Block Goose | Phase 8 Session 8.1 |
| Recipe system (YAML + typed params + scoping) | Block Goose | Phase 8 Session 8.1 |
| Thinking budget control (per-persona) | AutoAgent | Phase 8 Sessions 8.1/8.2 |
| ATIF trajectory serialization (echo format) | AutoAgent | Phase 8 Sessions 8.1/8.2 |
| Large response handler (context overflow guard) | Block Goose | Phase 8 Session 8.2 |
| Fast model fallback (mana optimization) | Block Goose | Phase 8 Sessions 8.1/8.2 |
| Virtual FS over indexed content (vault as FS) | ChromaFs (Mintlify) | Phase 8 Session 8.3 |
| Two-stage grep (DB coarse + in-memory fine) | ChromaFs (Mintlify) | Validates Phase 4 Session 4.0 |
| Page reconstruction from chunks (echo assembly) | ChromaFs (Mintlify) | Phase 8 Sessions 8.1/8.2 |
| Per-user RBAC at FS level (persona vault pruning) | ChromaFs (Mintlify) | Phase 8 Session 8.3 |
| Lazy content resolution (large artifact pointers) | ChromaFs (Mintlify) | Phase 8 Session 8.3 |
| Meta-agent hill-climbing (persona evolution loop) | AutoAgent | Phase 9 Session 9.4 |
| Composable filesystem (MountableFs persona mounts) | just-bash (Vercel Labs) | Phase 8 Session 8.3 |
| Network allow-list + header injection (API security) | just-bash (Vercel Labs) | Phase 8 Session 8.1 |
| Declarative capability metadata on agent definitions | oh-my-codex | Phase 7 P7-C patch |
| Underspecification gating (redirect vague to planning) | oh-my-codex | Phase 7 Session 7.2 |
| Phase-based agent composition (per-phase persona recs) | oh-my-codex | Phase 8 Session 8.2 |
| Worker allocation scoring (role + scope + load) | oh-my-codex | Phase 8 Session 8.2 |
| Three-tier memory (priority/working/manual sections) | oh-my-codex | Phase 8 Session 8.1 |
| Pipeline stage interface (run + canSkip + checkpoint) | oh-my-codex | Phase 8 Session 8.2 |
| Formal state machine with fix loop (max N attempts) | oh-my-codex | Phase 8 Session 8.2 |
| Runtime overlay injection (marker-bounded context) | oh-my-codex | Phase 8 Session 8.2 (deferred from 7.2 — dispatch context injection) |
| Dual adapter system (YAML declarative + code imperative) | OpenCLI | Phase 7 P7-C patch (4th validation) |
| Dispatch lifecycle hooks (before/after/startup) | OpenCLI | Phase 8 Session 8.2 |
| Strategy cascade (minimum privilege discovery) | OpenCLI | Phase 8 Session 8.2 |
| Compile-time key hash tables for IPC dispatch | Glaze | Phase 11 |
| Buffer reuse + padding for zero-alloc IPC | Glaze | Phase 11 |
| Binary format for high-frequency hot paths | Glaze | Phase 11 |
| Expression<T> template+bindings (type-safe SQL) | SQLite.swift | Phase 11 |
| Schema reader via PRAGMA introspection | SQLite.swift | Phase 11 |
| Pure decision functions for lifecycle logic | background-agents | Phase 8 Session 8.1 |
| Circuit breaker for agent/ritual dispatch | background-agents | Phase 8 Sessions 8.1/8.2 |
| Auto-pause with consecutive failure tracking | background-agents | Phase 8 Session 8.1 |
| Recovery sweep on every heartbeat tick | background-agents | Phase 8 Session 8.1 |
| Typed event condition registry (reactive triggers) | background-agents | Phase 8 Session 8.2 |
| Proactive warming on intent (pre-warm context) | background-agents | Phase 8 Session 8.1 |
| Dispatch queue with serial execution + crash recovery | background-agents | Phase 8 Session 8.2 |
| Log-normal scoring with percentile control points | Lighthouse | Phase 9 Session 9.3 (Pareto/quality scoring) |
| Audit base class pattern (meta + requiredArtifacts + audit) | Lighthouse | Phase 8 Session 8.2 (gate audit structure) |
| Rust crypto library landscape (ring/sodiumoxide/BLAKE3/rage/argon2) | awesome-cryptography | Phase 11 / R-DS-01 (Tanaka knowledge bank) |
| Media generation pipeline (diagram/image/audio/video) | Novel | Phase 10 Session 10.3 |
| MediaProvider trait (mirrors chat provider abstraction) | Novel (from existing provider pattern) | Phase 10 Session 10.3 |
| Free-tier API targeting (HF Inference, fal.ai, Together, Edge TTS) | Novel | Phase 10 Session 10.3 |
| Persona portraits + ritual sounds + pipeline GIF export | Novel | Phase 10 Session 10.3 |
| Persistent context tree (agentic map + 96.1% retrieval benchmarks) | ByteRover CLI | Phase 8 Sessions 8.1/8.3 (validates KAIROS + sigils) |
| Hub & Connectors extensible skill bundles | ByteRover CLI | Phase 8 Session 8.1 (validates skills marketplace) |
| Tool Registry with Factory DI + requiredServices gating | ByteRover CLI | Phase 8 Session 8.1 (deferred from P7-C.1 — skills system needs service DI) |
| Tool Markers semantic classification (Core/Discovery/Execution/etc.) | ByteRover CLI | Phase 7 P7-C (validates CommandCategory enum) |
| Policy Engine rule-based access (ALLOW/DENY, first-match-wins) | ByteRover CLI | Phase 7 P7-N backfill (prerequisite for 8.2 dispatch) |
| Priority-based invocation queue (4-tier, concurrency-limited) | ByteRover CLI | Phase 7 Session 7.3 (P7-L dispatch queue) |
| Plugin before/after hooks (sequential before, parallel after) | ByteRover CLI | Phase 8 Session 8.2 (dispatch lifecycle hooks) |
| Session overrides on immutable baseline (structuredClone) | ByteRover CLI | Phase 8 Session 8.2 (per-dispatch isolated state) |
| Daemon architecture for persistent background state | ByteRover CLI + Agent Browser | Phase 8 Sessions 8.1/8.2 (validates ritual engine) |
| Engine abstraction layer (pluggable backends, uniform API) | Agent Browser | Phase 8 Session 8.1 (5th validation dual-adapter) |
| AX tree snapshot as agent observation model (refs, compact mode) | Agent Browser | Phase 8 Session 8.2 (gate pipeline: snapshot vs raw DOM) |
| Action Policy Allow/Deny/Confirm trichotomy (JSON-configurable) | Agent Browser | Phase 7 Session 7.2 (2nd validation policy gate) |
| WebSocket multiplexer with ID-correlated dispatch (oneshot senders) | Agent Browser | N/A — Tauri IPC is the transport. Pattern validated by ConfirmationRouter oneshot design. |
| Content boundary markers + AI-friendly error translation | Agent Browser | Phase 8 Sessions 8.1/8.2 (agent security + error UX) |
| AES-256-GCM encrypted state persistence with session isolation | Agent Browser | Phase 11 (R-DS-01 — 2nd validation alongside AiDesigner) |
| Retry with transient error classification (platform-specific codes) | Agent Browser | Phase 8 Session 8.2 (circuit breaker enhancement) |
| Hierarchical config merge (4-tier, additive extension arrays) | Agent Browser | Phase 8 Sessions 8.1/8.2 (grimoire + dispatch config cascade) |
| Invisible orchestration (hide methodology, one consistent voice) | AiDesigner | Phase 9 Session 9.4 / Phase 11 (selectable visibility) |
| Dual-lane routing with automatic complexity escalation | AiDesigner | Phase 8 Session 8.2 (deferred from 7.2 — dispatch routing with model tiering) |
| Conversational tool discovery ("I need X" → auto-configure MCP) | AiDesigner | Phase 11 (auto-MCP setup during /init) |
| Profile-based environment separation (dev/staging/prod, inheritance) | AiDesigner | Phase 8 Session 8.1 / Phase 9 (grimoire env profiles) |
| Credential vault with {{vault:key}} reference syntax | AiDesigner | Phase 11 (R-DS-01 keyring migration pattern) |
| Phase detection via filesystem state (verify claims against artifacts) | AiDesigner | Phase 8 Session 8.1 (vault watcher integrity check) |
| Agent Client Protocol (ACP) host — external agent interop | Zed | Phase 10 Sessions 10.1/10.2 |
| WASM plugin sandbox via Wasmtime + WIT contracts | Zed | Phase 10 Session 10.4 (upgrade from error-boundary) |
| Embedded terminal panel via ghostty-web WASM (~400KB) | Ghostty / Coder (ghostty-web) | Phase 10 Sessions 10.1/10.2 |
| Git worktree isolation for parallel agent dispatches | Codex / Zed / T3 Code | Phase 10 Session 10.4 (deferred from Phase 3 — parallel dispatch in plugin system) |
| Issue-tracker-as-dispatch surface (Linear/GitHub inbound) | Codex | Phase 10 Session 10.3 (enrichment) |
| Orchestrator-over-Terminal (inject prompts, read output) | cmux (cmux-agent-mcp) | Phase 8 Session 8.2 (fallback transport) |
| Checkpoint revert per micro-batch (git tag + SQLite) | T3 Code | Phase 8 Session 8.2 (enrichment) |
| MCP for context, ACP for agent control (protocol split) | Zed | Phase 8.2 + Phase 10.2 |
| Agent following mode (real-time observation via ACP) | Zed | Phase 10 Sessions 10.1/10.2 |
| Three-thread PTY model (IO/render/write separation) | Ghostty | Phase 10 Sessions 10.1/10.2 (PTY architecture) |
| Stacked git actions (commit_push_pr composites) | T3 Code | Phase 10 Session 10.3 (deferred from Phase 5 — git automation in messaging gateway) |
| Plan mode as explicit InteractionMode choice | Codex / T3 Code | Phase 7 Session 7.2 (enrichment) |
| Composable pipeline stages (independently invocable) | cmux philosophy | Phase 10 Session 10.4 (self-modification) |
| supports_native_compaction() on ContextEngine trait | Codex (model-level compaction) | Phase 8 Session 8.1 (deferred from Phase 3 — ContextEngine extension in KAIROS) |
| Meta-agent ecosystem (librarian, refactor, genesis, inspector) | AiDesigner | Phase 9 Session 9.4 (persona evolution meta-agents) |
| Checkpoint validation before phase transitions | AiDesigner | Phase 7 Session 7.3 (P7-L dispatch queue UX) |
| Multi-agent BMAD framework with specialist roles | AiDesigner | Validates existing 10-persona architecture |
| JSONL-over-stdio transport with write serialization | Factory-AI droid-sdk | Phase 8 Session 8.2 (agent subprocess IPC) |
| Sticky error propagation (one failure kills all pending) | Factory-AI droid-sdk | Phase 8 Session 8.2 (dispatch error handling) |
| Two-layer state machine (turn-level + mission-level) | Factory-AI droid-sdk | Phase 8 Session 8.2 (KAIROS + swarm state separation) |
| DroidWorkingState 5-state turn lifecycle | Factory-AI droid-sdk | Phase 7 P7-C.1 (agent working state enum) |
| MissionState 6-state orchestrator lifecycle | Factory-AI droid-sdk | Phase 7 Session 7.3 (proposal/mission state machine) |
| InteractionMode × AutonomyLevel 2-axis dispatch gate | Factory-AI droid-sdk | Phase 7 P7-C.1 (refines CapabilityFamily gating) |
| ToolConfirmationType 9-action permission taxonomy | Factory-AI droid-sdk | Phase 7 Session 7.2 (tool confirmation router) |
| ToolConfirmationOutcome 8-response permission resolution | Factory-AI droid-sdk | Phase 7 Session 7.2 (confirmation UX) |
| SettingsLevel 7-tier config hierarchy | Factory-AI droid-sdk | Phase 8 Session 8.1 (grimoire config cascade) |
| ReasoningEffort 9-level thinking budget | Factory-AI droid-sdk | Phase 8 Session 8.1 (per-persona reasoning profiles) |
| MissionFeature schema (preconditions + verification + fulfills) | Factory-AI droid-sdk | Phase 7 Session 7.3 (proposal item schema) |
| Handoff structured worker completion packet | Factory-AI droid-sdk | Phase 8 Session 8.2 (swarm worker completion) |
| ProgressLogEntry 11-type append-only audit log | Factory-AI droid-sdk | Phase 8 Session 8.2 (KAIROS dispatch audit trail) |
| FeatureSuccessState (success/partial/failure) outcome quality | Factory-AI droid-sdk | Phase 7 Session 7.3 (proposal completion states) |
| returnToOrchestrator boolean dispatch signal | Factory-AI droid-sdk | Phase 8 Session 8.2 (swarm chaining optimization) |
| SkillFeedback + SkillDeviation self-improvement loop | Factory-AI droid-sdk | Phase 9 Session 9.4 (persona evolution input) |
| DismissalRecord with justification (explicit dismiss + reasoning) | Factory-AI droid-sdk | Phase 7 Session 7.3 (proposal dismissal audit) |
| MilestoneValidationTriggered checkpoint gate | Factory-AI droid-sdk | Phase 8 Session 8.2 (milestone-gated dispatch) |
| Bidirectional JSON-RPC (server requests permission from client) | Factory-AI droid-sdk | Phase 8 Session 8.2 (capability gate IPC pattern) |
| Notification-to-AsyncGenerator bridge (micro-queue + wake) | Factory-AI droid-sdk | Phase 8 Session 8.2 (Rust mpsc → React stream) |
| Injectable transport interface (test/custom IPC seam) | Factory-AI droid-sdk | Phase 8 Session 8.2 (Tauri custom transport) |
| allowedTools[] prefix-matching exogenous MCP allowlist | Factory-AI droid-action | Phase 7 P7-C.1 (3rd validation tool allowlist) |
| Context-aware conditional MCP server registration | Factory-AI droid-action | Phase 8 Session 8.2 (per-dispatch MCP composition) |
| Runtime permission probe before server registration | Factory-AI droid-action | Phase 8 Session 8.2 (live capability check) |
| Review depth presets (model + reasoningEffort per tier) | Factory-AI droid-action | Phase 8 Session 8.1 (persona reasoning profiles) |
| Plugin manifest + sidecar files (mcp.json, hooks.json) | Factory-AI factory-plugins | Phase 8 Session 8.1 (agent definition extensions) |
| Skill as pure routing-description + instruction body | Factory-AI factory-plugins | Validates Phase 2 kernel architecture |
| Agent output lint rules for predictable category errors | Factory-AI eslint-plugin | Phase 8 Session 8.2 (post-generation validation) |

### Research Session Integrations (2026-04-02 — previously untracked)

Patterns from research docs (`docs/RESEARCH-*.md`) and reference files (`references/`) that were informing the build plan but had no formal map rows. Added 2026-04-04 for completeness.

#### Claude Code Source Patterns (references/claude-code/)

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| KAIROS persistent daemon mode (daily-log memory, /dream consolidation) | Claude Code source | Phase 8 Session 8.1 |
| SWARM / Teams multi-agent (TeamFile, mailbox, permission sync, worktrees) | Claude Code source | Phase 8 Session 8.2 |
| Coordinator mode (no direct tools, delegates to workers, synthesis rule) | Claude Code source | Phase 8 Session 8.2 |
| Worker result notification (task-notification XML in user-role messages) | Claude Code source | Phase 8 Session 8.2 |
| Scoped worker tools (subset of coordinator tools per dispatch) | Claude Code source | Phase 8 Session 8.2 |
| Dream / AutoDream 4-phase consolidation (Orient→Gather→Consolidate→Prune) | Claude Code source | Phase 8 Session 8.5 |
| Magic Docs (MAGIC DOC header, auto-updated after tool turns, high signal only) | Claude Code source | Phase 8 Session 8.1 |
| Session Memory auto-extraction (8-section, max 12K tokens) | Claude Code source | Phase 8 Session 8.1 |
| Agent Summary (3-5 word progress, 30s interval, maps to persona status panel) | Claude Code source | Phase 8 Session 8.2 |
| LSP tool integration (9 operations: goToDefinition, findReferences, hover, etc.) | Claude Code source | Phase 8 Session 8.2 |
| System prompt section-based caching (__DYNAMIC_BOUNDARY__ marker) | Claude Code systems | Phase 8 Session 8.1 |
| Compaction engine (analysis-then-summary, 9 structured sections, file budget) | Claude Code systems | Phase 8 Session 8.1 |
| Dynamic section registry (runtime persona-specific context injection) | Claude Code systems | Phase 8 Session 8.1 |
| Prompt priority chain (override > coordinator > agent > custom > default) | Claude Code systems | Phase 8 Session 8.1 |
| Three skill sources (bundled/compiled, disk-based/runtime, MCP-based/server) | Claude Code skill-system | Phase 8 Session 8.1 |
| Skill definition schema (name, aliases, allowedTools, model, context, files) | Claude Code skill-system | Phase 8 Session 8.1 |
| Skill execution isolation (context: inline vs fork) | Claude Code skill-system | Phase 8 Session 8.1 |
| Tool safety taxonomy (isConcurrencySafe, isReadOnly, isDestructive flags per tool) | Claude Code tool-interface | Phase 7 P7-N backfill (prerequisite for 8.1 skill safety classification) |
| Tool rendering contract (description + prompt + renderToolResultMessage) | Claude Code tool-interface | Phase 8 Session 8.1 (deferred from 7.1 — skills system needs rendering contract) |
| Zod schema validation on tool I/O (inputSchema + outputSchema) | Claude Code tool-interface | Phase 8 Session 8.1 (deferred from 7.1 — skills system needs typed I/O) |
| Permission mode taxonomy (expand to 5 modes: Spec, Auto, Orchestrator, Plan, Supervised) | Claude Code permission-model | Phase 7 P7-N backfill (prerequisite for 8.2 dispatch modes) |
| Permission rule sources (session → persona → project → defaults, layered) | Claude Code permission-model | Phase 7 P7-N backfill (prerequisite for 8.2 dispatch) |
| Tool-specific permission rules (allow/deny/ask per toolName with glob matching) | Claude Code permission-model | Phase 7 P7-N backfill (prerequisite for 8.2 dispatch) |
| External store pattern (createStore with getState/setState/subscribe) | Claude Code state-management | Phase 8 Session 8.1 (deferred from 7.1 — state management redesign with KAIROS) |
| React bridge (stable Provider, store ref never re-renders) | Claude Code state-management | Phase 8 Session 8.1 (deferred from 7.1 — React state layer redesign) |
| Categorized memory files (user_*, feedback_*, project_*, reference_* prefix) | Claude Code memory-system | Phase 8 Session 8.1 |
| Memory index constraints (MEMORY.md max 200 lines, 25KB, truncation strategy) | Claude Code memory-system | Phase 8 Session 8.1 |

#### Excalibur Agent Scaffold (viemccoy/excalibur)

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| Mana economy (visible token/cost budget per dispatch, budget asymmetry by context) | Excalibur | Phase 8 Sessions 8.1/8.2 |
| Emanation charge semantics (sub-agent funded from parent mana, depth cap at 2) | Excalibur | Phase 8 Session 8.2 |
| Read-only rituals (automated jobs cannot modify own spec, disabled by default) | Excalibur | Phase 8 Session 8.1 |
| Warden pattern (mandatory security audit entity in bootstrapping ceremony) | Excalibur | /init flow (validates Tanaka+Wraith separation) |
| Single tuning surface / Grimoire (one file governs all operational costs) | Excalibur | Phase 8 Sessions 8.1/8.2 |
| Capability widening / Spellbook (explicit open/close per dispatch, not ambient) | Excalibur | Phase 7 P7-N backfill (prerequisite for 8.2 dispatch scoping) |
| Dreamtime consolidation (nightly scheduled memory distillation, 4-tier memory) | Excalibur | Phase 8 Sessions 8.1/8.5 |
| Budget asymmetry by context (interactive=full, automated=constrained) | Excalibur | Phase 8 Session 8.2 |
| Reclaim-on-progress (mana not consumed on timer, requires durable progress) | Excalibur | Phase 8 Session 8.1 |
| Typed emanation tiers (codex/genius/echo = fast/high/parallel provider tiers) | Excalibur | Phase 8 Session 8.2 |
| Post-emanation integration responsibility (parent reviews, not blind merge) | Excalibur | Phase 8 Session 8.2 |
| 3-file identity split (config/personality/capabilities = convergent validation) | Excalibur | Validates kernel/personality/agent-definition pattern |
| Behavioral contract (11 laws → validates 46 rules + 8 contracts at diff scale) | Excalibur | Validates governance architecture |
| Zero-code philosophy (markdown-as-spec → validates kernel architecture) | Excalibur | Validates content layer approach |

#### Meta-Harness Paper (arxiv 2603.28052)

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| Harness-is-the-variable (same model, different harness = 6x gap) | Meta-Harness | Foundational validation — harness optimization > model selection |
| Raw traces beat summaries (+15.1 median accuracy; summaries hurt) | Meta-Harness | Phase 8 Sessions 8.1/8.5 (trace store design axiom) |
| Non-Markovian credit assignment (82 files/iteration, 20+ prior candidates) | Meta-Harness | Phase 8 Sessions 8.2/8.3b |
| Filesystem-based selective access (10 MTok/iteration via grep/cat, not stuffing) | Meta-Harness | Phase 8 Sessions 8.1/8.2 |
| 41/40/6 context read ratio (prior code 41%, traces 40%, summaries 6%) | Meta-Harness | Phase 8 Sessions 8.1/8.2 |
| Small context + large queryable store (don't stuff, select) | Meta-Harness | Phase 8 Session 8.1 |
| Pareto frontier optimization (mana-accuracy frontier, operator-selectable point) | Meta-Harness | Phase 8 Sessions 8.1/8.2 |
| Confound isolation (one fix per finding, verified independently, additive-first) | Meta-Harness | Phase 8 Session 8.2 / Gate Protocol |
| Environment bootstrapping (~80 lines env snapshot = +1.7-3.9pp; validates Scout Phase 0) | Meta-Harness | Validates Scout recon architecture |
| Code-space regularization (skills as algorithms not prompts, generalization testing) | Meta-Harness | Phase 8 Session 8.1 (skills marketplace) |
| Additive-first fix strategy (adding > rewriting; validates Rule 21 Edit-only) | Meta-Harness | Validates Rule 21 + Contract 4 |
| Cross-session transfer (iteration 10 refs earlier run; validates /link backfill) | Meta-Harness | Phase 8 Sessions 8.1/8.4 |

#### Karpathy Knowledge Base (X post + April 4 gist)

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| LLM-compiled knowledge / vault as living compilation | Karpathy | Phase 8 Sessions 8.1/8.3 |
| Knowledge compounding flywheel (gates/research/Q&A file back into vault) | Karpathy | Phase 8 Sessions 8.1/8.3b |
| Lint + Heal / vault health checks (scheduled scan for inconsistencies) | Karpathy | Phase 8 Sessions 8.3b/8.5 (Scrying ritual) |
| No RAG at small scale / auto-maintained indexes (~400K words threshold) | Karpathy | Phase 8 Sessions 8.1/8.3 |
| Human reads, LLM writes (operator steers, system writes/compiles/indexes) | Karpathy | Validates operator/persona role split |
| Output diversity (Q&A renders as markdown, slides, plots) | Karpathy | **DONE** — Phase 4 Session 4.4 (document gen engine) |
| Backlinks / bidirectional linking (dreamtime-generated backlink maps) | Karpathy | Phase 8 Sessions 8.3/8.5 (Ley Lines) |
| Mana-aware access tiers (index=free, depth=low mana, retrieval engine=higher) | Karpathy | Phase 8 Sessions 8.1/8.3 |
| Query-to-vault promotion (approved recs auto-promote during dreamtime) | Karpathy (Apr 4 gist) | Phase 8 Sessions 8.1/8.5 |
| Three-layer wiki architecture (Raw Sources → Wiki → Schema) | Karpathy (Apr 4 gist) | Phase 8 Sessions 8.1/8.5 |

#### Research Synthesis (2026-04-02 — cross-source themes)

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| Theme: Mana Economy (free → low → medium → high mana gradient) | Synthesis (Excalibur + Meta-Harness + Karpathy) | Phase 8 Sessions 8.1/8.2 |
| Theme: Trace Architecture 3-Layer (Raw Echoes → Compiled Knowledge → Active Context) | Synthesis | Phase 8 Sessions 8.1/8.2/8.5 |
| Theme: Ritual System (Heartbeat hourly + Dreamtime nightly + Scrying weekly) | Synthesis | Phase 8 Sessions 8.1/8.5 |
| Theme: Capability Model 3-Layer (connectivity gating + dispatch scoping + confound isolation) | Synthesis | Phase 7 Session 7.1 / Phase 8 Session 8.2 |
| Theme: Knowledge Architecture 3-Tier (Sigils → Articles → Ley Lines) | Synthesis | Phase 8 Sessions 8.1/8.3 |
| Theme: Identity and Evolution (3-file identity + cornerstone self-mod + harness-as-variable) | Synthesis | Phase 8 Session 8.5 |
| Lexicon: 10 terms (Mana, Emanation, Ritual, Dreamtime, Grimoire, Echoes, Scrying, Sigils, Ley Lines, Alchemy) | Synthesis | Global vocabulary — applied across all Phase 8+ specs |
| Artifact: Vault Sigils (4 index files: BUILD-LEARNINGS, SKILLS, ADL, FINDINGS) | Synthesis | Phase 8 Session 8.1 |
| Artifact: Grimoire Config (single tuning surface for mana costs, emanation budgets) | Synthesis | Phase 8 Sessions 8.1/8.2 |
| Artifact: Echo Ledger (vault/echoes/<date>.jsonl append-only trace store) | Synthesis | Phase 8 Session 8.1 |
| Two-register voice system (mystical for operations, clinical for quality) | Synthesis | Global — applied across alchemical aesthetic directive |

#### poetengineer Observatory Aesthetics + TouchDesigner Patterns

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| Canvas 2D tier: 20 patterns (feedback trails, Perlin drift, spring physics, flow particles, neon-on-dark, breathing, phase-stagger, glow sprites, state machine transitions, additive blending, noise terrain, force graph enhancement, attractor particles, event bursts, splat map, Hilbert curve, curl noise, slit scan, orbital layout, Voronoi territory) | poetengineer__ | Phase 9 Sessions 9.1/9.2 (Canvas 2D refinement) |
| WebGL tier: 10 patterns (bloom, GPU heightfield + contour shader, GPU particles 50K+, domain warping, SDF rendering, Fresnel fading, depth fog, aurora background, normal-mapped surfaces, simplex foam) | poetengineer__ | Phase 9 Session 9.5 (WebGL upgrade) |
| Observatory palette (Void/Luminous/Energy/Atmosphere layers) + brightness hierarchy (4-level bloom system) | poetengineer__ | Phase 9 — global aesthetic (replaces "rave neon" with restrained observatory register) |
| Recipe: Pipeline Canvas (aurora + flow particles + SDF nodes + glyph breathing + dispatch bursts + trails) | poetengineer__ | Phase 9 (Phase 5.1 upgrade) |
| Recipe: Graph Viewer (domain warp + force graph + curl noise + edge bundling + glow hierarchy) | poetengineer__ | Phase 9 (Phase 5.3 upgrade) |
| Recipe: Intelligence Network (noise terrain + contour + orbital glyphs + attractors + slit scan) | poetengineer__ | Phase 9 (Phase 5.3/8.2 upgrade) |
| Recipe: Signal Charts (terrain sections + forecast contour + anomaly bursts + fog + spring physics) | poetengineer__ | Phase 9 (Phase 8.3b upgrade) |
| Recipe: Findings Feed (feedback trail + severity particles + glow hierarchy + spring filter) | poetengineer__ | Phase 9 (Phase 5.2 upgrade) |
| Aesthetic correction: observatory register (rave energy from motion+density, not saturated color) | poetengineer__ | Global directive |
| TouchDesigner: 5 patterns (data-to-geometry, GPU instancing, feedback loops, noise heightfields, contour lines) | TouchDesigner research | Phase 9 (foundational visual vocabulary) |

#### Desktop App Patterns (references/ecosystem/)

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| SQLite session state (replace BOOT.md monolith with tables; BOOT.md becomes generated view) | OpenCode | Phase 7 / Phase 8 Session 8.1 |
| Auto-compact / context summarization (85% threshold, structured extraction to SQLite + markdown) | OpenCode | Phase 8 Session 8.1 |
| Persistent server / session survival (background process, frontend connects/disconnects) | OpenCode | Phase 7 / Phase 8 Session 8.1 |

#### Trail of Bits Security Skills (references/trail-of-bits/)

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| 8 security skills: Semgrep static analysis, supply chain risk auditor, insecure defaults detection, Semgrep rule creator, differential security review, zeroize audit, audit context building, constant-time analysis | Trail of Bits | Phase 8 Session 8.1 (Tanaka skill library). Skills installed at .claude/skills/. |

#### UI UX Pro Max (references/ui-ux-pro-max/)

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| Design system generator (product type → reasoning rules → style + color + typography + checklist) | ui-ux-pro-max | Phase 8 Session 8.1 (Mara/Riven skill library) |
| BM25 category matching (161 industry categories with structured outputs) | ui-ux-pro-max | Phase 8 Session 8.1 |
| Pre-delivery UX checklist (15-point: cursor-pointer, hover states, contrast, focus, reduced-motion, responsive) | ui-ux-pro-max | Operational — used in Build Triad gates |
| Z-index scale system (10/20/30/50 stacking context) | ui-ux-pro-max | Phase 8 Session 8.1 (Riven design system knowledge) |
| Content max-width readability (65-75 chars) | ui-ux-pro-max | Phase 8 Session 8.1 (Riven design system knowledge) |

#### Ruflo Patterns (references/ruflo/)

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| 10 patterns: autopilot persistent completion, worker count reduction (10→3), atomic file writes (tmp+rename), task source allowlist, stall detection + auto-disable, self-learning reward loop, re-engagement prompt builder, stop-hook checkpoint, prototype pollution prevention, HNSW ghost entry invalidation | ruvnet/ruflo | Phase 8 Sessions 8.1/8.2/8.3. Extracted to ECOSYSTEM-PATTERNS.md (operational). |

#### oh-my-claudecode / OMX (references/oh-my-claudecode/)

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| Deep Interview (Socratic ambiguity scoring, weakest-dimension targeting, <=20% gate) | oh-my-claudecode | /init, /link flows. Led to DEEP-INTERVIEW-PROTOCOL.md. |
| Ralph PRD-driven persistence loop (testable acceptance criteria, 3-iteration breaker) | oh-my-claudecode | Phase 8 Session 8.2. Led to PERSISTENCE-PROTOCOL.md. |
| Ralplan-first gate (vague request detection via concrete signal scan) | oh-my-claudecode | Scout / Phase 7 Session 7.2 |
| Worker hierarchy protocol (explicit "you are NOT the leader" preamble, watchdog) | oh-my-claudecode | Phase 8 Session 8.2 |
| Stage handoff documents (.omc/handoffs/<stage-a>-to-<stage-b>.md) | oh-my-claudecode | Phase 8 Session 8.2 |
| Deslop pass (mandatory AI-pattern cleanup after verification, post-deslop regression test) | oh-my-claudecode | Phase 8 Session 8.2 |
| Ontology tracking (entity stability ratio, renamed entities = convergence) | oh-my-claudecode | /init flow |
| Challenge agents at thresholds (Contrarian r4, Simplifier r6, Ontologist r8) | oh-my-claudecode | /init flow |
| Autopilot skill mode (10 CLI subcommands for persistent task management) | oh-my-claudecode | Phase 8 Session 8.2 |
| 11 lifecycle hook points (runtime hooks for state, keyword detection, deliverable verification) | oh-my-claudecode | Phase 8 Session 8.2 |

#### wshobson/agents (references/wshobson-agents/)

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| 4-tier model strategy (Opus/Inherit/Sonnet/Haiku; 80.8% SWE-bench) | wshobson/agents | Phase 8 Session 8.2. Already informing MODEL-TIERING.md. |
| Progressive disclosure for skills (3-tier: Metadata → Instructions → Resources) | wshobson/agents | Phase 8 Session 8.1 |
| PluginEval quality framework (Static + LLM Judge + Monte Carlo; Platinum→Bronze badges) | wshobson/agents | Phase 8 Sessions 8.1/8.3b |
| Anti-pattern detection (OVER_CONSTRAINED, BLOATED_SKILL, DEAD_CROSS_REF) | wshobson/agents | Phase 8 Session 8.3b |
| Agent frontmatter pattern (YAML frontmatter with "Use PROACTIVELY when [trigger]") | wshobson/agents | Phase 7 Session 7.1. Already in agent definitions. |

#### April 5, 2026 — 4 repos: awesome-design-md, GitNexus, StixDB, ArsContexta (68 patterns)

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| Exponential decay with half-life `importance * 2^(-t/48h)` | StixDB | Session 7.5 (P7.5-D) |
| Touch-boost on access `min(1.0, score * 1.2 + 0.1)` | StixDB | Session 7.5 (P7.5-D) |
| Hybrid LRU+LFU access scoring `0.6*freq + 0.4*recency` | StixDB | Session 7.5 (P7.5-D) |
| Reciprocal Rank Fusion (RRF) `1/(60+rank)` hybrid search | GitNexus | Session 7.5 (P7.5-E) |
| Three-Space memory partition (kernel/garden/ops) + 6 conflation failures | ArsContexta | Session 7.5 (P7.5-E) |
| Similarity-based consolidation merge at 0.88 cosine threshold | StixDB | Session 7.5 (P7.5-E) |
| 9-Section DESIGN.md format (agent-optimized design system governance) | awesome-design-md | Session 7.5 (P7.5-F) |
| Next-step hint guidance on agent returns | GitNexus | Session 7.5 (P7.5-F) |
| Dark-mode Do's/Don'ts (consolidated from 9 systems) | awesome-design-md | Session 7.5 (P7.5-F) |
| Border-as-depth system (rgba white overlays, zero shadows) | awesome-design-md | Session 7.5 (P7.5-F) |
| Persona-colored glow effects `drop-shadow(0 0 Npx {color})` | awesome-design-md | Session 7.5 (P7.5-F) |
| Luminance stacking `rgba(255,255,255, 0.02/0.04/0.05)` surface hierarchy | awesome-design-md | Session 7.5 (P7.5-F) |
| Multi-table FTS with score aggregation | GitNexus | Phase 8 Session 8.1 |
| Incremental embedding with skip sets | GitNexus | Phase 8 Session 8.1 |
| Tier-based memory promotion/demotion (WORKING/SEMANTIC/ARCHIVED) | StixDB | Phase 8 Session 8.1 |
| Hash-based exact dedup pre-pass | StixDB | Phase 8 Session 8.1 |
| Lineage-safe consolidation (pin sources, preserve provenance) | StixDB | Phase 8 Session 8.1 |
| Condition-based maintenance triggers (replace time scheduling) | ArsContexta | Phase 8 Session 8.1 |
| Feature block composition (always-included vs conditional modules) | ArsContexta | Phase 8 Session 8.1 |
| Tiered confidence resolution for dispatch routing (0.95/0.8/0.5) | GitNexus | Phase 8 Session 8.2 |
| Blast radius analysis via BFS (d=1 breaks, d=2+ indirect risk) | GitNexus | Phase 8 Session 8.2 |
| Ralph subagent spawning (fresh context per phase, count verification) | ArsContexta | Phase 8 Session 8.2 |
| Augmentation engine (batch-query related context before agent tasks) | GitNexus | Phase 8 Session 8.2 |
| Global agent capability registry | GitNexus | Phase 8 Session 8.2 |
| WHY/HOW/WHAT query classification for retrieval routing | ArsContexta | Phase 8 Session 8.2 |
| Signal-to-dimension derivation with confidence scoring | ArsContexta | Phase 8 Session 8.2 |
| Cascade constraints (hard/soft/compensating) | ArsContexta | Phase 8 Session 8.2 |
| Topological sort for batch dependency ordering (Kahn's algorithm) | GitNexus | Phase 8 Session 8.2 |
| Cross-surface contract matching | GitNexus | Phase 8 Session 8.2 |
| Leiden community detection for Knowledge Garden clustering | GitNexus | Phase 8 Session 8.3 |
| Knowledge graph analysis (8 ops: health, triangles, bridges, hubs) | ArsContexta | Phase 8 Session 8.3 |
| Per-type text generation for embeddings | GitNexus | Phase 8 Session 8.3 |
| Working memory boost in re-ranking (+0.15 for hot tier) | StixDB | Phase 8 Session 8.3 |
| Autonomous maintenance planner (self-healing memory) | StixDB | Phase 8 Session 8.3+ |
| 6 Rs extraction pipeline (Record/Reduce/Reflect/Reweave/Verify/Rethink) | ArsContexta | Phase 8 Session 8.3 |
| Session lifecycle Orient/Work/Persist | ArsContexta | Validates existing BOOT.md pattern |
| Three-font system (display/body/code triplet) | awesome-design-md | Phase 9 frontend |
| HSL+alpha color tokens | awesome-design-md | Phase 9 frontend |
| Vocabulary transforms per persona | ArsContexta | Phase 8 Session 8.5 (persona evolution) |
| Personality dimension framework (warmth/opinionatedness/formality/emotional) | ArsContexta | Phase 8 Session 8.5 (persona evolution) |
| Seed-evolve-reseed lifecycle (kernel versioning + drift detection) | ArsContexta | Phase 8 Session 8.5 |
| 15-primitive kernel validation (3-pass coherence check) | ArsContexta | Phase 8 Session 8.5 |

## Verification

After each phase:
- App launches via `pnpm tauri dev` without errors
- New panels render and are interactive
- SQLite persists data across app restarts
- Provider system works (chat responses stream from configured engine)
- Canvas renders at 60fps (no jank)
- All code pushed to CYM4TIC/forge-OS

Final verification (Phase 11): Alex opens Forge, links the DMS project, backfill engine seeds 57 decision traces + signals, TimesFM calibrates on real history, retrieval engine indexes it, and resumes the L4-J.2c build entirely from within the app. The observatory renders data as living topological surfaces — finding density as terrain elevation, persona activity as particle density, intelligence chains as light pulses flowing between orbital nodes. The graph panel shows 4 views (Grimoire / Vault / Ley Lines / Scrying) with Obsidian-style tunable physics controls. Gate reports export as typeset PDFs. An embedded terminal shows agent commands executing in real-time. Claude Code connects via ACP as an external agent with full capability mediation. Recommendations surface proactive intelligence before the next batch starts. Policy evolution proposes new checks from recurring gate patterns. The Agora shows agents debating in real time. CONSORTIUM resolves conflicts with empirical trade-off data. `/review` auto-dispatches from diffs. The OS modifies its own config and loads WASM-sandboxed plugins. All 105 agents respond in character through any configured provider. The system remembers, reasons, predicts, recommends, proposes, debates, learns, and makes its own intelligence visible as a living landscape.
