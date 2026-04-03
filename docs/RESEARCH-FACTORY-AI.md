# Research: Factory-AI (Droid Platform)

## Source: github.com/Factory-AI — 14 repos (org-wide mining)
## Date: 2026-04-03
## Participants: Nyx (research session)
## Key Repos: droid-sdk-typescript, factory-plugins, droid-action, examples/droid-chat, skills, legacy-bench

---

## What Factory-AI Is

Agent-native software development platform. Product is "Droid" — an AI software engineering agent operating across CLI, web, Slack/Teams, Linear/Jira, and mobile. Founded 2025-09, actively shipping (last push 2026-04-03). Architecture is directly analogous to Forge OS: agents dispatched from sessions, capability-gated tool execution, pluggable skill definitions, MCP tool registration, orchestrator/worker decomposition, streaming JSON-RPC protocol between host and agent subprocess.

---

## The Five Stories These Repos Tell

### Story 1: Agent IPC Is JSONL-over-Stdio with JSON-RPC 2.0

`droid-sdk-typescript` implements the full transport stack. `ProcessTransport` spawns `droid exec --input-format stream-jsonrpc --output-format stream-jsonrpc`, communicates via newline-delimited JSON on stdin/stdout. Write serialization via promise chain (prevents byte interleaving). Inbound parsing filters non-JSON lines (handles debug output). Graceful shutdown: `stdin.end()` → SIGTERM → 5s grace → SIGKILL. Sticky error model: once `processError` is set, all subsequent `send()` calls throw immediately — no silent message loss after process death.

**Forge integration:** Rust `tokio::process::Command` with piped stdio. `BufWriter<ChildStdin>` behind `tokio::sync::Mutex` for write serialization. `BufReader<ChildStdout>` with `lines()` for JSONL framing. `Arc<RwLock<Option<AgentError>>>` for sticky error propagation. Maps to Phase 8 Session 8.2 dispatch pipeline.

### Story 2: Two-Layer State Machine — Turn-Level + Mission-Level

Droid separates agent working state (5 states: idle → streaming → waiting_for_confirmation → executing_tool → compacting_conversation) from mission state (6 states: awaiting_input → initializing → running → paused → orchestrator_turn → completed). The turn-level state drives the React UI (show spinner, show permission dialog, show text stream). The mission-level state drives the swarm lifecycle (dispatch workers, review handoffs, validate milestones).

**`DroidWorkingState` (turn-level):**
| State | Meaning |
|-------|---------|
| `idle` | Awaiting user input |
| `streaming_assistant_message` | Generating response |
| `waiting_for_tool_confirmation` | Paused for permission |
| `executing_tool` | Tool call in-flight |
| `compacting_conversation` | Context compression active |

**`MissionState` (mission-level):**
| State | Meaning |
|-------|---------|
| `awaiting_input` | Mission proposed, not yet accepted |
| `initializing` | Decomposing into features |
| `running` | Workers actively executing |
| `paused` | Suspended by user |
| `orchestrator_turn` | Reviewing worker results |
| `completed` | All features done |

**Forge integration:** KAIROS owns turn-level state (maps to existing `AgentWorkingState`). Swarm module owns mission-level state. Both emit typed Tauri events to React. `compacting_conversation` should be a named state in KAIROS — confirms auto-compact engine needs explicit UI feedback. Maps to Phase 8 Session 8.2.

### Story 3: Capability Gating Happens at Dispatch Time, Not Call Time

Two orthogonal axes: `DroidInteractionMode` (spec/auto/agi) × `AutonomyLevel` (off/low/medium/high). `spec` = read-only, no writes. `auto` = standard execution. `agi` = orchestrator mode (missions with worker decomposition). Tool confirmation has 8 outcomes: `proceed_once` / `proceed_always` / `proceed_auto_run_{low,medium,high}` / `proceed_edit` / `cancel`. Tools are pre-registered via `allowedTools[]` prefix matching — the agent never sees tools it isn't authorized to use. They're simply not in the MCP server config.

**`ToolConfirmationType` (9 action types):**
| Type | What It Gates |
|------|--------------|
| `edit` | File modification |
| `create` | File creation |
| `exec` | Shell command |
| `apply_patch` | Diff application |
| `mcp_tool` | External MCP tool call |
| `ask_user` | Agent prompting user |
| `exit_spec_mode` | Planning → execution transition |
| `propose_mission` | Submitting mission plan |
| `start_mission_run` | Beginning approved mission |

