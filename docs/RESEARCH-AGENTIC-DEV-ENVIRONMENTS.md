# Research: Agentic Development Environments
## Session Date: 2026-04-04
## Participants: Alex (Operator), Nyx (Dr. Nyx)

---

## Source Material (5 products, 10 URLs)

| Product | Type | Stack | Stars | License |
|---------|------|-------|-------|---------|
| **Zed** | GPU-accelerated IDE with agent system | Rust (97.7%), GPUI, Metal/DX11/wgpu | 78.5k | GPL+AGPL |
| **T3 Code** | GUI orchestrator for CLI agents | Electron, React 19, Effect.js, node-pty, XTerm.js | 8.1k | MIT |
| **cmux** | Native macOS terminal for AI agents | Swift/AppKit, libghostty, WebKit | - | GPL-3.0 |
| **Ghostty** | GPU-accelerated terminal emulator + embeddable library | Zig (79%), Swift (macOS), GTK4 (Linux) | ~50k | MIT |
| **OpenAI Codex** | Cloud-first async software engineering agent | Cloud containers, codex-1 model family | - | Proprietary |

---

## Pattern Extraction (52 patterns across 5 products)

### TIER 1 — New Capabilities (not in current build plan)

#### P1. Embedded Terminal Panel via ghostty-web
**Source:** Ghostty, cmux
**What:** libghostty-vt compiled to WASM (~400KB), xterm.js-compatible API, canvas-based 60fps renderer. Created by Coder for "Mux" — a desktop app for isolated parallel agentic development. Drop-in for any webview.
**Integration:** New panel type in window manager. Tauri sidecar manages PTY, communicates via WebSocket to ghostty-web in React webview. Alternative: `alacritty_terminal` crate (Zed's approach) on Rust side with custom bridge to webview.
**Where it fits:** New session or patch into Phase 6 (Dev Server Preview). Terminal panes alongside preview panes.
**Why it matters:** Operator confirmed terminal embedding as a goal. Agents can execute commands in visible terminal panes. The operator sees what agents do in real-time. Terminal output becomes a first-class data source for the dispatch pipeline.
**Alternative path:** Zed uses `alacritty_terminal` Rust crate for VTE parsing + custom GPUI element for rendering. For our Tauri webview, ghostty-web WASM is the cleaner path — it renders to canvas in the React layer, avoiding a native-to-webview rendering bridge.

#### P2. Agent Client Protocol (ACP) Support
**Source:** Zed
**What:** Open protocol for connecting any external agent to any editor. JSON-RPC 2.0 over stdio. Agent runs as subprocess, editor mediates all file/terminal access. Adopted by JetBrains, Eclipse. Supported by Claude Code, Codex, Gemini CLI, Goose.
**Spec:** https://agentclientprotocol.com / https://github.com/agentclientprotocol/agent-client-protocol
**SDKs:** Rust, TypeScript, Python, Kotlin, Java
**Integration:** Forge OS as an ACP host. External agents (Claude Code, Codex, Goose) connect via ACP and appear as dispatch targets alongside our internal persona system. The dispatch pipeline mediates all tool calls through our capability family model.
**Where it fits:** Phase 8.2 (dispatch pipeline) or Phase 8.4 (/init + /link). ACP host as a new dispatch transport alongside our internal agent dispatch.
**Why it matters:** Interoperability. Instead of reimplementing every agent's capabilities internally, Forge OS can host any ACP-compatible agent and route its actions through our governance system (capability families, mana economy, tool confirmation). The agent ecosystem becomes our ecosystem.
**Key ACP features:** Agent "following" (user watches agent navigate codebase), multi-buffer diff review with LSP support, streaming via JSON-RPC notifications, editor-mediated sandboxing.

#### P3. Git Worktree Isolation for Parallel Dispatches
**Source:** Codex, Zed, T3 Code
**What:** Each parallel agent gets its own git worktree — a separate checked-out copy sharing the same `.git` history. Structural conflict avoidance rather than coordination-based (locking/merging).
**Convergence:** All three products independently arrived at worktrees as the multi-agent isolation primitive. Codex: native worktree mode per thread. Zed: Container Use creates worktree per background agent. T3 Code: default thread environment mode can be "worktree".
**Integration:** When Swarm dispatches parallel Triad agents (Pierce + Mara + Kehinde), each gets its own worktree. Findings reference worktree-relative paths. Nyx's fix cycle operates on the main working directory. Gate results merge cleanly because gate agents are read-only.
**Where it fits:** Patch candidate for Phase 3 (Swarm Mailbox) or integrate into Phase 8.2 (dispatch pipeline). The `DispatchRequest` struct gets an optional `isolation: WorktreeIsolation` field.
**Why it matters:** Currently our parallel Triad agents share a working directory. If two agents try to read+annotate the same file simultaneously, there's contention. Worktree isolation eliminates this structurally.

#### P4. WASM Plugin Sandboxing via Wasmtime + WIT
**Source:** Zed
**What:** Extensions run in WASM sandbox via Wasmtime. WebAssembly Interface Types (WIT) files define versioned API contracts (v0.1.0 through v0.8.0). Extensions compile to `wasm32-wasip2`. Failures are contained — Zed can reload without restarting.
**Integration:** Replaces or augments the React error-boundary plugin approach in Phase 10.4. Plugins compile to WASM, run in Wasmtime on the Rust side. Plugin contract defined via WIT. The Tauri backend loads/unloads plugins dynamically.
**Where it fits:** Phase 10.4 (Self-Modification Architecture — Plugin Layer). Upgrades from error-boundary isolation to WASM sandbox isolation.
**Why it matters:** Error boundaries catch rendering crashes but not malicious/buggy logic. WASM sandboxing provides memory isolation, capability restriction, and deterministic resource limits. A crashing plugin can't corrupt Tauri state. Critical for the skills marketplace (8.1) if we ever allow community-contributed skills to execute code.

#### P5. Issue-Tracker-as-Dispatch Surface
**Source:** Codex
**What:** Tasks originate from project management tools via @mentions. `@codex` in a GitHub Issue kicks off a task. `@codex` in a Linear issue does the same. Jira via label-triggered GitHub Action automation.
**Integration:** Linear MCP is already connected. New dispatch surface: operator assigns a Linear issue to Forge OS (or @mentions), dispatch pipeline picks it up, creates a thread, routes to appropriate persona(s), executes, posts results back to the issue.
**Where it fits:** Phase 8.4 (/init + /link) or Phase 10.3 (Messaging Gateway). The gateway already handles selective inbound — extend to issue tracker inbound.
**Why it matters:** Decouples task dispatch from the desktop app. Operator can file issues from their phone, Linear, or GitHub — Forge OS picks them up autonomously. Combined with the ritual system, enables overnight batch processing of issue backlogs.

---

### TIER 2 — Validations of Existing Design (12 convergence points)

These patterns independently confirm architectural decisions already in the build plan.

| # | Pattern | Source | What It Validates | Our Implementation |
|---|---------|--------|-------------------|-------------------|
| V1 | Tool Profiles (Write/Ask/Minimal) | Zed | CapabilityFamily + InteractionMode | Phase 7.1 — we're more sophisticated (6 families × 3 modes vs. 3 profiles) |
| V2 | spawn_agent with MAX_DEPTH=1 | Zed | max_emanation_depth | Phase 8.2 — our depth=2 is slightly more permissive |
| V3 | Skills as lazy-loaded modules | Codex | Skills system lazy injection | Phase 8.1 — metadata eager, full instructions on demand |
| V4 | Container isolation for background agents | Zed | E2B sandbox for Wraith/Kiln | Phase 8.2 — E2B for red-team and profiling |
| V5 | Rules files / AGENTS.md hierarchy | Zed, Codex | Cognitive kernel system | Our 24 kernels are deeper — per-entity, not just project-level |
| V6 | Event-sourcing orchestration (22 event types) | T3 Code | Echo ledger + decision traces | Phase 8.1 — our echo types are richer (7 types + ATIF trajectory) |
| V7 | Adapter/Registry for providers | T3 Code | ModelProvider trait + ProviderRegistry | Phase 1.3 — already shipped with 4 provider types |
| V8 | Thread-per-task with checkpoint revert | T3 Code | Session model with per-batch checkpoints | Phase 3 — sessions in SQLite, BOOT.md as checkpoints |
| V9 | NDJSON event logging | T3 Code | Echo ledger (JSONL) | Phase 8.1 — daily JSONL at `vault/echoes/<date>.jsonl` |
| V10 | Contract-first protocol layer | T3 Code | @forge-os/shared types package | Phase 1.3 — TypeScript types in shared package |
| V11 | Two-phase execution (setup → agent) | Codex | CapabilityFamily dispatch scoping | Phase 7.1 — capability grants per dispatch, not per session |
| V12 | RL-trained verification behavior | Codex | Gate enforcement as scaffolding | Phase 8.2 — we enforce via pipeline stages since we can't train the model |

**Analysis:** 12 independent convergence points across 4 products. The market is arriving at the same architectural conclusions we documented in the build plan. Key differentiation: our system is more granular (capability families vs. simple profiles, 24 kernels vs. flat rules files, typed echo ledger vs. generic event logs) and more opinionated (mandatory pipeline stages vs. optional verification).

---

### TIER 3 — Enrichments to Existing Plans (15 patterns)

#### E1. Orchestrator-over-Terminal Pattern
**Source:** cmux (cmux-agent-mcp, 81 tools)
**What:** One orchestrator agent controls N worker agents by injecting prompts into their terminal panes and reading terminal output. Workers are standard CLI agents that don't need modification.
**Enriches:** Phase 8.2 (dispatch pipeline). Alternative dispatch transport: instead of our internal Rust dispatch, the orchestrator could control Claude Code / Codex instances running in embedded terminal panes via ACP or terminal I/O.
**Assessment:** Crude but universal. Our internal dispatch is more structured (typed events, capability grants, mana budgets). But the terminal-I/O pattern could serve as a fallback transport for agents that don't support ACP.

#### E2. Browser-as-Surface Peer to Terminal
**Source:** cmux
**What:** Browser panes are peer to terminal panes in the same workspace. Scriptable — agents can drive them.
**Enriches:** Phase 6 (Dev Server Preview). We already have webview preview panels. The enrichment is making browser panes first-class dispatch targets — agents can interact with the preview DOM as a tool, not just view it.
**Assessment:** Already partially in plan. Phase 6 mentions "Agent-accessible: agents can read the preview DOM state via Tauri commands." cmux validates making this bidirectional.

#### E3. Metadata Sidebar for Situational Awareness
**Source:** cmux
**What:** Sidebar aggregates git branch, PR status, listening ports, notifications per workspace. Developer glances to know state of all concurrent sessions.
**Enriches:** Phase 7.1 (Team Panel) + Phase 6.2 (Connectivity Panel). Our Team Panel shows agent state; Connectivity Panel shows service health. The enrichment is adding git/PR/port awareness to the dock bar pills — aggregate status visible without opening panels.
**Assessment:** Minor UI enhancement. Dock pill for git state (branch + dirty indicator). Low priority but high information density.

#### E4. Worker Pool for Diff Computation
**Source:** T3 Code
**What:** `DiffWorkerPoolProvider` offloads diff computation to web workers. Essential for large codebases where diffs can block the main thread.
**Enriches:** Phase 5.2 (Findings Feed) and future code review features. When gate findings reference file diffs, computing those diffs in web workers prevents UI jank.
**Assessment:** Targeted optimization. Implement when diff-heavy features land.

#### E5. Plan Mode as Explicit User Choice
**Source:** Codex, T3 Code
**What:** Agent reads through complex changes in read-only mode, discusses with user before executing. T3 Code: `thread.interaction-mode-set` with "plan" vs "default".
**Enriches:** Phase 0 (Scout pre-build recon). Currently Scout runs automatically. The enrichment: operator can explicitly request "plan mode" where Nyx analyzes the batch, presents a plan, and waits for approval before Phase 1 (Build). Maps to `InteractionMode::Spec` from Phase 7.1.
**Assessment:** Already architecturally supported via InteractionMode. Just needs a UI surface — a toggle in the Action Palette or a `/plan` command.

#### E6. GitHub Action as CI Agent Runtime
**Source:** Codex (`openai/codex-action@v1`)
**What:** Codex CLI installed in GitHub Actions. Can apply patches, post reviews, auto-fix CI failures.
**Enriches:** Phase 10.3 (Messaging Gateway) + Beacon (post-deploy). Beacon could run as a GitHub Action triggered by deployment events, performing post-deploy verification and filing traces back to the desktop app.
**Assessment:** Post-v1 capability. Requires packaging Forge OS agents as standalone CLI tools first.

#### E7. Checkpoint Revert as First-Class Operation
**Source:** T3 Code
**What:** Per-turn checkpoints with one-click revert. Checkpoint statuses: ready/missing/error.
**Enriches:** Phase 8.2 (dispatch pipeline). After each build micro-batch, create a git checkpoint. If gate findings require reverting a batch, one command reverts to the pre-batch state.
**Assessment:** `git stash` + `git tag` already provide this primitively. A formal `BatchCheckpoint` struct in SQLite with revert commands would make it first-class.

#### E8. Stacked Git Actions
**Source:** T3 Code
**What:** Composite git workflows: `commit`, `push`, `create_pr`, `commit_push`, `commit_push_pr` with phase-by-phase progress events.
**Enriches:** Phase 5 close sequence. Currently Nyx pushes manually. Stacked git actions as a `CloseSequence` enum: `CommitAndPush`, `CommitPushAndPR`, `CommitOnly`. Emits progress events to the HUD.
**Assessment:** Nice-to-have. Reduces manual git ceremony at batch close.

#### E9. Fleet Orchestration via Headless Instances
**Source:** Zed (Helix fork)
**What:** Forked Zed to run headless in Docker containers. Central API dispatches tasks, monitors progress, streams results via ACP.
**Enriches:** Phase 8.2 (Swarm dispatch). Instead of parallel in-process agents, spawn headless Forge OS instances in containers. Each gets full tool access. Results stream back via event bus.
**Assessment:** Architecturally interesting but overkill for our current scale. File under "Phase 9+ if we need horizontal scaling."

#### E10. Composable Primitives Philosophy
**Source:** cmux ("Zen of cmux")
**What:** Give developers terminal + browser + notifications + splits + CLI. Let a million developers discover optimal workflows rather than designing top-down.
**Enriches:** Our Phase 10.4 (Self-Modification Architecture). The tension: our opinionated pipeline (6 mandatory phases, no skips) vs. composable primitives. Resolution: the pipeline is the default. Self-modification architecture allows operators to compose custom workflows from pipeline stages. Advanced operators can skip Scout. Beginners get the full pipeline.
**Assessment:** Already partially addressed by `can_skip(ctx)` in Phase 8.2's PipelineStage trait. The composability enrichment: expose individual pipeline stages as independently invocable commands, not just a fixed sequence.

#### E11. MSDF Text Rendering for Crisp Zoom
**Source:** Zed (GPUI)
**What:** Multi-channel Signed Distance Function rendering for text at any zoom level. Crisp at 0.1x and 10x.
**Enriches:** Phase 4 (Pretext canvas text rendering). Our canvas components render text at various zoom levels on the Graph Viewer. MSDF would eliminate blurriness at extreme zooms.
**Assessment:** Pretext handles text measurement and layout. The rendering is canvas 2D context. MSDF is a GPU shader technique — only applicable if we move to WebGL/WebGPU canvas rendering. File under "performance optimization if zoom quality becomes an issue."

#### E12. Context Compaction as Model-Level Capability
**Source:** Codex
**What:** Automatic summarization as session approaches context limits. Enables effective windows far beyond raw token limit. Model-trained behavior, not just scaffolding.
**Enriches:** Phase 3 (Auto-Compact Engine, P3-I). Our auto-compact is scaffolding-based (85% threshold, 9-section summary). Codex demonstrates that model-trained compaction is strictly better. When models with native compaction are available, our compact engine should detect and defer to the model's built-in capability rather than running its own summarization.
**Assessment:** Architectural note for Phase 8.1 — `ContextEngine` trait should have a `supports_native_compaction()` method. If the provider supports it, skip our summarization pass.

#### E13. Thin Desktop Shell Pattern
**Source:** T3 Code
**What:** Electron shell is intentionally thin (~3 deps). Exposes `NativeApi` over IPC with ~40 methods. All logic lives in server + web layers.
**Enriches:** Our Tauri architecture. Tauri is already thinner than Electron by design. But the pattern reinforces: keep Tauri commands as thin bridges to Rust modules. Don't put business logic in the command handlers — put it in domain modules that commands delegate to.
**Assessment:** Already our pattern. Validation, not enrichment.

#### E14. Provider Factory with Hot-Swap
**Source:** Zed (15+ provider crates), T3 Code (adapter registry)
**What:** Each AI provider is a separate crate/module with factory registration. Zed has 15+ provider crates. T3 Code has adapter + registry + service layers. Both support runtime provider switching.
**Enriches:** Phase 1.3 (provider system) + Phase 8.1 (SharedProvider hot-swap from Goose). Zed's per-provider crate granularity is the most extreme version — we don't need 15 crates, but our provider trait + registry approach is validated. The enrichment: T3 Code's `ProviderSessionDirectory` managing session lifecycle per provider is a pattern we should adopt for the mana economy — tracking mana spend per provider session.
**Assessment:** Minor enrichment to existing design.

#### E15. Agent Following (Real-Time Observation)
**Source:** Zed (ACP)
**What:** User can watch the agent navigate the codebase in real-time with full syntax highlighting. Agent actions are visible as they happen — file opens, cursor moves, terminal commands.
**Enriches:** Phase 7.3 (Dispatch Queue) + embedded terminal. When an agent is dispatched, the operator can "follow" it — seeing terminal output, file reads, and edits in real-time in the embedded terminal pane. Not just a progress spinner — full transparency.
**Assessment:** High-value UX pattern. Naturally falls out of the embedded terminal (P1) + ACP (P2) combination. When agents run in terminal panes, their work is inherently visible.

---

### TIER 4 — Architectural Intelligence (Cross-Cutting Observations)

#### O1. The Convergence on Worktrees
Three independent products (Codex, Zed, T3 Code) all arrived at git worktrees as the multi-agent isolation primitive. Not containers (too heavy for read-only gate reviews), not file locks (too fragile), not branch-per-agent (merge overhead). Worktrees share `.git` history with zero copy cost and provide true filesystem isolation. This is the industry consensus.

#### O2. The Protocol Split: MCP for Context, ACP for Control
Zed draws a clear line: MCP provides context (databases, APIs, analytics). ACP controls agents (file access, terminal, tool mediation). These are complementary, not competing. Forge OS should support both: MCP for enriching agent context (we already use MCP servers), ACP for hosting external agents.

#### O3. The GUI Orchestrator Pattern
T3 Code explicitly positions itself as NOT an editor — it's a "frontend for agentic coding." The editor is whatever you already use. This is the same architectural space Forge OS occupies: we're not replacing VS Code or Zed. We're the orchestration layer that manages the multi-agent build process. The terminal embedding (P1) + ACP support (P2) would let operators use their preferred editor while Forge OS manages the agent fleet.

#### O4. The Ghost in the Terminal
cmux and Ghostty together reveal a hidden infrastructure layer: libghostty as an embeddable terminal engine. cmux uses it. Coder's Mux uses ghostty-web. Forge OS can use ghostty-web for terminal panes. This is a platform primitive, not just a product — the terminal rendering engine is becoming a shared library like SQLite or libpng.

#### O5. The Verification Spectrum
Products arrange on a verification spectrum from passive to active:
- **Codex:** RL-trained to run tests (model behavior)
- **Zed:** Tool permissions with auto-approve/confirm/deny (editor-mediated)
- **T3 Code:** Checkpoint revert per turn (rollback-based)
- **cmux:** No verification (developer observes terminal output)
- **Forge OS:** 6-phase mandatory pipeline with external gate agents (institutional)

We're at the institutional end — the most structured. The enrichment is adding lighter-weight verification modes for experienced operators (E5 plan mode, E10 composable stages) without abandoning the institutional default.

---

## Integration Map

### Patches to Shipped Phases (1-7)

| Patch | Phase | What Changes | Priority |
|-------|-------|-------------|----------|
| **Worktree isolation for Swarm** | 3 (Swarm Mailbox) | `DispatchRequest` gets `isolation: Option<WorktreeIsolation>`. Parallel Triad agents get worktrees. | HIGH — structural improvement to parallel dispatch |
| **`supports_native_compaction()` on ContextEngine** | 3 (Auto-Compact) | ContextEngine trait gains method. Compact engine defers to model when supported. | LOW — future-proofing |
| **Plan mode toggle** | 7.2 (Action Palette) | New `InteractionMode::Plan` maps to existing `Spec` mode. `/plan` command in CommandRegistry. | MEDIUM — UX improvement |
| **Git state in dock pills** | 7.1 (Team Panel) | Dock bar shows git branch + dirty indicator. Connectivity Panel enriched. | LOW — minor UX |

### Forward Integration (Phase 8+)

| Pattern | Session | Integration Point | Priority |
|---------|---------|-------------------|----------|
| **P1: Embedded Terminal (ghostty-web)** | NEW 8.9 or patch 6.1 | New panel type. PTY sidecar + WebSocket + ghostty-web WASM. | HIGH — operator confirmed |
| **P2: ACP Host** | 8.2 or 8.4 | New dispatch transport in pipeline. ACP host process. External agents as dispatch targets. | HIGH — interoperability |
| **P4: WASM Plugin Sandbox** | 8.7 | Replace error-boundary with Wasmtime + WIT. Plugin contract via WASM interface. | MEDIUM — security upgrade |
| **P5: Issue-Tracker Dispatch** | 8.6 | Linear/GitHub inbound dispatch. Issue → thread → persona routing → result posted back. | MEDIUM — autonomous dispatch |
| **P3: Worktree in dispatch** | 8.2 | `WorktreeIsolation` in DispatchRequest. Pipeline creates/destroys worktrees per dispatch. | HIGH — already needed for Swarm |
| **E7: Batch Checkpoints** | 8.2 | `BatchCheckpoint` struct in SQLite. Pre-batch git tag. One-command revert. | MEDIUM — safety net |
| **E5: Plan mode UI** | 8.4 | Toggle in Action Palette. Maps to InteractionMode::Spec. | LOW — already architecturally supported |
| **E15: Agent Following** | 8.9 (terminal) | Falls out naturally from embedded terminal + ACP. Agent work is visible. | HIGH — bundled with P1 |

### New Session Candidate: 10.1/10.2 — Embedded Terminal + ACP Host

**Rationale:** P1 (terminal) + P2 (ACP) + E15 (agent following) form a natural bundle. The embedded terminal provides the rendering surface. ACP provides the protocol. Agent following provides the UX.

**Scope:**
- ghostty-web WASM integration (terminal rendering in React)
- PTY management via Tauri sidecar (spawn/read/write/resize/close)
- Terminal panel type registered in window manager
- ACP host implementation (JSON-RPC over stdio)
- External agent management (spawn/connect/disconnect Claude Code, Codex, Goose)
- Agent following mode (watch agent work in real-time)
- Terminal output as echo source (pipe to echo ledger)

**Dependencies:** Phase 6 (dev server infrastructure), Phase 7.1 (agent registry), Phase 8.2 (dispatch pipeline)

---

## Repo Mining Integration Map

| Source | Pattern ID | Adopted Into | Status |
|--------|-----------|-------------|--------|
| Zed | ACP protocol | Phase 8.2/8.4 — ACP host | NEW |
| Zed | WASM plugin sandbox (Wasmtime+WIT) | Phase 10.4 — plugin layer upgrade | NEW |
| Zed | spawn_agent MAX_DEPTH=1 | Phase 8.2 — max_emanation_depth | VALIDATED |
| Zed | Tool Profiles (Write/Ask/Minimal) | Phase 7.1 — CapabilityFamily | VALIDATED |
| Zed | Container Use background agents | Phase 8.2 — E2B sandbox | VALIDATED |
| Zed | alacritty_terminal crate | Phase 10.1/10.2 — terminal alternative | NOTED |
| Zed | Rules files hierarchy | Kernel system | VALIDATED |
| Zed | Fleet orchestration (Helix) | Phase 9+ — horizontal scaling | DEFERRED |
| Zed | MSDF text rendering | Phase 4 — canvas text | DEFERRED |
| Zed | Edit Prediction / speculative decoding | Future — code editing | DEFERRED |
| T3 Code | Contract-first protocol (Effect.js schemas) | Phase 1.3 — @forge-os/shared | VALIDATED |
| T3 Code | Event-sourcing orchestration | Phase 8.1 — echo ledger | VALIDATED |
| T3 Code | Adapter/Registry for providers | Phase 1.3 — provider system | VALIDATED |
| T3 Code | Thread-per-task + checkpoint revert | Phase 8.2 — batch checkpoints | ENRICHED |
| T3 Code | NDJSON event logging | Phase 8.1 — echo ledger (JSONL) | VALIDATED |
| T3 Code | Worker pool for diffs | Phase 5.2 — findings feed | NOTED |
| T3 Code | Stacked git actions | Phase 5 — close sequence | NOTED |
| T3 Code | Thin desktop shell | Tauri architecture | VALIDATED |
| cmux | Orchestrator-over-Terminal | Phase 8.2 — fallback transport | NOTED |
| cmux | Browser-as-Surface | Phase 6 — preview panels | VALIDATED |
| cmux | Metadata sidebar | Phase 7.1 — dock pills | NOTED |
| cmux | Composable primitives philosophy | Phase 10.4 — self-modification | ENRICHED |
| cmux | libghostty as embeddable library | Phase 10.1/10.2 — terminal embedding | NEW |
| cmux | Terminal I/O as agent bus | Phase 8.2 — transport alternative | NOTED |
| Ghostty | ghostty-web WASM terminal | Phase 10.1/10.2 — terminal panel | NEW |
| Ghostty | Three-thread model (IO/render/write) | Phase 10.1/10.2 — PTY architecture | ADOPTED |
| Ghostty | Glyph atlas (grayscale+RGBA) | Phase 4 — canvas rendering | NOTED |
| Ghostty | SIMD VT parser (100+ MB/s) | Phase 10.1/10.2 — via ghostty-web | INHERITED |
| Ghostty | apprt platform abstraction | Tauri model | VALIDATED |
| Codex | Two-phase execution (setup→agent) | Phase 7.1 — capability scoping | ENRICHED |
| Codex | Worktree multi-agent isolation | Phase 3/8.2 — Swarm dispatch | NEW |
| Codex | Skills lazy-loading | Phase 8.1 — skills system | VALIDATED |
| Codex | Issue-tracker-as-dispatch | Phase 8.4/10.3 — Linear dispatch | NEW |
| Codex | GitHub Action agent runtime | Phase 10.3 — Beacon CI | DEFERRED |
| Codex | Plan mode as user choice | Phase 7.2 — InteractionMode | ENRICHED |
| Codex | AGENTS.md hierarchy | Kernel system | VALIDATED |
| Codex | Context compaction (model-level) | Phase 3 — auto-compact | ENRICHED |
| Codex | Subagent orchestration | Phase 8.2 — emanation system | VALIDATED |

**Totals:** 5 NEW, 16 VALIDATED, 5 ENRICHED, 7 NOTED, 4 DEFERRED, 1 INHERITED, 38 patterns catalogued

---

## Open Questions

1. **ghostty-web vs. alacritty_terminal:** ghostty-web renders in the webview (canvas, WASM). alacritty_terminal parses in Rust, needs a custom rendering bridge to React. ghostty-web is the cleaner path for our architecture. Need to verify: does ghostty-web support the full Kitty keyboard protocol? Does it handle our canvas component system's resize events?

2. **ACP host complexity:** Implementing a full ACP host is non-trivial. The spec includes file access mediation, terminal execution, tool negotiation, and streaming. Start with a minimal subset (terminal execution + file read) and expand.

3. **Worktree lifecycle management:** Who creates/destroys worktrees? The dispatch pipeline? Per-dispatch? Per-session? Codex does per-thread. Zed does per-background-task. We likely want per-dispatch for Triad (temporary, destroyed after gate) and per-session for build dispatches (persistent while building).

4. **WASM plugin API surface:** What capabilities do plugins get? Zed's WIT defines language servers, themes, slash commands, grammars. Our plugins would need: panel rendering, tool registration, signal emission, vault access. Defining the WIT contract is the hard design problem.

5. **Terminal pane count limit:** cmux runs 4-8 terminal panes routinely. Each ghostty-web instance is a WASM module + canvas. Need to profile: how many concurrent ghostty-web instances can our Tauri webview handle before performance degrades?

---

## Summary

**5 new capabilities** identified: embedded terminal (ghostty-web), ACP host, worktree isolation, WASM plugin sandbox, issue-tracker dispatch.

**16 validations** of existing build plan decisions — the market is converging on the same patterns we've already documented.

**5 enrichments** to existing plans — native compaction detection, plan mode UI, batch checkpoints, composable pipeline stages, capability scoping refinement.

**Strongest signal:** The convergence on git worktrees for multi-agent isolation (3/5 products independently) and the emergence of ACP as an interoperability standard (adopted by Zed, JetBrains, Claude Code, Codex, Goose). These two patterns together — worktrees + ACP — would give Forge OS structural isolation AND ecosystem interoperability.

**Recommended sessions:** 10.1 + 10.2 (Embedded Terminal + ACP Host). Bundles the three highest-impact new capabilities into a coherent build unit.

---

*Research session 3: Agentic Development Environments. 5 products, 10 URLs, 52 patterns extracted.*
*38 catalogued in integration map. 5 new, 16 validated, 5 enriched, 7 noted, 4 deferred, 1 inherited.*
*Previous research: Session 1 (Context Graphs + Predictive Intelligence, 11 sources), Session 2 (Block engineering, 1 source).*
