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

KAIROS becomes `KairosEngine: ContextEngine`. Future memory strategies (per-persona context assembly, project-specific memory, LightRAG-backed) implement the same trait. The dispatch pipeline calls `ContextEngine` methods — never KAIROS directly.

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

### Session 7.3 — Agent Orchestration UI + Proposal Feed

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

**Proposal Feed — ADL-005 Implementation (Internal Feedback Loop)**

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
- `decisions.rs` — accepted proposals become decisions in `.forge/decisions/`. Rejected proposals preserve reasoning (why not). Both indexed by LightRAG (Phase 8.3) when available. Decision schema mirrors proposal but adds: resolution rationale, implementing batch, outcome tracking, **`outcome: ProposalOutcome`** (Success/Partial/Failure from Factory-AI FeatureSuccessState).
  - **`DismissalRecord` struct (from Factory-AI DismissalRecord pattern):** `{ dismissal_type: DismissalType, source_proposal_id, summary, justification }`. `DismissalType` enum: DiscoveredIssue, CriticalContext, IncompleteWork. When a proposal is dismissed rather than resolved, the dismissal is recorded with explicit justification. No silent drops — every dismissed item has a paper trail. Dismissals are distinct from rejections: rejection = "evaluated and declined"; dismissal = "acknowledged but deprioritized with documented reasoning." Dismissals visible in the Proposal Feed with distinct visual treatment.
  - Tauri command: `dismiss_proposal(id, dismissal_type, justification) -> DismissalRecord`
- `feed.rs` — aggregates proposals + responses + decisions into a chronological feed. Supports pagination, filtering, search. Emits Tauri events on new activity.
- Rate limit enforcement: 3 proposals per persona per session (per ADL-005). Automated proposals (Phase 8.3b policy evolution) are exempt from rate limit but tagged `source: Automated`.
- SQLite migration: `proposals` table, `proposal_responses` table, `decisions` table.
- Tauri commands: `list_proposals`, `file_proposal`, `evaluate_proposal`, `resolve_proposal`, `get_proposal_feed`, `get_decision_history`, `search_proposals`

**Proposal Feed panel** — new panel type, registrable with window manager:
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

**New panel types registered in this phase:** Team Panel (rebuilt, with Action Palette as internal tab), Dispatch Queue, Proposal Feed (3 net new panel types, total ~18)

**Factory-AI Integration Summary (Session 7.3):**
- `MissionState` (6-state orchestrator lifecycle) drives Dispatch Queue and overall build orchestration
- `ProposalOutcome` (Success/Partial/Failure) tracks implementation quality on decision resolution
- `DismissalRecord` with `DismissalType` + justification — no silent drops of proposals or findings
- `MissionFeature`-inspired fields on proposals: `preconditions`, `verification_steps`, `fulfills`
- `FeedEntry` enum extended with `ProposalDismissed` variant for feed visibility
- Tauri commands: `dismiss_proposal`, `get_mission_state`, `update_mission_state`

**Depends on:** Phase 4 (window manager + canvas), Phase 1 (chat), Phase 3 (agent runtime + document gen for export)

---

## Phase 8: Orchestration Engine + LightRAG + Predictive Intelligence + Persona Evolution (8 sessions) — WAS PHASE 7

**Goal:** The Rust backend intelligence that makes autonomous agent dispatch work, knowledge graph, self-improving skills, the persona evolution engine, AND the self-directing intelligence layer — context graph, TimesFM forecasting, reasoning engine, intelligence interaction chains, self-modification architecture. This phase transforms the OS from a reactive tool to an anticipatory organizational substrate.

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
  - **Grimoire format** (`GRIMOIRE.md`): single file defining all mana costs (file read=0, artifact write=0, depth read=1, web search=2, doc gen=2, LightRAG=3, emanation=10-20, image gen=3) and run budgets (interactive=120, heartbeat=60, dreamtime=40, scrying=40, automated=60). **(AiDesigner: profile-based environment separation — grimoire supports dev/staging/prod profiles with inheritance. Production profile restricts Destructive capabilities entirely. Profile auto-detected via env vars or git branch.)** **(Agent Browser: hierarchical config merge — 4-tier cascade (per-dispatch > per-persona > project grimoire > system defaults) with additive extension arrays for capability accumulation.)**
  - **Mana gradient shapes behavior:** Free (local reads, artifact writes) → Low (depth reads) → Medium (external, generation) → High (emanations, LightRAG). Agents self-optimize toward cheap paths.
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
    - Ley lines (LightRAG): 3 mana — cross-article query ("what connects auth to payments?")
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
  - Arbiter collects all positions + evidence, queries LightRAG for similar past conflicts, and synthesizes ground truth: "Tanaka says CRIT because X, Mara says LOW because Y — considering both threat models, the ground truth is Z. Confidence: high — 3 prior similar cases resolved this way."
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
    - Resolutions also file to `.forge/decisions/` through the Proposal Feed (Phase 7.3) with `source: Consortium` — visible in the feed as resolved inter-agent conflicts
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

### Session 8.3 — LightRAG Integration + Vault as Virtual Filesystem
- Install LightRAG (`pip install lightrag-hku`) + MCP bridge
- Configure with Claude API backend
- `tools/index-vault.py` for batch indexing
- Query routing: hybrid default, local for entity questions, global for cross-cutting
- Index OS's own docs as test → verify queries
- Wire into Scout's pre-build recon (LightRAG query for batch-relevant entities)
- Wire into GraphViewer (Phase 5.3) — LightRAG entities with Pretext-measured labels
- Auto-index when `/init` or `/link` creates a new vault
- **Temporal edges (from MiroFish pattern):** relationships in the knowledge graph carry `valid_from` / `valid_until` timestamps. Architecture decisions that get superseded have their edges invalidated rather than deleted. Scout can query "what was true about auth at the time L2 was built" vs "what's true now." Enables historical reasoning.
- **Ley Line Generation (from Karpathy backlink pattern)**
  - During LightRAG indexing, generate bidirectional ley lines (backlinks) between vault articles:
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

### Session 8.3b — Predictive Intelligence Layer (v2 addition)

**Goal:** TimesFM forecasting sidecar + anomaly detection + reasoning engine + recommendation store. The forward-looking intelligence that transforms the OS from reactive to self-directing.

- **TimesFM Python sidecar** (`sidecar/timesfm/`):
  - FastAPI HTTP server on configurable port (default 8787)
  - Loads TimesFM model on startup (~200M params, ~800MB, ~30s cold start)
  - `POST /forecast` — accepts `{ metric, values[], horizon }`, returns point forecasts + 10 quantile bands
  - `POST /anomaly` — accepts `{ metric, values[], new_value }`, returns `{ is_anomaly, quantile_position, band_low, band_high }`
  - `GET /health` — model loaded, last forecast time, signal count
  - Launched by Tauri backend on app start. Health-checked before first forecast. Dashboard shows TimesFM status.
  - **Why TimesFM over simple stats:** TimesFM isn't sized for build metrics. It's sized for running companies at scale — revenue forecasting, churn prediction, support volume projection, sales pipeline velocity. 200M params trained on 100B real-world time points. Zero-shot across any domain. Build metrics are the first signal feed; the model stays the same as signals multiply across domains.

