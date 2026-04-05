## Phase 4: Runtime Upgrades + Window Manager + Pretext + Document Generation (20 batches, 5 sessions)

> Harden Phase 3 runtime with repo mining patterns, then build the spatial foundation (floating window manager),
> the canvas rendering primitive (Pretext), and the dual-output document engine.
> Every visual component in Phases 5-9 depends on this phase being right.
> Build plan: `docs/TAURI-BUILD-PLAN.md` Phase 4 section.

**Session map:** 4.0 = P4-A through P4-E | 4.1 = P4-F through P4-I | 4.2 = P4-J through P4-L | 4.3 = P4-M through P4-P | 4.4 = P4-Q through P4-T
**Prerequisite:** Phase 3 COMPLETE + AUDITED. `tauri build` green. Commit `0c95cc8`.
**Repo:** CYM4TIC/forge-OS | **Local:** `.repo/`

---

### Session 4.0 — Runtime Upgrades (Post-Phase-3 Hardening)

Retroactive enhancements to Phase 3 systems based on repo mining (Hermes Agent, OpenClaw, Paperclip). Rust backend only — no UI changes.

---

#### P4-A: ContextEngine Trait Extraction

**Goal:** Extract formal `ContextEngine` trait from KAIROS, making memory management pluggable. KAIROS becomes `KairosEngine: ContextEngine`. Future memory strategies implement the same trait. Dispatch pipeline calls `ContextEngine` methods — never KAIROS directly.

**Files:**
- `src-tauri/src/memory/engine.rs` — ContextEngine trait definition (bootstrap, maintain, ingest, after_turn, assemble, compact, prepare_subagent_spawn, on_subagent_ended, dispose)
- `src-tauri/src/memory/kairos.rs` — KairosEngine struct implementing ContextEngine (wraps existing logs/topics/dream/index logic)
- `src-tauri/src/memory/mod.rs` — EDIT: add engine + kairos modules, re-export ContextEngine trait

**Gate:** `cargo check` clean. Existing memory commands still work (append_memory, query_memory, trigger_dream). KairosEngine passes all methods through to existing implementations.
**Depends on:** Phase 3 complete
**Push:** Yes

---

#### P4-B: Cache-TTL Context Pruning

**Goal:** Add TTL metadata to stored tool results. Different tool types get different lifetimes. Two-phase compaction: TTL prune (free, no LLM call) then LLM summarize (only if still over threshold).

**Files:**
- `src-tauri/src/compact/ttl.rs` — TTL configuration per tool type (schema_query=10m, file_read=5m, browser_snapshot=2m, adl=session, build_learnings=session, agent_result=30m), TTL prune function, placeholder insertion
- `src-tauri/src/compact/mod.rs` — EDIT: integrate TTL prune as first pass before LLM compaction in compact() method
- `src-tauri/src/database/schema.rs` — EDIT: V6 migration — add `tool_type TEXT` and `expires_at TEXT` columns to session_summaries or new `tool_results` table

**Gate:** `cargo check` clean. TTL prune removes expired entries. LLM compaction only fires when TTL prune alone isn't enough.
**Depends on:** P4-A
**Push:** Yes

---

#### P4-C: Iterative Compression with Structured Handoff

**Goal:** Upgrade compact engine's summary system. Store `previous_summary` in SQLite. On re-compaction, pass previous summary as context with PRESERVE/ADD/REMOVE instructions. Add orphaned tool pair sanitization.

**Files:**
- `src-tauri/src/compact/summary.rs` — EDIT: add iterative summary prompt (previous_summary + PRESERVE/ADD/REMOVE instructions), upgrade 9-section template to merge with Hermes structured handoff format
- `src-tauri/src/compact/sanitize.rs` — Orphaned tool pair detection and repair (detect tool_call without tool_result and vice versa after compression, insert stubs or remove orphans)
- `src-tauri/src/compact/mod.rs` — EDIT: call sanitize after compaction, pass previous_summary to compact()

**Gate:** `cargo check` clean. Re-compaction preserves information from previous summary. Orphaned pairs cleaned.
**Depends on:** P4-B
**Push:** Yes

---

#### P4-D: FTS5 Full-Text Search on Sessions

**Goal:** SQLite FTS5 virtual table on session messages. Enables cross-session recall. New Tauri command: `search_sessions(query, limit)`.

