# Forge — Tauri Desktop App Build Plan

## Context

Forge OS was originally planned as a Claude Code extension system (methodology docs + genericized agents + a React dashboard). Today's design conversation fundamentally changed the vision: **Forge is a standalone Tauri desktop application** — a native program you load up and build with. It features a chat interface for directing AI agents, a Pretext-powered living canvas HUD, an embedded dev server preview, connectivity monitoring, and agent presence visualization. This is not a dashboard bolted onto a terminal — it's a spatial, animated, living workspace where the entire build process is visible and directed from one window.

**App name:** Forge
**Repo:** CYM4TIC/forge-OS (existing Phase 1 repo, Tauri added around it)
**Local workspace:** `forge-dms-brain/forge-os/` (inside DMS vault — single working directory for specs + code)
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
- Install react-resizable-panels for six-panel resizable layout
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

## Phase 4: Pretext Layout Engine + Document Generation (3 sessions) — MOVED FROM PHASE 3

**Goal:** The canvas rendering primitive AND the dual-output document engine.

### Session 3.1 — Core Engine
- `packages/layout-engine/` — the Pretext wrapper
  - `prepare.ts` — batch prepare for arrays of text blocks, font caching, memoization
  - `measure.ts` — single + multi-breakpoint measurement (375/768/1280), height-for-width
  - `fit.ts` — fit-to-container solver: given text + width + min/max font, binary search over layout() (<1ms)
  - `canvas.ts` — canvas text renderer: draw prepared text with line breaks, colors, alignment, styled spans (bold, color, badges)
  - `virtual.ts` — pre-compute heights for virtualized lists (react-window/react-virtuoso compatible)
  - `types.ts` — PreparedText, LayoutResult, MeasureOptions, FitResult, VirtualHeightMap
- Install `@chenglou/pretext` as dependency
- Unit tests for measurement accuracy

### Session 3.2 — Canvas Components Library
- `packages/canvas-components/` — reusable canvas-rendered UI primitives
  - StatCard (number + label + trend indicator)
  - ProgressArc (circular gauge, batch progress)
  - StatusBadge (green/amber/red with pulse animation)
  - FlowParticle (animated dot traveling along a bezier path)
  - NodeCard (rounded rect with text, icon, status indicator, dynamic font sizing)
  - ConnectionLine (animated bezier between two nodes)
  - TokenGauge (pre-measured number displays — "$4.23" → "$4.24" without element shifting, widest-possible-value space reservation)
  - ContextMeter (per-session context window fill gauge)
- All components use Pretext for text measurement, render to canvas
- Test page inside the Tauri app

### Session 3.3 — Document Generation Engine
- `packages/document-gen/` — dual-output from single content
  - `pdf.ts` — page-break calculator: given content blocks + page dimensions, compute per-page. Render to canvas, export as PDF blob.
  - Gate report template: title, findings table (severity/persona/description/evidence/fix), summary stats
  - Project brief template: project name, architecture decisions, batch plan, persona assignments
  - Build report template: batch progress, findings resolved, risks, token usage
  - Retrospective template: timeline, learnings, failure modes, recommendations
- **Dual output:** markdown for Claude to read, Pretext-rendered PDF for humans
- Test: generate PDF from sample data, verify page breaks and typography

**Depends on:** Phase 1 (project structure)
**New ADL:** OS-ADL-016 (multi-panel layout with canvas center), OS-ADL-020 (dual-output document generation)

---

## Phase 5: Living Canvas HUD (3 sessions) — WAS PHASE 4

**Goal:** The center panel becomes an animated, GPU-accelerated visualization of system state. Every visual component uses the layout engine from Phase 3. Canvas for presentation, DOM for interaction.

### Session 4.1 — Build State Topology + Core Gauges
- `PipelineCanvas` — canvas-rendered pipeline with animated stage transitions:
  - Pipeline stages as nodes: Scout → Build → Triad → Sentinel
  - Nodes pulse when active, dim when idle, glow on completion
  - Agent names perfectly centered at any zoom via Pretext measurement
- `BatchProgress` — layer visualization, animated counters, percentage arc gauge
- `TokenGauge` — pre-measured number displays, zero-shift updates
- `ContextMeter` — per-session context window fill gauge
- Reads state from BOOT.md (parsed by Rust backend, emitted as Tauri events)
- Ambient idle animation (subtle node drift, pulse)

