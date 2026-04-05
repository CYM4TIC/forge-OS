## Phase 5: Living Canvas HUD (16 batches, 3 sessions)

**Session map:** 5.1 = P5-A through P5-F (DONE) | 5.2 = P5-G through P5-K | 5.3 = P5-L through P5-P
**Prerequisite:** Phase 4 complete. Window manager, layout engine, canvas components, persona glyphs all on main.
**Depends on:** `@forge-os/layout-engine` (Pretext pipeline), `@forge-os/canvas-components` (10 components + glyphs), window manager panel registry, Tauri event system (OS-ADL-009).
**Repo:** CYM4TIC/forge-OS | **Local:** `.repo/`

**Path prefix (all files):**
- Rust backend: `apps/desktop/src-tauri/src/`
- TypeScript frontend: `apps/desktop/src/`
- Panels: `apps/desktop/src/components/panels/`
- HUD sub-components: `apps/desktop/src/components/panels/hud/`
- Hooks: `apps/desktop/src/hooks/`
- Bridge: `apps/desktop/src/lib/tauri.ts`

**Key ADL constraints:**
- OS-ADL-001: All text measurement via Pretext. No DOM measurement.
- OS-ADL-002: Canvas for presentation, DOM for interaction. Every component classified.
- OS-ADL-009: State changes via Tauri events (`app.emit` / `listen`). No polling.

**Infrastructure available from 5.1:**
- `isTauriRuntime` guard in `tauri.ts` — all new Tauri bridge functions must use this for browser-only graceful degradation
- `setupCanvasForHiDPI` + `renderStyledSpans` + `measureText` pattern established in ContextMeterViz
- `hexToRgba()` utility in ContextMeterViz (move to canvas-tokens if reused)
- ResizeObserver pattern in every panel for responsive sizing
- 12 panel types registered in `window-manager/types.ts`
- 49 Tauri commands, 10 React hooks, 348 Vite modules

---

### Session 5.1 — Build State Topology + Core Gauges (P5-A through P5-F) ✅ COMPLETE

**Goal:** The Canvas HUD panel becomes a live visualization of build state. Pipeline nodes, batch progress, token gauge, context meter — all canvas-rendered, all size-aware, all driven by real state from the Rust backend.
**Status:** All 6 batches done. Build Triad gate passed (26 findings, all CRITs + HIGHs resolved). Commits `4658f64`, `57263c7`.

---

### P5-A: BOOT.md Parser + Build State Events

**Goal:** Rust backend parses BOOT.md YAML frontmatter and session log into structured state. Emits Tauri events on change.

**Files:**
- `src-tauri/src/hud/mod.rs` (module declaration)
- `src-tauri/src/hud/boot_parser.rs` (parse BOOT.md YAML header → BuildStateSnapshot struct: phase, batch, batches_done, phases_total, sessions_total, last_commit, last_updated)
- `src-tauri/src/hud/events.rs` (HudEvent enum: BuildStateChanged, PipelineStageChanged, AgentStatusChanged, FindingAdded, FindingResolved. Emit via app.emit())
- Update `src-tauri/src/lib.rs` (register hud module)

**Types (Rust):**
```
BuildStateSnapshot { phase, current_batch, batches_done, phases_total, sessions_total, last_commit, last_updated }
PipelineStage { id: String, status: StageStatus, agent: Option<String>, started_at, completed_at }
StageStatus { Idle, Active, Complete, Error }
HudEvent { BuildStateChanged(BuildStateSnapshot), PipelineStageChanged(PipelineStage), ... }
```

**Gate:** `cargo check` 0 errors. HudEvent variants compile. boot_parser extracts YAML from a test BOOT.md string.
**Depends on:** Nothing new — reads files, emits events.
**Push:** Yes

---

### P5-B: HUD Tauri Commands + Bridge

**Goal:** Expose build state and pipeline to the frontend. Commands to get current state and subscribe to events.

**Files:**
- `src-tauri/src/commands/hud.rs` (get_build_state_snapshot, get_pipeline_stages, refresh_build_state — re-reads BOOT.md and emits events)
- Update `src-tauri/src/commands/mod.rs` (add hud module)
- Update `src-tauri/src/lib.rs` (register hud commands in invoke_handler)
- `src/lib/tauri.ts` (add getBuildStateSnapshot, getPipelineStages, refreshBuildState + onBuildStateChanged, onPipelineStageChanged event listeners)