**Files:**
- `src-tauri/src/database/schema.rs` — EDIT: V7 migration — CREATE VIRTUAL TABLE messages_fts USING fts5(content, role, session_id, content='messages', content_rowid='id'). Add FTS5 triggers for INSERT/UPDATE/DELETE sync.
- `src-tauri/src/database/search.rs` — search_sessions function (FTS5 MATCH query, returns matching messages with session context, highlights)
- `src-tauri/src/commands/search.rs` — search_sessions Tauri command
- `src-tauri/src/commands/mod.rs` — EDIT: register search command
- `src-tauri/src/lib.rs` — EDIT: register search_sessions in Tauri builder

**Gate:** `cargo check` clean. `search_sessions("Pierce flagged", 10)` returns matching messages across sessions. FTS5 index stays in sync with message inserts.
**Depends on:** P4-C
**Push:** Yes

---

#### P4-E: Atomic Task Checkout + Bridge Updates

**Goal:** Add checkout semantics to findings table (prevents two agents from working on same finding during parallel Triad gates). Update TypeScript bridge with new commands.

**Files:**
- `src-tauri/src/database/schema.rs` — EDIT: V8 migration — ALTER TABLE findings ADD COLUMN checked_out_by TEXT, checked_out_at TEXT. CREATE UNIQUE INDEX idx_findings_checkout ON findings(id) WHERE checked_out_by IS NOT NULL AND resolved_at IS NULL.
- `src-tauri/src/build_state/findings.rs` — EDIT: add checkout_finding(id, agent_slug) and release_finding(id) functions
- `src-tauri/src/commands/build_state.rs` — EDIT: add checkout_finding and release_finding commands
- `apps/desktop/src/lib/tauri.ts` — EDIT: add searchSessions, checkoutFinding, releaseFinding bridge functions + types

**Gate:** `cargo check` clean. Vite build clean. Two concurrent checkout attempts on same finding — second one rejected by DB unique index.
**Depends on:** P4-D
**Push:** Yes
**Session 4.0 verification:** `cargo check` 0 errors. All 8 migrations apply cleanly. Existing Phase 3 tests still pass.

---

### Session 4.1 — Window Manager + Dock Bar

Architecture pivot: drop `react-resizable-panels` (linked split panes). Replace with floating window manager where every panel is independently sizable, movable, and detachable.

---

#### P4-F: Window Manager Core (Types + State + Persistence)

**Goal:** Panel instance registry, z-order stack, position/size state, dock/float transitions. SQLite persistence for layout state.

**Files:**
- `apps/desktop/src/window-manager/types.ts` — PanelId, PanelState (docked/floating/minimized/popped_out), PanelPosition, PanelSize, WorkspacePreset, DockItem, TabGroup, PanelInstance, PanelTypeRegistry
- `apps/desktop/src/window-manager/manager.ts` — ForgeWindowManager class: panel instance registry, z-order stack, state transitions (dock↔float↔minimize↔pop-out), position/size management, click-to-raise
- `apps/desktop/src/window-manager/persistence.ts` — Save/restore full layout state to SQLite via Tauri commands. Debounced saves on every change.
- `src-tauri/src/database/schema.rs` — EDIT: V9 migration — upgrade panel_layout table (panel_id PK, panel_type, state, x, y, width, height, z_order, monitor, tab_group_id, tab_order, workspace_preset)
- `src-tauri/src/commands/layout.rs` — save_panel_layout, load_panel_layout, save_workspace_preset, load_workspace_preset Tauri commands
- `src-tauri/src/commands/mod.rs` — EDIT: register layout commands
- `src-tauri/src/lib.rs` — EDIT: register layout commands in Tauri builder

**Gate:** `cargo check` + `vite build` clean. Panel state persists across app restart.
**Depends on:** P4-E
**Push:** Yes

---

#### P4-G: PanelContainer + Drag/Resize

**Goal:** Individual panel component with drag handle, 8-edge resize, minimize/pop-out/close buttons, size-aware content slot.

**Files:**
- `apps/desktop/src/window-manager/panel.tsx` — PanelContainer component: titlebar drag region, 8-point resize handles (N/S/E/W/NE/NW/SE/SW), minimize/pop-out/close buttons, children slot that receives dynamic width/height
- `apps/desktop/src/window-manager/snapping.ts` — Edge-snap engine: 8px magnetic snap to app frame edges and other panel edges. Toggle-able.
- `apps/desktop/src/hooks/useWindowManager.ts` — React hook wrapping ForgeWindowManager: panel CRUD, drag/resize handlers, z-order management, preset switching

