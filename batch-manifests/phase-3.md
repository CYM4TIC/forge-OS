## Phase 3: Agent Runtime (12 batches, 3 sessions)

> Original Phase 3 (Pretext Layout Engine) pushed to Phase 4.
> Runtime is more critical than rendering — the OS needs to think before it can draw.
> Architecture roadmap: `docs/PHASE-3-ARCHITECTURE.md`

### Session 3.1 — Foundation: SQLite + Agent Dispatch

#### P3-A: Tauri Dev Verification + SQLite v2 Migration

Goal: Verify `pnpm tauri dev` works (OS-BL-002 resolved), then extend SQLite for Phase 3.

Files:
- `database/schema.rs` — extend with v2 tables
- `database/migrations.rs` — add v2 migration path

New tables: memory_logs, memory_topics, mailbox, batches, risks, session_summaries
Verification: `pnpm tauri dev` compiles and launches. Screenshot proof.
Gate: App runs. SQLite v2 migration applies cleanly.
Push: Yes

#### P3-B: Agent Dispatch Core (Rust Backend)

Goal: Build the forked agent system — the core runtime primitive.

Files:
- `src-tauri/src/dispatch/mod.rs` — AgentDispatcher struct, public API
- `src-tauri/src/dispatch/cache.rs` — Prompt cache (HashMap by content hash)
- `src-tauri/src/dispatch/context.rs` — Isolated ToolUseContext per agent
- `src-tauri/src/dispatch/lifecycle.rs` — spawn → track → complete/timeout/cancel
- `src-tauri/src/dispatch/types.rs` — AgentRequest, AgentResult, DispatchConfig

Tauri commands: dispatch_agent, get_agent_status, list_active_agents, cancel_agent
Constants: AGENT_BACKGROUND_TIMEOUT_MS=120_000, MAX_CONCURRENT_AGENTS=10
Gate: Agent dispatch command works, lifecycle tracked in SQLite.
Depends on: P3-A
Push: Yes

#### P3-C: Agent Dispatch UI (React)

Goal: Agent activity visible in TeamPanel.

Files:
- `apps/desktop/src/components/team/AgentStatusPanel.tsx` — color-coded status indicators
- `apps/desktop/src/components/team/AgentCard.tsx` — name, status, duration timer
- `apps/desktop/src/components/team/AgentResultViewer.tsx` — completed agent results
- `apps/desktop/src/components/team/DispatchLog.tsx` — scrollable dispatch log
- `apps/desktop/src/hooks/useAgentDispatch.ts` — listen for dispatch events
- **Note (PIERCE-MED-2):** useAgentResults consolidated into useAgentBoard.ts (hooks/useAgentBoard.ts) — no separate useAgentResults file

Wire into: TeamPanel (replace stub)
Gate: TeamPanel shows live agent status. Events stream correctly.
Depends on: P3-B
Push: Yes

#### P3-D: Build State Manager (Rust)

Goal: SQLite-backed build state, BOOT.md as generated view.

Files:
- `src-tauri/src/build_state/mod.rs` — BuildStateManager struct
- `src-tauri/src/build_state/batches.rs` — Batch CRUD
- `src-tauri/src/build_state/findings.rs` — Finding CRUD
- `src-tauri/src/build_state/risks.rs` — Risk CRUD
- `src-tauri/src/build_state/generator.rs` — generate_boot_md()

Tauri commands: get_build_state, create_batch, complete_batch, add_finding, resolve_finding, generate_boot_md
Gate: Build state queryable. BOOT.md generation produces valid markdown.
Depends on: P3-A
Push: Yes

---

### Session 3.2 — Memory + Communication

#### P3-E: KAIROS Daily-Log Memory (Rust)

Goal: Append-only memory system with 4-type taxonomy.

Files:
- `src-tauri/src/memory/mod.rs` — MemoryManager struct
- `src-tauri/src/memory/logs.rs` — daily log operations
- `src-tauri/src/memory/topics.rs` — topic file CRUD
- `src-tauri/src/memory/index.rs` — MEMORY.md index generation
- `src-tauri/src/memory/types.rs` — MemoryType, MemoryEntry

Tauri commands: append_memory, query_memory, get_memory_index, get_daily_log
Constants: MEMORY_MAX_LINES=200, MEMORY_MAX_SIZE_KB=25
Gate: Memory appends persist. Index generates correctly. Query returns results.
Depends on: P3-A
Push: Yes

#### P3-F: Dream Consolidation Engine (Rust Background Task)

Goal: Nightly 4-phase consolidation — Orient → Gather → Consolidate → Prune.

Files:
- `src-tauri/src/memory/dream.rs` — DreamEngine + 4-phase pipeline
- Update `lib.rs` — register background task via tokio::spawn