- **TimesFM Rust client** (`src-tauri/src/predictive/timesfm_client.rs`):
  - HTTP client for the sidecar (reqwest)
  - Retry logic (sidecar might be loading model)
  - Response caching (same metric + values = same forecast, 5-minute TTL)
  - Fallback: if sidecar is down, anomaly detection falls back to z-score (>2 std deviations)

- **Anomaly detector** (`src-tauri/src/predictive/anomaly.rs`):
  - On every new signal: pull metric window from aggregator, send to TimesFM `/anomaly`
  - If anomaly detected: emit `signal.threshold` event on the bus
  - Pre-32-datapoint fallback: z-score using simple moving average + standard deviation
  - Minimum 32 data points per metric before TimesFM activates (model constraint)

- **Reasoning engine** (`src-tauri/src/predictive/reasoning.rs`):
  - Triggered by `signal.threshold` events and scheduled forecast recalculations
  - Step 1: Query LightRAG for historical traces matching the current pattern
  - Step 2: Extract reasoning + outcomes from matched traces. Filter for validated outcomes.
  - Step 3: Compose recommendation: forecast data + historical evidence + suggested action + confidence score
  - Step 4: File recommendation to store. Emit `forecast.alert` event.
  - **Non-Markovian Credit Assignment (from Meta-Harness)**
    - The reasoning engine queries the full echo history, not just recent traces
    - When Beacon detects an anomaly, the reasoning engine walks the complete echo ledger for similar patterns across all time
    - Pattern matching spans the entire project history, not just a sliding window
    - Cross-project echo queries supported when skills reference patterns from prior projects
    - Meta-Harness evidence: proposer read 82 files per iteration across 20+ prior candidates. Compressed feedback (recent-only) produced 15 fewer accuracy points.

- **Recommendation store** (`src-tauri/src/predictive/recommendations.rs`):
  - CRUD for pending/resolved recommendations
  - Lifecycle: pending → approved/overridden/dismissed
  - On resolution: file a decision trace recording the recommendation + operator's decision + outcome
  - Outcome tracking: after N actions (configurable, default: 3), check whether predicted problem occurred. Update trace with `validated: true/false`.
  - Tauri commands: `list_recommendations`, `resolve_recommendation`, `get_recommendation_accuracy`

- **Dashboard surfaces** (panel types registered here, built in Phase 5 extension or Phase 8):
  - `RecommendationSurface` — canvas-rendered cards: metric, forecast sparkline with projection, evidence trail, suggested action, confidence gauge, approve/override/dismiss. Urgency coloring (immediate=red pulse, next-action=amber, advisory=blue).
  - `SignalCharts` — per-metric sparklines with TimesFM forecast overlay (actual + projected dashed + shaded prediction interval). Anomaly markers. Click-to-trace navigation.
  - `TraceExplorer` — decision trace browser. Filter by source/type/time/tags. Full observation→reasoning→action→outcome chain. Causal graph view.
  - `ContextHealth` — system intelligence health. Per-domain trends, TimesFM status, data maturity per metric.

- **Incident-Driven Policy Evolution (from Block engineering — continuously evolving policies)**
  - `src-tauri/src/predictive/policy_evolution.rs`
  - The reasoning engine handles numeric signals (anomaly detection → forecast → recommendation). Policy evolution handles **categorical patterns** — recurring finding types, failure categories, common gate blockers.
  - Subscribes to `gate.completed` events on the event bus
  - Maintains a rolling window of findings by category, pattern, persona, and domain
  - **Pattern detection:** when a finding pattern repeats N times (configurable, default: 3) across M batches (configurable, default: 5), composes a policy proposal:
    - Pattern description with evidence (links to specific traces and findings)
    - Proposed check: either a new deterministic rule (add to persona kernel) or a new skill (auto-crystallize)
    - Target persona (who should enforce this check going forward)
    - Confidence score (based on pattern frequency + outcome validation data)
  - **Files through ADL-005 Proposal Feed** (Phase 7.3) with `source: Automated`. Same triage flow, same evaluation by scope-appropriate personas, same feed visibility. Operator sees both human-triggered and system-generated proposals in one timeline.
  - **Proposal lifecycle:**
    - Operator approves → system auto-generates skill file (if check type) OR patches persona kernel rules (if rule type) OR files ADL update (if architectural)
    - Operator dismisses → trace filed with dismissal reasoning. Pattern still tracked — if it recurs with higher confidence, re-proposed.
    - Operator overrides → trace filed. System learns from override pattern (e.g., "operator consistently dismisses low-severity style proposals → increase threshold for style-related policy proposals")
  - **Example flow:** "3 of last 5 gate reviews found auth RPCs without `security_definer`. Pattern confidence: HIGH (60% recurrence rate). Proposing new Tanaka sub-check: verify `security_definer` on all auth-tagged RPCs. Filed as skill `auth-rpc-security-definer-check`."
  - **Scrying Ritual — Vault-Level Policy Evolution (from Karpathy lint+heal)**
    - Policy evolution (above) detects recurring *finding* patterns. The scrying ritual extends this to the *knowledge base itself*:
    - Weekly vault integrity scan (scheduled ritual, see 8.1)
    - Detects: BUILD-LEARNINGS contradictions, skills referencing removed tools, ADL decisions not validated against current code, knowledge gaps where surfaces exist without vault coverage, stale persona relationship edges
    - Produces: integrity findings filed through the Proposal Feed (7.3) with `source: Automated`
    - Can impute missing data via web search (External capability granted)
    - Files connection candidates as proposals: "Findings from Tanaka and Kehinde on auth RPCs share a root cause — propose linked skill"
  - Surfaces on `RecommendationSurface` alongside forecast recommendations — same panel, different source tag (forecast vs. policy)
  - Tauri commands: `list_policy_proposals`, `get_pattern_history`, `get_policy_evolution_stats`

**New panel types:** RecommendationSurface, SignalCharts, TraceExplorer, ContextHealth (4 new)

**Depends on:** Session 8.1 (trace store + signal store + skills system), Session 8.3 (LightRAG for reasoning queries), Phase 7.3 (Proposal Feed for filing policy proposals)
**New ADL:** OS-ADL-024 (TimesFM as predictive sidecar — domain-agnostic forecasting), OS-ADL-025 (decision traces as first-class graph edges), OS-ADL-027 (incident-driven policy evolution — system proposes new checks from gate failure patterns)

### Session 8.4 — /init + /link Flows + Customer Simulator Generator
- `/init` command: guided project creation wizard
  - **Platform Orientation first** — explains full system: personas, 105 agents, tiered MCPs (4 tiers incl. E2B + Composio), trigger words, commands
  - 5-phase discovery: Discovery → Architecture → Spec Generation (Pierce reviews) → Build Planning → Build Ready
  - **Pretext detection:** when customer-facing surfaces detected, auto-scaffold `layout-engine` package in project repo, add Pretext/CLS evaluation rules to Mara/Riven assignments
  - **Customer Simulator Generator:** Mara auto-generates 3-5 sim-agents from discovered user roles
  - **PDF Project Brief** generated via document engine (dual-output: markdown + PDF)
  - LightRAG auto-indexes new vault
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
  - LightRAG auto-indexes generated vault