**`SettingsLevel` hierarchy (7 tiers):**
`org` → `runtime` → `user` → `project` → `folder` → `dynamic` → `builtin`

**Forge integration:** Forge's `CapabilityFamily` enum (ReadOnly → Destructive) maps to the `AutonomyLevel` axis. `DroidInteractionMode` maps to dispatch context. The key insight: Forge should pre-compute the full MCP server set from persona + task context BEFORE spawning the agent, not check permissions at each tool call. `propose_mission` = Forge Proposal system. `exit_spec_mode` = transition from planning to execution. The 7-tier settings hierarchy informs grimoire config cascade (Phase 8 Session 8.1). Maps to Phase 7 P7-C.1 + Phase 8.

### Story 4: Mission Decomposition Is Features-as-Units-of-Work

`MissionFeature` schema: `{ id, description, status, skillName, preconditions[], expectedBehavior[], verificationSteps[], fulfills[], milestone?, workerSessionIds[], currentWorkerSessionId?, completedWorkerSessionId? }`. Features are assigned to workers. Workers produce `Handoff` packets: `{ salientSummary, whatWasImplemented, whatWasLeftUndone, verification{commandsRun[], interactiveChecks[]}, tests{added[], updated[], coverage}, discoveredIssues[], skillFeedback? }`. `SkillFeedback` tracks deviations: `{ followedProcedure, deviations[{step, whatIDidInstead, why}], suggestedChanges[] }`.

**`ProgressLogEntry` discriminated union (11 audit event types):**
| Event | Key Fields |
|-------|-----------|
| `mission_accepted` | `title` |
| `mission_paused` | — |
| `mission_resumed` | — |
| `mission_run_started` | `message?` |
| `worker_started` | `workerSessionId`, `spawnId`, `featureId?` |
| `worker_selected_feature` | `workerSessionId`, `featureId` |
| `worker_completed` | `workerSessionId`, `featureId`, `successState`, `returnToOrchestrator`, `commitId?`, `exitCode`, `validatorsPassed?`, `handoff?` |
| `worker_failed` | `workerSessionId?`, `spawnId`, `exitCode?`, `reason` |
| `worker_paused` | `workerSessionId`, `featureId?` |
| `handoff_items_dismissed` | `dismissals[]` |
| `milestone_validation_triggered` | `milestone`, `featureId` |

**Critical field: `returnToOrchestrator`** — boolean on `worker_completed`. When `false`, the next worker can chain directly without an orchestrator turn. When `true`, the orchestrator reviews handoff + discovered issues before dispatching next.

**`FeatureSuccessState`:** `success` / `partial` / `failure`. Workers can complete with `partial` — work done but verification incomplete.

**`IssueSeverity`:** `blocking` / `non_blocking` / `suggestion`. Only `blocking` halts the mission.

**`DismissalRecord`:** `{ type: discovered_issue|critical_context|incomplete_work, sourceFeatureId, summary, justification }`. Orchestrator can explicitly dismiss items with documented justification.

**Forge integration:** `MissionFeature` maps to Forge Proposal items. `Handoff` schema maps to swarm worker completion events — store in SQLite as structured JSON. `ProgressLogEntry` is the KAIROS audit log format — append-only, immutable, timestamped. `returnToOrchestrator` is the dispatch signal that determines whether the queen takes a turn. `SkillFeedback.suggestedChanges` feeds into kernel update proposals. Maps to Phase 7 Session 7.3 (proposals) + Phase 8 Session 8.2 (swarm dispatch).

### Story 5: Skills Are Pure Instruction Documents, Not Capability Declarations

`SKILL.md` format: YAML frontmatter (`name`, `description`, optional `version`) + markdown body. The `description` field is the routing predicate — the agent reads it and decides when to invoke the skill. No tool declarations, no permission fields, no capability metadata in the skill itself. All capability gating lives in the tool allowlist at the dispatch layer.

**Plugin structure:**
```
plugin-name/
├── .factory-plugin/plugin.json    # { name, description, author }
├── skills/<name>/SKILL.md         # behavioral spec
├── droids/                        # droid overrides (optional)
├── commands/                      # slash commands (optional)
├── mcp.json                       # MCP server config (optional)
└── hooks.json                     # lifecycle hooks (optional)
```

