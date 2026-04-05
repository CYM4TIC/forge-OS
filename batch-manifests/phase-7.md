## Phase 7: Team Panel + Agent Presence + Action Palette + Proposals (14 batches, 3 sessions)

**Session map:** 7.1 = P7-A through P7-E | 7.2 = P7-F through P7-H | 7.3 = P7-I through P7-M
**Prerequisite:** Phase 6 complete (76 Tauri commands, 16 hooks, 6 workspace presets). All carried risks inventoried.
**Repo:** CYM4TIC/forge-OS | **Local:** `.`

**Carried risks entering Phase 7:**
| ID | Risk | Severity | From | Resolution |
|---|---|---|---|---|
| R-DS-02 | Focus ring via JS onFocus/onBlur — should be :focus-visible CSS | MED | P6-I | P7-A |
| R-DS-03 | Icon tinting for colorblind (color-only status indicators) | MED | P6-J | P7-A |
| R-DS-05 | Badge token audit (divergent badge color sources) | MED | P6-J | P7-A |
| M-1 HIGH | Roving tabIndex for VaultBrowser tree nav | MED | P5-N | P7-A |
| R-DS-04 | Sentinel + Meridian full gates deferred from Phase 6 exit | LOW | P6-J | P7-A |
| R-DS-01 | Keyring migration for HealthCheckManager credentials | HIGH | P6-G | Tracked — Phase 9 pre-release |

---

### Session 7.1 — Agent Registry + Team Panel (P7-A through P7-E)

**Goal:** Rust-side agent registry that scans all 65+ agent files, single command registry, tool availability gating, Smart Review routing, and a rebuilt Team Panel with persona glyphs and live status. All carried risks from Phase 5-6 resolved first.

---

### P7-A: Carried Risk Resolution + Full Gates

**Goal:** Resolve all 5 carried risks from Phases 5-6 before building new features. Dispatch Sentinel + Meridian full gates against Phase 6 final state.

**Risk resolutions:**

**R-DS-02 — Focus Ring CSS Migration:**
- Grep all `onFocus`/`onBlur` focus ring JS handlers across PreviewPanel, ConnectivityPanel, FindingsPanel, VaultBrowserPanel, and any other panels
- Replace with `:focus-visible` CSS rule using existing accent token (`box-shadow: 0 0 0 2px var(--accent)`)
- Add `:focus-visible` base rule in `globals.css` for interactive elements (buttons, links, inputs, [tabindex])
- Remove JS `onFocus`/`onBlur` state + inline focus ring styles from each component
- Verify keyboard navigation still shows focus ring in all panels

**R-DS-03 — Colorblind Icon Tinting:**
- DockBar connectivity badge: add secondary shape indicators alongside color (checkmark for healthy, warning triangle for degraded, X for unreachable)
- ConnectivityPanel StatusBadge: add icon glyph inside badge alongside color fill
- Ensure WCAG 1.4.1 (color not sole means of conveying information) across all status indicators

**R-DS-05 — Badge Token Audit:**
- Grep all badge color definitions: `findingsBadgeColors`, `connectivityBadge*`, `StatusBadge` variant colors, `DockPill` badge colors
- Unify into single `BADGE_COLORS` token group in `canvas-tokens.ts`
- Map: success/warning/danger/neutral/info → single hex source per semantic meaning
- Update all consumers to import from unified source
- Verify WCAG contrast (4.5:1 text, 3:1 non-text) for every badge variant

**M-1 HIGH — Roving TabIndex (VaultBrowser):**
- Implement roving tabIndex pattern in VaultBrowserPanel tree view
- Arrow Up/Down moves focus between siblings, Arrow Right expands/enters children, Arrow Left collapses/exits to parent
- Home/End jump to first/last visible node
- Type-ahead: typing characters focuses first matching node name
- `role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-selected` ARIA attributes

**R-DS-04 — Sentinel + Meridian Full Gates:**
- Dispatch Sentinel: full 4-check regression sweep (compile, runtime, visual, integration) against Phase 6 final state
- Dispatch Meridian: full 8-dimension cross-surface consistency audit (naming, spacing, color, typography, interaction, ARIA, animation, token usage)
- Fix ALL findings before proceeding to P7-B

**Files (edits to existing):**
- `apps/desktop/src/styles/globals.css` (`:focus-visible` base rule)
- `apps/desktop/src/components/panels/PreviewPanel.tsx` (remove JS focus ring)
- `apps/desktop/src/components/panels/ConnectivityPanel.tsx` (remove JS focus ring, add icon indicators)
- `apps/desktop/src/components/panels/FindingsPanel.tsx` (remove JS focus ring)
- `apps/desktop/src/components/panels/VaultBrowserPanel.tsx` (remove JS focus ring, add roving tabIndex)
- `apps/desktop/src/components/dock/DockBar.tsx` (add shape indicators to connectivity badge)
- `packages/canvas-components/src/StatusBadge.tsx` (add icon glyph)
- `packages/canvas-components/src/canvas-tokens.ts` (add unified BADGE_COLORS group)
- Additional files as Sentinel/Meridian findings dictate

**Gate:** All 5 carried risks resolved with read-back. Sentinel clean. Meridian clean. `tsc --noEmit` zero errors.
**Depends on:** Phase 6 complete
**Push:** Yes

---

### P7-B: Agent Registry Rust Module

**Goal:** Rust backend that scans all agent .md files, parses YAML frontmatter, and builds a structured in-memory registry.

**Files:**
- Create `apps/desktop/src-tauri/src/commands/registry.rs`:
  - `RegistryEntry` struct: slug, name, description, category (Persona/Intelligence/Orchestrator/Utility/SubAgent/Command), tools list (`Vec<String>`), parent_agent (`Option<String>`), file_path, user_invocable (bool)
  - `AgentRegistry` struct: `entries: HashMap<String, RegistryEntry>`, `orchestrator_members: HashMap<String, Vec<String>>`, initialized flag
  - `scan_agents(base_path: &Path) -> Vec<RegistryEntry>` — walks `.claude/agents/`, `.claude/agents/sub-agents/`, `.claude/commands/`. Reads each `.md` file, extracts YAML frontmatter between `---` delimiters, parses into RegistryEntry
  - Sub-agent parent derivation: filename prefix convention (`mara-mobile.md` → parent `mara`)
  - `Arc<Mutex<AgentRegistry>>` registered as Tauri managed state
  - Tauri command: `get_agent_registry() -> Vec<RegistryEntry>` — returns full registry (lazy-init on first call, cached thereafter)
  - Tauri command: `get_agent_content(slug: String) -> String` — reads full .md file body (everything after frontmatter) for system prompt construction
  - Tauri command: `refresh_registry()` — forces rescan (called when connectivity changes)