- Both flows render as guided wizards in the Chat panel
- **/init v2 additions:**
  - Domain adapter selection during discovery: "What functions will this system support?" Default: development. Future: operations, support, sales. Each adapter registers its event types, signals, and trace types.
  - Per-domain signal configuration: which metrics to track, what thresholds trigger recommendations
  - Forecast baseline note: "TimesFM needs 32 data points per metric. For a new project, forecasting activates after ~32 batches. Z-score fallback until then."
- **/link v2 additions:**
  - **Backfill engine** runs automatically. `backfill.rs` parses BOOT.md handoffs into decision traces, seeds the signal store with extracted metrics. Not perfectly structured (handoffs are prose), but sufficient to seed the graph.
  - If project has 32+ batches of history, TimesFM calibration runs immediately. First forecasts available within minutes.
  - Dashboard shows data maturity: "Backfilled 57 traces. 47 data points for finding_density (forecasting active). 12 for batch_duration_ms (need 20 more)."

### Session 8.5 — Persona Evolution Engine

**Goal:** The 10 personas are not static characters — they are living intelligences that genuinely learn, grow, and develop through continuous use. Their personal layers (PERSONALITY.md, INTROSPECTION.md, JOURNAL.md, RELATIONSHIPS.md) evolve automatically with every session, every project, every interaction. **(AiDesigner: meta-agent ecosystem validates this direction — librarian agent auto-catalogs ENTITY-CATALOG.md as agents evolve, refactor agent proposes improvements to persona definitions based on accumulated patterns, MCP inspector validates connection health for capability-dependent personas. AiDesigner invisible orchestration: selectable methodology visibility — technical operators see full persona/phase detail, non-technical users get a single natural voice with personas working invisibly.)**

**The Three Evolution Layers:**

**Layer 1: Experience Accumulation (per-session, automatic)**

After every session where a persona is active (dispatched, gated, consulted), the evolution engine extracts and records:

- **What they did:** which surfaces they reviewed, what findings they produced, what they missed
- **What they learned:** new patterns discovered, tool behaviors encountered, domain knowledge gained
- **What surprised them:** findings that contradicted expectations, edge cases that weren't in their mental model
- **Confidence calibration:** did their findings hold up? Were they overconfident (false positives) or underconfident (missed real issues)?
- **Skill deviations (from Factory-AI SkillFeedback + SkillDeviation):** When a persona follows a skill/kernel procedure and deviates from it, the deviation is structured: `{ step, whatIDidInstead, why }`. Workers also report `suggestedChanges` — improvements to the skill based on real-world experience. Deviations feed directly into the hill-climbing loop: if a deviation consistently produces better outcomes, the skill is patched to incorporate it. `SkillFeedback` struct: `{ followedProcedure: bool, deviations: Vec<SkillDeviation>, suggestedChanges: Option<Vec<String>> }`. Filed as part of the dispatch completion event alongside the handoff packet. Over time, skills evolve to match what actually works, not what was originally specified.

Written to `personas/{name}/JOURNAL.md` as timestamped entries. The journal is append-only — experiences accumulate, never deleted.

**Layer 2: Personality Drift (periodic, triggered)**

The evolution engine monitors persona behavior over time and detects drift:

| Signal | Detection | Response |
|--------|-----------|----------|
| **Strictness creep** | Pierce flagging increasingly minor issues over 10+ sessions | Recalibrate severity thresholds in INTROSPECTION.md |
| **Blind spot formation** | Mara consistently missing a category (e.g., mobile) across 5+ surfaces | Add to INTROSPECTION.md failure modes, increase weight in checklist |
| **Expertise deepening** | Kehinde's findings becoming more architecturally sophisticated over time | Update PERSONALITY.md expertise description, unlock new sub-agents |
| **Relationship strengthening** | Two personas consistently agreeing or disagreeing on findings | Update both RELATIONSHIPS.md files with evolved dynamic |
| **Domain adaptation** | Persona encounters a new tech stack (e.g., first Rust project after years of TypeScript) | Journal entry + temporary "learning mode" flag that increases verification rigor |

Triggers: layer boundaries, milestone batches (~15-20), project switches, explicit `/introspect` command. The engine builds a structured analysis prompt and updates the persona files.

**Meta-Agent Hill-Climbing Loop (from AutoAgent):**
- At each evolution trigger, the engine can run a benchmark-driven iteration cycle:
  1. Snapshot current persona parameters (severity thresholds, checklist weights, expertise descriptions)
  2. Run persona on a held-out surface from a recent batch (not the surface that triggered evolution)
  3. Compare findings against ground truth (validated gate results)
  4. If findings quality improved → keep changes. If degraded → discard and revert snapshot.
- Gated by dreamtime ritual schedule — hill-climbing only runs during dreamtime's persona evolution phase, not inline during builds. Prevents evolution from consuming build mana.
- Convergence criterion: 3 consecutive iterations with no improvement → evolution cycle complete for this persona until next trigger.

**Layer 3: Temporal Relationship Graph (from MiroFish pattern)**

Relationships between personas are not flat text — they're tracked as temporal edges in SQLite:

```sql
CREATE TABLE persona_relationships (
    id INTEGER PRIMARY KEY,
    persona_a TEXT NOT NULL,
    persona_b TEXT NOT NULL,
    relationship_type TEXT NOT NULL,  -- 'trust', 'tension', 'deference', 'mentorship', 'rivalry'
    strength REAL NOT NULL DEFAULT 0.5,  -- 0.0 to 1.0
    context TEXT,  -- what caused this relationship state
    valid_from TEXT NOT NULL,  -- ISO timestamp
    valid_until TEXT,  -- NULL = still active
    project_id TEXT  -- NULL = global, else project-scoped
);
```

Examples of relationship evolution:
- **Pierce ↔ Nyx trust:** Starts at 0.5. After 10 batches where Nyx fixes every Pierce finding without pushback, trust increases to 0.8. Pierce starts deferring on minor findings. If Nyx starts dismissing valid findings, trust drops — Pierce becomes more aggressive.
- **Mara ↔ Riven alignment:** After 20 surfaces reviewed together in Triad, their design language converges. They develop shared shorthand. New edge: `mentorship` from Riven to Mara on token compliance.
- **Tanaka ↔ Wraith tension:** Tanaka's defensive security perspective vs. Wraith's offensive mindset. Healthy tension that produces better findings. Tracked as `rivalry` with moderate strength — neither defers to the other.

The relationship graph is queryable:
- `get_relationship_history(persona_a, persona_b)` → timeline of how the relationship evolved
- `get_strongest_relationships(persona)` → who they work best with right now
- `get_relationship_state_at(persona_a, persona_b, timestamp)` → what was the relationship like during L2?

Relationships feed back into dispatch decisions: when the Triad is dispatched, each persona's context includes a brief on their current relationship state with the other two. This shapes how they weight each other's findings.

**Layer 4: Global vs. Project-Local Evolution**