### Session 4.2 — Agent Board + Findings Feed
- `AgentBoard` — canvas-rendered agent cards:
  - Status (idle/running/complete/error), model tier badge
  - Animated state transitions (fade in on dispatch, pulse on activity)
  - Dynamic font sizing for variable name lengths via Pretext fit()
  - Click to expand → shows last finding, domain health
- `FindingsFeed` — virtualized scrolling list:
  - Pretext pre-computed heights for zero-jank scroll (hundreds of findings, no lag)
  - Canvas-rendered finding cards with severity-colored text
  - Color-coded: P-CRIT red, P-HIGH orange, P-MED yellow, P-LOW blue
  - Filterable by persona, severity, status
  - Findings persist to SQLite
- `SessionTimeline` — BOOT.md handoffs visualized as canvas-rendered horizontal timeline with annotations

### Session 4.3 — Flow Visualization + Graph
- Semi-transparent overlay on the canvas
- When agents dispatch/communicate, animated particle flows show:
  - Scout → Nyx (pre-build intel delivery)
  - Nyx → Build Triad (gate dispatch)
  - Triad → Nyx (findings return)
  - Wraith probe paths hitting system surfaces
- Bezier curves with moving particles, color-coded by type (dispatch=blue, findings=orange/red, context=green)
- Triggered by real dispatch events from the orchestration engine
- Toggleable visibility, replayable from session history
- `VaultBrowser` — tree view (DOM for interaction) with content panel (canvas-rendered for consistent typography), pre-computed document heights for virtual scroll
- `GraphViewer` — knowledge graph with Pretext-measured labels on every node and edge, canvas pan/zoom, entity highlighting

**Depends on:** Phase 3 (Pretext + canvas components + document gen)

---

## Phase 6: Dev Server Preview + Connectivity (2 sessions) — WAS PHASE 5

**Goal:** Embedded live application preview and service health monitoring.

### Session 5.1 — Dev Server Preview Panel
- Tauri sidecar/shell API for dev server process management
  - Start/stop/restart dev servers
  - Process stdout/stderr capture
  - Port detection and health polling
- Embedded `<webview>` panel pointing to localhost:PORT
- Viewport controls (desktop/tablet/mobile presets, custom dimensions)
- URL bar for navigation within the preview
- Agent-accessible: agents can read the preview DOM state via Tauri commands
  - No screenshot round-trips — the rendered app is a first-class citizen

### Session 5.2 — Connectivity Panel
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

**Depends on:** Phase 1 (Tauri shell), Phase 3 (canvas components)
**New ADL:** OS-ADL-017 (dev server management via Tauri sidecar)

---

## Phase 7: Team Panel + Agent Presence (2 sessions) — WAS PHASE 6

**Goal:** Personas as first-class visible entities with state and direct dispatch.

### Session 6.1 — Team Panel
- Right sidebar showing all registered agents
- Grouped by role: Personas, Intelligences, Orchestrators, Utilities
- Each agent card shows:
  - Name + icon
  - Model tier badge (high/medium/fast)
  - Status (idle/active/findings-pending)
  - Domain health indicator
  - Last finding or recommendation (truncated)
  - Time since last activity
- Direct dispatch button → opens chat with that persona pre-selected
- Click agent → expand to see full recent history

### Session 6.2 — Agent Orchestration UI
- Dispatch queue visualization (what's pending, what's running)
- Parallel execution indicator (e.g., "3 Triad agents running")
- Gate status display (pass/fail/in-progress per gate)
- Session timeline (horizontal, shows BOOT.md handoffs as milestones)
- Orchestrator controls: "Run Build Triad", "Dispatch Scout", "Red Team This"
- "Export Report" button → generates PDF via document generation engine

**Depends on:** Phase 4 (canvas), Phase 1 (chat), Phase 3 (document gen for export)

---

## Phase 8: Orchestration Engine + LightRAG (4 sessions) — WAS PHASE 7

**Goal:** The Rust backend intelligence that makes autonomous agent dispatch work, plus knowledge graph.

### Session 7.1 — Vault Watcher + State Engine + Memory System
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
- **Introspection lifecycle:**
  - Contextual triggers: layer exits, failure events, persona drift, new project start, batch milestones (~15-20)
  - Prompts user when introspection is due
  - Failure modes persist globally — personas get permanently smarter across ALL projects

### Session 7.2 — Agent Dispatch Pipeline
- Orchestration engine in Rust:
  - Sequential: Scout → Build → Gate → Sentinel
  - Parallel: 3 Triad agents simultaneously (3 concurrent provider streams)
  - Each agent's `model:` frontmatter determines capability tier → routed to configured provider's best model
  - Mixed-provider dispatch: Nyx on Claude Opus, sub-agents on GPT-4, Sentinel on fast local model
  - Gate enforcement: parse findings, determine pass/fail
  - Auto-fix loop: findings → Nyx fix → re-verify