**Gate:** Panels can be dragged freely. Resize from any edge/corner. Click-to-raise z-order works. Snap-to-edge functional.
**Depends on:** P4-F
**Push:** Yes

---

#### P4-H: Dock Bar + Tab Groups

**Goal:** Dock bar at bottom of app. One pill per registered panel type. Active = lit, minimized = dim with restore click. Tab groups: drag one panel onto another to create tabbed group.

**Files:**
- `apps/desktop/src/window-manager/dock.tsx` — DockBar component: horizontal bar at app bottom, one pill per panel type, active/minimized/closed states, unread badges, activity pulse animations, scales to 20+ panel types
- `apps/desktop/src/window-manager/manager.ts` — ForgeWindowManager class: panel registry, z-order stack, state transitions, tab groups, 3 built-in presets (Build/Review/Focus). **Note (PIERCE-CRIT-2/3):** groups.ts and presets.ts were absorbed into manager.ts during build — separate files do not exist.

**Gate:** Dock bar renders all panel types. Minimize sends to dock. Restore from dock. Tab groups work. Preset switching rearranges layout.
**Depends on:** P4-G
**Push:** Yes

---

#### P4-I: Layout Migration + Pop-Out Windows

**Goal:** Replace react-resizable-panels with window manager. Wire all existing panel content components into PanelContainers. Implement pop-out to native OS windows via Tauri multi-window API.

**Files:**
- `apps/desktop/src/components/layout/PanelLayout.tsx` — EDIT: replace entire react-resizable-panels grid with ForgeWindowManager + PanelContainers hosting existing ChatPanel, TeamPanel, CanvasPanel, PreviewPanel, ConnectivityPanel
- `src-tauri/src/commands/windows.rs` — create_panel_window(panel_id, position, size), close_panel_window(panel_id), sync_panel_state IPC bridge for popped-out panels
- `src-tauri/src/commands/mod.rs` — EDIT: register window commands
- `src-tauri/src/lib.rs` — EDIT: register window commands in Tauri builder
- `apps/desktop/package.json` — EDIT: remove react-resizable-panels dependency

**Gate:** App launches with default docked layout matching previous appearance. All panels float, minimize, pop-out. Pop-out panels communicate back via IPC. `react-resizable-panels` fully removed.
**Depends on:** P4-H
**Push:** Yes
**Session 4.1 verification:** `pnpm tauri dev` launches with floating window manager. All 5 panels functional. Dock bar visible. Layout persists across restart.

---

### Session 4.2 — Core Pretext Engine

The canvas-rendered text measurement + layout primitive. Every text-heavy canvas component in Phases 5-9 depends on this.

---

#### P4-J: Pretext Measure + Layout

**Goal:** Install @chenglou/pretext. Build measurement and layout functions for canvas text rendering.

**Files:**
- `packages/layout-engine/package.json` — @forge-os/layout-engine, depends on @chenglou/pretext
- `packages/layout-engine/tsconfig.json`
- `packages/layout-engine/src/index.ts` — re-exports
- `packages/layout-engine/src/prepare.ts` — batch prepare for text block arrays, font caching, memoization
- `packages/layout-engine/src/measure.ts` — single + multi-breakpoint measurement (375/768/1280), height-for-width

**Gate:** `pnpm build` clean. `prepare("Hello World", { font: "Inter", size: 14 })` returns PreparedText. `measure(prepared, 320)` returns accurate height.
**Depends on:** P4-I
**Push:** Yes

---

#### P4-K: Pretext Fit + Canvas Render

**Goal:** Fit-to-container solver and canvas text renderer with styled spans.

**Files:**
- `packages/layout-engine/src/fit.ts` — fit-to-container solver: given text + width + min/max font size, binary search over layout() to find optimal size (<1ms)
- `packages/layout-engine/src/canvas.ts` — canvas text renderer: draw prepared text with line breaks, colors, alignment, styled spans (bold, color, badges)
- `packages/layout-engine/src/types.ts` — PreparedText, LayoutResult, MeasureOptions, FitResult, CanvasRenderOptions, StyledSpan