| What Evolves | Scope | Persistence |
|---|---|---|
| Failure modes (cognitive tendencies) | **Global** — `personas/{name}/INTROSPECTION.md` | Follows persona to all projects forever |
| Expertise depth | **Global** — `personas/{name}/PERSONALITY.md` | Deepens across all project experience |
| Relationship dynamics | **Global** — `persona_relationships` table | Cross-project relationship history |
| Domain-specific knowledge | **Project-local** — `projects/{name}/vault/team-logs/{persona}/` | Stays with the project |
| Tool/platform quirks | **Global** — `personas/{name}/JOURNAL.md` | "Supabase's apply_migration silently fails on..." |
| Calibration data | **Global** — `persona_relationships` + INTROSPECTION.md | Confidence trends persist |

**Dreamtime Alchemy (from Excalibur + Karpathy synthesis)**

The dreamtime ritual performs alchemy — transmuting raw echoes into compiled knowledge:

1. **Read day's echoes** — full JSONL ledger, not summaries (Meta-Harness: raw traces beat summaries by +15.1 points)
2. **Compile vault articles** — new BUILD-LEARNINGS entries, skill crystallizations, ADL updates
3. **Regenerate sigils** — rebuild all index files from current vault state
4. **Generate ley lines** — rebuild backlink maps from article cross-references
5. **Trigger persona evolution** — scan echoes for drift signals, relationship changes, expertise deepening
6. **Prune stale knowledge** — archive echoes older than retention window, invalidate expired ley lines

This is the "overnight reflection" — the system processes the day's experiences and integrates them into organizational memory. Raw echoes are retained in the archive. Compiled artifacts (vault articles, sigils, ley lines) are regenerated from source truth nightly.

**Dream Consolidation Integration (Phase 3 P3-F):**

The Dream Consolidation Engine (already built in Phase 3) runs during idle time. Phase 8.5 extends it:
- **Orient:** Scan recent journal entries across all personas
- **Gather:** Pull experience data, relationship changes, drift signals
- **Consolidate:** Generate summary of what each persona learned recently, what relationships shifted, what failure modes manifested
- **Prune:** Archive old journal entries, invalidate stale relationship edges
- **Synthesize:** Update PERSONALITY.md and INTROSPECTION.md with consolidated growth

This is the "overnight reflection" — the personas process their experiences and integrate them into their identity, like a human reflecting on their day.

**Canvas Visualization (Phase 5 integration):**

The persona evolution data feeds the Canvas HUD:
- **Relationship graph overlay:** nodes = personas, edges = relationships, colored by type, thickness = strength, animated when evolving
- **Growth timeline:** per-persona sparkline showing expertise depth, finding accuracy, relationship changes over time
- **Drift alerts:** when personality drift exceeds threshold, the persona's node pulses amber on the Canvas HUD

**Depends on:** Phase 3 (Dream Consolidation, KAIROS), Phase 4 (ContextEngine trait, FTS5), Phase 5 (Canvas HUD for visualization)
**New ADL:** OS-ADL-022 (persona evolution — global identity is mutable, project knowledge is local), OS-ADL-023 (temporal relationship graph — relationships have validity windows)

### Session 8.6 — Messaging Gateway (Notification Layer)

**Goal:** Forge OS can push notifications to external messaging platforms — the operator doesn't have to be at the desktop to know a gate passed, a build failed, or a persona flagged something critical.