- Update `apps/desktop/src-tauri/src/commands/mod.rs` (add registry module)
- Update `apps/desktop/src-tauri/src/lib.rs` (register registry commands + AgentRegistry managed state)

**Gate:** `get_agent_registry()` returns 65+ entries. `get_agent_content("pierce")` returns Pierce's full agent markdown. Categories correctly assigned. Sub-agent parents resolved.
**Depends on:** P7-A
**Push:** Yes

---

### P7-C: CommandRegistry + Capability Families

**Goal:** Single command registry (all slash commands defined once, consumed everywhere) and dispatch-scoped capability grants.

**Files:**
- Update `apps/desktop/src-tauri/src/commands/registry.rs`:
  - `CommandDef` struct: slug, name, description, category (Build/Persona/Quality/Analysis/Reporting/Operations), aliases (`Vec<String>`), dispatch_target (agent slug or handler), available_when (`Option<AvailabilityCheck>`), keyboard_shortcut (`Option<String>`)
  - `CommandCategory` enum: Build, Persona, Quality, Analysis, Reporting, Operations
  - `AvailabilityCheck` enum: GitChanges, McpConnected(String), EnvVarSet(String), ServerRunning, Always
  - `CommandRegistry` struct: `commands: Vec<CommandDef>` — populated from `.claude/commands/` scan + hardcoded built-in commands
  - Embed `CommandRegistry` inside `AgentRegistry`
  - Tauri command: `get_command_registry() -> Vec<CommandDef>` — returns all commands with current availability state (checks run live)
- Create `apps/desktop/src-tauri/src/commands/capabilities.rs`:
  - `CapabilityFamily` enum: ReadOnly, WriteCode, WriteVault, Database, External, Destructive
  - Update existing `DispatchRequest` struct (from Phase 3) to include `granted_capabilities: Vec<CapabilityFamily>`
  - `default_capabilities(context: &str) -> Vec<CapabilityFamily>` — gate_review → ReadOnly, build → ReadOnly+WriteCode, dreamtime → ReadOnly+WriteVault, red_team → ReadOnly+Destructive (requires operator approval)
  - Capability enforcement: dispatch pipeline checks granted capabilities before executing tool calls
- Update `apps/desktop/src-tauri/src/commands/mod.rs` (add capabilities module)

**Gate:** `get_command_registry()` returns 30+ commands. Availability checks correctly reflect MCP connectivity state. `CapabilityFamily` enforced on dispatch — gate review dispatch rejects WriteCode tool calls.
**Depends on:** P7-B
**Push:** Yes

---

### P7-C.1: Registry Enhancements — Lazy Loading, Capability Metadata, Allow-Lists

**Goal:** Enhance the CommandRegistry and CapabilityFamily system (P7-C) with research-sourced patterns: lazy handler loading, per-persona tool allow-lists, three-tier capability model, declarative agent metadata, and dual adapter registration. All 8 patterns target the existing `registry.rs` and `capabilities.rs` without adding new files.

**Files:**
- Update `apps\desktop\src-tauri\src\commands\registry.rs`:
  - **Lazy handler loading via OnceCell (from just-bash):** `CommandDef` metadata registered at scan time, dispatch handler loaded on first invocation via `OnceCell<Box<dyn Handler>>`. Eliminates loading 30+ handler implementations on startup — only handlers that are actually invoked get loaded.
  - **Declarative capability metadata on RegistryEntry (from oh-my-codex):** Add three fields to `RegistryEntry`:
    - `reasoning_effort: ReasoningEffort` enum (Low/Medium/High) — feeds thinking token allocation in grimoire
    - `model_class: ModelClass` enum (Frontier/Standard/Fast) — feeds provider routing decisions
    - `routing_role: RoutingRole` enum (Leader/Specialist/Executor) — feeds dispatch pipeline priority
  - Populate from agent YAML frontmatter (new optional fields: `reasoning_effort`, `model_class`, `routing_role`). Defaults: Medium/Standard/Specialist.
  - **Factory-based tool registration (from AutoAgent):** `create_tool_set(persona: &str, grants: &[CapabilityFamily]) -> Vec<Tool>` — constructs per-persona tool sets at dispatch time, not statically. Persona's granted capabilities determine which tools are included.
  - **Built-in extension macro (from Goose DuplexStream):** `register_builtin!` macro for in-process capabilities that skip IPC. Used for vault reads, sigil scans, and other low-latency operations that don't need external tool calls.
  - **Dual adapter registration (from OpenCLI, 4th validation):** Commands support both YAML declarative definitions (for simple read-only operations like vault reads, sigil scans) and Rust `fn` implementations (for complex dispatch logic). Both register into the same `CommandRegistry` via `RegisterCommand` trait with `from_yaml()` and `from_fn()` constructors.