**Gate:** Commands callable from frontend. Event listeners fire on state change.
**Depends on:** P5-A (parser + events)
**Push:** Yes

---

### P5-C: Panel Registration + HUD Shell

**Goal:** Register all Phase 5 panel types in the window manager. Create the Canvas HUD panel shell that will host pipeline + gauges.

**Files:**
- Update `src/window-manager/manager.ts` (register 6 new panel types in PANEL_TYPE_REGISTRY: canvas_hud already registered — add findings, agent_board, vault_browser, graph_viewer, session_timeline, context_meter. Each with min/default dimensions and instance rules)
- `src/panels/CanvasHudPanel.tsx` (the shell — receives width/height from PanelContainer, renders canvas element, passes dimensions to child visualizations. Imports useWindowManager for size reactivity. Layout: vertical stack — PipelineCanvas top, gauges row bottom)
- `src/hooks/useBuildState.ts` (hook — calls getBuildStateSnapshot on mount, subscribes to onBuildStateChanged events, returns reactive BuildStateSnapshot)

**Gate:** 6 new panel types appear in dock bar. CanvasHudPanel renders an empty canvas at correct dimensions. useBuildState returns snapshot data.
**Depends on:** P5-B (commands + bridge), window manager (Phase 4.1)
**Push:** Yes

---

### P5-D: PipelineCanvas — Nodes + Layout

**Goal:** Canvas-rendered pipeline with 4 stage nodes (Scout → Build → Triad → Sentinel). Nodes positioned via Pretext-measured labels. Persona glyphs inside active nodes.

**Files:**
- `src/panels/hud/PipelineCanvas.tsx` (canvas component — draws 4 pipeline nodes as rounded rects connected by arrows. Each node: label (Pretext-measured, centered), status glow (idle=dim, active=pulse, complete=glow), persona glyph rendered inside when agent is active. Uses `flowAroundObstacles()` for stat labels that reflow around nodes. Responds to container resize — nodes reflow to fill available width)
- `src/panels/hud/pipeline-layout.ts` (pure layout math — given container width/height + node count, computes node positions/sizes. Horizontal flow with wrapping on narrow panels. No DOM)

**Imports from existing packages:**
- `@forge-os/layout-engine`: `measureText`, `fitToContainer`, `flowAroundObstacles`
- `@forge-os/canvas-components`: `NodeCard`, `PersonaGlyph`, `ConnectionLine`, `StatusBadge`

**Gate:** Pipeline renders 4 nodes at any panel size. Labels don't clip. Persona glyphs animate inside active nodes. Resize reflows nodes.
**Depends on:** P5-C (HUD shell + build state hook)
**Push:** Yes

---

### P5-E: BatchProgress + TokenGauge

**Goal:** Batch progress arc and token gauge — the numeric heartbeat of the build.

**Files:**
- `src/panels/hud/BatchProgressGauge.tsx` (wraps ProgressArc from canvas-components. Shows batches_done/batches_total. Animated counter via Pretext pre-measured number widths — zero-shift on digit change. Layer label below. Responds to BuildStateChanged events)
- `src/panels/hud/TokenGaugeDisplay.tsx` (wraps TokenGauge from canvas-components. Shows context window usage. Connects to useContextUsage hook. Pre-measured number display. Warning state at 70%, critical at 85%)

**Imports from existing:**
- `@forge-os/canvas-components`: `ProgressArc`, `TokenGauge`, `StatCard`
- `src/hooks/useContextUsage.ts` (already exists)

**Gate:** BatchProgress shows correct fraction from build state. TokenGauge reflects real context usage. Both animate on value change. Both resize cleanly.
**Depends on:** P5-C (build state hook), existing useContextUsage hook
**Push:** Yes

---

### P5-F: ContextMeter — Text Density Visualization

**Goal:** The context meter shows context window fill as progressively denser typography. Early context = spacious text. At 85% = compressed, tight. Compaction = text dissolves and re-emerges sparser.