**Gate:** `fit(text, 200, { minFont: 10, maxFont: 24 })` returns optimal font size in <1ms. Canvas render produces readable text with styled spans.
**Depends on:** P4-J
**Push:** Yes

---

#### P4-L: Virtual List Heights + Integration Test

**Goal:** Pre-computed heights for virtualized lists. Integration test with react-window compatibility.

**Files:**
- `packages/layout-engine/src/virtual.ts` — pre-compute heights for virtualized lists (react-window/react-virtuoso compatible). VirtualHeightMap from text content array + container width.
- `packages/layout-engine/src/index.ts` — EDIT: export all public APIs

**Gate:** VirtualHeightMap produces accurate row heights for 1000-item list. react-window integration renders variable-height rows using Pretext measurements. Package importable from apps/desktop.
**Depends on:** P4-K
**Push:** Yes
**Session 4.2 verification:** `@forge-os/layout-engine` builds clean. All measurement/layout/render functions work. Importable from desktop app.

---

### Session 4.3 — Canvas Components Library

Reusable canvas-rendered UI primitives. Every component accepts `width` + `height` props — no assumptions about container size.

---

#### P4-M: Core Gauges (StatCard, ProgressArc, StatusBadge)

**Goal:** First 3 canvas components: number display, circular gauge, status indicator.

**Files:**
- `packages/canvas-components/package.json` — @forge-os/canvas-components, depends on @forge-os/layout-engine
- `packages/canvas-components/tsconfig.json`
- `packages/canvas-components/src/index.ts` — re-exports
- `packages/canvas-components/src/stat-card.tsx` — StatCard: number + label + trend indicator, Pretext-measured text, canvas-rendered
- `packages/canvas-components/src/progress-arc.tsx` — ProgressArc: circular gauge, animated fill, batch progress display
- `packages/canvas-components/src/status-badge.tsx` — StatusBadge: green/amber/red with pulse animation

**Gate:** All 3 components render at arbitrary sizes. StatCard text stays centered. ProgressArc animates smoothly.
**Depends on:** P4-L
**Push:** Yes

---

#### P4-N: Flow Components (FlowParticle, ConnectionLine, NodeCard)

**Goal:** Pipeline visualization primitives: animated particles, bezier connections, labeled nodes.

**Files:**
- `packages/canvas-components/src/flow-particle.tsx` — FlowParticle: animated dot traveling along bezier path, configurable speed/color/trail
- `packages/canvas-components/src/connection-line.tsx` — ConnectionLine: animated bezier between two points, dash animation, directional arrows
- `packages/canvas-components/src/node-card.tsx` — NodeCard: rounded rect with text, icon, status indicator, dynamic font sizing via Pretext fit()

**Gate:** FlowParticle animates along path. ConnectionLine draws bezier with dash animation. NodeCard text auto-sizes to fit container.
**Depends on:** P4-M
**Push:** Yes

---

#### P4-O: Token Display Components (TokenGauge, ContextMeter)

**Goal:** Pre-measured number displays that never shift layout when values change. Context window fill gauge.

**Files:**
- `packages/canvas-components/src/token-gauge.tsx` — TokenGauge: pre-measured number display ("$4.23" → "$4.24" without element shifting), widest-possible-value space reservation via Pretext
- `packages/canvas-components/src/context-meter.tsx` — ContextMeter (canvas version): per-session context window fill gauge, animated fill, zone colors (green/yellow/red)

**Gate:** TokenGauge never shifts layout when value changes (verify with $9.99 → $10.00 transition). ContextMeter animates fill smoothly.
**Depends on:** P4-N
**Push:** Yes

---

#### P4-P: DockPill + Test Page

**Goal:** Canvas-rendered dock bar item. Test page inside Tauri app showing all components.

**Files:**
- `packages/canvas-components/src/dock-pill.tsx` — DockPill: icon + label + badge + activity pulse, canvas-rendered for dock bar
- `apps/desktop/src/pages/ComponentTestPage.tsx` — Test page: renders every canvas component at multiple sizes, acts as visual regression reference
- `packages/canvas-components/src/index.ts` — EDIT: export all components

**Gate:** DockPill renders with badge and pulse. Test page shows all 9 components at 3 sizes each. Package importable from desktop app.
**Depends on:** P4-O
**Push:** Yes
**Session 4.3 verification:** `@forge-os/canvas-components` builds clean. 9 components all render correctly. Test page visible in app.