Trigger conditions: 24h+ since last, 5+ sessions, no concurrent dream
SQLite advisory lock prevents races
Tauri commands: trigger_dream, get_dream_status
Gate: Dream runs manually. Consolidation produces topic files. MEMORY.md regenerated.
Depends on: P3-E
Push: Yes

#### P3-G: Swarm Mailbox (Rust)

Goal: Inter-agent message bus with typed messages.

Files:
- `src-tauri/src/swarm/mod.rs` — SwarmManager struct
- `src-tauri/src/swarm/mailbox.rs` — send/receive/query
- `src-tauri/src/swarm/types.rs` — 5 message types
- `src-tauri/src/swarm/permissions.rs` — permission request/response flow

Tauri commands: swarm_send, swarm_get_messages, swarm_mark_read, swarm_respond_permission
Tauri events: `swarm-message` emitted on new message
Gate: Messages persist. Events emit. Permission flow completes.
Depends on: P3-A
Push: Yes

#### P3-H: Communication UI (React)

Goal: Agent communication visible + permission approval.

Files:
- `components/team/PermissionModal.tsx` — approve/deny with context
- `components/team/MessageFeed.tsx` — real-time agent message stream
- `components/team/MailboxBadge.tsx` — unread count
- `components/team/AgentPresence.tsx` — online/active/idle
- `hooks/useSwarmMessages.ts` — subscribe to swarm-message events
- `hooks/usePermissions.ts` — pending permission queue

Wire into: TeamPanel
Gate: Permission modal appears on request. Messages stream in real-time.
Depends on: P3-G, P3-C
Push: Yes

---

### Session 3.3 — Compaction + Integration

#### P3-I: Auto-Compact Engine (Rust)

Goal: Automatic context management at 85% threshold.

Files:
- `src-tauri/src/compact/mod.rs` — CompactionEngine struct
- `src-tauri/src/compact/counter.rs` — token approximation
- `src-tauri/src/compact/threshold.rs` — 85% detection + trigger
- `src-tauri/src/compact/summary.rs` — 9-section summary generation
- `src-tauri/src/compact/restore.rs` — post-compact file restoration

Constants: POST_COMPACT_TOKEN_BUDGET=50_000, MAX_FILES_TO_RESTORE=5, MAX_TOKENS_PER_FILE=5_000
Tauri commands: get_context_usage, trigger_compact, get_last_summary
Gate: Token counter accurate. Auto-compact triggers at threshold. Summary stored.
Depends on: P3-A, P3-B (dispatches compaction agent)
Push: Yes

#### P3-J: Context Management UI (React)

Goal: Visual context window management.

Files:
- `components/status/ContextMeter.tsx` — token usage bar (green/yellow/red)
- `components/status/CompactionIndicator.tsx` — compacting animation
- `components/status/SummaryViewer.tsx` — read compaction summaries
- `components/status/SessionContinuity.tsx` — continuation indicator
- `hooks/useContextUsage.ts` — poll context usage

Wire into: Status bar area (near titlebar or ChatPanel bottom)
Gate: Context meter updates live. Compaction visible to operator.
Depends on: P3-I
Push: Yes

#### P3-K: TeamFile Manager + Persistent Sessions

Goal: Per-persona configuration + crash recovery.

Files:
- `apps/desktop/src-tauri/src/swarm/team_file.rs` — TeamFile JSON management
- `apps/desktop/src-tauri/src/database/checkpoints.rs` — session checkpoint save/get/resume/clear (PIERCE-MED-3)
- `apps/desktop/src-tauri/src/commands/team.rs` — Tauri command wrappers

Tauri commands: get_team_config, update_team_member, save_checkpoint, get_checkpoint, get_resume_candidate, clear_checkpoint
Persistent sessions: SQLite checkpoint after each message, resume dialog on startup
Gate: Team config loads/saves. Interrupted session detected and resumable.
Depends on: P3-G
Push: Yes

#### P3-L: Integration Testing + Verification

Goal: End-to-end verification of all Phase 3 systems.

Tests:
1. Dispatch agent → result in SQLite → UI updates
2. Memory append → dream consolidation → MEMORY.md regenerated
3. Swarm message → mailbox → UI notification
4. Token threshold → auto-compact → summary stored
5. Batch created → finding logged → BOOT.md generated

Verification: pnpm tauri dev clean. All panels render with real content. All commands respond.
Gate: Screenshot proof of running app with agent dispatch + memory + mailbox + context meter.
Push: Yes (final Phase 3 push)

---

### Phase 3 Risks
- **Rust async complexity:** tokio + Tauri async model may have surprises with background tasks
- **SQLite concurrency:** Multiple async tasks writing to same database — need connection pooling or mutex
- **Token counting accuracy:** Character-based approximation may drift from actual token count
- **Tauri v2 event system:** Real-time events for swarm messages need testing under load

---