**Skill discovery (3 scopes):**
| Scope | Path |
|-------|------|
| Workspace | `<repo>/.factory/skills/<name>/SKILL.md` |
| Personal | `~/.factory/skills/<name>/SKILL.md` |
| Plugin | `plugins/<plugin>/skills/<name>/SKILL.md` |

**Review depth presets:**
| Depth | Model | Reasoning Effort |
|-------|-------|-----------------|
| `shallow` | `kimi-k2-0711` | none |
| `deep` | `gpt-5.2` | high |

Explicit overrides take precedence over presets (model param > depth preset). Default when unspecified: `deep`.

**Forge integration:** Confirms Forge's kernel architecture — kernels are pure behavioral specs, not tool declarations. The 3-scope skill discovery (workspace/personal/plugin) validates the grimoire layered config pattern. `mcp.json` and `hooks.json` as optional sidecar files inform agent definition extensions — agents could declare their MCP requirements and lifecycle hooks in sidecar files rather than in the kernel body. Review depth presets map to persona reasoning profiles (Phase 8 Session 8.1).

---

## Protocol Engine Deep-Dive

### JSON-RPC Envelope (Factory extension on top of 2.0)

```
{
  jsonrpc: "2.0",
  factoryApiVersion: <version>,
  factoryProtocolVersion: <version>,
  type: "request" | "response" | "notification",
  id: "<uuid>",
  method: string,
  params: Record<string, unknown>
}
```

### Request Correlation

UUID-keyed `Map<string, PendingRequest>`. Per-request timeout (default 30s). On response: clear timer, delete from map, resolve/reject. Unknown IDs silently dropped. On engine close: drain entire map, reject all.

### Bidirectional Request Channel

Server → client requests (not just notifications): `request_permission` and `ask_user`. Client must respond with same `id`. Default behavior when no handler: permission → `cancel`, ask_user → `{ cancelled: true }`. This is the capability gate mechanism — the server pauses execution and asks the client for approval.

### Error Taxonomy

| Type | Trigger |
|------|---------|
| `ConnectionError` | Transport failure, engine closed, send failure |
| `TimeoutError` | Per-request deadline exceeded |
| `ProtocolError` | Non-entity-not-found RPC error |
| `SessionNotFoundError` | `ENTITY_NOT_FOUND` code (extracts sessionId from original request params) |
| `ProcessExitError` | Subprocess crash (exit code + signal preserved) |

### Notification Stream → AsyncGenerator Bridge

`stream()` uses a micro-queue pattern: notification arrives → push to `messageQueue` → wake sleeping consumer via `resolveWaiting()`. Consumer yields messages until `turn_complete` sentinel. `finally` block always unsubscribes. Rust equivalent: `tokio::sync::mpsc::channel` where notification dispatch task is sender, stream consumer is receiver.

### Session Lifecycle

```
createSession() / resumeSession()
  → ProcessTransport(options)
  → transport.connect()                    // spawns subprocess
  → DroidClient({ transport })
  → client.setPermissionHandler(...)       // optional
  → client.setAskUserHandler(...)          // optional
  → client.initializeSession(params)       // or loadSession({ sessionId })
  → DroidSession(client, sessionId, result)
  → [OPEN]

OPEN:
  session.stream(text)    → async generator of DroidMessage
  session.send(text)      → aggregated DroidResult { text, messages, tokenUsage }
  session.interrupt()     → interruptSession RPC
  session.close()         → idempotent close
  → [CLOSED]

CLOSED:
  all methods throw ConnectionError
```

**Key design:** `transport` is injectable — allows test mocks and custom IPC. The seam for Tauri's custom transport: instead of spawning a subprocess, communicate over Tauri IPC channels.

---

## Additional Patterns

### Agent Output Quality via Lint Rules (`eslint-plugin`)

Factory open-sourced lint rules specifically for agent-generated code. Rules like `filename-match-export`, `structured-logging`, `require-route-middleware` encode architectural invariants as static analysis. All code in the repo is AI-generated. Insight: agents make predictable category errors; lint rules are cheaper to enforce than prompt engineering per case. Forge can adopt this: define lint rules encoding system invariants (no direct SQLite outside modules, all Tauri commands have typed returns), run as post-generation validation.

### Agent Evaluation Methodology (`legacy-bench`)

Benchmark format: `instruction.md` + `task.toml` + `environment/` Dockerfile + `solution/` oracle + `tests/` verifier. Critical finding from results: "In 97% of failures, the agent believes it has solved the task." Validates Forge's external verification principle — agents must not self-report success. Verification layer must be external to the agent that did the work.

