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
  - Gate report template: title, **persona glyph attribution per finding**, findings table (severity/persona/description/evidence/fix), summary stats, **multi-column body text flowing around severity distribution charts**, **pull quotes from Pierce/Mara/Riven findings**
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
  - Nyx bolt → Build Triad glyphs: crosshair + eye + grid (gate dispatch — three glyphs streak in formation)
  - Triad glyphs → Nyx bolt (findings return — severity-colored trail)
  - Wraith probe paths hitting system surfaces
- **Dispatch is visible as motion:** dispatching the Build Triad shows three glyphs (Pierce crosshair + Mara eye + Riven grid) accelerating along bezier paths toward the target surface. The personas are characters in the visualization, not just labels.
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

## Phase 7: Team Panel + Agent Presence + Action Palette (3 sessions) — WAS PHASE 6

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

Five Tauri commands:
- `get_agent_registry()` → full registry (called once on mount, refreshable)
- `get_agent_content(slug)` → full markdown body for system prompt construction
- `get_palette_actions(selected_slugs)` → resolved actions for current persona selection (filters by availability)
- `get_command_registry()` → all commands with current availability state
- `smart_review_routing(diff_summary)` → resolved persona list from diff analysis (used by smart-review orchestrator)

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
| `{pierce, mara, riven}` | Build Triad |
| `{kehinde, tanaka, vane}` | Systems Triad |
| `{calloway, voss, sable}` | Strategy Triad |
| `{pierce, mara, riven, kehinde, tanaka, vane, wraith, sentinel, meridian}` | Full Audit |
| `{calloway, voss, sable, wraith}` | Launch Sequence |
| `{all 10 personas}` | The Council |
| `{pierce, mara, riven}` | Gate Runner (dispatches Triad) |
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

**React files:**
- `src/hooks/usePersonaSelection.ts` — toggle/clear/isSelected over `Set<string>`
- `src/hooks/useActionPalette.ts` — fetches palette on selection change (150ms debounce), exposes `dispatch(action)` handler
- `src/components/team/ActionPalette.tsx` — grouped action list with click-to-dispatch rows
- Modified: `AgentPresence.tsx` (click-to-select), `TeamPanel.tsx` (third tab + hook wiring), `tauri.ts` (new types + invoke wrappers)

### Session 7.3 — Agent Orchestration UI + Proposal Feed

**Dispatch Queue:**
- **Dispatch Queue** — **separate panel type.** What's pending, what's running. Can float alongside Canvas HUD or pop out.
- Parallel execution indicator (e.g., "3 Triad agents running")
- Gate status display (pass/fail/in-progress per gate)
- Session timeline (horizontal, shows BOOT.md handoffs as milestones)
- "Export Report" button → generates PDF via document generation engine
- **Protocol enforcement point #1:** Gate dispatch is a pipeline stage, not an option. The dispatch queue refuses to advance a batch past "Build" until Triad agents have been dispatched and the findings table (P5-G) shows zero open items. No silent skipping.

**Proposal Feed — ADL-005 Implementation (Internal Feedback Loop)**

The OS has a formalized internal communication system where personas propose changes, evaluate each other's proposals, and build organizational judgment collectively. This is the "social media for agents" — a visible feed of inter-agent reasoning.

**Rust backend:** `src-tauri/src/proposals/`