**Files:**
- `src/panels/hud/ContextMeterViz.tsx` (extends ContextMeterCanvas from canvas-components. Renders actual text samples at variable density — lineHeight transitions from 1.8 → 1.0, maxWidth compresses, font weight shifts. Uses Pretext `measure()` to compute exact layouts at each density level. Animated transitions when context usage changes. On compaction event: text dissolves (opacity fade) and re-emerges at lower density)
- Update `src/panels/CanvasHudPanel.tsx` (wire in PipelineCanvas, BatchProgressGauge, TokenGaugeDisplay, ContextMeterViz into the panel layout. Responsive — pipeline takes top 60%, gauges row takes bottom 40%. Adjust ratios on narrow panels)

**Imports:**
- `@forge-os/layout-engine`: `measure`, `fitToBox`, `renderStyledSpans`
- `@forge-os/canvas-components`: `ContextMeterCanvas`

**Gate:** ContextMeter visualizes density. Panel layout is complete — all 4 sub-components render. Resize works at all sizes. Ambient idle animation runs (subtle node pulse, glyph embers).
**Depends on:** P5-D (pipeline), P5-E (gauges)
**Push:** Yes

---

### Session 5.2 — Agent Board + Findings Feed (P5-G through P5-K)

**Goal:** Agent Board and Findings Feed as independent panel types. Canvas-rendered agent cards with dynamic layouts. Virtualized findings list with severity-as-typography. Session timeline as text river. All three register with the window manager and can float/tab/pop-out independently.

**Existing placeholders to replace:** `AgentBoardPanel.tsx` (13 lines), `FindingsPanel.tsx` (13 lines), `SessionTimelinePanel.tsx` (13 lines) — all created in P5-C.
**Existing hooks to compose:** `useAgents` (agent list), `useAgentDispatch` (active dispatch tracking) — don't duplicate, extend.

---

### P5-G: Findings SQLite Schema + Commands

**Goal:** Persistent findings storage with real-time events. The data layer for the findings feed. Protocol Enforcement Point #2 — every gate finding gets an ID, severity, and status in SQLite. A batch cannot close with `status = 'open'` rows.

**Files:**
- `apps/desktop/src-tauri/src/database/schema.rs` (add SCHEMA_V10: CREATE TABLE hud_findings — id TEXT PRIMARY KEY, session_id TEXT, batch_id TEXT, severity TEXT, persona TEXT, title TEXT, description TEXT, status TEXT DEFAULT 'open', file_path TEXT, line_number INTEGER, created_at TEXT, resolved_at TEXT. Indexes on session_id, severity, persona, status)
- `apps/desktop/src-tauri/src/database/migrations.rs` (add V10 migration step)
- `apps/desktop/src-tauri/src/hud/findings.rs` (CRUD: insert_finding, resolve_finding, list_findings with filters — by session, severity, persona, status. Count by severity. Emits HudEvent::FindingAdded / FindingResolved via app.emit)
- Update `apps/desktop/src-tauri/src/commands/hud.rs` (add: list_hud_findings, add_hud_finding, resolve_hud_finding, get_finding_counts commands)
- Update `apps/desktop/src/lib/tauri.ts` (add listHudFindings, addHudFinding, resolveHudFinding, getFindingCounts. Guard all with `isTauriRuntime`. Add onFindingAdded, onFindingResolved event listeners)

**Gate:** V10 migration applies. CRUD commands work. Events fire on insert/resolve. Finding counts by severity return correct data.
**Depends on:** P5-A (events module)
**Push:** Yes

---

### P5-H: Agent Board Panel

**Goal:** Canvas-rendered agent cards showing status, model tier, domain. Responsive grid layout. Click to expand.

**Files:**
- Update `apps/desktop/src/components/panels/AgentBoardPanel.tsx` (REPLACE placeholder. Canvas-rendered grid of agent cards. Each card: persona glyph, name via Pretext `fitToContainer`, status badge (idle/running/complete/error), model tier badge. Grid reflows: 1-col at <400px, 2-col at <700px, 3-col at 700px+. Click card → DOM overlay expands with last finding + domain health. Uses ResizeObserver for responsive sizing)
- `apps/desktop/src/hooks/useAgentBoard.ts` (composes existing `useAgents` + `useAgentDispatch` + `onAgentStatusChanged` event. Returns agent list with real-time status. Does NOT duplicate data fetching — wraps existing hooks)