- Pipeline state emitted to frontend via Tauri events
- Provider fallback: rate-limit or error → auto-fallback to next provider at same tier
- Document generation triggers: auto-generate gate report PDF on gate completion

### Session 7.3 — LightRAG Integration
- Install LightRAG (`pip install lightrag-hku`) + MCP bridge
- Configure with Claude API backend
- `tools/index-vault.py` for batch indexing
- Query routing: hybrid default, local for entity questions, global for cross-cutting
- Index OS's own docs as test → verify queries
- Wire into Scout's pre-build recon (LightRAG query for batch-relevant entities)
- Wire into GraphViewer (Phase 4.3) — LightRAG entities with Pretext-measured labels
- Auto-index when `/init` or `/link` creates a new vault

### Session 7.4 — /init + /link Flows + Customer Simulator Generator
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

**Depends on:** Phase 1 (Tauri + providers), Phase 4 (canvas for pipeline viz), Phase 3 (document gen for PDF)

---

## Phase 9: Integration Test + DMS Reconnection (2 sessions) — WAS PHASE 8

**Goal:** Prove the full system works end-to-end.

### Session 8.1 — Fresh Project Test
- `/init test-project` → verify all six panels activate
- Chat with multiple personas across different providers
- Canvas HUD shows pipeline stages, animated
- PDF project brief generated
- LightRAG indexes vault, GraphViewer renders entities
- Connectivity panel shows GitHub
- Agent dispatch → Scout → Build → Triad gate
- Gate report PDF generated
- Customer simulator agents created by Mara
- All 105 agents have `model:` frontmatter
- Tanaka has Trail of Bits enhancements
- Mara has design intelligence + Pretext/CLS evaluation
- Pretext detection scaffolds layout-engine when customer-facing surfaces detected

### Session 8.2 — DMS Reconnection
- `/link` the Forge DMS vault
- Verify BOOT.md parsing → Canvas HUD shows L4-J.2c position
- LightRAG indexes 146 segments + ADL + build learnings
- Scout recon against DMS Supabase (with LightRAG query)
- Build Triad gate (3 parallel sessions across configured providers)
- Gate report displayed in Findings Feed AND exported as PDF
- Dev server preview showing DMS app
- **Proof:** Forge can resume building the DMS

**Depends on:** All prior phases complete

---

## Deferred to Post-v1

- Visual regression system (Sentinel baseline capture/comparison)
- Scheduled tasks (periodic agent dispatch — stale findings, build progress, persona evolution)
- n8n integration (workflow automation)
- CLI provider implementation (shells out to arbitrary CLI tools)
- Ollama provider implementation (local model hosting)
- Provider marketplace / plugin system
- Customer simulation scaffolding during /init (sim-{role}.md auto-generation)
- Competitive monitor (Calloway scheduled scans)

---

## Summary

| Phase | Sessions | Deliverable |
|-------|----------|-------------|
| 1. Tauri Shell + Chat | 3 | Running app, multi-engine streaming, chat works |
| 2. Content Layer | 5 | 105 agents + 12 reference extractions + 5 skills + model tiering + persona enhancements (parallel) |
| 3. Pretext Engine + Docs | 3 | Layout engine + canvas components + PDF document generation |
| 4. Canvas HUD | 3 | Living build state + agent board + findings + flow viz + graph |
| 5. Preview + Connectivity | 2 | Embedded dev server + service health |
| 6. Team + Presence | 2 | Agent cards + orchestration UI + report export |
| 7. Orchestration + LightRAG | 4 | Vault watcher + dispatch pipeline + LightRAG + /init + /link |
| 8. Integration Test | 2 | End-to-end + DMS reconnection |
| **Total** | **24** | **~19 on critical path (Phase 2 parallel)** |

## Verification

After each phase:
- App launches via `pnpm tauri dev` without errors
- New panels render and are interactive
- SQLite persists data across app restarts
- Provider system works (chat responses stream from configured engine)
- Canvas renders at 60fps (no jank)
- All code pushed to CYM4TIC/forge-OS

Final verification (Phase 8): Alex opens Forge, links the DMS project, LightRAG indexes it, and resumes the L4-J.2c build entirely from within the app. Gate reports export as typeset PDFs. All 105 agents respond in character through any configured provider.