- Update `apps\desktop\src-tauri\src\commands\capabilities.rs`:
  - **Per-persona tool allow-lists (from just-bash + Goose):** `get_allowed_tools(persona: &str, grants: &[CapabilityFamily]) -> Vec<String>` — derives tool allow-lists from capability grants at dispatch time. Pierce (ReadOnly) gets read + grep + snapshot. Nyx (WriteCode) gets the full set. Dynamic, not static config.
  - **Three-tier capability model (from AutoAgent):** Base capabilities (available to all personas) → Persona-specific (derived from persona's `CapabilityFamily` grants) → External MCP (dynamically discovered from connected MCPs). The `CapabilityFamily` enum is the base layer. Per-persona grants add the second layer. MCP discovery adds the third. `resolve_capabilities(persona, context) -> ResolvedCapabilities` computes the full set.

**Gate:** `RegistryEntry` for Pierce has `reasoning_effort: High, model_class: Frontier, routing_role: Specialist`. `get_allowed_tools("scout", &[ReadOnly])` returns subset excluding write tools. `CommandDef` for a YAML-defined vault-read command loads correctly alongside Rust-defined dispatch commands. OnceCell handler loads lazily on first `dispatch_command("gate")` call.
**Depends on:** P7-C
**Push:** Yes

---

### P7-D: Smart Review + Availability Gating + Agent Working State

**Goal:** Diff-aware dispatch command that analyzes changes and routes to relevant personas. Availability gating that dims unavailable agents. Agent working state enum for turn-level lifecycle. 2-axis dispatch gate refinement.

**Files:**
- Update `apps/desktop/src-tauri/src/commands/registry.rs`:
  - `PaletteAction` struct: slug, name, description, action_type (Command/SubAgent/Orchestrator), dispatch_target_slug
  - `PaletteResponse` struct: individual_actions (`Vec<PaletteAction>`), orchestrator_actions (`Vec<PaletteAction>`)
  - `check_availability(check: &AvailabilityCheck) -> bool` — queries HealthCheckManager for MCP connectivity, checks env vars, checks git status
  - **`AgentWorkingState` enum (from Factory-AI DroidWorkingState):** Idle, Streaming, WaitingForConfirmation, ExecutingTool, Compacting. 5 states tracking per-agent turn-level lifecycle. Emitted via Tauri events (`agent:working-state-changed`). Separated from mission-level state (MissionState in P7-I) — turn-level drives UI (spinners, permission dialogs), mission-level drives orchestration (dispatch queue, milestone gates). Two-layer state machine — do NOT collapse into one enum.
  - **`InteractionMode` enum (from Factory-AI 2-axis model):** Spec (read-only, no writes), Auto (standard execution), Orchestrator (mission decomposition with workers). Orthogonal to existing `CapabilityFamily` — mode controls structural access, family controls per-action capability. Combined gate: `InteractionMode::Spec` → only `ReadOnly` capability valid regardless of grants. `InteractionMode::Auto` → capabilities as granted by dispatch context. `InteractionMode::Orchestrator` → enables mission features (worker spawn, feature decomposition).
  - Tauri command: `get_palette_actions(selected_slugs: Vec<String>) -> PaletteResponse` — resolves available actions for current persona selection, filters by availability
  - Tauri command: `smart_review_routing(diff_summary: String) -> Vec<String>` — parses file paths from diff, maps via routing table, returns persona slugs
  - Smart Review routing table (static):
    - `*.rs`, `src-tauri/**` → kehinde
    - `*.tsx`, `*.css`, `*.html` → mara, riven
    - `*.sql`, `migrations/**` → tanaka, kehinde
    - `*auth*`, `*permission*`, `*rls*` → tanaka
    - `*.md` (specs/ADL) → pierce
    - `*price*`, `*rate*`, `*payment*` → vane
    - `*tos*`, `*privacy*`, `*consent*` → voss
- Create `agents/smart-review.md`:
  - YAML frontmatter: name, description, tools (git, file read), model tier (high)
  - Body: instructions for reading `git diff`, calling `smart_review_routing`, dispatching matched personas in parallel, collecting findings

**Gate:** `get_palette_actions(["pierce", "mara", "kehinde"])` returns Build Triad orchestrator + individual sub-agents. `smart_review_routing` correctly maps `.rs` → kehinde, `.tsx` → mara+riven. Unavailable agents filtered out when MCPs disconnected. `AgentWorkingState` transitions emit events. `InteractionMode::Spec` blocks write capabilities.
**Depends on:** P7-C.1
**Push:** Yes

---

### P7-E: Registry Bridge + Team Panel Rebuild

**Goal:** Frontend bridge for registry commands and full Team Panel rewrite with persona glyphs, live status, and grouped agent cards.

**Files:**
- Update `apps/desktop/src/lib/tauri.ts`:
  - Types: `RegistryEntry`, `CommandDef`, `PaletteAction`, `PaletteResponse`, `CapabilityFamily`
  - `getAgentRegistry(): Promise<RegistryEntry[]>`
  - `getAgentContent(slug: string): Promise<string>`
  - `getCommandRegistry(): Promise<CommandDef[]>`
  - `getPaletteActions(selectedSlugs: string[]): Promise<PaletteResponse>`
  - `smartReviewRouting(diffSummary: string): Promise<string[]>`
  - All guarded by `isTauriRuntime` (OS-BL-008)
- Create `apps/desktop/src/hooks/useAgentRegistry.ts`:
  - `useAgentRegistry()` → `{ agents, commands, loading, error, refresh }`
  - Cached-then-fresh pattern: return cache immediately, fetch in background, update on resolution
  - Re-fetch on `connectivity:status-changed` event (availability may have changed)
  - Groups agents by category for easy rendering
- Rewrite `apps/desktop/src/components/panels/TeamPanel.tsx`:
  - 3 tabs: "Team" (agent cards), "Dispatch" (existing dispatch view), "Actions" (placeholder — wired in P7-G)
  - Team tab: grouped sections — Personas (10), Intelligences (10), Orchestrators (10), Utilities (10)
  - Each agent card: PersonaGlyph at 24px (from P4-P.2 component) in signature color, name, model tier badge, status (idle/active/findings-pending), domain health indicator, last finding (truncated), time since last activity
  - Glyph animation state reflects dispatch status: idle=ember, active=pulse, findings-pending=glow, complete=steady, error=flicker
  - Unavailable agents: glyph dims to ember, card grayed, tooltip shows reason ("Needs Supabase connection")
  - Click agent → expand to see full recent history (last 5 findings/dispatches)
  - Responsive: 1-col narrow, 2-col medium, 3-col wide (reuses Phase 5 grid pattern)

**Gate:** Team Panel renders all 40+ registered agents in correct groups. Persona glyphs animate based on dispatch status. Unavailable agents dimmed with reason tooltip. Click-to-expand shows history.
**Depends on:** P7-D
**Push:** Yes

---

### Session 7.2 — Action Palette + Multi-Select (P7-F through P7-H)

**Goal:** Persona pills become clickable toggles. Multi-select triggers orchestrator recognition. Action Palette surfaces contextual commands, sub-agents, and orchestrator actions. Click-to-dispatch end-to-end.

---

### P7-F: Persona Selection + Orchestrator Recognition

**Goal:** Multi-select persona pills and automatic orchestrator matching.

**Files:**
- Create `apps/desktop/src/hooks/usePersonaSelection.ts`:
  - `usePersonaSelection()` → `{ selected: Set<string>, toggle(slug), clear(), isSelected(slug), selectedCount }`
  - Session-scoped `Set<string>` state (not persisted — resets on app restart)
  - Emits custom event on selection change (for Action Palette debounce)
- Update `apps/desktop/src-tauri/src/commands/registry.rs`:
  - Orchestrator membership table — static `HashMap<String, Vec<String>>`:
    - `build-triad` → `[pierce, mara, kehinde]`
    - `systems-triad` → `[kehinde, tanaka, vane]`
    - `strategy-triad` → `[calloway, voss, sable]`
    - `full-audit` → `[pierce, mara, kehinde, tanaka, vane, wraith, sentinel, meridian]`
    - `launch-sequence` → `[calloway, voss, sable, wraith]`
    - `council` → all 10 personas
    - `gate-runner` → `[pierce, mara, kehinde]`
    - `postmortem` → `[chronicle]` + relevant domain personas
    - `debate` → any 2+ (empty member list, always matches)
    - `decision-council` → any 2+ (empty member list, always matches)
  - Update `get_palette_actions` to include orchestrator matching: for each orchestrator, check if selected set is superset of member list. Return matches sorted by member count ascending (most specific first). Empty-member orchestrators match when 2+ selected.
- Update Team Panel presence bar (in `TeamPanel.tsx`):
  - Persona pills become clickable toggles: `onClick` → `toggle(slug)`
  - Selected pills get `ring-1` visual feedback using accent color
  - Selection count badge on "Actions" tab

**Gate:** Click Pierce → selected. Click Mara → selected. Click Kehinde → selected. "Actions" tab shows count badge "3". `get_palette_actions(["pierce","mara","kehinde"])` returns Build Triad + Gate Runner orchestrators.
**Depends on:** P7-E
**Push:** Yes

---

### P7-G: Action Palette Component

**Goal:** Contextual action browser that shows orchestrators, commands, and sub-agents based on persona selection.

**Files:**
- Create `apps/desktop/src/hooks/useActionPalette.ts`:
  - `useActionPalette(selected: Set<string>)` → `{ actions: PaletteResponse, loading, dispatch(action) }`
  - Fetches `get_palette_actions` on selection change with 150ms debounce
  - `dispatch(action)`: calls `get_agent_content(action.dispatch_target_slug)` → constructs `DispatchRequest` with markdown as system prompt → calls existing `dispatch_agent` Tauri command
- Create `apps/desktop/src/components/team/ActionPalette.tsx`:
  - Renders as content of "Actions" tab in TeamPanel
  - **Empty state** (nothing selected): "Select personas above to browse actions" with subtle hint text
  - **Orchestrators section** (when multi-select matches): matched orchestrator cards with name, description, member count, single-click dispatch
  - **Commands section**: user-invocable slash commands relevant to selected personas, filtered by availability. Each row: name + description + availability indicator
  - **Sub-Agents section**: specialized sub-agents owned by selected personas (e.g., selecting Mara shows `mara-accessibility`, `mara-mobile`, `mara-interaction`). Persona glyph attribution on each sub-agent row.
  - Each action row: click dispatches immediately (no confirmation step for non-destructive actions)
  - Loading skeleton while fetching
- **Underspecification Gating (from oh-my-codex):**
  - Before dispatching heavy orchestrators, detect vague/underspecified commands
  - Heuristic: <15 effective words AND no well-specified signals (file paths, code blocks, numbered steps, batch IDs) → redirect to planning prompt instead of dispatch
  - `check_specification(input: &str) -> SpecificationResult` — returns `Specified` or `Underspecified(suggestion: String)`
  - Two-layer pre-dispatch gating: (1) `AvailabilityCheck` — is the command available? (2) `SpecificationCheck` — is the request specified enough?
  - Both pass before Action Palette dispatches. Underspecified requests show inline prompt: "Can you be more specific? Try: `/review src-tauri/src/commands/` or `/gate P7-G`"
  - **(AiDesigner dual-lane routing: don't just block — route simple/well-scoped requests to single-persona lightweight review, complex/multi-surface to full triad orchestration. Automatic complexity escalation. ByteRover Tool Markers: filter available actions by operational mode tags.)**

**Gate:** Select Mara → Sub-Agents section shows mara-accessibility, mara-mobile, mara-interaction. Select Pierce+Mara+Kehinde → Orchestrators section shows Build Triad + Gate Runner. Click Build Triad → dispatch fires. Unavailable commands hidden. Bare `/review` with no scope triggers underspecification prompt instead of dispatch.
**Depends on:** P7-F
**Push:** Yes

---

### P7-H: Dispatch Integration + Chat Glyphs

**Goal:** End-to-end dispatch from Action Palette to chat, persona glyph avatars on chat messages, and session 7.2 integration.

**Files:**
- Update `apps/desktop/src/components/panels/ChatPanel.tsx`:
  - Chat message avatars: render PersonaGlyph component (24px) next to message bubble when sender is a persona
  - Persona slug extracted from message metadata (already in dispatch pipeline from Phase 3)
  - Non-persona messages (operator, system) use default avatar
  - `shrinkwrapText()` integration for chat bubbles: import from `@forge-os/layout-engine`, measure message text, set bubble `maxWidth` to shrinkwrap result. Zero-waste widths — no blanket `max-width: 80%`.
- Update `apps/desktop/src/components/team/ActionPalette.tsx`:
  - Wire dispatch flow: click action → `useActionPalette.dispatch(action)` → DispatchRequest constructed → `dispatch_agent` called → agent appears in Dispatch tab with status tracking → findings flow back to chat
  - Loading state on dispatched action row (spinner until agent starts)
  - Error state if dispatch fails (toast notification)
- **Tool Confirmation Router (from Goose oneshot channel pattern + Factory-AI ToolConfirmation system):**
  - Destructive tool calls (file delete, SQL DROP, credential access, `Destructive` capability family) require operator confirmation before execution
  - Create `apps/desktop/src-tauri/src/commands/confirmation.rs`:
    - **`ConfirmationType` enum (from Factory-AI 9-action taxonomy):** FileEdit, FileCreate, ShellExec, ApplyPatch, McpTool, AskUser, ExitSpecMode, ProposeMission, StartMissionRun. Each type carries action-specific detail fields (e.g., FileEdit has `path` + `diff`, ShellExec has `command`, McpTool has `server` + `tool_name`).
    - **`ConfirmationOutcome` enum (from Factory-AI 8-response resolution):** ProceedOnce, ProceedAlways, ProceedAutoLow, ProceedAutoMedium, ProceedAutoHigh, ProceedEdit, Cancel. `ProceedAlways` whitelists this tool for the session. `ProceedAuto*` maps to AutonomyLevel — at `ProceedAutoHigh`, all future calls of this type auto-approve. `ProceedEdit` allows operator to modify the action before execution.
    - `ConfirmationRequest` struct: id (UUID), confirmation_type (ConfirmationType), arguments_summary, capability_required, requesting_persona
    - `ConfirmationRouter` struct: pending requests map (`HashMap<Uuid, oneshot::Sender<ConfirmationOutcome>>`), auto_approved set (`HashSet<ConfirmationType>` populated by ProceedAlways), autonomy_level (from InteractionMode × AutonomyLevel — determines which types auto-approve)
    - `request_confirmation(req) -> Receiver<ConfirmationOutcome>` — checks auto_approved set first (skip modal if whitelisted), then sends to frontend via Tauri event `dispatch:confirmation-requested`, returns oneshot receiver
    - Dispatch pipeline awaits receiver with 60s timeout — other dispatches continue (non-blocking)
    - Tauri commands: `respond_to_confirmation(id, outcome: ConfirmationOutcome)` — resolves the oneshot sender
  - Update `apps/desktop/src/components/team/ActionPalette.tsx`:
    - Confirmation modal: shows confirmation_type badge, action-specific detail (path+diff for FileEdit, command for ShellExec), requesting persona glyph, outcome buttons (Once / Always / Edit / Cancel)
    - Subscribes to `dispatch:confirmation-requested` event
  - Update `apps/desktop/src-tauri/src/commands/mod.rs` (add confirmation module)
  - **(Agent Browser: Action Policy Allow/Deny/Confirm trichotomy — 3rd independent validation. JSON-configurable policy with precedence: deny > confirm > allow > default. Maps: `Destructive` → RequiresConfirmation, `ReadOnly` → Allow, blocked tools → Deny.)**
  - **Note:** AST Transform Plugin Pipeline (capability gate + injection scan + audit log transforms) deferred to Phase 8.2 where it integrates with the full orchestration engine. The confirmation router provides the critical safety gate now; the transform pipeline adds composable pre-execution analysis later.
- Session 7.2 integration verification:
  - Full flow: select personas → browse actions → click dispatch → agent runs → findings appear in chat with glyph avatar → findings feed updates
  - Destructive dispatch: click Wraith red-team → confirmation modal appears → approve → Wraith dispatches with `Destructive` grant

**Gate:** End-to-end verified: select Pierce+Mara+Kehinde → click Build Triad → 3 agents dispatch → findings appear in chat with crosshair/eye/nested-brackets glyph avatars → shrinkwrap bubbles render tight. Destructive dispatch triggers confirmation modal — deny blocks execution, approve proceeds. Build Triad gate on Session 7.2.
**Depends on:** P7-G
**Push:** Yes

---

### Session 7.3 — Agent Orchestration UI + Agora (P7-I through P7-M)

**Goal:** Proposal system backend (file, evaluate, resolve proposals), Agora panel, Dispatch Queue panel with protocol enforcement, and full Phase 7 integration.

---

### P7-I: Proposal Store + Mission State + SQLite Migration

**Goal:** Rust backend for proposal CRUD, mission lifecycle state machine, and SQLite schema for persistent proposal storage.

**Files:**
- Create `apps/desktop/src-tauri/src/proposals/mod.rs` (module declaration)
- Create `apps/desktop/src-tauri/src/proposals/store.rs`:
  - `Proposal` struct: id (ULID), author (persona slug), source (Persona/Automated/Consortium), proposal_type (Optimization/Pattern/Rule/Architecture/Skill/Policy), scope, target, severity, title, body, evidence (`Vec<String>`), status (ProposalStatus), evaluators (`Vec<String>`), created_at, resolved_at (`Option`), decision_trace_id (`Option<Ulid>`), **preconditions (`Vec<String>`) — conditions that must be true before implementation (from Factory-AI MissionFeature)**, **verification_steps (`Vec<String>`) — how to verify completion (from Factory-AI MissionFeature)**, **fulfills (`Option<Vec<String>>`) — which higher-level requirements this satisfies (from Factory-AI MissionFeature)**
  - `ProposalResponse` struct: id (ULID), proposal_id, author (persona slug), body, created_at
  - `ProposalStatus` enum: Open, Evaluating, Accepted, Rejected
  - `ProposalSource` enum: Persona, Automated, Consortium
  - `ProposalType` enum: Optimization, Pattern, Rule, Architecture, Skill, Policy
  - **`ProposalOutcome` enum (from Factory-AI FeatureSuccessState): Success, Partial, Failure. Tracks implementation quality — `Partial` means accepted and partially implemented (verification incomplete). Stored on resolution alongside status.**
  - **`MissionState` enum (from Factory-AI 6-state orchestrator lifecycle): AwaitingInput, Initializing, Running, Paused, OrchestratorTurn, Completed. Mission-level state machine for multi-proposal orchestration. Separated from `AgentWorkingState` (P7-D) — mission state drives orchestration (worker dispatch, milestone gates), agent state drives UI (spinners, permission dialogs). Emits `mission:state-changed` Tauri events. Used by Dispatch Queue (P7-L) to track overall build/gate state.**
  - CRUD functions: `create_proposal`, `get_proposal`, `list_proposals`, `update_status`, `add_response`
  - Rate limit enforcement: `count_proposals_by_author_session` — max 3 per persona per session. Automated proposals exempt (tagged `source: Automated`).
  - `ProposalStore` struct: wraps SQLite pool connection, registered as Tauri managed state
- SQLite migration V13 (`apps/desktop/src-tauri/migrations/013_proposals.sql`):
  - `proposals` table: all Proposal struct fields (including preconditions, verification_steps, fulfills as JSON arrays), indexed on author + status + created_at
  - `proposal_responses` table: id, proposal_id (FK), author, body, created_at
  - `decisions` table: id, proposal_id (FK), resolution, rationale, implementing_batch, outcome_tracking, **outcome (ProposalOutcome)**, created_at
- Update `apps/desktop/src-tauri/src/lib.rs` (add proposals module, register ProposalStore managed state)
- Tauri commands: `file_proposal(proposal) -> Proposal`, `list_proposals(filter) -> Vec<Proposal>`, `get_proposal_feed(page, filter) -> Vec<FeedEntry>`, **`get_mission_state() -> MissionState`**, **`update_mission_state(state) -> MissionState`**

**Gate:** `file_proposal` creates proposal in SQLite with preconditions + verification_steps. `list_proposals` returns it. Filing 4th proposal by same persona in same session returns rate limit error. V13 migration applies cleanly on top of V12. `MissionState` transitions emit events. `ProposalOutcome::Partial` correctly stored on resolution.
**Depends on:** P7-D (Agent Registry for persona→domain mapping)
**Push:** Yes

---

### P7-J: Proposal Triage + Decisions + Dismissals + Commands

**Goal:** Auto-routing of proposals to evaluators, decision creation from resolved proposals, structured dismissal with justification, and remaining Tauri commands.

**Files:**
- Create `apps/desktop/src-tauri/src/proposals/triage.rs`:
  - `auto_assign_evaluators(proposal: &Proposal, registry: &AgentRegistry) -> Vec<String>` — maps proposal scope to domain-appropriate persona slugs using Agent Registry
  - Security scope → tanaka, UX scope → mara, Architecture scope → kehinde, Design scope → riven, Financial scope → vane, Legal scope → voss, Cross-cutting → council
  - Called automatically on `file_proposal` — evaluators field populated before storage
- Create `apps/desktop/src-tauri/src/proposals/decisions.rs`:
  - `resolve_proposal(id, status, rationale, outcome: ProposalOutcome) -> Decision` — creates decision record when proposal is Accepted or Rejected. `outcome` field (Success/Partial/Failure from P7-I) records implementation quality.
  - Accepted: creates entry in `decisions` table with resolution rationale, implementing batch placeholder, outcome
  - Rejected: creates entry preserving rejection reasoning
  - Both emit Tauri event `proposals:decision-made`
  - **`DismissalRecord` struct (from Factory-AI DismissalRecord pattern):** `{ dismissal_type: DismissalType, source_proposal_id: Ulid, summary: String, justification: String }`. `DismissalType` enum: DiscoveredIssue, CriticalContext, IncompleteWork. When a proposal or finding is dismissed rather than resolved, the dismissal is recorded with explicit justification. No silent drops — every dismissed item has a paper trail.
  - **`dismiss_proposal(id, dismissal_type, justification) -> DismissalRecord`** — creates dismissal record in SQLite. Distinct from rejection: rejection means "evaluated and declined." Dismissal means "acknowledged but deprioritized with documented reasoning." Dismissals visible in Agora (P7-K) with distinct visual treatment.
- Create `apps/desktop/src-tauri/src/proposals/feed.rs`:
  - `get_feed(page, per_page, filters) -> Vec<FeedEntry>` — aggregates proposals + responses + decisions + **dismissals** chronologically
  - `FeedEntry` enum: ProposalFiled, ResponseAdded, DecisionMade, **ProposalDismissed** — each variant carries relevant data
  - Pagination: cursor-based (created_at + id)
  - Filters: by author, proposal_type, status, source
  - Emits Tauri event `proposals:feed-updated` on any new activity
  - `search_proposals(query: String) -> Vec<Proposal>` — FTS on title + body
- Tauri commands: `evaluate_proposal(id, response_body)`, `resolve_proposal(id, status, rationale, outcome)`, **`dismiss_proposal(id, dismissal_type, justification)`**, `get_decision_history(page)`, `search_proposals(query)`
- Update `apps/desktop/src-tauri/src/proposals/mod.rs` (re-export all sub-modules)
- SQLite migration V13 update: add `dismissals` table (id, proposal_id FK, dismissal_type, summary, justification, created_at)

**Gate:** File a security-scoped proposal → auto-assigns tanaka as evaluator. `evaluate_proposal` adds threaded response. `resolve_proposal` as Accepted with `outcome: Success` creates decision record + emits event. `dismiss_proposal` creates dismissal with justification visible in feed. `search_proposals("auth")` returns matching proposals. No silent drops — dismissal count tracked.
**Depends on:** P7-I
**Push:** Yes

---

### P7-K: Proposal Bridge + Feed Panel

**Goal:** Frontend bridge for proposal system and Agora panel with persona glyph attribution and evaluation threads.

**Files:**
- Update `apps/desktop/src/lib/tauri.ts`:
  - Types: `Proposal`, `ProposalResponse`, `ProposalStatus`, `ProposalType`, `FeedEntry`, `Decision`
  - `fileProposal(proposal): Promise<Proposal>`
  - `listProposals(filter): Promise<Proposal[]>`
  - `evaluateProposal(id, body): Promise<ProposalResponse>`
  - `resolveProposal(id, status, rationale): Promise<Decision>`
  - `getProposalFeed(page, filter): Promise<FeedEntry[]>`
  - `getDecisionHistory(page): Promise<Decision[]>`
  - `searchProposals(query): Promise<Proposal[]>`
  - `onProposalFeedUpdated(callback): Promise<UnlistenFn>`
  - All guarded by `isTauriRuntime`
- Create `apps/desktop/src/hooks/useProposalFeed.ts`:
  - `useProposalFeed(filter?)` → `{ entries, loading, error, hasMore, loadMore, refresh }`
  - Paginated feed with cursor-based loading
  - Real-time subscription via `proposals:feed-updated` event — prepends new entries
  - Filter state: author, proposal_type, status, source
  - Cleanup on unmount
- Create `apps/desktop/src/components/panels/ProposalFeedPanel.tsx`:
  - Registers as panel type with window manager
  - Timeline layout: newest at top, scroll-to-load-more
  - Proposal cards: PersonaGlyph (author) + title + proposal_type badge + severity badge + status indicator (Open=blue, Evaluating=amber, Accepted=green, Rejected=red via BADGE_COLORS tokens from P7-A)
  - Evaluation threads: when personas evaluate, responses appear as threaded replies with their own glyphs. Indented, connected by vertical line.
  - Decision outcomes inline: accepted proposals show what changed. Rejected proposals show reasoning.
  - Filter bar: by author persona (glyph pills), proposal type, status, source
  - Loading skeleton (6 cards with shimmer, matching existing pattern)
  - Empty state: "No proposals yet — personas will file proposals during builds"
  - Pop-out friendly via window manager

**Gate:** Feed renders proposals with persona glyphs. Evaluation threads display threaded with glyphs. Filter by author works. Real-time updates appear without refresh. BADGE_COLORS tokens used (no hardcoded hex).
**Depends on:** P7-J
**Push:** Yes

---

### P7-L: Dispatch Queue Panel

**Goal:** Panel showing pending and active dispatches with gate enforcement.

**Files:**
- Create `apps/desktop/src/components/panels/DispatchQueuePanel.tsx`:
  - Registers as panel type with window manager
  - **Queue view:** pending dispatches (ordered), active dispatches (with progress), completed (last 10)
  - **Priority queue model (from ByteRover ToolInvocationQueue):** 4-tier priority (Critical/High/Normal/Low). Dispatches sorted by priority first, FIFO within tier. Configurable concurrency limit (default 3 for triad, 1 for sequential stages). Returns execution statistics (count, duration, failures per dispatch).
  - **Internal dispatch tracking (from Agent Browser WebSocket multiplexer):** ID-correlated oneshot pattern — each dispatch gets unique ID (ULID), completion resolves via oneshot sender in `PendingMap<Ulid, oneshot::Sender<DispatchResult>>`. Multiple dispatches in-flight concurrently. 60s timeout with cleanup of pending entries. Prevents hung dispatches from blocking the queue.
  - Each entry: agent glyph + name + status (queued/running/complete/error) + duration timer + priority badge
  - Parallel execution indicator: "3 Triad agents running" with progress bars
  - **Gate status display:** per-batch gate state: Build (pass/fail/in-progress), Triad (dispatched/pending/not-started), Sentinel (pass/pending), Meridian (pass/pending)
  - **Checkpoint validation (from AiDesigner):** before batch advancement, explicit checkpoint prompt: progress recap showing what shipped + numbered options for next direction (advance, re-gate, hold). `canAdvance` gates on: Triad dispatched + zero open findings + checkpoint acknowledged.
  - **Protocol enforcement point #1:** visual indicator when batch advancement is blocked. If Triad not dispatched or findings unresolved, advancement blocked with explicit reason ("2 open findings — resolve before advancing")
  - Session timeline: horizontal bar showing BOOT.md handoffs as milestone markers
  - "Export Report" button: calls existing document gen engine (Phase 4) to produce gate report PDF
  - Loading/empty states following established pattern
- Create `apps/desktop/src/hooks/useDispatchQueue.ts`:
  - `useDispatchQueue()` → `{ queue, activeDispatches, gateStatus, canAdvance, checkpoint, exportReport }`
  - Subscribes to dispatch events from Phase 3 agent runtime
  - Computes gate status from findings SQLite (Phase 5) — counts open findings per batch
  - `canAdvance`: boolean derived from gate rules (Triad dispatched + zero open findings + checkpoint acknowledged)
  - `checkpoint`: state object tracking whether the operator has reviewed the batch summary before advancement

**Gate:** Queue shows active dispatches with glyphs, priority badges, and timers. Gate status correctly reflects findings state. `canAdvance` returns false when open findings exist OR checkpoint not acknowledged. Priority ordering: Critical dispatches jump the queue. Export Report triggers PDF generation. 60s timeout on stale dispatches triggers cleanup.
**Depends on:** P7-K
**Push:** Yes

---

### P7-M: Phase 7 Integration + Dock + Presets

**Goal:** Register all new panel types, update dock bar, add workspace presets, write ADLs, and run full Phase 7 exit gate.

**Files:**
- Update `apps/desktop/src/components/layout/PanelLayout.tsx`:
  - Register 4 new panel types: TeamPanel (rebuilt), DispatchQueuePanel, ProposalFeedPanel (3 net new — TeamPanel replaces existing)
  - Note: ActionPalette is a tab inside TeamPanel, not a separate panel type
- Update `apps/desktop/src/components/dock/DockBar.tsx`:
  - Unresolved proposal count badge on Agora dock pill (uses `proposals:feed-updated` event)
  - Active dispatch count indicator on Dispatch Queue dock pill
  - Both badges use BADGE_COLORS tokens
- Update window manager presets:
  - New preset: `team` — Chat + Team + Dispatch Queue + Agora (4-panel layout for team coordination)
  - Update `build` preset to include Dispatch Queue (Chat + Canvas + Preview + Dispatch Queue)
  - Update `review` preset: Chat + Findings + Dispatch Queue + Agora
  - Total: 7 workspace presets (build, review, focus, observatory, gate_review, dev, team)
- Create `docs/adl/OS-ADL-019.md` — Agent Registry architecture decision (single command registry, availability gating, capability families)
- Create `docs/adl/OS-ADL-020.md` — Proposal system architecture decision (internal feedback loop, rate limiting, decision tracking)
- Full Phase 7 exit gate:
  - Build Triad dispatch (Pierce + Mara + Kehinde)
  - Sentinel full regression sweep
  - Meridian full consistency audit
  - Rule 43 structural gate: `tsc --noEmit` = zero errors, all findings resolved, consequence climb per fix

**Gate:** All 4 panel types render and interact correctly. Dock badges update in real-time. All 7 workspace presets load. ADLs written. Build Triad + Sentinel + Meridian all pass. `tsc --noEmit` zero errors.
**Depends on:** P7-L
**Push:** Yes

---

## Phase 7 Summary

| Metric | Value |
|---|---|
| **Batches** | 15 (P7-A through P7-N + P7-C.1 research patch) |
| **Sessions** | 3 + backfill (7.1, 7.2, 7.3, 7.4-backfill) |
| **New Tauri commands** | ~14 + ~5 backfill (registry: 5, proposals: 7, confirmation: 1, specification: 1, backfill: ~5) |
| **New React hooks** | 5 (useAgentRegistry, usePersonaSelection, useActionPalette, useProposalFeed, useDispatchQueue) |
| **New panel types** | 3 net new (DispatchQueue, ProposalFeed + TeamPanel rebuild) |
| **Workspace presets** | 7 total (+1 new: team) |
| **Carried risks resolved** | 5 (R-DS-02, R-DS-03, R-DS-05, M-1 HIGH, R-DS-04) |
| **Carried risks tracked** | 1 (R-DS-01 → Phase 9) |
| **Estimated totals** | ~93 Tauri commands, ~21 hooks, ~17 panel types |

---

### Session 7.4 — Integration Map Backfill (P7-N)

**Goal:** Backfill Phase 8 prerequisites that were in the Integration Map but missed during 7.1-7.3. These are dispatch architecture foundations that Phase 8.1/8.2 depend on.

**Why now:** Audit (2026-04-04) found 17 unimplemented Integration Map patterns targeting Phases 1-7. Of those, 5-7 are Phase 8 prerequisites. The rest are deferred to their natural sessions (8.1/8.2/10+). This batch closes the prerequisite gap.

---

### P7-N: Phase 8 Prerequisite Backfill

**Goal:** Implement 5 missing patterns that Phase 8.1/8.2 dispatch architecture depends on. Complete 4 partially-implemented patterns to production quality.

**Must-build (5 new):**

1. **Policy Engine — rule-based ALLOW/DENY access** (Source: ByteRover CLI)
   - `apps/desktop/src-tauri/src/commands/policy.rs` (NEW)
   - Rule struct: `{ pattern: String, action: Allow|Deny|Confirm, scope: Persona|Global, priority: u32 }`
   - First-match-wins evaluation. Global rules, then persona-specific overlays.
   - `evaluate_policy(tool_name, persona, context) -> PolicyDecision`
   - Load rules from grimoire config (Phase 8.1 will expand this to full Grimoire).
   - Wire into `ConfirmationRouter` — policy evaluation runs BEFORE confirmation modal.

2. **Permission rule sources — layered settings** (Source: Claude Code permission-model)
   - `apps/desktop/src-tauri/src/commands/permissions.rs` (NEW)
   - 4-tier precedence: `session_override > persona_config > project_settings > defaults`
   - `PermissionRule { tool_pattern: String, action: Allow|Deny|Ask, source: PermissionSource }`
   - `resolve_permission(tool_name, persona, session) -> PermissionDecision`
   - Integrates with policy engine: policy = structural rules, permissions = user-configured overrides.

3. **Tool-specific permission rules** (Source: Claude Code permission-model)
   - Extend `PermissionRule` with glob pattern matching on tool names (e.g., `"git *"` matches all git commands)
   - `match_tool_pattern(pattern, tool_name) -> bool` with glob semantics
   - Store rules in SQLite `permission_rules` table (session-scoped + persistent tiers)

4. **Capability widening / dynamic open-close** (Source: Excalibur Spellbook)
   - `apps/desktop/src-tauri/src/commands/capabilities.rs` (EDIT — extend existing)
   - Add `CapabilityGrant { family: CapabilityFamily, scope: GrantScope, expires: Option<Instant> }`
   - `widen_capabilities(persona, grants)` / `narrow_capabilities(persona, families)`
   - Per-dispatch capability snapshot: widen at dispatch start, narrow at dispatch end.
   - Existing `ResolvedCapabilities` becomes the snapshot; widening/narrowing mutates the persona's active grants.

5. **Tool safety taxonomy — per-tool flags** (Source: Claude Code tool-interface)
   - `apps/desktop/src-tauri/src/commands/registry.rs` (EDIT — extend `CommandDef`)
   - Add to `CommandDef`: `is_read_only: bool`, `is_destructive: bool`, `is_concurrency_safe: bool`
   - Derive from existing `CapabilityFamily` classification + explicit overrides in command YAML.
   - Policy engine and confirmation router use these flags for automatic decisions.

**Must-complete (4 partial → production):**

6. **allowedTools prefix-matching** (EDIT `capabilities.rs`)
   - Replace exact match in `get_allowed_tools()` with prefix-match: `"git"` matches `"git_status"`, `"git_diff"`, etc.
   - Add `matches_tool_pattern(pattern: &str, tool_name: &str) -> bool` (shared with permission rules).

7. **Priority-based invocation queue — Rust backend** (EDIT existing dispatch)
   - `apps/desktop/src-tauri/src/commands/dispatch.rs` (EDIT or NEW)
   - 4-tier priority enum: `Critical > High > Normal > Low`
   - `DispatchQueue` with `BinaryHeap<PrioritizedDispatch>`, concurrency limit (configurable, default 3).
   - Existing `useDispatchQueue.ts` already has UI — wire it to Rust backend via Tauri commands.

8. **Checkpoint validation at phase transitions** (EDIT `checkpoints.rs`)
   - Add `validate_checkpoint(session_id, required_gates) -> ValidationResult`
   - Check: all batches in session marked complete, all gate findings resolved, tsc clean.
   - Wire into dispatch queue: mission cannot advance past checkpoint until validation passes.

9. **Permission mode taxonomy — expand to 5 modes** (EDIT `registry.rs`)
   - Current: `Spec | Auto | Orchestrator`
   - Add: `Plan` (read-only exploration, no writes), `Supervised` (all writes require confirmation)
   - `InteractionMode` now 5 variants. `apply_mode_gate()` updated for new modes.

**Gate:** All 5 new files compile. `tsc --noEmit` = 0. Policy engine evaluates test rules correctly. Capability widening/narrowing round-trips. Priority queue dispatches in order. Permission rules resolve with correct precedence.
**Depends on:** P7-M (Phase 7 integration complete)
**Push:** Yes

---

| Metric | Value |
|---|---|
| **Batches** | 1 (P7-N backfill) |
| **New files** | ~3 (policy.rs, permissions.rs, dispatch.rs or inline) |
| **Edited files** | ~4 (capabilities.rs, registry.rs, checkpoints.rs, confirmation.rs) |
| **New Tauri commands** | ~5 (evaluate_policy, resolve_permission, widen_capabilities, narrow_capabilities, validate_checkpoint) |

---

---

*Phase 7 sealed 2026-04-05. Session 7.5 (ecosystem retrofit) moved to phase-7.5.md.*