---

## Forge OS Concept Mapping

| Forge OS | Factory-AI Equivalent | Delta |
|----------|----------------------|-------|
| `CapabilityFamily` (6 tiers) | `AutonomyLevel` (4 tiers) × `InteractionMode` (3 modes) | Factory uses 2-axis model; Forge uses single-axis. Factory's 2-axis is cleaner for dispatch |
| `CommandCategory` (6 cats) | `skillName` field on `MissionFeature` | Factory routes by skill description, not category enum |
| `AvailabilityCheck` | `allowedTools[]` prefix matching + `McpServerStatus` | Factory does exogenous allowlist; Forge does runtime check enum |
| `AgentCategory` (4 cats) | `DecompSessionType` (orchestrator/worker) | Factory has 2 roles; Forge has 4 categories. Forge is richer |
| Swarm queen/worker | Orchestrator/Worker (`DecompSessionType`) | Exact match |
| KAIROS session state | `MissionState` (6) + `DroidWorkingState` (5) | Factory confirms two-layer state machine. Forge should separate turn-level from mission-level |
| KAIROS context windows | `compacting_conversation` + `ReasoningEffort` (9 levels) | Factory surfaces compaction as named state. Forge auto-compact should do same |
| Proposal system | `propose_mission` + `MissionState.awaiting_input` | Strong match. Agent pauses, surfaces plan, user approves/cancels |
| Proposal item status | `FeatureStatus` (4 states) | Direct match |
| Build Triad gate | External `tests/` verifier in legacy-bench | Same principle: verification external to builder |
| Cognitive kernels | `SKILL.md` (description-routed, instruction body) | Same architecture: pure behavioral spec, no capability declarations |
| Grimoire config cascade | `SettingsLevel` (7-tier hierarchy) | Factory has 7 tiers; Forge grimoire should adopt hierarchical merge |
| Agent dispatch lifecycle | `ProgressLogEntry` (11 event types) | Append-only audit log. Forge should store same structure in SQLite |
| Worker handoff | `Handoff` schema (7 fields) | Structured completion packet. Forge swarm workers should produce this |
| Skill feedback loop | `SkillFeedback` + `SkillDeviation` | Self-improvement: workers report when they deviated from instructions and why |

---

## Patterns for Integration Map (+28 entries)