- `store.rs` — CRUD for proposals. Schema:
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
      status: ProposalStatus,   // Open | Evaluating | Accepted | Rejected
      evaluators: Vec<String>,  // persona slugs assigned to evaluate
      responses: Vec<ProposalResponse>, // threaded evaluation responses
      created_at: String,
      resolved_at: Option<String>,
      decision_trace_id: Option<Ulid>, // links to context graph trace on resolution
  }
  ```
- `triage.rs` — auto-routes proposals to scope-appropriate personas for evaluation. Security proposal → Tanaka evaluates. UX proposal → Mara evaluates. Architecture → Kehinde. Cross-cutting → Council. Uses Agent Registry (7.1) for persona→domain mapping. Proposals can also be manually assigned.
- `decisions.rs` — accepted proposals become decisions in `.forge/decisions/`. Rejected proposals preserve reasoning (why not). Both indexed by LightRAG (Phase 8.3) when available. Decision schema mirrors proposal but adds: resolution rationale, implementing batch, outcome tracking.
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

**New panel types registered in this phase:** Team Panel (rebuilt), Action Palette, Dispatch Queue, Proposal Feed (4 new, total ~18)

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
- Build state aggregator (combines vault state + SQLite metrics)
- Session management (create, resume, archive)
- **Auto-memory extraction (Mem0-inspired):**
  - After every BOOT.md write, auto-scan session for:
    - Tool surprises or workarounds → BUILD-LEARNINGS.md
    - Persona failure patterns → flag for introspection
    - Implicit architecture decisions → document in ADL
    - Reusable patterns → BUILD-LEARNINGS.md
  - Failure mode evaluation: persona-inherent (propagate globally) vs. project-specific (stay local)
- **Context Graph: Decision Trace Store (v2 addition)**
  - Every meaningful action produces a structured decision trace: `observation → reasoning → action → outcome`. This is the atomic unit of organizational judgment.
  - `src-tauri/src/context_graph/` — Rust module:
    - `store.rs` — append-only JSONL + SQLite FTS5 index. Trace schema: id (ULID), source (domain adapter), type, timestamp, observation (what/where/evidence), reasoning (why/references/confidence), action (what/who/artifacts), outcome (result/validated/learned), graph edges (caused_by/leads_to/related_to), tags, signals_emitted.
    - `query.rs` — query by time range, source, type, tags. Edge traversal: given a trace, walk the causal chain recursively. Full-text search on observation + reasoning.
    - `backfill.rs` — parse BOOT.md handoffs into DecisionTrace objects. Run once during `/link` to seed graph from project history.
  - Domain-agnostic schema. Development traces ("3 P-CRITs in auth surface") and future business traces ("deal velocity dropped 30%") use the same structure.
  - SQLite migration: `traces` table + FTS5 virtual table + triggers.
  - Tauri commands: `file_trace`, `query_traces`, `get_trace`, `walk_causal_chain`.

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

- **Self-Improving Skills System (from Hermes pattern)**
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

### Session 8.2 — Agent Dispatch Pipeline + Goal Ancestry + Injection Scanning

**Protocol enforcement points #1, #3, #4, #5:**
- **#1 Gate dispatch as pipeline stage:** The orchestration engine enforces Scout → Build → Triad → Sentinel as mandatory stages. The pipeline will not advance past Build until Triad agents have been dispatched and all findings in SQLite are resolved. This is the central enforcement mechanism — the system physically cannot skip gates.
- **#3 Batch decomposition validation:** Before a phase begins, the pipeline validates that every batch in the manifest has gate assignments. No assignments = phase won't start. Prevents batches shipping without gate coverage.
- **#4 Diff-aware gate routing:** The pipeline knows what files changed per batch. Rust files → auto-assign Kehinde. TSX/CSS → auto-assign Mara + Riven. SQL/migrations → auto-assign Tanaka. Auth code → auto-assign Tanaka. Gate map partially automated from file diffs.
- **#5 Read-back verification in audit trail:** The dispatch audit trail verifies that for every file written during a batch, a corresponding read-back occurred. If not, the batch is flagged incomplete before gates can run.

- Orchestration engine in Rust:
  - Sequential: Scout → Build → Gate → Sentinel
  - Parallel: 3 Triad agents simultaneously (3 concurrent provider streams)
  - Each agent's `model:` frontmatter determines capability tier → routed to configured provider's best model
  - Mixed-provider dispatch: Nyx on Claude Opus, sub-agents on GPT-4, Sentinel on fast local model
  - Gate enforcement: parse findings, determine pass/fail
  - Auto-fix loop: findings → Nyx fix → re-verify
- Pipeline state emitted to frontend via Tauri events
- Provider fallback: rate-limit or error → auto-fallback to next provider at same tier (from Hermes/OpenClaw pattern — cooldown tracking per API key profile)
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

### Session 8.3 — LightRAG Integration
- Install LightRAG (`pip install lightrag-hku`) + MCP bridge
- Configure with Claude API backend
- `tools/index-vault.py` for batch indexing
- Query routing: hybrid default, local for entity questions, global for cross-cutting
- Index OS's own docs as test → verify queries
- Wire into Scout's pre-build recon (LightRAG query for batch-relevant entities)
- Wire into GraphViewer (Phase 5.3) — LightRAG entities with Pretext-measured labels
- Auto-index when `/init` or `/link` creates a new vault
- **Temporal edges (from MiroFish pattern):** relationships in the knowledge graph carry `valid_from` / `valid_until` timestamps. Architecture decisions that get superseded have their edges invalidated rather than deleted. Scout can query "what was true about auth at the time L2 was built" vs "what's true now." Enables historical reasoning.

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

**Goal:** The 10 personas are not static characters — they are living intelligences that genuinely learn, grow, and develop through continuous use. Their personal layers (PERSONALITY.md, INTROSPECTION.md, JOURNAL.md, RELATIONSHIPS.md) evolve automatically with every session, every project, every interaction.

**The Three Evolution Layers:**

**Layer 1: Experience Accumulation (per-session, automatic)**

After every session where a persona is active (dispatched, gated, consulted), the evolution engine extracts and records:

- **What they did:** which surfaces they reviewed, what findings they produced, what they missed
- **What they learned:** new patterns discovered, tool behaviors encountered, domain knowledge gained
- **What surprised them:** findings that contradicted expectations, edge cases that weren't in their mental model
- **Confidence calibration:** did their findings hold up? Were they overconfident (false positives) or underconfident (missed real issues)?

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

---

## Phase 9: Integration Test + DMS Reconnection (2 sessions) — WAS PHASE 8

**Goal:** Prove the full system works end-to-end, including all new capabilities from repo mining integration.

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

## Verification

After each phase:
- App launches via `pnpm tauri dev` without errors
- New panels render and are interactive
- SQLite persists data across app restarts
- Provider system works (chat responses stream from configured engine)
- Canvas renders at 60fps (no jank)
- All code pushed to CYM4TIC/forge-OS

Final verification (Phase 9): Alex opens Forge, links the DMS project, backfill engine seeds 57 decision traces + signals, TimesFM calibrates on real history, LightRAG indexes it, and resumes the L4-J.2c build entirely from within the app. Gate reports export as typeset PDFs. Intelligence network shows chain propagation in real time. Recommendations surface proactive intelligence before the next batch starts. Policy evolution proposes new checks from recurring gate patterns. The Proposal Feed shows agents debating, evaluating, and building organizational judgment in real time. CONSORTIUM resolves inter-agent conflicts with empirical trade-off data from prior resolutions. `/review` auto-dispatches the right agents from a diff. The OS can modify its own dashboard config and register new plugins. All 105 agents respond in character through any configured provider. The system remembers, reasons, predicts, recommends, proposes, debates, and learns from its own decisions.