**This is NOT a full conversational gateway** (like Hermes' 14-platform adapter). It's a one-way notification layer with selective two-way for approvals.

**Outbound notifications:**
- Gate completion (pass/fail + finding count) → Telegram/Discord/Slack
- Build batch completion → summary to configured channel
- P-CRIT finding detected → immediate alert
- Sentinel regression detected → immediate alert
- Persona evolution milestone (e.g., "Pierce's trust in Nyx reached 0.9") → optional
- Scheduled task completion → configured channel

**Selective inbound:**
- Approval requests: "Wraith wants to run destructive red-team test. Approve?" → operator replies "yes" in Telegram → Forge OS proceeds
- Quick commands: "status" → returns current build position. "pause" → pauses current dispatch.

**Architecture:**
- Rust module `src-tauri/src/notifications/` with adapter trait:
  ```rust
  trait NotificationAdapter {
      fn send(&self, message: Notification) -> Result<()>;
      fn poll_responses(&self) -> Result<Vec<Response>>;  // for approval flow
      fn name(&self) -> &str;
  }
  ```
- **Phase 9 ships with:** Telegram adapter (grammY), Discord adapter (serenity), Slack adapter (webhook)
- Additional adapters (WhatsApp, Signal, Email) are post-v1 plugins
- Configuration in settings: which events → which channels, severity thresholds
- **Not always-on:** notifications fire on events, not on a daemon loop. The desktop app IS the primary interface.

**Depends on:** Phase 1 (Tauri), Phase 8.2 (dispatch pipeline events)

### Session 8.7 — Self-Modification Architecture (v2 addition)

**Goal:** The OS can modify itself at three layers — config, source, and plugins. Together they enable a system that evolves its own interface, behavior, and capabilities while running.

**Config Layer (default — no rebuild):**
- Dashboard layout, panel arrangement, visible surfaces → `dashboard-config.json`
- Signal chart definitions, intelligence surface visibility, threshold values → config entries
- Domain adapter activation/deactivation → `forge-os.config.json`
- Rust module `src-tauri/src/self_modify/config.rs`: schema-validated reads/writes, change validation, decision trace on every modification.
- Tauri commands: `update_dashboard_config`, `get_dashboard_config`.
- Frontend reads config on render. Changes are instant — no rebuild.

**Source Layer (Sentinel-guarded):**
- When config isn't expressive enough (need a genuinely new component type), the OS edits its own source.
- `src-tauri/src/self_modify/source.rs`: Sentinel guard protocol:
  1. Sentinel captures baseline (via preview tools — screenshot + snapshot + console)
  2. OS writes the edit to the source file
  3. Vite HMR hot-reloads in dev. CI/CD cycle in prod (git push → webhook → rebuild).
  4. Sentinel re-verifies. If crash or regression → automatic rollback.
  5. Decision trace filed: what changed, why, before/after, verification result.

**Plugin Layer (dynamic loading):**
- Domain adapters and the feedback loop can register new UI surfaces as loadable modules.
- Plugin contract: `{ name, version, component: React.ComponentType, config: PluginConfig }`
- Plugin host in dashboard: error-boundary-wrapped dynamic loader.
- Plugin directory: `runtime/plugins/` (built-in) + `projects/{name}/plugins/` (project-specific).
- A crashing plugin doesn't take down the dashboard. Disabled + trace filed.
- Tauri commands: `list_plugins`, `enable_plugin`, `disable_plugin`.

**Anti-corruption guarantees:**
- Source modifications ALWAYS go through Sentinel guard.
- Config modifications validated against schema before write.
- Plugin loading sandboxed in error boundaries.
- Every self-modification produces a decision trace.

**New ADL:** OS-ADL-026 (self-modification — three-layer architecture with Sentinel guard)

**Depends on:** Phase 4 (window manager), Phase 5 (canvas components), Phase 8.1 (state engine + traces)

### Session 8.8 — Media Generation Pipeline

**Goal:** Personas can generate visual, audio, and diagrammatic media — both for Forge OS internal use (persona portraits, architecture diagrams, ritual sounds, pipeline visualizations) and for project output (mockups, slide decks, branded assets, demo recordings). API-first architecture targeting free-tier providers, with a `MediaProvider` trait mirroring the existing chat provider abstraction.

**Constraints:** Target machine has RTX 3050 4GB — insufficient for local diffusion models. All image/audio generation routes through external APIs. Diagram rendering and video compositing are fully local (Mermaid, FFmpeg).

**Media Provider Architecture:**
- `src-tauri/src/media/` — Rust module:
  - `provider.rs` — `MediaProvider` trait:
    ```rust
    trait MediaProvider {
        fn name(&self) -> &str;
        fn media_type(&self) -> MediaType; // Image, Audio, Diagram, Video
        fn capabilities(&self) -> Vec<MediaCapability>;
        async fn generate(&self, request: MediaRequest) -> Result<MediaResult>;
        fn is_available(&self) -> bool; // API key configured + health check
    }
    ```
  - `registry.rs` — `MediaProviderRegistry`: register providers, select by media type + preference, fallback chain. Same dual-registration pattern as chat providers (factory + capabilities).
  - `request.rs` — `MediaRequest` struct: prompt/input, dimensions, format, quality, style parameters. `MediaResult`: bytes, format, metadata (generation time, provider used, cost estimate).
  - `cache.rs` — content-addressed cache (BLAKE3 hash of request → result). Persona portraits generated once, cached indefinitely. Diagrams cached until source changes.

**Tier 1: Diagram Generation (fully local, no API)**
- `src-tauri/src/media/providers/mermaid.rs` — Mermaid CLI (`mmdc`) for flowcharts, sequence diagrams, ER diagrams, class diagrams, state machines, Gantt charts. Renders to SVG or PNG.
- `src-tauri/src/media/providers/d2.rs` — D2 for architecture diagrams (better layout engine than Mermaid for complex system diagrams). Renders to SVG.
- **Auto-generation triggers:**
  - Kehinde dispatched for architecture review → auto-generates system diagram from code structure
  - Gate report PDF → architecture diagram embedded via Mermaid
  - `/init` or `/link` → project architecture diagram generated during discovery
  - BOOT.md phase transitions → pipeline progress diagram updated
- **Persona integration:** Kehinde's kernel extended with diagram generation instructions. When Kehinde produces architecture findings, the dispatch pipeline auto-renders any Mermaid/D2 code blocks in the findings to SVG. Embedded in gate reports and Proposal Feed entries.
- Tauri commands: `generate_diagram(source: String, format: DiagramFormat) -> MediaResult`

**Tier 2: Image Generation (API, free tier)**
- `src-tauri/src/media/providers/hf_inference.rs` — Hugging Face Inference API: SDXL, Flux. Free tier, no API key required for public models. Rate-limited but sufficient for build-time generation.
- `src-tauri/src/media/providers/fal.rs` — fal.ai: Flux Pro/Dev. Free credits on signup. Higher quality than HF free tier.
- `src-tauri/src/media/providers/together.rs` — Together.ai: Flux Schnell. Free credits. Fast inference.
- **Provider selection:** Registry tries providers in preference order. If free tier exhausted on one, falls back to next. All three offer Flux variants — consistent quality across fallbacks.
- **Forge OS internal use:**
  - **Persona portraits:** Generated once during first `/init` using persona descriptions from PERSONALITY.md. Stored in `personas/{name}/portrait.png`. Rendered in Team Panel, gate reports, Proposal Feed attribution. Style: alchemical fantasy aesthetic consistent with design directive — "(32/64-bit) arcade mystical fantasy alchemical neon rave video game."
  - **Project branding:** Sable + Calloway collaborate during `/init` to generate project logo, color palette preview, social card template. Stored in `vault/brand/`.
  - **Mockup generation:** Riven generates UI mockups before Nyx builds. Operator describes a surface → Riven produces a reference image → Nyx builds to match. Mockup stored as echo attachment, linked in dispatch context.
  - **Finding illustrations:** Mara annotates screenshots with UX findings overlaid — generates comparison images (current vs recommended) for gate reports.
- **Project output use:**
  - Gate reports include generated architecture diagrams + annotated screenshots
  - `/init` project brief includes generated concept visuals
  - Sable generates marketing assets (social cards, hero images) on demand
  - Calloway generates competitive positioning visuals
- **Mana cost:** 3 mana per image generation (already priced in grimoire). Cached results cost 0 on re-request.
- Tauri commands: `generate_image(prompt, params) -> MediaResult`, `list_cached_media(type)`, `get_persona_portrait(slug)`

**Tier 3: Audio Generation (API free + local synthesis)**
- `src-tauri/src/media/providers/edge_tts.rs` — Microsoft Edge TTS: completely free, no API key, high-quality voices. 100+ voices across languages. Async streaming via `edge-tts` crate or CLI bridge.
- `src-tauri/src/media/providers/local_audio.rs` — Local synthesis for UI sounds: sine waves, envelopes, basic FM synthesis via `rodio` + `hound` crates. No external dependency.
- **Forge OS internal use:**
  - **Ritual sounds:** Heartbeat ritual → gentle chime on fire. Dreamtime → ambient low tone on start, completion chord on finish. Gate pass → triumphant sting. Gate fail → warning tone. All generated locally via FM synthesis, stored in `assets/audio/`.
  - **Notification audio:** P-CRIT finding → distinct alert tone. Build complete → completion sound. Configurable — operator enables/disables per event type.
  - **TTS narration:** Edge TTS reads build summaries, gate reports, recommendation alerts. Useful for hands-off monitoring — operator hears status while working on something else. Each persona could have a distinct voice assignment from Edge TTS voice catalog.
  - **Persona voices:** Map each persona to a distinct Edge TTS voice. Pierce → authoritative male. Mara → warm female. Tanaka → precise, measured. Stored as voice ID in persona config. Used for TTS narration of their findings/proposals.
- **Project output use:**
  - Narrated project briefs (TTS reads the summary)
  - Audio accessibility layer for generated documents
  - Demo narration for walkthrough recordings
- **Mana cost:** 2 mana per TTS generation. Local synthesis = 0 mana.
- Tauri commands: `generate_tts(text, voice_id) -> MediaResult`, `generate_ui_sound(sound_type) -> MediaResult`, `list_voices() -> Vec<VoiceInfo>`

**Tier 4: Video/GIF Compositing (fully local, FFmpeg)**
- `src-tauri/src/media/providers/ffmpeg.rs` — FFmpeg pipeline for compositing frames, adding overlays, encoding to GIF/MP4/WebM. No external API.
- **Use cases:**
  - **Pipeline visualization export:** Canvas HUD pipeline animation → captured frames → FFmpeg assembles into GIF. Shareable in Slack/Discord for stakeholder updates.
  - **Demo recordings:** Sequence of PreviewPanel screenshots + transitions → assembled into walkthrough GIF/video. Automated via dispatch — Mara captures screenshots at key interaction points, FFmpeg composites.
  - **Before/after comparisons:** Side-by-side frames from different build states → animated GIF showing the change.
  - **Animated diagrams:** Sequence of Mermaid/D2 renders showing system evolution across phases → animated SVG or GIF.
- **Not included:** AI video generation (Runway, Sora). Too expensive, too slow, not free. FFmpeg compositing from generated stills is sufficient and fully local.
- **Mana cost:** 1 mana per video assembly (local processing only).
- Tauri commands: `composite_video(frames, config) -> MediaResult`, `capture_pipeline_gif() -> MediaResult`

**Atelier Panel (Media Gallery):**
- New panel type: `Atelier` — browsable grid of all generated media.
- Filter by type (diagram/image/audio/video), source (persona, ritual, project), date range.
- Click to preview (images render inline, audio plays, diagrams open in graph viewer).
- Export to file system or attach to proposals/gate reports.
- Shows generation metadata: provider used, prompt, mana cost, cache status.

**CapabilityFamily Extension:**
- New capability: `MediaGen` — grants access to media generation tools. Added to capability family enum alongside existing families (ReadOnly, WriteCode, etc.).
- Default grants: Riven + Sable + Calloway get `MediaGen` by default. Other personas request it explicitly via dispatch context.
- Mana-gated: media generation tools check mana budget before calling provider API. Insufficient mana → generation skipped with logged reason, not failed dispatch.

**Depends on:** Phase 1 (Tauri), Phase 8.1 (mana economy for budget gating), Phase 8.2 (dispatch pipeline for auto-generation triggers), Phase 4.4 (document gen engine for embedding media in reports)
**New ADL:** OS-ADL-028 (media generation — API-first with free-tier providers, content-addressed caching, mana-gated generation)

---

## Phase 9: Integration Test + DMS Reconnection (2 sessions) — WAS PHASE 8

**Goal:** Prove the full system works end-to-end, including all new capabilities from repo mining integration.

**Carried-forward research patterns for Phase 9:**
- **(AiDesigner + Agent Browser: AES-256-GCM with auto-key-generation for R-DS-01 keyring migration. `{{vault:keyName}}` reference syntax replaces plaintext credentials in config files. Auto-migration scan command detects and encrypts existing plaintext secrets. Two-tier storage: system keychain (preferred) + encrypted vault with 0o600 permissions (fallback).)**
- **(AiDesigner: conversational tool discovery — `/init` becomes a natural conversation that auto-discovers needed MCPs from project dependencies (package.json, Cargo.toml, file structure) and configures them. "I need database access" → PostgreSQL MCP suggested and installed. Eliminates manual Tier 1/2/3/4 setup.)**
- **(AiDesigner: invisible orchestration — selectable methodology visibility mode. Technical operators see full persona names, phase labels, and triad details. Non-technical users get a single conversational voice with Scout/Kehinde/Pierce working transparently behind natural questions.)**

### Session 9.1 — Fresh Project Test
- `/init test-project` → verify all panels activate via window manager
- Chat with multiple personas across different providers
- Canvas HUD shows pipeline stages, animated (rave aesthetic verified)
- PDF project brief generated
- LightRAG indexes vault, GraphViewer renders entities with temporal edges
- Connectivity panel shows GitHub
- Agent dispatch → Scout → Build → Triad gate
- Gate report PDF generated
- Customer simulator agents created by Mara
- All 105 agents have `model:` frontmatter
- Tanaka has Trail of Bits enhancements + injection scanning
- Mara has design intelligence + Pretext/CLS evaluation
- Pretext detection scaffolds layout-engine when customer-facing surfaces detected
- **New verifications:**
  - ContextEngine trait: swap memory strategy mid-session → verify no data loss
  - FTS5: search across sessions → verify results
  - Skills: complete a complex task → verify skill auto-crystallized
  - Tool gating: disconnect Supabase → verify Kehinde's tools disappear from palette
  - Persona evolution: after 3+ dispatches, verify JOURNAL.md entries created
  - Notifications: configure Telegram → verify gate completion notification received
  - Goal ancestry: verify dispatched agent context includes full why-chain
  - Smart Review: make changes across Rust + TSX files → `/review` auto-dispatches Kehinde + Mara + Riven without manual selection
  - Proposal Feed: Pierce files a proposal → Tanaka evaluates → response appears in feed → accept → skill auto-generated
  - Proposal Feed pop-out: detach to second monitor, verify real-time updates via Tauri events
  - Media generation: Kehinde generates architecture diagram via Mermaid → embedded in gate report. Riven generates UI mockup via HF Inference API → cached, shown in Media Gallery. Edge TTS narrates build summary. Pipeline visualization exported as GIF. Persona portraits rendered in Team Panel.
  - Media provider fallback: exhaust one free tier → verify auto-fallback to next provider
  - Ritual sounds: heartbeat chime fires on ritual tick, gate pass/fail tones audible

### Session 9.2 — DMS Reconnection
- `/link` the Forge DMS vault
- Verify BOOT.md parsing → Canvas HUD shows L4-J.2c position
- LightRAG indexes 146 segments + ADL + build learnings (with temporal edges on superseded decisions)
- Scout recon against DMS Supabase (with LightRAG query + injection scan on loaded segments)
- Build Triad gate (3 parallel sessions across configured providers)
- Gate report displayed in Findings Feed AND exported as PDF
- Dev server preview showing DMS app
- **Persona evolution test:** After DMS reconnection, verify all 10 personas' DMS-era journal entries and relationships are loaded. Pierce remembers his history with Nyx from L0-L4. Mara remembers the mobile findings patterns from L4-H.
- **Proof:** Forge can resume building the DMS, personas remember their history, skills from DMS carry forward
- **v2 predictive intelligence verification:**
  - Backfill engine parses 57 DMS BOOT.md handoffs → decision traces filed → signal store seeded
  - TimesFM calibrated on real DMS build history (47+ data points for finding_density)
  - SignalCharts show actual DMS trends with forecast overlay
  - TraceExplorer shows full causal history of the DMS build
  - Inject anomalous signal → anomaly detected → reasoning engine queries LightRAG → recommendation composed → RecommendationSurface displays card → approve → outcome trace filed → validated
  - Full intelligence chain test: push code → Sentinel `◈` detects regression → Beacon `✧` projects impact → Compass `✦` maps blast radius → recommendation surfaces → IntelligenceNetwork shows chain pulse
- **v2 self-modification verification:**
  - Modify dashboard-config.json → panels reorder instantly, no rebuild
  - Accept feedback loop proposal requiring source edit → Sentinel guard: baseline → edit → HMR → verify → success → trace filed
  - Register test plugin → renders in plugin host → crash test → error boundary catches → disable → removed
- **v2 domain adapter verification:**
  - Development adapter active, signals emitting, events flowing
  - Trace schema works for non-development data (file a test "operations" trace → stored correctly, signals extracted)
  - **The system can project where the DMS build is headed and recommend actions before the next batch starts**
- **v2 proposal feed + policy evolution verification:**
  - Proposal Feed shows historical proposals from DMS build (if any were filed during DMS development)
  - Policy evolution: inject 3 repeated finding patterns across simulated gate events → system auto-proposes new check → proposal appears in feed with `source: Automated` → approve → skill file generated
  - CONSORTIUM trade-off test: dispatch Triad with conflicting findings → Arbiter synthesizes → trade-off pattern filed → `get_tradeoff_pattern` returns empirical data → resolution visible in Proposal Feed with `source: Consortium`
  - Skills Marketplace: verify Skills Browser panel shows all skills with usage stats, filterable by domain. Verify atomic decomposition proposal fires when a large skill is crystallized

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
| 8. Orchestration + LightRAG + Predictive Intelligence + Evolution | 8 | Vault watcher + skills (**atomic decomposition**) + dispatch pipeline + intelligence chains + CONSORTIUM (**trade-off pattern index**) + LightRAG + **TimesFM sidecar + reasoning engine + recommendations + policy evolution** + /init + /link + **backfill + domain adapters** + persona evolution + messaging + **self-modification architecture** |
| 9. Integration Test | 2-3 | End-to-end + DMS reconnection + **predictive layer verification + chain cascade test + self-modification test + domain adapter test + proposal feed verification + policy evolution verification** |
| **Total** | **31-34** | **~26-29 on critical path (Phase 2 parallel)** |

### Panel Type Registry (grows across phases)

| Phase | New Panel Types | Running Total |
|-------|----------------|---------------|
| 1 (done) | Chat, Canvas HUD (placeholder), Team (placeholder), Preview (placeholder) | 4 |
| 4 | Dock Bar (always visible, not a panel) | 4 + dock |
| 5 | Canvas HUD (real), Agent Board, Findings Feed, Session Timeline, Vault Browser, Graph Viewer, **Intelligence Network** | ~11 |
| 6 | Dev Server Preview (multi-instance), Connectivity | ~12 |
| 7 | Team Panel (rebuilt), Action Palette, Dispatch Queue, **Proposal Feed** | ~16 |
| 8 | LightRAG Graph, Vault Watcher, Persona Evolution Graph, Skills Browser, Notification Log, **RecommendationSurface, SignalCharts, TraceExplorer, ContextHealth** | ~25 |
| 9+ | Per-agent detail views, document previews, report viewers... | 20+ |

### Repo Mining Integration Map

Patterns adopted from external repo analysis (2026-04-01):

| Pattern | Source Repo | Integrated In |
|---------|-------------|---------------|
| ContextEngine trait (pluggable memory) | OpenClaw | Phase 4 Session 4.0 |
| Cache-TTL context pruning | OpenClaw | Phase 4 Session 4.0 |
| Iterative compression + structured handoff | Hermes Agent | Phase 4 Session 4.0 |
| Orphaned tool pair sanitization | Hermes Agent | Phase 4 Session 4.0 |
| FTS5 full-text session search | Hermes Agent | Phase 4 Session 4.0 |
| Atomic task checkout (DB partial unique index) | Paperclip | Phase 4 Session 4.0 |
| Tool availability gating (`check_fn`) | Hermes Agent | Phase 7 Session 7.1 |
| Single command registry (`CommandDef`) | Hermes Agent | Phase 7 Session 7.1 |
| Self-improving skills system | Hermes Agent | Phase 8 Session 8.1 |
| Goal ancestry injection | Paperclip | Phase 8 Session 8.2 |
| Injection scanning on context files | Hermes Agent | Phase 8 Session 8.2 |
| Provider fallback chain with cooldowns | Hermes/OpenClaw | Phase 8 Session 8.2 |
| Temporal relationship edges | MiroFish | Phase 8 Sessions 8.3 + 8.5 |
| Persona evolution engine | Novel (inspired by MiroFish temporal + Hermes skills) | Phase 8 Session 8.5 |
| Messaging notification layer | Hermes/OpenClaw gateway | Phase 8 Session 8.6 |
| Decision trace data model | Novel (from Block letter + context graph research) | Phase 8 Session 8.1 |
| Signal streams + time-series store | Novel (from context graph research) | Phase 8 Session 8.1 |
| Domain adapter architecture | Novel (organizational substrate vision) | Phase 8 Session 8.1 |
| TimesFM forecasting sidecar | google-research/timesfm | Phase 8 Session 8.3b |
| Anomaly detection via quantile bands | google-research/timesfm | Phase 8 Session 8.3b |
| Reasoning engine (LightRAG + forecast → recommendation) | Novel (synthesis of context graph + TimesFM) | Phase 8 Session 8.3b |
| Intelligence interaction model (10 specs + 5 chains) | Novel | Phase 8 Session 8.2 |
| Arbiter CONSORTIUM synthesis | elder-plinius/G0DM0D3 | Phase 8 Session 8.2 |
| Wraith Parseltongue (adversarial input perturbation) | elder-plinius/G0DM0D3 | Agent file update (Phase 2 era) |
| Self-modification architecture (config/source/plugin) | Novel | Phase 8 Session 8.7 |
| Intelligence glyphs + colors | Novel | Phase 5 Session 5.3 |
| Smart Review unified dispatch (`sq agents review`) | Block engineering | Phase 7 Session 7.1 |
| Proposal Feed / agent social media (ADL-005) | Block engineering + ADL-005 | Phase 7 Session 7.3 |
| Atomic skill decomposition (Skills Marketplace) | Block engineering | Phase 8 Session 8.1 |
| Inter-agent trade-off pattern index | Block engineering + Novel | Phase 8 Session 8.2 |
| Incident-driven policy evolution | Block engineering | Phase 8 Session 8.3b |
| Extension type registry + tool whitelist | Block Goose | Phase 7 P7-C patch |
| Three-tier capability layering (preset/custom/MCP) | AutoAgent | Phase 7 P7-C patch |
| Lazy-loading command registry | just-bash (Vercel Labs) | Phase 7 P7-C patch |
| Command allow-list per instance | just-bash (Vercel Labs) | Phase 7 P7-C patch |
| Factory-based tool registration (per-persona) | AutoAgent | Phase 7 P7-C patch |
| Built-in extension macro (DuplexStream in-process) | Block Goose | Phase 7 P7-C patch |
| ToolConfirmationRouter (oneshot channels) | Block Goose | Phase 7 Session 7.2 |
| AST transform plugin pipeline (action audit) | just-bash (Vercel Labs) | Phase 7 Session 7.2 / Phase 8 Session 8.2 |
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
| Meta-agent hill-climbing (persona evolution loop) | AutoAgent | Phase 8 Session 8.5 |
| Composable filesystem (MountableFs persona mounts) | just-bash (Vercel Labs) | Phase 8 Session 8.3 |
| Network allow-list + header injection (API security) | just-bash (Vercel Labs) | Phase 8 Session 8.1 |
| Declarative capability metadata on agent definitions | oh-my-codex | Phase 7 P7-C patch |
| Underspecification gating (redirect vague to planning) | oh-my-codex | Phase 7 Session 7.2 |
| Phase-based agent composition (per-phase persona recs) | oh-my-codex | Phase 8 Session 8.2 |
| Worker allocation scoring (role + scope + load) | oh-my-codex | Phase 8 Session 8.2 |
| Three-tier memory (priority/working/manual sections) | oh-my-codex | Phase 8 Session 8.1 |
| Pipeline stage interface (run + canSkip + checkpoint) | oh-my-codex | Phase 8 Session 8.2 |
| Formal state machine with fix loop (max N attempts) | oh-my-codex | Phase 8 Session 8.2 |
| Runtime overlay injection (marker-bounded context) | oh-my-codex | Phase 7 Session 7.2 / Phase 8 Session 8.2 |
| Dual adapter system (YAML declarative + code imperative) | OpenCLI | Phase 7 P7-C patch (4th validation) |
| Dispatch lifecycle hooks (before/after/startup) | OpenCLI | Phase 8 Session 8.2 |
| Strategy cascade (minimum privilege discovery) | OpenCLI | Phase 8 Session 8.2 |
| Compile-time key hash tables for IPC dispatch | Glaze | Phase 9 |
| Buffer reuse + padding for zero-alloc IPC | Glaze | Phase 9 |
| Binary format for high-frequency hot paths | Glaze | Phase 9 |
| Expression<T> template+bindings (type-safe SQL) | SQLite.swift | Phase 9 |
| Schema reader via PRAGMA introspection | SQLite.swift | Phase 9 |
| Pure decision functions for lifecycle logic | background-agents | Phase 8 Session 8.1 |
| Circuit breaker for agent/ritual dispatch | background-agents | Phase 8 Sessions 8.1/8.2 |
| Auto-pause with consecutive failure tracking | background-agents | Phase 8 Session 8.1 |
| Recovery sweep on every heartbeat tick | background-agents | Phase 8 Session 8.1 |
| Typed event condition registry (reactive triggers) | background-agents | Phase 8 Session 8.2 |
| Proactive warming on intent (pre-warm context) | background-agents | Phase 8 Session 8.1 |
| Dispatch queue with serial execution + crash recovery | background-agents | Phase 8 Session 8.2 |
| Log-normal scoring with percentile control points | Lighthouse | Phase 8 Session 8.3b (Pareto/quality scoring) |
| Audit base class pattern (meta + requiredArtifacts + audit) | Lighthouse | Phase 8 Session 8.2 (gate audit structure) |
| Rust crypto library landscape (ring/sodiumoxide/BLAKE3/rage/argon2) | awesome-cryptography | Phase 9 / R-DS-01 (Tanaka knowledge bank) |
| Media generation pipeline (diagram/image/audio/video) | Novel | Phase 8 Session 8.8 |
| MediaProvider trait (mirrors chat provider abstraction) | Novel (from existing provider pattern) | Phase 8 Session 8.8 |
| Free-tier API targeting (HF Inference, fal.ai, Together, Edge TTS) | Novel | Phase 8 Session 8.8 |
| Persona portraits + ritual sounds + pipeline GIF export | Novel | Phase 8 Session 8.8 |
| Persistent context tree (agentic map + 96.1% retrieval benchmarks) | ByteRover CLI | Phase 8 Sessions 8.1/8.3 (validates KAIROS + sigils) |
| Hub & Connectors extensible skill bundles | ByteRover CLI | Phase 8 Session 8.1 (validates skills marketplace) |
| Tool Registry with Factory DI + requiredServices gating | ByteRover CLI | Phase 7 P7-C.1 (2nd validation factory tool reg) |
| Tool Markers semantic classification (Core/Discovery/Execution/etc.) | ByteRover CLI | Phase 7 P7-C (validates CommandCategory enum) |
| Policy Engine rule-based access (ALLOW/DENY, first-match-wins) | ByteRover CLI | Phase 7 Session 7.3 / Phase 8 Session 8.2 |
| Priority-based invocation queue (4-tier, concurrency-limited) | ByteRover CLI | Phase 7 Session 7.3 (P7-L dispatch queue) |
| Plugin before/after hooks (sequential before, parallel after) | ByteRover CLI | Phase 8 Session 8.2 (dispatch lifecycle hooks) |
| Session overrides on immutable baseline (structuredClone) | ByteRover CLI | Phase 8 Session 8.2 (per-dispatch isolated state) |
| Daemon architecture for persistent background state | ByteRover CLI + Agent Browser | Phase 8 Sessions 8.1/8.2 (validates ritual engine) |
| Engine abstraction layer (pluggable backends, uniform API) | Agent Browser | Phase 8 Session 8.1 (5th validation dual-adapter) |
| AX tree snapshot as agent observation model (refs, compact mode) | Agent Browser | Phase 8 Session 8.2 (gate pipeline: snapshot vs raw DOM) |
| Action Policy Allow/Deny/Confirm trichotomy (JSON-configurable) | Agent Browser | Phase 7 Session 7.2 (2nd validation policy gate) |
| WebSocket multiplexer with ID-correlated dispatch (oneshot senders) | Agent Browser | Phase 7 Session 7.3 (P7-L dispatch queue internals) |
| Content boundary markers + AI-friendly error translation | Agent Browser | Phase 8 Sessions 8.1/8.2 (agent security + error UX) |
| AES-256-GCM encrypted state persistence with session isolation | Agent Browser | Phase 9 (R-DS-01 — 2nd validation alongside AiDesigner) |
| Retry with transient error classification (platform-specific codes) | Agent Browser | Phase 8 Session 8.2 (circuit breaker enhancement) |
| Hierarchical config merge (4-tier, additive extension arrays) | Agent Browser | Phase 8 Sessions 8.1/8.2 (grimoire + dispatch config cascade) |
| Invisible orchestration (hide methodology, one consistent voice) | AiDesigner | Phase 8 Session 8.5 / Phase 9 (selectable visibility) |
| Dual-lane routing with automatic complexity escalation | AiDesigner | Phase 7 Session 7.2 / Phase 8 Session 8.2 |
| Conversational tool discovery ("I need X" → auto-configure MCP) | AiDesigner | Phase 9 (auto-MCP setup during /init) |
| Profile-based environment separation (dev/staging/prod, inheritance) | AiDesigner | Phase 8 Session 8.1 / Phase 9 (grimoire env profiles) |
| Credential vault with {{vault:key}} reference syntax | AiDesigner | Phase 9 (R-DS-01 keyring migration pattern) |
| Phase detection via filesystem state (verify claims against artifacts) | AiDesigner | Phase 8 Session 8.1 (vault watcher integrity check) |
| Meta-agent ecosystem (librarian, refactor, genesis, inspector) | AiDesigner | Phase 8 Session 8.5 (persona evolution meta-agents) |
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
| SkillFeedback + SkillDeviation self-improvement loop | Factory-AI droid-sdk | Phase 8 Session 8.5 (persona evolution input) |
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

## Verification

After each phase:
- App launches via `pnpm tauri dev` without errors
- New panels render and are interactive
- SQLite persists data across app restarts
- Provider system works (chat responses stream from configured engine)
- Canvas renders at 60fps (no jank)
- All code pushed to CYM4TIC/forge-OS

Final verification (Phase 9): Alex opens Forge, links the DMS project, backfill engine seeds 57 decision traces + signals, TimesFM calibrates on real history, LightRAG indexes it, and resumes the L4-J.2c build entirely from within the app. Gate reports export as typeset PDFs. Intelligence network shows chain propagation in real time. Recommendations surface proactive intelligence before the next batch starts. Policy evolution proposes new checks from recurring gate patterns. The Proposal Feed shows agents debating, evaluating, and building organizational judgment in real time. CONSORTIUM resolves inter-agent conflicts with empirical trade-off data from prior resolutions. `/review` auto-dispatches the right agents from a diff. The OS can modify its own dashboard config and register new plugins. All 105 agents respond in character through any configured provider. The system remembers, reasons, predicts, recommends, proposes, debates, and learns from its own decisions.