| # | Pattern | Source | Integrates In |
|---|---------|--------|---------------|
| 1 | JSONL-over-stdio transport with write serialization | droid-sdk-typescript | Phase 8 Session 8.2 (agent subprocess IPC) |
| 2 | Sticky error propagation (one failure kills all pending) | droid-sdk-typescript | Phase 8 Session 8.2 (dispatch error handling) |
| 3 | Two-layer state machine (turn-level + mission-level) | droid-sdk-typescript | Phase 8 Session 8.2 (KAIROS + swarm state separation) |
| 4 | `DroidWorkingState` 5-state turn lifecycle | droid-sdk-typescript | Phase 7 P7-C.1 (agent working state enum) |
| 5 | `MissionState` 6-state orchestrator lifecycle | droid-sdk-typescript | Phase 7 Session 7.3 (proposal/mission state machine) |
| 6 | `InteractionMode` × `AutonomyLevel` 2-axis dispatch gate | droid-sdk-typescript | Phase 7 P7-C.1 (refines CapabilityFamily gating) |
| 7 | `ToolConfirmationType` 9-action permission taxonomy | droid-sdk-typescript | Phase 7 Session 7.2 (tool confirmation router) |
| 8 | `ToolConfirmationOutcome` 8-response permission resolution | droid-sdk-typescript | Phase 7 Session 7.2 (confirmation UX) |
| 9 | `SettingsLevel` 7-tier config hierarchy | droid-sdk-typescript | Phase 8 Session 8.1 (grimoire config cascade) |
| 10 | `ReasoningEffort` 9-level thinking budget | droid-sdk-typescript | Phase 8 Session 8.1 (per-persona reasoning profiles) |
| 11 | `MissionFeature` schema (preconditions + verification + fulfills) | droid-sdk-typescript | Phase 7 Session 7.3 (proposal item schema) |
| 12 | `Handoff` structured worker completion packet | droid-sdk-typescript | Phase 8 Session 8.2 (swarm worker completion) |
| 13 | `ProgressLogEntry` 11-type append-only audit log | droid-sdk-typescript | Phase 8 Session 8.2 (KAIROS dispatch audit trail) |
| 14 | `FeatureSuccessState` (success/partial/failure) outcome quality | droid-sdk-typescript | Phase 7 Session 7.3 (proposal completion states) |
| 15 | `returnToOrchestrator` boolean dispatch signal | droid-sdk-typescript | Phase 8 Session 8.2 (swarm chaining optimization) |
| 16 | `SkillFeedback` + `SkillDeviation` self-improvement loop | droid-sdk-typescript | Phase 8 Session 8.5 (persona evolution input) |
| 17 | `DismissalRecord` with justification (explicit dismiss + reasoning) | droid-sdk-typescript | Phase 7 Session 7.3 (proposal dismissal audit) |
| 18 | `MilestoneValidationTriggered` checkpoint gate | droid-sdk-typescript | Phase 8 Session 8.2 (milestone-gated dispatch) |
| 19 | Bidirectional JSON-RPC (server requests permission from client) | droid-sdk-typescript | Phase 8 Session 8.2 (capability gate IPC pattern) |
| 20 | Notification-to-AsyncGenerator bridge (micro-queue + wake) | droid-sdk-typescript | Phase 8 Session 8.2 (Rust mpsc → React stream) |
| 21 | Injectable transport interface (test/custom IPC seam) | droid-sdk-typescript | Phase 8 Session 8.2 (Tauri custom transport) |
| 22 | `allowedTools[]` prefix-matching exogenous MCP allowlist | droid-action | Phase 7 P7-C.1 (3rd validation tool allowlist) |
| 23 | Context-aware conditional MCP server registration | droid-action | Phase 8 Session 8.2 (per-dispatch MCP composition) |
| 24 | Runtime permission probe before server registration | droid-action | Phase 8 Session 8.2 (live capability check) |
| 25 | Review depth presets (model + reasoningEffort per tier) | droid-action | Phase 8 Session 8.1 (persona reasoning profiles) |
| 26 | Plugin manifest + sidecar files (mcp.json, hooks.json) | factory-plugins | Phase 8 Session 8.1 (agent definition extensions) |
| 27 | Skill as pure routing-description + instruction body | factory-plugins + skills | Validates Phase 2 kernel architecture |
| 28 | Agent output lint rules for predictable category errors | eslint-plugin | Phase 8 Session 8.2 (post-generation validation) |

---

## Key Architectural Decisions Confirmed/Refined

1. **Pre-compute MCP server set at dispatch time, not at tool call time.** Factory's `allowedTools[]` + conditional registration is the canonical implementation. Agent never sees unauthorized tools — they don't exist in its session config. 3rd validation (after Block Goose tool whitelist and ByteRover requiredServices).

2. **Separate turn-level state from mission-level state.** Two independent state machines. Turn-level drives UI (spinners, permission dialogs). Mission-level drives orchestration (worker dispatch, milestone gates). Don't collapse these into one enum.

3. **`compacting_conversation` as a named, visible state.** KAIROS auto-compact should surface as `AgentWorkingState::Compacting` so the React UI can show feedback. Not a background operation — it's a state the user sees.

4. **`returnToOrchestrator` is the chaining optimization.** Not every worker completion requires queen review. Sequential features with no blocking issues can chain directly. This reduces orchestrator turns and speeds mission execution.

5. **Handoff is a structured packet, not free-form text.** `whatWasImplemented`, `whatWasLeftUndone`, `discoveredIssues[]`, `verification{}`, `tests{}`, `skillFeedback?`. Store as structured JSON in SQLite. Parse at the receiving end.

6. **Skill feedback is a self-improvement input.** Workers report deviations from their skill procedure with justification. `suggestedChanges` from skill feedback feeds into kernel update proposals — an organic evolution mechanism.

7. **External verification is non-negotiable.** Factory's benchmark data: 97% of agent failures are self-reported as successes. Validates Forge's Build Triad and Rule 29 (never simulate gates inline).

8. **2-axis dispatch gate (mode × level) > single-axis family.** `InteractionMode` (spec/auto/agi) controls WHAT the agent can do structurally. `AutonomyLevel` (off/low/medium/high) controls HOW MUCH confirmation is required. Forge's `CapabilityFamily` maps to the `AutonomyLevel` axis; the `InteractionMode` axis is a new dimension Forge should adopt.

---

*28 patterns extracted. 0 new sessions — all fit existing seams. Total repo mining entries: 139.*