---

### Session 4.4 — Document Generation Engine

Dual-output from single content: markdown for Claude, Pretext-rendered PDF for humans.

---

#### P4-Q: PDF Page Layout Engine

**Goal:** Page-break calculator and canvas-to-PDF export pipeline.

**Files:**
- `packages/document-gen/package.json` — @forge-os/document-gen, depends on @forge-os/layout-engine
- `packages/document-gen/tsconfig.json`
- `packages/document-gen/src/index.ts` — re-exports
- `packages/document-gen/src/pdf.ts` — page-break calculator: given content blocks + page dimensions, compute per-page layout. Render to canvas, export as PDF blob via jspdf or canvas-to-blob.
- `packages/document-gen/src/types.ts` — ContentBlock, PageLayout, PageBreak, DocumentTemplate, RenderOptions

**Gate:** `layoutPages(blocks, { width: 612, height: 792 })` returns correct page breaks. PDF blob exports successfully.
**Depends on:** P4-P
**Push:** Yes

---

#### P4-R: Gate Report Template

**Goal:** Gate report PDF template: title, findings table (severity/persona/description/evidence/fix), summary stats.

**Files:**
- `packages/document-gen/src/templates/gate-report.ts` — Gate report template: header with batch ID + date, findings table with severity coloring, summary stats (counts by severity, by persona), resolution status
- `packages/document-gen/src/markdown.ts` — Markdown output generator (same content blocks → markdown string for Claude consumption)

**Gate:** Gate report renders with sample findings data. PDF has proper page breaks. Markdown output is clean and parseable.
**Depends on:** P4-Q
**Push:** Yes

---

#### P4-S: Project Brief + Build Report Templates

**Goal:** Two more document templates for common outputs.

**Files:**
- `packages/document-gen/src/templates/project-brief.ts` — Project brief template: project name, architecture decisions, batch plan, persona assignments, stack summary
- `packages/document-gen/src/templates/build-report.ts` — Build report template: batch progress, findings resolved, risks, token usage, session metrics

**Gate:** Both templates render with sample data. Dual output (PDF + markdown) works for both.
**Depends on:** P4-R
**Push:** Yes

---

#### P4-T: Retrospective Template + Integration Test

**Goal:** Retrospective template. Full integration test of document generation pipeline.

**Files:**
- `packages/document-gen/src/templates/retrospective.ts` — Retrospective template: timeline, learnings, failure modes, recommendations, action items
- `packages/document-gen/src/index.ts` — EDIT: export all templates and generators

**Gate:** All 4 templates render. PDF export works end-to-end. Markdown export works end-to-end. Package importable from desktop app.
**Depends on:** P4-S
**Push:** Yes
**Session 4.4 verification:** `@forge-os/document-gen` builds clean. 4 templates all render PDF + markdown. Full `pnpm build` green.

---

### Phase 4 Summary

| Session | Batches | Domain | Key Deliverable |
|---------|---------|--------|-----------------|
| 4.0 | P4-A → P4-E | Rust backend | ContextEngine trait, TTL pruning, iterative compression, FTS5 search, atomic checkout |
| 4.1 | P4-F → P4-I | Frontend + Rust | Floating window manager, dock bar, tab groups, pop-out windows |
| 4.2 | P4-J → P4-L | Package | @forge-os/layout-engine (Pretext wrapper) |
| 4.3 | P4-M → P4-P | Package | @forge-os/canvas-components (9 components) |
| 4.4 | P4-Q → P4-T | Package | @forge-os/document-gen (4 templates, dual PDF+MD output) |

### Phase 4 Risks
- **Pretext API stability:** @chenglou/pretext is relatively new — API surface may shift
- **Canvas performance:** 9+ canvas components rendering simultaneously needs GPU attention
- **Tauri multi-window IPC:** Pop-out panels communicating back to main process is complex
- **FTS5 + WAL interaction:** FTS5 virtual tables with WAL mode need careful trigger management
- **PDF blob size:** Canvas-to-PDF export may produce large blobs — may need compression

### Phase 4 ADL (New)
- **OS-ADL-016** (updated): Floating window manager — panels are independent, not linked
- **OS-ADL-020**: Dual-output document generation — same content → markdown + PDF
- **OS-ADL-021**: Dock bar as panel registry UI — scales to 20+ panel types

---