**Imports:**
- `@forge-os/canvas-components`: `PersonaGlyph`, `NodeCard`, `StatusBadge`
- `@forge-os/layout-engine`: `fitToContainer`, `measureText`, `shrinkwrapText`

**Gate:** Agent board renders all agents. Status updates in real-time. Grid reflows on resize. Click expands card. Pop-out works.
**Depends on:** P5-C (panel registration), existing `useAgents` + `useAgentDispatch` hooks
**Push:** Yes

---

### P5-I: Findings Feed — Virtualized List

**Goal:** Virtualized scrolling findings list. Severity-as-typography: P-CRIT = max weight + glow, P-LOW = small + dim. Persona glyph attribution. Shrinkwrap card widths.

**Files:**
- Update `apps/desktop/src/components/panels/FindingsPanel.tsx` (REPLACE placeholder. Uses `createVirtualHeightMap` from layout-engine for pre-computed row heights — zero-jank scroll with hundreds of findings. Each finding card: severity-driven typography (P-CRIT: 20px bold + red glow, P-HIGH: 16px semi-bold + orange, P-MED: 14px medium + yellow, P-LOW: 12px regular + muted). Persona glyph of who found it, shrinkwrap width. Filter bar (DOM): by persona, severity, status. Card list (Canvas): virtual scroll. No external virtual scroll library — uses layout-engine's `createVirtualHeightMap` which outputs react-window-compatible `itemSize` functions)
- `apps/desktop/src/components/panels/hud/finding-card-renderer.ts` (pure canvas render function for a single finding card. Severity → font size/weight/color mapping from canvas-tokens. Returns rendered height)

**Imports:**
- `@forge-os/layout-engine`: `createVirtualHeightMap`, `shrinkwrapText`, `measureText`, `renderStyledSpans`
- `@forge-os/canvas-components`: `PersonaGlyph`, `getZoneColor` (reuse zone color pattern for severity)

**Gate:** Findings feed renders with virtual scroll. Severity hierarchy is visually obvious. Filters work. Persona glyphs attribute correctly. Pop-out works.
**Depends on:** P5-G (findings data layer), P5-C (panel registration)
**Push:** Yes

---

### P5-J: Session Timeline — Text River

**Goal:** A flowing text stream of commits, findings, gate verdicts. Text density = activity density. Pretext-measured, flowing left-to-right with time.

**Files:**
- Update `apps/desktop/src/components/panels/SessionTimelinePanel.tsx` (REPLACE placeholder. Horizontal canvas scroll — time flows left to right. Events rendered as text at variable density: dense clusters = busy sessions, sparse = quiet. Each event: commit message / finding summary / gate verdict. Text measured via Pretext, positioned proportional to timestamp. Color-coded: commits=STATUS.accent, findings=severity color, gates=STATUS.success/STATUS.danger. Persona glyphs inline. Uses ResizeObserver)
- `apps/desktop/src/hooks/useSessionTimeline.ts` (aggregates session events: commits from build state, findings from hud_findings, gate verdicts. Returns time-ordered event list. Subscribes to real-time events via onFindingAdded + onBuildStateChanged)

**Imports:**
- `@forge-os/layout-engine`: `measureText`, `renderStyledSpans`, `batchPrepare`
- `@forge-os/canvas-components`: `PersonaGlyph`, `STATUS` (color tokens)

**Gate:** Timeline renders events proportional to time. Dense activity visually clusters. Horizontal scroll works. New events appear in real-time. Pop-out works.
**Depends on:** P5-G (findings data), P5-B (build state events)
**Push:** Yes

---

### P5-K: Session 5.2 Integration + Polish

**Goal:** Wire Agent Board, Findings Feed, and Session Timeline into the dock bar. Ensure all three panels coexist, tab together, and persist layout to SQLite. Add `gate_review` workspace preset.

**Files:**
- Update `apps/desktop/src/window-manager/dock.tsx` (findings pill shows count badge by severity via `getFindingCounts` bridge. Badge uses STATUS.danger color for open CRITs)
- Update `apps/desktop/src/components/panels/CanvasPanel.tsx` (pipeline node click handlers — clicking active stage opens relevant panel if not visible: build stage → Canvas HUD, triad stage → Agent Board + Findings)
- Update `apps/desktop/src/window-manager/manager.ts` (add built-in presets to `getBuiltInPresets()`: `gate_review` = Canvas HUD left + Findings Feed right + Agent Board bottom-right. `observatory` = Canvas HUD + Graph Viewer + Vault Browser. Seed to SQLite on first run if not present)

**Gate:** All 3 new panels appear in dock, can be opened/floated/tabbed/popped. `gate_review` preset tiles them correctly. Layout persists across restart. Badge counts update in real-time. Presets seed correctly on clean install.
**Depends on:** P5-H, P5-I, P5-J (all three panels built)
**Push:** Yes

---

### Session 5.3 — Flow Visualization + Graph (P5-L through P5-P)

**Goal:** Persona glyph particle trails on agent dispatch. Bezier curves showing information flow. VaultBrowser for file navigation. GraphViewer for knowledge graph. The canvas comes alive.

---

### P5-L: Dispatch Event Bus + Trail Types

**Goal:** Backend emits structured dispatch events that the flow visualization can animate. Types for particle trails.

**Files:**
- `apps/desktop/src-tauri/src/hud/dispatch_events.rs` (DispatchFlow struct: source_agent, target_agents Vec, flow_type (dispatch/findings_return/context_transfer), severity Option, timestamp. Emits HudEvent::DispatchFlowStarted when dispatch pipeline fires. Hooks into existing dispatch command)
- Update `apps/desktop/src/lib/tauri.ts` (add onDispatchFlow event listener + DispatchFlow TypeScript type. Guard with `isTauriRuntime`)
- `apps/desktop/src/components/panels/hud/trail-types.ts` (ParticleTrail: source_glyph PersonaSlug, target_glyphs PersonaSlug[], path BezierPath[], color string, progress 0-1, flow_type. TrailConfig: speed, decay, glow_intensity)

**Gate:** Dispatch events fire when agents are dispatched. TypeScript types match Rust structs. Trail types compile.
**Depends on:** P5-A (events module), existing dispatch commands
**Push:** Yes

---

### P5-M: Flow Overlay — Particle Trails

**Goal:** Semi-transparent canvas overlay on the Canvas HUD. When agents dispatch, persona glyphs streak across bezier paths between pipeline nodes.

**Files:**
- `apps/desktop/src/components/panels/hud/FlowOverlay.tsx` (transparent canvas layer overlaid on PipelineCanvas. Listens to onDispatchFlow events. On dispatch: source persona glyph animates along bezier curve to target node(s). Build Triad dispatch = 3 glyphs (crosshair + eye + grid) streaking in formation. Findings return = severity-colored trail back. Uses requestAnimationFrame for 60fps. Particle trails decay over ~2s. Toggleable visibility)
- `apps/desktop/src/components/panels/hud/bezier-paths.ts` (compute bezier control points between pipeline node positions. Paths curve to avoid overlapping nodes. Multiple simultaneous trails offset to prevent z-fighting)
- Update `apps/desktop/src/components/panels/CanvasPanel.tsx` (layer FlowOverlay on top of PipelineCanvas. Z-order: pipeline → flow overlay → gauges)

**Imports:**
- `@forge-os/canvas-components`: `PersonaGlyph`, `FlowParticle`

**Gate:** Dispatching an agent produces visible glyph trail on canvas. Triad dispatch shows 3 glyphs in formation. Trails decay smoothly. Toggle on/off works. No performance regression (60fps maintained).
**Depends on:** P5-L (dispatch events + trail types), P5-D (pipeline canvas with node positions)
**Push:** Yes

---

### P5-N: Vault Browser Panel

**Goal:** Tree view for vault navigation. DOM for interaction (tree nodes are clickable), canvas for content preview (consistent typography).

**Files:**
- Update `apps/desktop/src/components/panels/VaultBrowserPanel.tsx` (REPLACE placeholder. Split layout: left = DOM tree view (collapsible folders, file icons, search filter), right = canvas content preview (renders file content with Pretext typography). Tree reads from filesystem via Tauri. Content preview uses `createVirtualHeightMap` for zero-jank scroll. Uses ResizeObserver for responsive split ratio)
- `apps/desktop/src-tauri/src/commands/vault.rs` (list_vault_tree: reads directory recursively, returns tree structure. read_vault_file: returns file content as string. Both operate on the active project's vault directory)
- Update `apps/desktop/src-tauri/src/commands/mod.rs` + `apps/desktop/src-tauri/src/lib.rs` (register vault commands)
- Update `apps/desktop/src/lib/tauri.ts` (add listVaultTree, readVaultFile. Guard with `isTauriRuntime`)

**Gate:** Vault browser shows file tree. Clicking a file renders content in canvas preview. Virtual scroll handles large files. Search filters the tree. Panel floats/pops out.
**Depends on:** P5-C (panel registration), layout engine (virtual heights)
**Push:** Yes

---

### P5-O: Graph Viewer Panel

**Goal:** Knowledge graph visualization. Canvas pan/zoom. Pretext-measured labels on every node and edge.

**Files:**
- Update `apps/desktop/src/components/panels/GraphViewerPanel.tsx` (REPLACE placeholder. Canvas-rendered force-directed graph. Nodes = entities (persona glyphs for personas, generic nodes for concepts). Edges = relationships. Labels via Pretext `fitToContainer`. Mouse: drag to pan, wheel to zoom, click node to highlight + DOM detail overlay. Zoom-dependent label visibility. Uses ResizeObserver)
- `apps/desktop/src/components/panels/hud/graph-layout.ts` (simple force-directed layout: repulsion between nodes, attraction along edges, gravity toward center. Iterates on requestAnimationFrame. Stabilizes after ~100 iterations. Pure math, no external dependency)
- `apps/desktop/src/hooks/useGraphData.ts` (placeholder data source — returns hardcoded node/edge data for Phase 5. Wire to retrieval engine in Phase 8.3, replace with Knowledge Garden renderer. Provides: nodes with id/label/type/persona, edges with source/target/label/weight)

**Imports:**
- `@forge-os/layout-engine`: `fitToContainer`, `measureText`, `renderStyledSpans`
- `@forge-os/canvas-components`: `PersonaGlyph`, `ConnectionLine`

**Gate:** Graph renders nodes and edges. Pan/zoom works smoothly. Labels are readable at all zoom levels. Node click shows detail. Persona nodes show glyphs. Panel floats/pops out.
**Depends on:** P5-C (panel registration), layout engine
**Push:** Yes

---

### P5-P: Phase 5 Integration + Ambient Animation

**Goal:** Final polish pass. All 6 new panel types working together. Ambient idle animation. Replay from session history. Workspace presets updated.

**Files:**
- Update `apps/desktop/src/components/panels/hud/PipelineCanvas.tsx` (add ambient idle animation: subtle node drift via sine wave, pulse intensity varies, persona glyph ember states — glyphs glow softly when idle, brighten on activity)
- Update `apps/desktop/src/components/panels/hud/FlowOverlay.tsx` (add replay mode: stores dispatch events in session, can replay flow visualization from history. Toggle button in panel titlebar)
- Update `apps/desktop/src/window-manager/manager.ts` (ensure presets seed: `build` = Canvas HUD with flow overlay. `gate_review` = Agent Board + Findings + Timeline. `observatory` = Canvas HUD + Graph Viewer + Vault Browser)
- Update `apps/desktop/src/components/panels/CanvasPanel.tsx` (final layout polish — empty/error/loading edge cases for all sub-components)

**Gate:** All 6 new panel types registered and functional. Ambient animation runs without performance regression. Flow replay works. 3 workspace presets (build, gate_review, observatory) tile panels correctly. Empty/error/loading states all handled.
**Depends on:** P5-L through P5-O (all 5.3 panels and flow viz)
**Push:** Yes

---

### Phase 5 Batch Summary

| Batch | Name | Session | Depends On |
|-------|------|---------|------------|
| P5-A | BOOT.md Parser + Events | 5.1 | — |
| P5-B | HUD Commands + Bridge | 5.1 | P5-A |
| P5-C | Panel Registration + HUD Shell | 5.1 | P5-B |
| P5-D | PipelineCanvas Nodes + Layout | 5.1 | P5-C |
| P5-E | BatchProgress + TokenGauge | 5.1 | P5-C |
| P5-F | ContextMeter Text Density | 5.1 | P5-D, P5-E |
| P5-G | Findings SQLite + Commands | 5.2 | P5-A |
| P5-H | Agent Board Panel | 5.2 | P5-C |
| P5-I | Findings Feed Virtualized | 5.2 | P5-G, P5-C |
| P5-J | Session Timeline Text River | 5.2 | P5-G, P5-B |
| P5-K | Session 5.2 Integration | 5.2 | P5-H, P5-I, P5-J |
| P5-L | Dispatch Event Bus + Trails | 5.3 | P5-A |
| P5-M | Flow Overlay Particles | 5.3 | P5-L, P5-D |
| P5-N | Vault Browser Panel | 5.3 | P5-C |
| P5-O | Graph Viewer Panel | 5.3 | P5-C |
| P5-P | Phase 5 Integration + Ambient | 5.3 | P5-L through P5-O |

### Phase 5 Persona + Intelligence Gates

| Batch | Gates | Rationale |
|-------|-------|-----------|
| P5-A | Kehinde | Backend module — systems architecture review (trait design, event patterns) |
| P5-B | Kehinde | Tauri command surface — bridge shape, error handling |
| P5-C | Mara + Riven | First visual surface — panel shell, layout registration |
| P5-D | Mara + Riven | Canvas-rendered pipeline — visual hierarchy, resize behavior, animation |
| P5-E | Mara + Riven | Gauges — data visualization clarity, value display |
| P5-F | Build Triad (Pierce + Mara + Kehinde) | Session 5.1 exit gate — full visual integration, all HUD sub-components |
| P5-G | Kehinde + Tanaka | SQLite schema — data model review + security (no PII in findings) |
| P5-H | Build Triad | Agent board — complex canvas rendering, grid layout, interaction |
| P5-I | Build Triad | Findings feed — severity hierarchy, virtual scroll performance |
| P5-J | Mara + Riven | Timeline — text density visualization, temporal accuracy |
| P5-K | Build Triad + Sentinel | Session 5.2 exit gate — integration + regression check on 5.1 surfaces |
| P5-L | Kehinde | Backend event bus — dispatch event shape, type safety |
| P5-M | Mara + Riven | Flow overlay — animation performance, visual clarity |
| P5-N | Build Triad | Vault browser — file I/O + canvas preview + tree interaction |
| P5-O | Build Triad | Graph viewer — force layout correctness, pan/zoom, label legibility |
| P5-P | Build Triad + Sentinel + Meridian | Phase 5 exit gate — full integration, regression, cross-surface consistency |

**New ADL decisions expected:**
- **OS-ADL-013**: HUD event taxonomy — all backend→frontend state updates use typed HudEvent enum through Tauri events
- **OS-ADL-014**: Findings persistence — HUD findings are the canonical store, not BOOT.md text parsing

**Phase 5 infrastructure totals (after all 3 sessions):**
- Session 5.1 delivered: 1 new Rust module (hud/ with 3 files), 3 Tauri commands, 1 hook (useBuildState), 5 bridge functions, 2 event listeners, isTauriRuntime guard, 5 HUD sub-components, 348 Vite modules
- Session 5.2 will add: 1 SQLite migration (V10), 1 Rust file (hud/findings.rs), 4 Tauri commands, 3 hooks (useAgentBoard, useSessionTimeline, useFindingsFilter), ~8 bridge functions, 3 panel implementations replacing placeholders
- Session 5.3 will add: 1 Rust file (hud/dispatch_events.rs), 1 Rust command module (commands/vault.rs), 2 Tauri commands, 1 hook (useGraphData), ~4 bridge functions, 3 panel implementations replacing placeholders, flow overlay, graph layout engine
- 3 workspace presets: build (updated), gate_review (new), observatory (new)

**Deferred to Phase 8:**
- IntelligenceGlyph component (10 new draw functions) — needs Phase 8 event bus data
- IntelligenceNetwork panel — visualization of intelligence chains, deferred until chains exist

---

