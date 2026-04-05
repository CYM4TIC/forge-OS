## Phase 8: Intelligence Foundation (30 batches, 6 sessions)

**Session map:** 8.1 = P8-A through P8-I | 8.2 = P8-J through P8-Q | 8.3 = P8-R through P8-U | 8.4 = P8-V through P8-Y | 8.5 = P8-Z through P8-AB | 8.6 = P8-AC through P8-AD
**Prerequisite:** Phase 7 complete + Session 7.5 complete. Entering Phase 8 with: 14 world-class personas (ecosystem refinement complete), 14 professional profiles (`forge/profiles/*.md`), Knowledge Loading Architecture (`docs/KNOWLEDGE-LOADING-ARCHITECTURE.md` — three-layer assembly, self-updating loop), DESIGN.md governance doc, 106 Tauri commands, 21 hooks, PolicyEngine, PermissionManager, DispatchQueue with HaltCondition trait, CapabilityGrants, InteractionModes 5-way, Agora proposal system, SecretScrubber, Condenser trait + pipeline with SimilarityCondenser (0.88 threshold), TriggerRegistry, composite memory scoring with exponential decay (48h half-life) + touch-boost + hybrid LRU+LFU + RRF fusion (K=60), Three-Space memory partition (kernel/garden/ops), finding deduplication, next-step hints on persona returns. SQLite at V15c. Rust toolchain, `notify` crate for filesystem watching. `fastembed` + `sqlite-vec` crates for Session 8.3 retrieval engine.
**Knowledge Loading Architecture integration:** P8-F adds KnowledgeAugmenter to context assembly. P8-G adds Dreamtime consolidation per persona. P8-K adds Learning Extractor as post-dispatch hook. P8-L loads kernel + profile as identity layer. See `docs/KNOWLEDGE-LOADING-ARCHITECTURE.md` for the full pipeline design.
**Repo:** CYM4TIC/forge-OS | **Local:** `.`

> **Phase 8 scope (restructured 2026-04-04):** Original Phase 8 (9 sessions) split into Phase 8 (4 original + 2 new = 6), Phase 9 (5), Phase 10 (4), Phase 11 (2-3). Phase 8 = the core runtime systems the OS needs to think — vault watching, dispatch pipeline, knowledge graph, project onboarding, persona evolution, messaging gateway. Everything downstream depends on this phase being solid.

**Carried risks entering Phase 8:**

| ID | Risk | Severity | From | Resolution |
|---|---|---|---|---|
| P-HIGH-3 | `validate_checkpoint` Tauri command wrapper missing — backend exists, no Tauri surface | HIGH | P7-N | P8-A |
| P-HIGH-4 | `PersonaCapabilityState` Tauri commands missing — widen/narrow/prune_expired/effective not exposed | HIGH | P7-N | P8-A |
| K-MED-7 | Unified `evaluate_access` merge — PolicyEngine + PermissionManager + CapabilityState evaluated separately, no single entry point | MED | P7-N | P8-A |
| K-INFO-14 | Supervised mode enforcement — `InteractionMode::Supervised` defined but no runtime gate enforcing write confirmation | INFO | P7-N | P8-A |
| K-HIGH-3 | 16+ `isTauriRuntime` guard gaps — systemic pre-existing across bridge functions | HIGH | P7-L | P8-A |
| K-HIGH-4 | Rate limit bypass via omitted `session_id` in proposal filing | HIGH | P7-J | P8-A |
| K-MED-4 | `MissionState` in-memory only — no SQLite persistence, lost on restart | MED | P7-J | P8-A |
| K-LOW-1 | Event emission `let _` pattern — silently swallows send failures | LOW | P7-J | P8-A |
| K-LOW-3 | `InvalidParameterName` error variant misuse — used for unrelated validation failures | LOW | P7-J | P8-A |
| PL-005 | Checkpoint advance/re-gate/hold — UI buttons exist, backend handlers missing | MED | P7-M | P8-A |
| PL-003 | 60s timeout — backend scope unimplemented, UI shows static value | LOW | P7-M | P8-A |
| PL-004 | Concurrency limit — display-only, no enforcement in DispatchQueue | LOW | P7-M | P8-A |
| PL-008 | Timeline scope mismatch — timeline shows hardcoded range, not session-relative | LOW | P7-M | P8-A |
| M-LOW-3 | Pill touch target below 44px minimum | LOW | P7-L | P8-A |
| M-LOW-4 | DismissalCard opacity contrast below 4.5:1 in dark theme | LOW | P7-L | P8-A |
| K-MED-2 | Viewport-relative presets — presets use absolute pixel values, not viewport-relative | MED | P7-L | P8-A |

---

### Session 8.1 — Vault Watcher + State Engine + Skills Crystallization (9 batches)

**Architectural goal:** Build the data substrate the OS thinks with — mana budgets, execution traces, signals, vault watching, auto-indexes, scheduled rituals, self-improving skills. Every system in 8.2+ reads from what 8.1 creates.

**Integration Map patterns (Session 8.1):** Mana Economy (Excalibur + Meta-Harness Pareto), Echo Ledger + ATIF (Meta-Harness + Excalibur + AutoAgent), Decision Trace Store (Novel context graph), Signal Store (Novel context graph), Domain Adapter Architecture (Novel org substrate), Vault Sigils (Karpathy), Three-Tier Context Assembly (oh-my-codex), Self-Improving Skills (Hermes + ByteRover + Block), Atomic Skill Decomposition (Block engineering), Ritual System (Excalibur + Karpathy + background-agents), Provider Factory Registry + SharedProvider (Goose), Recipe System (Goose), Network Allow-List + Header Injection (just-bash), Pure Decision Functions (background-agents), Circuit Breaker (background-agents), Recovery Sweep (background-agents), Proactive Context Warming (background-agents), Configurable Execution Limits (just-bash), Thinking Budget Control (AutoAgent), Page Reconstruction from Chunks (ChromaFs), **Composable Halt Conditions (AutoGen TerminationCondition)**, **Composite Memory Scoring (CrewAI UnifiedMemory)**, **Exploration Budget Loop (CrewAI RecallFlow)**, **Multi-table FTS with score aggregation (GitNexus)**, **Incremental embedding with skip sets (GitNexus)**, **Tier-based memory promotion/demotion WORKING/SEMANTIC/ARCHIVED (StixDB)**, **Hash-based exact dedup pre-pass before vector dedup (StixDB)**, **Lineage-safe consolidation with provenance preservation (StixDB)**, **Feature block composition — always-included vs conditional kernel modules (ArsContexta)**, **Condition-based maintenance triggers replacing time-based scheduling (ArsContexta)**.

---

### P8-A: Carried Risk Resolution

**Goal:** Resolve all 16 carried risks from Phase 7. Clean slate before building new systems.

**Edits:**
- `src-tauri/src/commands/checkpoints.rs` — add `validate_checkpoint` Tauri command wrapper (P-HIGH-3), add checkpoint advance/re-gate/hold handlers (PL-005)
- `src-tauri/src/commands/capabilities.rs` — add `widen_capabilities`, `narrow_capabilities`, `prune_expired_capabilities`, `get_effective_capabilities` Tauri commands (P-HIGH-4)
- `src-tauri/src/commands/access.rs` — NEW: unified `evaluate_access` entry point combining PolicyEngine + PermissionManager + CapabilityState (K-MED-7)
- `src-tauri/src/dispatch/mode_gate.rs` — enforce `InteractionMode::Supervised` write confirmation at runtime (K-INFO-14)
- Grep all bridge functions for `isTauriRuntime` gaps — patch each (K-HIGH-3, systematic: touch ~16 files across 2 pushes)
- `src-tauri/src/commands/proposals.rs` — require `session_id` on `file_proposal`, validate non-empty (K-HIGH-4)
- `src-tauri/src/dispatch/mission.rs` — persist `MissionState` to SQLite, restore on startup (K-MED-4)
- `src-tauri/src/events/emitter.rs` — replace `let _` with explicit error logging on event send failure (K-LOW-1)
- `src-tauri/src/commands/mod.rs` — rename `InvalidParameterName` to `ValidationError` or split into correct variants (K-LOW-3)
- `src-tauri/src/dispatch/queue.rs` — enforce concurrency limit in dequeue logic (PL-004), implement timeout enforcement (PL-003)
- Frontend: fix timeline scope to session-relative range (PL-008), fix pill touch targets to 44px (M-LOW-3), fix DismissalCard opacity to ≥4.5:1 contrast (M-LOW-4), convert preset pixel values to viewport-relative (K-MED-2)
- `src-tauri/src/lib.rs` — register new commands in `generate_handler`

**Gate:** All 16 risks resolved with read-back. `tsc --noEmit` zero errors. `cargo check` clean. Sentinel regression sweep clean.
**Depends on:** Phase 7 complete
**Push:** Yes (2 pushes — backend first, frontend second)
**Notes:** Heavy edit batch. No new modules — strictly closing open items. isTauriRuntime is systemic (~16 files); use grep to enumerate all gaps, fix in two groups.

---

### P8-B: Domain Adapter Architecture + Mana Economy

**Goal:** Define the domain abstraction layer (development is first adapter) and the mana resource model that governs all dispatch expansion. These are the two foundational systems everything else references.

**Files:**
- `src-tauri/src/adapters/mod.rs` (module declaration)
- `src-tauri/src/adapters/adapter.rs` (`DomainAdapter` trait: `event_types()`, `signal_definitions()`, `trace_types()`, `agent_mapping()`, `forecast_thresholds()`. Domain-agnostic — core doesn't know about "batches")
- `src-tauri/src/adapters/development.rs` (built-in development adapter: 7 event types — `action.completed`, `gate.blocked`, `timer.fired`, `dispatch.started`, `dispatch.completed`, `finding.filed`, `ritual.fired`. 11 signal definitions — `finding_count`, `finding_density`, `files_changed`, `batch_duration_ms`, `token_usage`, `gate_pass`, `risk_delta`, `mana_spent`, `dispatch_count`, `regression_count`, `skill_count`)
- `src-tauri/src/mana/mod.rs` (module declaration)
- `src-tauri/src/mana/economy.rs` (`ManaEconomy`: per-run budget allocation, gradient tiers — Free (local reads, artifact writes: 0) → Low (depth reads: 1) → Medium (external calls: 2, doc gen: 2) → High (deep graph query: 3, emanations: 10-20, image gen: 3). Budget defaults — interactive: 120, heartbeat: 60, dreamtime: 40, scrying: 40, automated: 60)
- `src-tauri/src/mana/tracker.rs` (`ManaTracker`: per-dispatch mana accounting, running balance, Pareto frontier tracking — empirical operating point optimization velocity vs quality, log-normal scoring with two control points p10/p25)
- `src-tauri/src/mana/grimoire.rs` (`Grimoire` parser: reads `GRIMOIRE.md` single-file cost/budget definitions, hot-reloadable. YAML frontmatter + markdown body. All costs and budgets defined here, not in code)
- `src-tauri/src/mana/halt.rs` (`HaltCondition` trait from AutoGen TerminationCondition: composable halt conditions with `&` (AND) and `|` (OR) combinators. Built-in conditions: `ManaBudgetExhausted { max_mana }`, `TurnLimit { max_turns }`, `TimeoutHalt { timeout_secs }`, `ExternalHalt { signal: Arc<AtomicBool> }`, `TextTrigger { pattern }`, `ConflictDetected { threshold }`. Dispatch engine evaluates halt conditions on every step. Conditions are first-class — not just mana budgets but a composable halt abstraction)
- SQLite migration V16: `mana_ledger` table (id, dispatch_id, operation, cost, balance_after, timestamp), `pareto_points` table (id, persona, mana_spent, finding_quality, batch_id, timestamp)
- Tauri commands: `get_mana_balance`, `get_grimoire`, `update_grimoire_entry`, `get_pareto_frontier`

**Design constraints:**
- *Provider Factory Registry (Goose):* Dual registration — capabilities descriptor + factory function. `SharedProvider` double-Arc enables hot-swap between models at runtime without restart. Mana-aware: when balance low, auto-fallback to fast/cheap model via `SharedProvider::swap()`
- *Configurable Execution Limits (just-bash):* Per-persona profiles defined in Grimoire — Scout: tight (20 tool calls, 5 file reads), Nyx: wide (unlimited tool calls, unlimited reads), Gates: read-heavy (50 reads, 0 writes)
- *Thinking Budget Control (AutoAgent):* Per-persona reasoning token allocation via Grimoire. Scout: 2K thinking tokens, Nyx: 8K, Triad agents: 4K

**Gate:** `get_mana_balance` returns correct balance after mock operations. Grimoire parses from markdown. DomainAdapter trait compiles with development adapter. Provider factory registers and hot-swaps. Pareto frontier records data points. Halt conditions compose with `&`/`|` — `ManaBudgetExhausted | TurnLimit` fires when either triggers. `ManaBudgetExhausted & TurnLimit` fires only when both trigger.
**Depends on:** P8-A
**Push:** Yes
**Notes:** Two conceptually distinct modules in one batch because everything downstream references both. The adapter defines WHAT events/signals exist; the mana economy defines HOW MUCH work can be done with them.

---

### P8-C: Echo Ledger + Decision Trace Store

**Goal:** Build the dual-layer data recording system — raw echoes (highest fidelity, never summarized) and structured decision traces (observation → reasoning → action → outcome with FTS5 search).

**Files:**
- `src-tauri/src/echoes/mod.rs` (module declaration)
- `src-tauri/src/echoes/ledger.rs` (`EchoLedger`: append-only daily JSONL at `vault/echoes/<YYYY-MM-DD>.jsonl`. Echo types enum: `Dispatch`, `Finding`, `ToolCall`, `Checkpoint`, `GateResult`, `OperatorQuery`, `RitualEvent`. ATIF trajectory serialization from AutoAgent: each echo carries `action` (tool called), `thought` (reasoning), `input` (arguments), `feedback` (result). Never summarized-then-discarded)
- `src-tauri/src/echoes/query.rs` (`EchoQuery`: grep-style access by type/source/date/keyword. Page reconstruction from chunks — large documents stored as indexed chunks, reconstructed on read with LRU caching from ChromaFs pattern)
- `src-tauri/src/context_graph/mod.rs` (module declaration)
- `src-tauri/src/context_graph/store.rs` (`TraceStore`: structured append-only traces. Schema: `id` (ULID), `source` (domain adapter), `type`, `timestamp`, `observation` {what, where, evidence}, `reasoning` {why, references, confidence}, `action` {what, who, artifacts}, `outcome` {result, validated, learned}, `graph_edges` (caused_by/leads_to/related_to), `tags`, `signals_emitted`. Domain-agnostic — same schema for development traces and future business traces)
- `src-tauri/src/context_graph/query.rs` (`TraceQuery`: query by time range, type, tags, FTS5 full-text. Edge traversal: `walk_causal_chain(trace_id)` — follows `caused_by`/`leads_to` edges recursively with cycle detection and max depth)
- `src-tauri/src/context_graph/backfill.rs` (`TraceBackfill`: parse BOOT.md handoffs into decision traces, seed from existing project history. Used by `/link` command in Session 8.4)
- SQLite migration V17: `decision_traces` table (id TEXT PK, source TEXT, trace_type TEXT, timestamp TEXT, observation_json TEXT, reasoning_json TEXT, action_json TEXT, outcome_json TEXT, tags TEXT, signals_emitted TEXT), `trace_edges` table (from_id TEXT, to_id TEXT, edge_type TEXT — caused_by/leads_to/related_to), `CREATE VIRTUAL TABLE traces_fts USING fts5(observation_json, reasoning_json, action_json, outcome_json, content='decision_traces', content_rowid='rowid')`, FTS5 triggers for INSERT/UPDATE/DELETE sync
- Tauri commands: `append_echo`, `query_echoes`, `get_echo_stats`, `file_trace`, `query_traces`, `get_trace`, `walk_causal_chain`

**Gate:** Echo appended to JSONL file, queried back with type filter. Decision trace filed with all schema fields, queried via FTS5. Causal chain walks across 3+ linked traces. Backfill parses mock BOOT.md handoff into traces. V17 migration applies cleanly on V16.
**Depends on:** P8-B (adapter defines trace types, mana costs echo reads)
**Push:** Yes
**Notes:** Echo ledger is the raw audit trail — retained indefinitely. Decision traces are the structured reasoning layer built on top. The backfill module is critical for `/link` — it bootstraps the trace store from existing project history.

---

### P8-D: Signal Store + Collector

**Goal:** Build the numeric time-series layer that extracts quantitative signals from decision traces. Signals feed forecasting (Phase 9) and anomaly detection.

**Files:**
- `src-tauri/src/signals/mod.rs` (module declaration)
- `src-tauri/src/signals/store.rs` (`SignalStore`: SQLite-backed time-series. Retention policy: raw signals kept 90 days, daily aggregates kept indefinitely. Running windows per metric — last 10/30/90 values maintained in memory for fast access)
- `src-tauri/src/signals/aggregator.rs` (`SignalAggregator`: daily aggregation — min, max, avg, p50, p90 per metric per scope. Runs at end of day or on demand. Stores aggregates in `signal_daily_aggregates` table)
- `src-tauri/src/signals/collector.rs` (`SignalCollector`: subscribes to `trace.filed` events via domain adapter's signal definitions. Extracts numeric values from trace fields. Development adapter signals: `finding_count` (count findings per batch), `finding_density` (findings per file changed), `files_changed` (count), `batch_duration_ms` (timestamp delta), `token_usage` (from echo metadata), `gate_pass` (1/0), `risk_delta` (new risks minus resolved), `mana_spent` (from mana ledger), `dispatch_count`, `regression_count`, `skill_count`)
- SQLite migration V18: `signals` table (id INTEGER PK, source TEXT, metric TEXT, value REAL, timestamp TEXT, scope TEXT, trace_id TEXT, tags TEXT), `signal_daily_aggregates` table (id INTEGER PK, metric TEXT, scope TEXT, date TEXT, min REAL, max REAL, avg REAL, p50 REAL, p90 REAL, count INTEGER), INDEX on signals(metric, timestamp), INDEX on signals(trace_id)
- Tauri commands: `get_signal_window`, `get_signal_daily`, `list_signal_metrics`

**Gate:** Signal emitted from mock trace, stored in SQLite. Window query returns last 10 values. Daily aggregation computes correct min/max/avg/p50/p90. Collector extracts at least 3 signal types from a development-domain trace. V18 migration applies cleanly.
**Depends on:** P8-C (signals extract from traces), P8-B (adapter defines signal definitions)
**Push:** Yes

---

### P8-E: Vault Watcher + Build State Aggregator

**Goal:** Live filesystem watching on vault files. When BOOT.md, BUILD-LEARNINGS.md, agent files, or INTROSPECTION.md change, the OS knows immediately. Build state aggregator combines vault state + SQLite metrics into a single queryable model.

**Files:**
- `src-tauri/src/vault/mod.rs` (module declaration)
- `src-tauri/src/vault/watcher.rs` (`VaultWatcher`: Rust `notify` crate for filesystem events. Watches: BOOT.md, BUILD-LEARNINGS.md, `vault/team-logs/*/`, `personas/*/INTROSPECTION.md`, `vault/rituals/`, `vault/skills/`. Debounces rapid changes (100ms window). Emits typed `VaultEvent` variants: `BootUpdated`, `LearningsUpdated`, `PersonaUpdated`, `RitualSpecChanged`, `SkillChanged`. Protocol enforcement #7: verifies BOOT.md was updated AFTER last git push — if BOOT.md timestamp precedes last push, flags batch as incomplete)
- `src-tauri/src/vault/state.rs` (`BuildStateAggregator`: combines vault state (parsed BOOT.md YAML) + SQLite metrics (mana balance, signal windows, dispatch queue depth, active findings count). Session management: create, resume, archive sessions. Protocol enforcement #6: emits context warning at 70% usage, blocks new batch start, forces handoff write)
- `src-tauri/src/vault/parser.rs` (`BootParser`: parse BOOT.md YAML frontmatter → `BootState` struct with all fields from machine-readable block. Phase detection via filesystem state — verifies BOOT.md phase claims against expected artifacts. Auto-memory extraction triggers: after every BOOT.md write, scan for tool surprises, persona failure patterns, implicit architecture decisions, reusable patterns. Failure mode evaluation: persona-inherent → propagate globally, project-specific → stay local)
- Tauri commands: `get_vault_state`, `get_build_state`, `create_session`, `resume_session`, `archive_session`, `get_boot_state`

**Gate:** File change to BOOT.md triggers `BootUpdated` event within 200ms. YAML frontmatter parses correctly for current BOOT.md. BuildStateAggregator returns combined state. Session create/resume/archive lifecycle works. Handoff integrity check flags when BOOT.md outdated.
**Depends on:** P8-B (mana balance in aggregated state), P8-D (signal windows in aggregated state)
**Push:** Yes
**Notes:** The `notify` crate requires platform-specific testing. On Windows, uses `ReadDirectoryChangesW`. Debounce is critical — saving BOOT.md can trigger multiple filesystem events.

---

### P8-F: Vault Sigils + Three-Tier Context Assembly

**Goal:** Auto-maintained compact indexes (sigils) that eliminate RAG dependency for structured queries. Three-tier context assembly model that governs what each dispatch sees.

**Files:**
- `src-tauri/src/sigils/mod.rs` (module declaration)
- `src-tauri/src/sigils/generator.rs` (`SigilGenerator`: reads vault content, produces one-line index entries with tags and file references. Sigil files: `BUILD-LEARNINGS-INDEX.md`, `SKILLS-INDEX.md`, `ADL-INDEX.md`, `FINDINGS-INDEX.md`, `ECHOES-INDEX.md`. Generated by dreamtime ritual — never manually edited. Incremental update: only regenerate entries for files changed since last generation)
- `src-tauri/src/sigils/query.rs` (`SigilQuery`: search sigil indexes by tag, keyword, date range. Zero mana cost. Returns file references for deeper reads at 1 mana cost)
- `src-tauri/src/context/mod.rs` (module declaration)
- `src-tauri/src/context/assembly.rs` (`ContextAssembler`: three-tier model from oh-my-codex — **PRIORITY** tier (replaced per dispatch): kernel + current goal + dispatch grants + capability metadata. **WORKING** tier (append-only, prunable): echoes + recent findings + active traces + in-flight dispatch state. **MANUAL** tier (permanent reference): vault articles + ADL + grimoire + skills. Assembly filtered by declared `required_artifacts` list on each audit/dispatch. Mana-aware: sigils at 0, articles at 1, deep graph query at 3)
- `src-tauri/src/context/condenser.rs` (`Condenser` trait from OpenHands rolling condenser pipeline: `should_condense(view) -> bool`, `condense(view) -> View | Condensation`. Implementations: `ToolResultCondenser` (TTL-based, extends existing compact system), `ObservationMaskingCondenser` (replaces verbose observations with summary), `LLMSummarizingCondenser` (structured summary: USER_CONTEXT, TASK_TRACKING, CODE_STATE, CHANGES). `CondenserPipeline` chains condensers in sequence — first condenser that returns a Condensation signal triggers a compression round. Agents can request condensation proactively via `CondensationRequestTool` — when an agent senses context pressure, it calls this tool, which triggers the pipeline on the next step)
- Tauri commands: `get_sigil`, `list_sigils`, `regenerate_sigils`, `assemble_context`, `request_condensation`, `get_condenser_stats`

**Gate:** Sigils generated from current vault content. Sigil query returns matching entries. Context assembly produces correct tier separation. Required artifacts filtering excludes unrequested tiers. Mana costs deducted correctly per tier. Condenser pipeline chains 3 condensers — ToolResultCondenser triggers on TTL, ObservationMaskingCondenser masks verbose output, LLMSummarizingCondenser produces structured summary. CondensationRequestTool triggers pipeline on next step when called by agent. Condenser stats track what was forgotten and when.
**Depends on:** P8-C (echoes/traces indexed), P8-D (signals referenced), P8-E (vault state drives regeneration)
**Push:** Yes
**Notes:** Sigils are the "zero-cost navigation" layer. Most dispatch context questions can be answered from sigils without reading full articles. The three-tier model prevents context bloat — each dispatch gets only what it declared needing.

---

### P8-G: Ritual System

**Goal:** Scheduled automated jobs with mana budgets, circuit breakers, and governance. Three built-in rituals ship disabled by default — no accidental autonomous behavior.

**Files:**
- `src-tauri/src/rituals/mod.rs` (module declaration)
- `src-tauri/src/rituals/engine.rs` (`RitualEngine`: reads specs from `vault/rituals/*.md`. Cron-based scheduling via parsed schedule field. Dispatches ritual as mana-bounded, capability-scoped job. Status lifecycle: `idle → warming → executing → cooldown → idle`. Mana cap enforcement: ritual cannot exceed its cap even if budget allows)
- `src-tauri/src/rituals/spec.rs` (`RitualSpec` parser: YAML frontmatter from ritual markdown — `name`, `schedule` (cron), `starting_mana`, `mana_cap`, `timeout`, `capabilities[]`, `enabled`. Body is the ritual's prompt/instructions)
- `src-tauri/src/rituals/guard.rs` (`RitualGuard`: pure decision functions — `should_fire_ritual(spec, now, last_run) -> bool`, `should_pause_ritual(spec, history) -> bool`, `evaluate_circuit_breaker(history, window) -> CircuitState`, `evaluate_mana_budget(spec, current_balance) -> bool`. Circuit breaker: 3 consecutive failures within window → circuit opens → ritual auto-pauses. Successful run resets counter)
- `src-tauri/src/rituals/warming.rs` (`ContextWarmer`: proactive context warming from background-agents pattern. 5 minutes before scheduled fire time, pre-assemble ritual context using ContextAssembler. Warms: sigils, relevant echoes, active findings. Reduces cold-start latency on ritual dispatch)
- Three built-in ritual specs (created as vault files, not Rust):
  - `vault/rituals/heartbeat.md` — hourly (`0 * * * *`), 60 starting mana, 120 cap, 45min timeout, capabilities: `[ReadOnly, WriteVault]`. Recovery sweep: detect dispatches stuck in `running`, rituals stuck in `executing`, stale sigil indexes
  - `vault/rituals/dreamtime.md` — 2am daily (`0 2 * * *`), 40 starting mana, 80 cap, 90min timeout, capabilities: `[ReadOnly, WriteVault]`. Full alchemy pass: read echoes → compile vault articles → regenerate sigils → generate ley lines → trigger persona evolution → prune stale knowledge
  - `vault/rituals/scrying.md` — 3am Monday (`0 3 * * 1`), 40 starting mana, 80 cap, 60min timeout, capabilities: `[ReadOnly, WriteVault, External]`. Vault integrity: find contradictions, stale skills, unvalidated ADL decisions
- Tauri commands: `list_rituals`, `enable_ritual`, `disable_ritual`, `get_ritual_status`, `get_ritual_history`, `fire_ritual_now`

**Gate:** Ritual specs parse from markdown. `should_fire_ritual` returns true at scheduled time. Circuit breaker opens after 3 failures, closes on success. Context warming triggers 5 min before fire. All three rituals load but are disabled. `fire_ritual_now` dispatches heartbeat with mana tracking.
**Depends on:** P8-B (mana economy), P8-F (context assembly for warming)
**Push:** Yes (2 pushes — Rust modules first, vault ritual specs second)
**Notes:** All rituals ship DISABLED. Operator explicitly enables during `/init` (Session 8.4). The ritual system is the heartbeat of the OS — but it must be opt-in.

---

### P8-H: Self-Improving Skills System + Provider Services

**Goal:** Skills that crystallize from usage patterns, decompose when too large, and inject into dispatch context. Plus provider hot-swap, recipe templates, and network security.

**Files:**
- `src-tauri/src/skills/mod.rs` (module declaration)
- `src-tauri/src/skills/crystallizer.rs` (`SkillCrystallizer`: after batch completes, scan echo ledger for 5+ tool calls with novel pattern → auto-create skill file in `vault/skills/` with YAML frontmatter: `name`, `description`, `created_by`, `requires_tools[]`, `platforms[]`, `version`, `last_improved`. Generalization testing from ByteRover: crystallized skill tested on different surface before setting `version: 1`. Algorithmic skills — patterns capture tool sequences and decision logic, not prompt personality)
- `src-tauri/src/skills/decomposer.rs` (`SkillDecomposer`: atomic skill decomposition from Block engineering. When auto-crystallization creates skill > 8 steps, propose splitting into atomic sub-skills via `.forge/proposals/`. Operator approves. Sub-skills independently versionable. Target: hundreds of fine-grained skills, not dozens of large ones)
- `src-tauri/src/skills/injector.rs` (`SkillInjector`: during prompt assembly, scan skills index (sigil) for relevant skills matching dispatch domain + connected MCPs + build surface. Inject into MANUAL context tier. Mana cost per injection — large skills cost more. Conditional activation: skills only activate when `requires_tools` are connected and `platforms` match current project. Self-improvement loop: when agent discovers skill is incomplete, patches via `skill_manage(action='patch')` tool call)
- `src-tauri/src/skills/promoter.rs` (`VaultPromoter`: query-to-vault promotion pattern — when agent synthesis during a dispatch produces a high-quality recommendation (confidence > 0.8, cited by 2+ subsequent dispatches), auto-promote from ephemeral echo/trace to permanent vault article in `vault/articles/`. Promotion creates article with source attribution, tags, and ley line backlinks. Requires operator approval via Agora proposal before finalizing. Prevents knowledge decay — insights that would otherwise vanish with context window are crystallized into permanent reference)
- `src-tauri/src/providers/factory.rs` (`ProviderFactory`: dual registration from Goose — capabilities descriptor + factory function per provider. Hot-swap via `SharedProvider` double-Arc. Rate-limit tracking per API key profile)
- `src-tauri/src/recipes/engine.rs` (`RecipeEngine`: reusable dispatch templates from Goose. YAML with typed parameters and persona scoping. Live in `vault/recipes/`. Example: "gate-review" recipe = dispatch Pierce + Kehinde + domain-specific persona with pre-defined capability grants and mana allocations)
- `src-tauri/src/network/allowlist.rs` (`NetworkAllowList`: external API calls gated by URL allow-list from just-bash pattern. Auto-injects required headers from credential store. Blocks calls to unlisted domains. Audit log every external request)
- Tauri commands: `crystallize_skill`, `list_skills`, `get_skill`, `patch_skill`, `decompose_skill`, `promote_to_vault`, `list_promotions`, `swap_provider`, `list_providers`, `execute_recipe`, `list_recipes`, `check_network_allowlist`

**Gate:** Mock batch with 5+ repeated tool pattern triggers auto-crystallization. Skill file created with correct frontmatter. Skill > 8 steps produces decomposition proposal. Skill injector includes relevant skill in assembled context. Vault promoter files Agora proposal for high-confidence recommendation. Provider hot-swap changes active model. Recipe parses and pre-fills dispatch template. Network allow-list blocks unlisted URL, passes listed URL with injected headers.
**Depends on:** P8-F (sigils for skill index, context assembly for injection), P8-C (echo ledger for pattern detection), P8-B (mana costs, provider factory)
**Push:** Yes (2 pushes — skills first, provider/recipe/network second)
**Notes:** Skills are the long-term learning mechanism. The crystallizer mines echo ledger history. The injector makes skills available at dispatch time. The decomposer prevents skill bloat. Provider factory + recipe + network are infrastructure services that support the dispatch pipeline.

---

### P8-I: Session 8.1 Integration + Tauri Command Wiring

**Goal:** Wire all Session 8.1 modules into the Tauri app. Register managed states. Verify end-to-end flow from echo → trace → signal → sigil.

**Edits:**
- `src-tauri/src/lib.rs` — register all new modules: `adapters`, `mana`, `echoes`, `context_graph`, `signals`, `vault`, `sigils`, `context`, `rituals`, `skills`, `providers`, `recipes`, `network`
- `src-tauri/src/main.rs` — add managed states: `ManaEconomyState`, `EchoLedgerState`, `TraceStoreState`, `SignalStoreState`, `VaultWatcherState`, `BuildStateAggregatorState`, `SigilGeneratorState`, `RitualEngineState`, `SkillCrystallizerState`, `ProviderFactoryState`, `RecipeEngineState`, `NetworkAllowListState`
- `src-tauri/src/lib.rs` — register all ~35 new Tauri commands in `generate_handler` macro
- `src-tauri/src/commands/mod.rs` — re-export new command modules

**Gate — Full proof-of-life:**
1. Echo appended → trace filed from echo → signal extracted from trace → sigil regenerated from new data
2. Mana balance decrements on depth read, increments on budget allocation
3. Vault watcher detects BOOT.md change → state aggregator updates
4. Ritual spec loads, disabled by default
5. Skill crystallizer scans echo history
6. `cargo check` zero errors. `tsc --noEmit` zero errors
7. All new Tauri commands callable from frontend bridge

**Depends on:** P8-B through P8-H (all 8.1 modules)
**Push:** Yes
**Notes:** Integration batch. This is where silent failures surface. Every module must be exercised through its Tauri command interface. ~35 new commands, ~12 new managed states.

---

### Session 8.2 — Agent Dispatch Pipeline + Goal Ancestry + Injection Scanning (8 batches)

**Architectural goal:** Build the dispatch pipeline that moves agents through build phases — from Scout recon to Sentinel regression. Formal state machine, structured handoffs, capability-scoped dispatch with mana budgets, intelligence interaction chains, conflict resolution, and prompt injection defense.

**Integration Map patterns (Session 8.2):** Pipeline Stage Interface (oh-my-codex), Formal State Machine (oh-my-codex), Phase-Based Agent Composition (oh-my-codex), Worker Allocation Scoring (oh-my-codex), Runtime Overlay Injection (oh-my-codex + ByteRover), Handoff Schema (Factory-AI), ProgressLogEntry (Factory-AI), JSONL-over-stdio Transport (Factory-AI), Bidirectional JSON-RPC (Factory-AI), AX Tree Observation Model (Agent Browser), Audit Base Class (Lighthouse), Confound Isolation (Meta-Harness), Dispatch Lifecycle Hooks (OpenCLI + ByteRover), Strategy Cascade (OpenCLI), Typed Event Condition Registry (background-agents), Dispatch Queue with Serial Execution (background-agents), Goal Ancestry Injection (Paperclip), Intelligence Interaction Chains (Novel), Arbiter CONSORTIUM Synthesis (G0DM0D3), Trade-Off Pattern Index (Block engineering), Injection Scanning (Hermes), Emanation Mana Semantics (Excalibur), Large Response Handler (Goose), Provider Fallback (Hermes/OpenClaw), Git Worktree Isolation (Codex/Zed/T3), Batch Checkpoints (Novel), Plan Mode (Codex/T3), AST Transform Plugin Pipeline (just-bash — deferred from 7.2), **Stuck Detection — 5 Loop Patterns (OpenHands StuckDetector)**, **Progress Ledger per Dispatch Turn (AutoGen MagenticOne)**, **Rolling Condenser Pipeline (OpenHands)**, **Proactive Condensation Request Tool (OpenHands)**, **Handoff-as-Tool Protocol (AutoGen Swarm)**, **SocietyOfMind Nested Missions (AutoGen)**, **InterventionHandler Middleware Stack (AutoGen)**, **Delegation Budget Partitioning (OpenHands)**, **Error Classification for Self-Correction (OpenHands)**, **Event-Sourced State with View Projection (OpenHands)**, **Secret Scrubbing on Event Persistence (OpenHands)**, **Parallel Speaker Dispatch (AutoGen)**, **Tiered confidence resolution for dispatch routing — exact 0.95, adjacent 0.8, global 0.5, refuse on ambiguity (GitNexus)**, **Blast radius analysis via BFS — d=1 "will break", d=2+ "indirect risk" (GitNexus)**, **Ralph subagent spawning — fresh context per phase, count verification invariant (ArsContexta)**, **Augmentation engine — batch-query related context before agent tasks (GitNexus)**, **Global agent capability registry for dispatch routing (GitNexus)**, **WHY/HOW/WHAT query classification for retrieval routing (ArsContexta)**, **Signal-to-dimension derivation with confidence-weighted resolution (ArsContexta)**, **Cascade constraints — hard/soft/compensating capability validation (ArsContexta)**, **Topological sort for batch dependency ordering via Kahn's algorithm (GitNexus)**, **Cross-surface contract matching for Meridian consistency (GitNexus)**.

---

### P8-J: Pipeline Stage Interface + Formal State Machine

**Goal:** The backbone of the dispatch pipeline — typed stages that persist to SQLite and a state machine that enforces legal transitions.

**Files:**
- `src-tauri/src/dispatch/pipeline.rs` (`PipelineStage` trait from oh-my-codex: `fn name() -> &str`, `async fn run(ctx: StageContext) -> Result<StageResult>`, `fn can_skip(ctx: &StageContext) -> bool`. Stages: `Scout` → `Build` → `ConsequenceClimb` → `Gate` → `Regression` → `Close`. Each stage persists artifacts to SQLite via `StageResult`. On session restart, resume from last completed stage. Protocol enforcement #1: pipeline won't advance past Build until Triad agents dispatched and findings resolved)
- `src-tauri/src/dispatch/state_machine.rs` (`BuildPhase` enum from oh-my-codex: `PreBuild → Build → ConsequenceClimb → Gate → Regression → Close → Complete | Failed | Cancelled`. Typed transitions — only legal transitions compile. Gate → Fix → Re-verify loop with max N attempts (configurable, default 3). Terminal phases enforce `session.active = false` + BOOT.md handoff requirement. Protocol enforcement #3: before phase begins, validate every batch has gate assignments — no assignments = phase won't start)
- SQLite migration V19: `pipeline_stages` table (id INTEGER PK, session_id TEXT, stage_name TEXT, status TEXT, started_at TEXT, completed_at TEXT, artifacts_json TEXT), `build_phases` table (id INTEGER PK, session_id TEXT, phase TEXT, entered_at TEXT, fix_attempt INTEGER DEFAULT 0)
- Tauri commands: `get_pipeline_state`, `advance_pipeline`, `get_build_phase`, `transition_phase`

**Gate:** Pipeline stages persist to SQLite. Stage resume works after simulated restart. State machine rejects illegal transitions (e.g., `Build → Close` skipping Gate). Fix loop increments attempt counter, fails at max. V19 migration applies cleanly.
**Depends on:** P8-I (Session 8.1 complete — mana, traces, signals all available)
**Push:** Yes
**Notes:** This is the mechanical enforcement of the 6-phase build loop. What was previously governance-by-convention becomes governance-by-code.

---

### P8-K: Transport Layer + Dispatch Lifecycle

**Goal:** How agents communicate (JSONL transport, bidirectional JSON-RPC) and how their lifecycle is managed (hooks, queue enhancements, event conditions).

**Files:**
- `src-tauri/src/dispatch/transport.rs` (`DispatchTransport` enum: `Internal` (in-process) | `ACP` (Phase 10.2, stub) | `Terminal` (Phase 10.1, stub). JSONL-over-stdio from Factory-AI: agent subprocesses communicate via newline-delimited JSON with JSON-RPC 2.0 envelopes. Write serialization via `tokio::sync::Mutex` on `BufWriter<ChildStdin>` prevents byte interleaving. Sticky error propagation: once `AgentError` set, all subsequent writes fail immediately. Injectable transport trait for test mocks)
- `src-tauri/src/dispatch/jsonrpc.rs` (Bidirectional JSON-RPC from Factory-AI: server-to-client requests for `request_permission` with correlation ID. Rust dispatches to ConfirmationRouter (Phase 7.2), awaits oneshot response, writes envelope back. Non-blocking to pipeline)
- `src-tauri/src/dispatch/hooks.rs` (`DispatchHooks` from OpenCLI + ByteRover: extension points `on_before_dispatch`, `on_after_dispatch`. Before-hooks run SEQUENTIALLY — each can modify args, any can block. After-hooks run in PARALLEL — fire-and-forget. Before: capability gate → injection scan → context injection (blocking). After: echo logging → state update → notification (non-blocking). AST transform plugin pipeline from just-bash wired as before-hook: action audit on dispatch args)
- Edit `src-tauri/src/dispatch/queue.rs` — enhance with: serial execution per persona (one dispatch per persona at a time from background-agents), crash recovery (queue persisted in SQLite, restore on startup), status lifecycle: `queued → dispatching → running → completed | failed | cancelled`. Typed event condition registry: formal condition evaluation on event subscriptions — e.g., Sentinel subscribes to `action.completed` with `{ path_glob: "src-tauri/**/*.rs" }`. Stored as typed JSON in SQLite
- SQLite migration V20: `event_subscriptions` table (id INTEGER PK, subscriber TEXT, event_type TEXT, conditions_json TEXT, enabled INTEGER DEFAULT 1)
- Tauri commands: `dispatch_agent`, `get_dispatch_status`, `list_event_subscriptions`, `register_event_subscription`

**Gate:** Internal transport dispatches mock agent, receives JSONL response. JSON-RPC permission request round-trips through ConfirmationRouter. Before-hook blocks dispatch when capability check fails. After-hook logs echo on completion. Queue enforces one-per-persona. Event subscription fires on matching condition. V20 migration applies.
**Depends on:** P8-J (pipeline stages define when dispatches happen)
**Push:** Yes
**Notes:** ACP and Terminal transports are stubs — Phase 10 builds them out. The Internal transport is the immediate workhorse. JSON-RPC bridges the permission system from Phase 7.2 into the dispatch pipeline.

---

### P8-L: Agent Composition + Worker Scoring + Capability Strategy

**Goal:** Determine WHO gets dispatched, with what permissions, using what strategy.

**Files:**
- `src-tauri/src/dispatch/composition.rs` (`AgentComposer` from oh-my-codex: `get_phase_agents(phase: BuildPhase) -> Vec<PersonaSlug>`. Phase 0 → Scout + Kehinde. Phase 1 → Nyx. Phase 3 → Pierce + Mara + Kehinde + domain-specific. Phase 4 → Sentinel + Meridian. Phase 5 → Nyx. Same file change triggers different personas per build phase. Protocol enforcement #4: diff-aware gate routing — Rust files → Kehinde, TSX/CSS → Mara + Riven, SQL/migrations → Tanaka, auth code → Tanaka. Dual-lane routing: simple batches (1-2 files) get lightweight single-persona review, complex batches (multi-domain, 5+ files) auto-escalate to full triad)
- `src-tauri/src/dispatch/scoring.rs` (`WorkerScorer` from oh-my-codex: score personas across three dimensions — `role_match` (domain alignment to file types), `scope_overlap` (prior findings in this surface → familiarity bonus), `load` (remaining mana budget → availability). Composite score determines assignment. Prevents over-dispatch to single persona)
- `src-tauri/src/dispatch/strategy.rs` (`CapabilityStrategy` from OpenCLI: strategy cascade — try `ReadOnly` first, if write needed escalate to `ReadOnly + WriteCode`, never start with `Destructive`. Auto-discovers minimum-privilege execution path based on task ambiguity. Wires into CapabilityGrant system from Phase 7)
- Tauri commands: `get_phase_agents`, `score_workers`, `get_capability_strategy`

**Gate:** `get_phase_agents(Gate)` returns Pierce + Mara + Kehinde. Worker scorer ranks 3 candidates with correct composite scoring. Capability strategy starts ReadOnly, escalates to WriteCode when mock write needed. Diff-aware routing sends `.rs` file to Kehinde, `.tsx` to Mara.
**Depends on:** P8-K (dispatch queue and hooks), P8-B (mana for load scoring)
**Push:** Yes

---

### P8-M: Goal Ancestry + Runtime Overlay + Handoff + Progress Log

**Goal:** What context dispatches carry (goal ancestry, runtime overlay) and what they report back (structured handoffs, progress audit log).

**Files:**
- `src-tauri/src/dispatch/ancestry.rs` (`GoalAncestry` from Paperclip pattern: auto-build the "why" chain for every dispatch — current task (batch goal + specific surface), layer goal (e.g., "Phase 8: Intelligence Foundation"), project goal (from PROJECT.json), ADL constraints (filtered by domain relevance). Constructed automatically by dispatch pipeline. Agents know WHY they're working)
- `src-tauri/src/dispatch/overlay.rs` (`RuntimeOverlay` from oh-my-codex + ByteRover: marker-bounded sections in dispatch prompt templates. Base template: stable sections (kernel, rules, contracts) — immutable baseline via `structuredClone` prevents config corruption across concurrent triad dispatches. Per-dispatch overlay: goal ancestry, findings context, capability grants, phase-specific recommendations (ephemeral). Persona kernels are baseline. Per-dispatch context are session overrides)
- `src-tauri/src/dispatch/handoff.rs` (`Handoff` struct from Factory-AI: `salient_summary`, `what_was_implemented`, `what_was_left_undone`, `verification` {commands_run[], interactive_checks[]}, `tests` {added[], updated[], coverage}, `discovered_issues[]`, `skill_feedback?`. Stored as structured JSON in SQLite. Parsed by orchestrator for next dispatch)
- `src-tauri/src/dispatch/progress.rs` (`ProgressLog` from Factory-AI: 11-type append-only audit log — `MissionAccepted`, `MissionPaused`, `MissionResumed`, `MissionRunStarted`, `WorkerStarted`, `WorkerSelectedFeature`, `WorkerCompleted`, `WorkerFailed`, `WorkerPaused`, `HandoffItemsDismissed`, `MilestoneValidationTriggered`. Each timestamped. Source of truth for what happened and when. `WorkerCompleted` includes `return_to_orchestrator` flag for chaining optimization)
- `src-tauri/src/dispatch/ledger.rs` (`ProgressLedger` from AutoGen MagenticOne: per-dispatch-turn structured assessment. JSON schema: `is_request_satisfied: {answer: bool, reason: str}`, `is_progress_being_made: {answer: bool, reason: str}`, `is_in_loop: {answer: bool, reason: str}`, `instruction_or_question: {answer: str}`, `next_persona: {answer: str, reason: str}`. Stall counter: increments on no-progress or loop detection, decrements on forward progress. When `n_stalls >= max_stalls` (default 3), trigger replan phase — refresh facts from worktree state and revise the dispatch plan. Replanning costs mana. Ledger assessments persist to SQLite as structured JSON alongside ProgressLog entries)
- `src-tauri/src/dispatch/response_handler.rs` (`LargeResponseHandler` from Goose: context overflow guard. Responses exceeding expected size get truncated with structured summary preservation — retains findings/decisions, truncates verbose reasoning. Chunked outputs keep structured portion intact)
- SQLite migration V21: `handoffs` table (id INTEGER PK, dispatch_id TEXT, handoff_json TEXT, created_at TEXT), `progress_log` table (id INTEGER PK, dispatch_id TEXT, entry_type TEXT, payload_json TEXT, timestamp TEXT)
- Tauri commands: `get_goal_ancestry`, `build_overlay`, `file_handoff`, `get_handoff`, `get_progress_log`

**Gate:** Goal ancestry builds correct 4-level chain. Overlay template produces stable base + variable overlay. Handoff stores and parses with all fields. Progress log appends 3 entry types, queries by dispatch_id. Large response truncation preserves findings array. Progress ledger produces structured JSON assessment per turn. Stall counter increments on no-progress, decrements on forward progress. Replan triggers when stalls exceed threshold. V21 applies.
**Depends on:** P8-L (composition determines who, ancestry determines why), P8-J (pipeline stage context)
**Push:** Yes

---

### P8-N: Audit Base Class + Intelligence Chains + Event Subscriptions

**Goal:** Standardized audit contract for all gate checks, plus the reactive intelligence network — 10 intelligences connected through event subscriptions and chain orchestration.

**Files:**
- `src-tauri/src/dispatch/audit.rs` (`AuditBase` from Lighthouse: standardized audit contract — `meta` (check ID, description, severity tier, `required_artifacts` list), `async fn audit(artifacts: ArtifactSet) -> GateResult`. Pre-flight validation: verify required artifacts present before dispatch. Standardized `GateResult` output: findings array with severity, pass/fail, confidence score. Enables automated aggregation, conflict detection, historical comparison. Confound isolation from Meta-Harness: one finding → one fix → one verification, isolated. Additive modifications preferred. Protocol enforcement #5: read-back verification — every file written must have corresponding read-back in audit trail)
- `src-tauri/src/intelligence/mod.rs` (module declaration)
- `src-tauri/src/intelligence/chains.rs` (`ChainOrchestrator`: 5 canonical chains from v2 design — **Predictive Loop**: Kiln measures → Beacon forecasts → reasoning → recommendation → operator → outcome → Kiln. **Regression Chain**: push → Sentinel → anomaly → Beacon → Compass (blast radius) → fix. **Consistency Chain**: gate → Meridian → drift → Riven/Sable → fix → Meridian updates. **Learning Chain**: Wraith finds vuln → Tanaka absorbs → Scout flags proactively. **Ground Truth Chain**: conflicting findings → Arbiter CONSORTIUM → operator decides → accuracy tracked. Max chain depth: 5. Cycle detection via chain_id + visited set. Chain_id tracing for dashboard visualization)
- `src-tauri/src/intelligence/stuck.rs` (`StuckDetector` from OpenHands: watches the event stream for 5 loop patterns — (1) **Repeating action-observation**: same action-observation pair 4 times = stuck, (2) **Repeating action-error**: same action produces errors 3+ times = tool failure, (3) **Monologue**: agent talks to itself without observations = disconnected from reality, (4) **Alternating pattern**: two action-obs pairs alternate 6+ times = oscillation, (5) **Condensation spiral**: repeated condensation without progress = context thrashing. Recovery options per pattern: user re-prompt, auto-retry with modified parameters, abort chain with finding. Detector runs as event stream listener on every chain dispatch. Fires before mana exhaustion to prevent wasting budget on stuck loops)
- `src-tauri/src/intelligence/subscriptions.rs` (`IntelligenceSubscriber`: wire the 10 intelligences to their event subscriptions — Sentinel subscribes to `action.completed` (git-push), Sentinel subscribes to `gate.completed` (baseline capture), Meridian subscribes to `gate.completed` (cross-surface scan), Beacon subscribes to `trace.filed` (signal extraction + anomaly check), Beacon subscribes to `signal.threshold` (reasoning engine activation), Compass subscribes to `action.completed` (migration → dependency graph update). Each intelligence has formal spec: READS, WRITES, EMITS, SUBSCRIBES_TO, TRIGGERS)
- `src-tauri/src/intelligence/ax_tree.rs` (`AxTreeObserver` from Agent Browser: Mara evaluates structured accessibility tree with deterministic element refs instead of raw outerHTML. Compact mode strips non-interactive lines. RoleNameTracker deduplicates identical elements)
- Tauri commands: `run_audit`, `get_audit_result`, `list_chains`, `get_chain_status`, `list_intelligence_specs`

**Gate:** Audit base class runs with required_artifacts check. Confound isolation: fix applied independently, regression detectable. Chain orchestration triggers Regression Chain from mock push event → Sentinel → Beacon. Cycle detection prevents infinite chain. AX tree produces compact accessibility snapshot. Stuck detector identifies repeating action-observation pattern (4x) and triggers recovery. Stuck detector identifies alternating pattern (6x) and triggers abort. Monologue detection catches agent self-talk without observations.
**Depends on:** P8-K (event subscriptions system), P8-M (handoff + progress for audit trail), P8-D (signals for Beacon thresholds)
**Push:** Yes
**Notes:** The intelligence network is what makes the 10 intelligences more than isolated agents. The chains define how they react to each other. This is the "nervous system" of the OS.

---

### P8-O: Arbiter CONSORTIUM + Trade-Off Patterns + Injection Scanning

**Goal:** Conflict resolution when agents disagree, empirical trade-off judgment, and prompt injection defense.

**Files:**
- `src-tauri/src/intelligence/arbiter.rs` (`ArbiterConsortium` from G0DM0D3: when multi-agent gate produces conflicting severity rulings on same finding → dispatch Arbiter. Arbiter collects positions + evidence, queries retrieval engine (stub until 8.3 — hybrid search on FTS5 + sqlite-vec) for similar past conflicts, synthesizes ground truth with confidence. Both synthesis AND raw positions preserved — Arbiter synthesizes for operator, never overrides persona. Resolution filed as decision trace with `source: Consortium`)
- `src-tauri/src/intelligence/tradeoffs.rs` (`TradeOffIndex` from Block engineering: when Arbiter resolves conflict, files decision trace with conflict-specific fields — `conflict_type` taxonomy: `security-vs-ux`, `performance-vs-correctness`, `compliance-vs-simplicity`, `security-vs-velocity`, `consistency-vs-pragmatism` (extensible). `domain`, `positions[]` {persona, severity, reasoning}, `resolution` {direction, reasoning, scope_constraints}, `validated` (updated after N batches with outcome data). Command: `get_tradeoff_pattern(conflict_type, domain)` → prior resolutions + win/loss record + empirical confidence. Arbiter prompt auto-includes pattern data: "In auth security-vs-ux conflicts, security-favored resolutions held 83% (5/6 validated)")
- `src-tauri/src/security/mod.rs` (module declaration)
- `src-tauri/src/security/injection_scanner.rs` (`InjectionScanner` from Hermes pattern: scan context files before loading for — 13+ prompt injection regex patterns (role override, instruction override, ignore-previous), invisible unicode characters (zero-width spaces, RTL marks), HTML comment injection, Base64-encoded instruction blocks, secret exfiltration patterns (URLs with data params). Blocked files produce `[BLOCKED: injection detected in {file}]` instead of silent drop. Wired as before-hook in dispatch lifecycle. `tanaka-injection-scan` sub-agent wraps as dispatchable check. Runs automatically in Scout's pre-build recon)
- Tauri commands: `resolve_conflict`, `get_tradeoff_patterns`, `scan_for_injection`, `get_injection_report`

**Gate:** Mock conflicting findings from Pierce + Mara → Arbiter synthesizes with confidence score. Trade-off pattern stored, queryable by conflict_type. Injection scanner detects test patterns (role override, Base64 block, zero-width space). Blocked file produces explicit blocked message.
**Depends on:** P8-N (chains for conflict detection, audit base for findings), P8-K (hooks for injection scanning)
**Push:** Yes
**Notes:** Retrieval engine query in Arbiter is stubbed until Session 8.3 wires it (hybrid search: FTS5 for conflict-type keywords + sqlite-vec for semantic similarity). Trade-off patterns accumulate over project lifetime — early queries return sparse data, but the system bootstraps from the first conflict resolution.

---

### P8-P: Worktree Isolation + Batch Checkpoints + Emanation Mana + Provider Fallback

**Goal:** Safety infrastructure — parallel dispatches get isolated worktrees, batches get reversible checkpoints, emanations draw mana from parent, providers auto-fallback on failure.

**Files:**
- `src-tauri/src/dispatch/worktree.rs` (`WorktreeIsolation` from Codex/Zed/T3 convergence: `DispatchRequest.isolation: Option<WorktreeIsolation>`. Parallel Triad agents get own git worktrees — read-only, destroyed after gate. Build dispatches get persistent worktrees. Shared `.git` history with zero copy cost. Worktree lifecycle: create → dispatch → verify → merge-or-destroy)
- `src-tauri/src/dispatch/checkpoint.rs` (`BatchCheckpoint` from novel research: pre-batch git tag + `BatchCheckpoint` struct in SQLite. One-command revert via `revert_to_checkpoint(batch_id)`. Checkpoint stores: git tag, migration version, mana balance, active findings count. Revert: git reset to tag, rollback migrations to stored version, restore mana balance)
- Edit `src-tauri/src/mana/economy.rs` — add emanation mana semantics from Excalibur: emanation cast cost = 0. Emanation mana allocation drawn from parent (default: 20 per emanation). Parent's remaining mana decreases by allocation. Child's mana budget = allocation. `max_emanation_depth: 2` — no recursive chains beyond 2 levels. Example: Triad at 120 mana → 3 emanations × 20 = 60 allocated to children, orchestrator retains 60
- Edit `src-tauri/src/providers/factory.rs` — add provider fallback from Hermes/OpenClaw: rate-limit or error → auto-fallback to next provider at same tier with cooldown tracking. No manual intervention required
- SQLite migration V22: `batch_checkpoints` table (id INTEGER PK, batch_id TEXT, git_tag TEXT, migration_version INTEGER, mana_balance REAL, findings_count INTEGER, created_at TEXT)
- Tauri commands: `create_checkpoint`, `revert_to_checkpoint`, `list_checkpoints`, `create_worktree`, `destroy_worktree`

**Gate:** Checkpoint created with git tag. Revert restores to tagged state. Worktree creates isolated directory for mock dispatch. Emanation allocates 20 mana from parent, parent balance decrements. Provider fallback triggers on simulated rate limit. V22 applies.
**Depends on:** P8-K (dispatch queue for worktree lifecycle), P8-B (mana economy for emanation semantics)
**Push:** Yes
**Notes:** Worktree isolation is critical for parallel Triad dispatch — without it, three agents writing to the same files would conflict. Batch checkpoints are the "undo" button for entire batches.

---

### P8-Q: Plan Mode + Session 8.2 Integration

**Goal:** Plan mode as explicit interaction mode, auto-fix loop wiring, and full end-to-end integration of the dispatch pipeline.

**Edits:**
- `src-tauri/src/dispatch/mode_gate.rs` — add `InteractionMode::Plan` surface from Codex/T3: maps to existing `Spec` mode with UI surface. `/plan` command. Read-only exploration — blocks writes, allows reads + analysis. Operator explicitly requests read-only analysis before committing to execution
- `src-tauri/src/dispatch/pipeline.rs` — wire auto-fix loop: findings from Gate stage → Nyx fix dispatch → re-verify via audit base class. Confound isolation: one finding → one fix → one re-check. Max fix attempts from state machine config
- `src-tauri/src/dispatch/pipeline.rs` — wire document generation trigger: auto-generate gate report on gate completion (stub — full PDF rendering is future session)
- `src-tauri/src/lib.rs` — register all Session 8.2 modules and managed states: `PipelineState`, `TransportState`, `DispatchHooksState`, `AgentComposerState`, `ChainOrchestratorState`, `ArbiterState`, `InjectionScannerState`, `WorktreeManagerState`, `CheckpointManagerState`
- `src-tauri/src/lib.rs` — register all ~30 new Tauri commands from Session 8.2

**Gate — Full pipeline proof-of-life:**
1. Scout stage dispatches → populates context
2. Build stage dispatches Nyx → code written
3. ConsequenceClimb stage runs
4. Gate stage dispatches Triad (3 parallel via worktrees) → findings collected
5. Auto-fix loop: finding → fix dispatch → re-verify
6. Regression stage dispatches Sentinel
7. Close stage writes handoff + progress log
8. State machine transitions through all phases
9. Plan mode blocks writes correctly
10. Progress ledger produces structured assessment JSON per dispatch turn
11. Stuck detector fires on repeating action-observation loop, triggers recovery
12. Condenser pipeline compresses context when threshold exceeded, agent can request condensation proactively
13. Halt conditions compose — `ManaBudgetExhausted | TurnLimit` works as expected
14. `cargo check` zero errors. `tsc --noEmit` zero errors

**Depends on:** P8-J through P8-P (all 8.2 modules)
**Push:** Yes
**Notes:** This is the integration batch for the entire dispatch pipeline. The end-to-end flow should be exercisable with mock agents. Real agent dispatch (via LLM providers) is validated in Phase 9 integration testing.

---

### Session 8.3 — Retrieval Engine + Knowledge Garden + Vault as Virtual Filesystem (4 batches)

**Architectural goal:** Build the native retrieval engine (sqlite-vec + FTS5 + entity graph), the Knowledge Garden visualization (react-three-fiber L-system trees inspired by poetengineer's Idea Garden / Session Garden), and the virtual filesystem that presents the vault differently to each persona. No external dependencies — everything runs in SQLite + the Tauri binary.

> **Architecture decision (2026-04-04):** LightRAG dropped in favor of SQLite-native retrieval. Rationale: (1) LightRAG benchmarks inflated by evaluation bias — NaiveRAG comparable after correction, (2) Python dependency in a Rust/Tauri app = extra process + install requirement, (3) sqlite-vec + FTS5 handles vault scale (<100K vectors) with <100ms brute-force queries, (4) vault content is structured (YAML frontmatter, tags, typed traces) — SQL exploits this structure better than graph RAG ignores it, (5) single SQLite database means atomic transactions across retrieval + application data, (6) RetrievalBackend trait allows LanceDB upgrade path if scale demands it. See `vault/decisions/` for full ADL entry.

**Integration Map patterns (Session 8.3):** Temporal Edges (MiroFish), Ley Line Generation (Karpathy backlinks), Virtual Filesystem (ChromaFs + just-bash), Per-Persona Vault Pruning / RBAC (ChromaFs), Composable Filesystem Mounts (just-bash), Lazy Content Resolution (ChromaFs). **Visual reference:** poetengineer (Kat Zhang) Session Garden + Idea Garden — L-system botanical tree visualization, timeline scrubber growth animation, cross-pollination particles, 2D→3D perspective orbit, tag pill sidebars. **April 5 mining additions:** Leiden community detection for functional clustering in Knowledge Garden (GitNexus), Knowledge graph analysis — 8 ops: health metrics, triangle detection, bridge identification, hub ranking, sibling analysis, traversal, schema query, cluster discovery (ArsContexta), Per-type text generation for embeddings — different memory types get different text representations (GitNexus), Working memory boost in re-ranking +0.15 for hot tier nodes (StixDB), Autonomous maintenance planner — self-healing memory via coverage gap analysis (StixDB), 6 Rs extraction pipeline for knowledge ingestion: Record/Reduce/Reflect/Reweave/Verify/Rethink (ArsContexta).

---

### P8-R: Retrieval Engine Core — sqlite-vec + fastembed + RetrievalBackend Trait

**Goal:** Add vector similarity search to the existing SQLite database. Build the hybrid retrieval pipeline (keyword + vector + metadata) with Reciprocal Rank Fusion. Define the `RetrievalBackend` trait so the vector layer can be swapped to LanceDB in a future phase if scale demands it.

**Files:**
- `src-tauri/src/retrieval/mod.rs` (module declaration)
- `src-tauri/src/retrieval/backend.rs` (`RetrievalBackend` trait: `search_keyword(query, filters) -> Results` (FTS5 BM25), `search_vector(embedding, k, filters) -> Results` (sqlite-vec cosine similarity), `search_graph(entity, depth, edge_types) -> Results` (recursive CTEs on entity tables), `search_hybrid(query, embedding, k, filters) -> Results` (RRF fusion across keyword + vector). Trait enables future `LanceBackend` implementation without changing callers)
- `src-tauri/src/retrieval/sqlite_backend.rs` (`SqliteRetrievalBackend`: implements `RetrievalBackend` using existing rusqlite connection. sqlite-vec registered via `sqlite3_auto_extension()` + `sqlite3_vec_init`. FTS5 queries via existing infrastructure. Hybrid search via Reciprocal Rank Fusion — merges BM25 rank + cosine similarity rank using `1/(k+rank)` formula, k=60. Metadata pre-filtering via SQL WHERE on entity tags/domain/persona before vector search — structured vault metadata eliminates candidates before expensive vector math)
- `src-tauri/src/retrieval/embedder.rs` (`VaultEmbedder`: wraps `fastembed` crate for local ONNX embedding generation. Default model: `BAAI/bge-small-en-v1.5` (33M params, 67MB, 384 dimensions). Model downloaded once on first use, cached locally. Supports CPU and GPU (CUDA via `ort` ONNX Runtime). Incremental indexing: tracks file content hashes in SQLite, only re-embeds changed files. Chunking: markdown-aware splitter respecting heading boundaries, 512 token chunks with 64 token overlap)
- SQLite migration V16 amendment: add `vec_embeddings` virtual table via sqlite-vec (`CREATE VIRTUAL TABLE vec_embeddings USING vec0(embedding float[384], entity_id TEXT)`), add `content_hashes` table (file_path TEXT PK, content_hash TEXT, last_indexed TEXT) for incremental indexing
- Tauri commands: `search_hybrid`, `search_keyword`, `search_vector`, `index_vault`, `get_index_status`, `reindex_file`

**Install (Rust):** `fastembed` crate (v5.x), `sqlite-vec` crate (registers C extension with rusqlite)

**Design constraints:**
- *Mana-aware retrieval:* Tier 0 (sigil metadata queries) = 0 mana. Tier 1 (FTS5 + sqlite-vec hybrid) = 1 mana. Tier 2 (deep graph traversal + LLM relevance scoring) = 3 mana
- *RetrievalBackend trait is the upgrade path:* If a project's vault + repo exceeds ~100K vectors, implement `LanceRetrievalBackend` using LanceDB for the vector layer only. FTS5 and graph queries stay in SQLite regardless. The trait boundary makes this a single-crate addition, not a rewrite

**Gate:** sqlite-vec extension loads successfully. Embedding generated for test document via fastembed. Vector inserted and queried with cosine similarity. FTS5 keyword search returns ranked results. Hybrid search fuses both via RRF — result set includes matches from both keyword and semantic. Incremental indexer skips unchanged files. Metadata pre-filter correctly narrows search scope.
**Depends on:** P8-I (Session 8.1 complete — sigils and context assembly ready)
**Push:** Yes
**Notes:** sqlite-vec is a pure-C extension (~1MB) with Rust bindings — zero additional database processes. fastembed uses ONNX Runtime for local inference — the 67MB model downloads once, then fully offline. At vault scale (<50K vectors), brute-force cosine similarity is <100ms. No ANN index needed.

---

### P8-S: Entity Graph + Temporal Edges + Ley Lines

**Goal:** Build the entity/relationship graph in SQLite with temporal validity and bidirectional backlinks (ley lines). This is the data layer that the Knowledge Garden visualizes.

**Files:**
- `src-tauri/src/retrieval/entities.rs` (`EntityStore`: SQLite-backed entity management. Entity schema: `id` (ULID), `name`, `entity_type` (persona/concept/system/domain/file/decision), `domain`, `tags[]`, `metadata_json`, `created_at`, `updated_at`. Entities extracted from vault content during indexing — LLM-assisted entity extraction via dispatch to Scout, or rule-based extraction from YAML frontmatter. Domain clustering: entities grouped by domain tag for garden tree layout)
- `src-tauri/src/retrieval/relationships.rs` (`RelationshipStore`: typed edges between entities. Schema: `id`, `source_id`, `target_id`, `edge_type` (references/caused_by/leads_to/branched_from/supersedes/related_to), `weight`, `context`, `valid_from`, `valid_until`, `created_at`. Temporal edges from MiroFish: superseded decisions have `valid_until` set, never deleted — history preserved. `query_at_time(entity, timestamp)` returns relationships valid at that moment via `WHERE valid_from <= :t AND (valid_until IS NULL OR valid_until > :t)`. Graph traversal via recursive CTEs with cycle detection and max depth)
- `src-tauri/src/retrieval/leylines.rs` (`LeyLineGenerator` from Karpathy backlinks: during vault indexing, scan for cross-references between articles. When article A references article B, create bidirectional relationship edges with `edge_type = 'references'`. Ley line strength derived from reference frequency + recency. Cross-domain ley lines (e.g., auth article referencing frontend pattern) flagged as cross-pollination candidates for garden visualization. Dreamtime ritual regenerates ley lines nightly alongside sigils)
- SQLite migration V16 amendment: add `entities` table (id TEXT PK, name TEXT, entity_type TEXT, domain TEXT, tags TEXT, metadata_json TEXT, created_at TEXT, updated_at TEXT), `relationships` table (id TEXT PK, source_id TEXT FK, target_id TEXT FK, edge_type TEXT, weight REAL, context TEXT, valid_from TEXT, valid_until TEXT, created_at TEXT), indexes on entities(domain), entities(entity_type), relationships(source_id), relationships(target_id), relationships(edge_type)
- Tauri commands: `query_at_time`, `get_entity`, `list_entities`, `get_ley_lines`, `regenerate_ley_lines`, `get_entity_tree`, `walk_relationships`

**Gate:** Entity created with full schema. Relationship filed with temporal bounds. `query_at_time` returns different relationship sets for "Phase 3" vs "now" on mock superseded decision. Ley line generated bidirectionally when article A references article B. Recursive CTE walks 3-hop relationship chain with cycle detection. Domain clustering groups entities correctly for tree layout.
**Depends on:** P8-R (retrieval backend for hybrid search integration)
**Push:** Yes

---

### P8-T: Virtual Filesystem + Persona Vault Pruning

**Goal:** Vault exposes as virtual filesystem backed by SQLite. Each persona sees a different vault tree based on domain and capabilities.

**Files:**
- `src-tauri/src/vault/virtualfs.rs` (`VirtualFs` from ChromaFs + just-bash: familiar navigation (ls/cat/grep analogues) backed by SQLite storage. Path tree from sigils — sigil index files ARE compressed JSON path tree, zero-cost navigation. Lazy content resolution: large artifacts (PDFs, gate reports, full echo ledgers) stored as lightweight pointer entries, materialized only on explicit read at 1 mana cost)
- `src-tauri/src/vault/pruning.rs` (`VaultPruner` from ChromaFs RBAC: per-persona vault tree pruning. Tanaka sees auth + security + compliance. Mara sees frontend + UX + accessibility. Riven sees design system + tokens + components. Pruned content doesn't exist in their tree — not hidden, absent. Pruning rules derived from persona capability families)
- `src-tauri/src/vault/mounts.rs` (`MountComposer` from just-bash: composable filesystem mounts — vault components (skills, ADL, echoes, sigils) independently mountable. Read-only gate dispatch mounts skills + ADL. Dreamtime mounts everything. Mount composition via capability grants from Phase 7)
- Tauri commands: `vault_ls`, `vault_read`, `vault_search`, `get_persona_tree`, `mount_components`

**Gate:** `vault_ls("/")` returns top-level vault structure. `vault_read` resolves lazy pointer to full content. Persona tree for Tanaka excludes frontend files. Persona tree for Mara excludes security files. Mount composition correctly limits gate dispatch to skills + ADL.
**Depends on:** P8-F (sigils for path tree), P8-R (retrieval engine for content search)
**Push:** Yes
**Notes:** The virtual filesystem is the "API" through which agents access vault content. It replaces raw file reads with capability-scoped, mana-tracked access.

---

### P8-U: Knowledge Garden Renderer + Session 8.3 Integration

**Goal:** Replace the basic Canvas 2D graph viewer (Phase 5.3) with a react-three-fiber Knowledge Garden — L-system botanical trees growing from void, timeline scrubber for temporal replay, cross-pollination particles along ley lines, 2D→3D perspective orbit. Wire the retrieval engine into all consumers (Arbiter, Scout, dreamtime, /init, /link).

**Visual reference:** poetengineer (Kat Zhang) Session Garden / Idea Garden. Pure black void. Trees grow upward — trunk is the foundational entity, branches fork at relationship points, colored dots at tips are terminal nodes. Color = domain/tag. Default view is top-down (observatory — dot clusters against void). Orbit/tilt reveals 3D tree depth. Timeline scrubber replays the garden's growth chronologically. Cross-pollination: particles drift between trees along cross-domain ley lines. Tag pill sidebars as legend + filter.

**Files:**
- `apps/desktop/src/components/panels/GraphViewerPanel.tsx` — MAJOR REWRITE: replace Canvas 2D force-directed renderer with react-three-fiber scene. Four graph tabs via tab bar:
  - **Grimoire:** Standard node-link diagram (personas as hub nodes, sub-agents as branches). Simpler 2D layout — clarity over spectacle
  - **Vault (Garden):** L-system botanical tree visualization. Each domain cluster is a tree. Entities are nodes along branches. Color-coded by domain tag. Timeline scrubber for temporal growth replay
  - **Ley Lines:** Same garden layout + cross-pollination particle layer. Particles animate along cross-domain ley line edges showing relationship flow
  - **Scrying:** Orbital/radial layout. Arbiter at center, personas orbiting, intelligence chain activations as animated pulses along chain edges
- `apps/desktop/src/components/panels/hud/garden-layout.ts` — NEW: L-system tree layout algorithm replacing `graph-layout.ts` for garden tabs. Tree generation: recursive branching from root entity (trunk angle/length from entity age/weight, branch forks at relationship points, leaves at terminal nodes). Forest positioning: force-directed repulsion between tree root positions (trees don't overlap), gravity toward center. Timeline animation: progressively reveal nodes by `created_at`, replay growth by advancing the time filter
- `apps/desktop/src/components/panels/hud/garden-scene.tsx` — NEW: Three.js garden scene component. Tree mesh generation (THREE.Line for stems/branches, InstancedMesh for dot nodes — performance at 1K+ nodes). Emissive materials per node type with persona colors from canvas-tokens. `EffectComposer` + `UnrealBloomPass` for selective glow — active/hovered nodes bloom, others stay matte. `OrbitControls` for 2D→3D perspective shift (default top-down, drag to tilt into perspective). Raycasting for hover tooltips + click selection. Cross-pollination particles: small spheres traveling along ley line bezier curves between trees (speed/density proportional to ley line strength)
- `apps/desktop/src/components/panels/hud/garden-detail.tsx` — NEW: React DOM overlay for selected node detail panel. Shows: entity name, type, domain, tags, created date, full content preview, connections (older sibling / newer sibling / references / referenced by). Positioned at right edge of panel, slides in on selection
- `apps/desktop/src/components/panels/hud/tag-sidebar.tsx` — NEW: Tag pill sidebar component. Domain tags as colored pills on left/right margins. Click to filter garden to that domain. Shows entity count per tag. Scrollable when many tags. Colors from PERSONA_COLORS for persona-domain tags, distinct palette for content-domain tags
- Edit `apps/desktop/src/hooks/useGraphData.ts` — REWRITE: replace placeholder data with Tauri bridge calls to retrieval engine. `useGardenData(timeFilter, domainFilter)` queries entities + relationships from SQLite via `get_entity_tree` + `query_at_time`. Returns `GardenTree[]` (each tree = domain cluster with hierarchical node/edge structure). `useLeyLines(domainFilter)` queries cross-domain relationships for particle layer
- Edit `apps/desktop/src/lib/tauri.ts` — add bridge functions: `searchHybrid`, `searchKeyword`, `searchVector`, `indexVault`, `getEntityTree`, `queryAtTime`, `getLeyLines`, `walkRelationships`
- Wire Arbiter (`src-tauri/src/intelligence/arbiter.rs`): replace stub with real hybrid search query (FTS5 for conflict-type keywords + sqlite-vec for semantic similarity on resolution embeddings) for historical conflict lookup
- Wire Scout pre-build recon: include hybrid search for batch-relevant entities before build starts
- Wire dreamtime ritual: regenerate ley lines + re-embed changed vault content alongside sigil regeneration
- Wire `/init` and `/link` flows: auto-index vault via embedding pipeline on vault creation
- `src-tauri/src/lib.rs` — register Session 8.3 modules (`retrieval`, `knowledge` → `retrieval`) and all new Tauri commands

**Install (frontend):** `@react-three/fiber`, `@react-three/drei` (OrbitControls, Line, etc.), `@react-three/postprocessing` (EffectComposer, Bloom), `three`

**Gate — Session 8.3 proof-of-life:**
1. Hybrid search returns ranked results combining keyword + semantic + metadata filtering
2. Entity graph stores entities with temporal relationships, queryable at arbitrary time points
3. Ley lines generated bidirectionally, regenerated by dreamtime
4. Virtual filesystem serves pruned vault trees per persona
5. **Knowledge Garden renders:** domain trees visible in Vault tab, orbit tilts into 3D perspective, timeline scrubber replays growth, tag pills filter by domain, node click opens detail panel
6. **Ley Lines tab:** cross-pollination particles animate along cross-domain edges
7. Arbiter historical query returns results (or empty for new projects)
8. Scout recon includes retrieval context
9. `cargo check` zero errors. `tsc --noEmit` zero errors
**Depends on:** P8-R through P8-T (all 8.3 backend modules), P8-G (ritual system for dreamtime), P8-O (Arbiter for historical queries)
**Push:** Yes (2 pushes — backend wiring first, frontend garden renderer second)
**Notes:** The garden renderer is the single most visually distinctive feature of Forge OS. The observatory aesthetic applies: luminous data against restrained void, energy from particle motion and selective bloom, not saturated color. The existing `graph-layout.ts` physics parameters (repulsion: 4000, rest length: 120, damping: 0.85) inform forest-level tree positioning. Tree-internal layout is hierarchical (L-system), not force-directed.

---

### Session 8.4 — /init + /link Flows + Customer Simulator Generator (4 batches)

**Architectural goal:** Project onboarding — guided wizard for new projects (`/init`) and existing repo connection (`/link`). Both flows render in the Chat panel, configure the full OS stack, and bootstrap the intelligence layer.

**Integration Map patterns (Session 8.4):** /init Platform Orientation, 5-Phase Discovery, Mandatory Security Circle (Excalibur Warden), Ritual Configuration (Excalibur ceremony), Domain Adapter Selection, /link Agent Discovery, Backfill Engine, Data Maturity Dashboard, Customer Simulator Generator, Pretext Detection, PDF Project Brief, Vault Auto-Index (embedding pipeline), Issue-Tracker-as-Dispatch Awareness, Forecast Baseline (TimesFM 32 datapoints).

---

### P8-V: /init Wizard — Platform Orientation + Discovery

**Goal:** The `/init` command starts a guided project creation wizard. First two phases: platform orientation (explains the full system) and discovery (deep interview to understand the project).

**Files:**
- `src-tauri/src/onboarding/mod.rs` (module declaration)
- `src-tauri/src/onboarding/init.rs` (`InitWizard`: 5-phase state machine — Discovery → Architecture → SpecGeneration → BuildPlanning → BuildReady. Each phase emits Chat panel messages via event bus. Platform orientation first: explains personas (10), agents (105), tiered MCPs (4 tiers incl. E2B + Composio), trigger words, commands. Deep interview loop: asks about project goals, stack, team size, deployment targets, compliance requirements. Convergence signal: all critical ambiguities resolved)
- `src-tauri/src/onboarding/discovery.rs` (`DiscoveryEngine`: guided discovery questions — tech stack detection, user roles, business domain, compliance landscape, existing infrastructure. Domain adapter selection during discovery: "What functions will this system support?" Default: development. Future: operations, support, sales. Per-domain signal configuration: which metrics to track, what thresholds trigger recommendations)
- Tauri commands: `start_init`, `advance_init_phase`, `get_init_state`

**Gate:** `/init` triggers Platform Orientation text in Chat panel. Discovery questions adapt based on answers. Domain adapter selection stores choice. State machine tracks progress through phases.
**Depends on:** P8-Q (Session 8.2 complete — dispatch pipeline for agent dispatch during discovery)
**Push:** Yes

---

### P8-W: /init Wizard — Spec + Build Planning + Security + Rituals

**Goal:** Final three phases of `/init`: spec generation (with Pierce review), build planning (batch decomposition), mandatory security circle, and ritual configuration.

**Files:**
- `src-tauri/src/onboarding/spec.rs` (`SpecGenerator`: produces product spec from discovery answers. Dispatches Pierce for spec review. Generates ADL skeleton. Architecture decisions captured as decision traces)
- `src-tauri/src/onboarding/planning.rs` (`BuildPlanner`: decomposes spec into phases → sessions → batches. Generates BATCH-MANIFESTS.md skeleton. Assigns persona gates per batch. Protocol enforcement #3: validates every batch has gate assignments before phase starts)
- `src-tauri/src/onboarding/security.rs` (`SecurityCircle` from Excalibur Warden: mandatory security audit configuration — no project completes `/init` without it. "Configure security audit schedule" — operator sets Tanaka and Wraith dispatch frequency. Default: Tanaka on every gate, Wraith on high-risk surfaces (auth, payments, PII). Option: automated Tanaka dispatch as weekly ritual)
- `src-tauri/src/onboarding/ritual_config.rs` (`RitualConfigurator` from Excalibur ceremony: present three built-in rituals (heartbeat, dreamtime, scrying). Explain purpose and mana cost of each. Operator enables/disables each explicitly. All ship disabled by default)
- Edit `src-tauri/src/onboarding/init.rs` — wire spec, planning, security, ritual phases into wizard state machine

**Gate:** Spec generation produces structured output with Pierce dispatch. Build planner creates phase/session/batch structure. Security circle blocks completion until audit schedule configured. Ritual configurator saves enabled/disabled state per ritual. Full `/init` flow completes from discovery to build-ready.
**Depends on:** P8-V (discovery phase), P8-G (ritual system), P8-O (injection scanning for security)
**Push:** Yes
**Notes:** The security circle is non-negotiable — it's the equivalent of Rule 43 for project setup. No project ships without explicit security audit configuration.

---

### P8-X: /link Command — Agent Discovery + Architecture Report + Backfill

**Goal:** Connect an existing repo. Four agents scan in parallel, produce architecture report, bootstrap intelligence layer from existing history.

**Files:**
- `src-tauri/src/onboarding/link.rs` (`LinkCommand`: dispatches Scout, Kehinde, Mara, Tanaka in parallel for repo discovery. Scout: file structure, tech stack, dependency analysis. Kehinde: architecture patterns, module boundaries. Mara: frontend surfaces, UX patterns, accessibility state. Tanaka: security posture, auth flows, credential handling. Produces unified architecture report. Stack-specific MCP recommendations based on detected stack)
- `src-tauri/src/onboarding/backfill.rs` (`BackfillEngine`: if project has BOOT.md history, parse handoffs into decision traces via `TraceBackfill` (P8-C). Seed signal store with extracted metrics. If 32+ batches of history, note TimesFM calibration readiness for Phase 9. Data maturity dashboard: "Backfilled 57 traces. 47 data points for finding_density (forecasting active). 12 for batch_duration_ms (need 20 more)")
- Edit `src-tauri/src/onboarding/security.rs` — reuse SecurityCircle for `/link` flow
- Edit `src-tauri/src/onboarding/ritual_config.rs` — reuse RitualConfigurator for `/link` flow
- Issue-tracker-as-dispatch awareness: during `/link`, detect connected Linear/GitHub MCPs. If present, configure dispatch surface for issue-originated tasks. Scan for existing issues tagged for automation
- Tauri commands: `start_link`, `get_link_progress`, `get_architecture_report`, `get_backfill_status`

**Gate:** `/link` dispatches 4 agents in parallel. Architecture report combines findings from all 4. Backfill engine parses mock BOOT.md history into traces + signals. Data maturity dashboard reports correct counts. MCP recommendation suggests Preview MCP for React project. Issue-tracker detection finds Linear MCP.
**Depends on:** P8-V (reuses onboarding infrastructure), P8-C (trace backfill), P8-D (signal seeding), P8-R (retrieval engine for auto-indexing)
**Push:** Yes

---

### P8-Y: Customer Simulator Generator + PDF Brief + Pretext Detection

**Goal:** Auto-generate customer simulators from discovered user roles, export PDF project brief, detect customer-facing surfaces for Pretext/CLS evaluation.

**Files:**
- `src-tauri/src/onboarding/simulator.rs` (`CustomerSimGenerator`: Mara auto-generates 3-5 sim-agents from discovered user roles during `/init` or `/link`. Each sim-agent has: persona name, demographic, technical proficiency, goals, frustrations, typical workflows. Sim-agents stored in vault for UX testing dispatches)
- `src-tauri/src/onboarding/brief.rs` (`ProjectBrief`: generates PDF project brief from discovery + architecture + spec. Dual-output: markdown (vault) + PDF (export). Includes: project goals, tech stack, team structure, architecture diagram, build phases, risk assessment, security configuration)
- `src-tauri/src/onboarding/pretext.rs` (`PretextDetector`: when customer-facing surfaces detected, auto-scaffold `layout-engine` package in project repo. Add Pretext/CLS evaluation rules to Mara and Riven persona assignments. Forecast baseline note: "TimesFM needs 32 data points per metric. For new project, forecasting activates after ~32 batches. Z-score fallback until then")
- Tauri commands: `generate_simulators`, `export_project_brief`, `detect_pretext_surfaces`

**Gate:** Sim-agents generated from mock user roles with correct persona fields. PDF brief exports successfully. Pretext detector identifies customer-facing `.tsx` files. Forecast baseline note included in `/init` output.
**Depends on:** P8-V (discovery data), P8-W (spec data), P8-X (architecture report for `/link`)
**Push:** Yes
**Notes:** Customer simulators are Mara's testing counterparts — they represent the actual humans who'll use the product. Pretext detection ensures text-heavy surfaces get proper typography evaluation.

---

### Session 8.5 — Persona Evolution Engine (3 batches)

**Architectural goal:** Personas are not static — they accumulate experience, develop domain expertise, and evolve their cognitive postures over time. This session builds the infrastructure for persona growth and drift detection.

> **Note:** Session 8.5 was added 2026-04-04 (not in original Phase 8 spec). Specifications below derived from BOOT.md expansion notes. Less granular than 8.1-8.4 — may require Scout recon before build.

---

### P8-Z: Persona Experience Accumulation

**Goal:** Track what each persona has seen, done, and learned across all dispatches. Build the data substrate for persona evolution.

**Files:**
- `src-tauri/src/evolution/mod.rs` (module declaration)
- `src-tauri/src/evolution/experience.rs` (`ExperienceTracker`: per-persona experience accumulation — dispatches completed, findings filed by domain, surfaces reviewed, skills used, conflicts participated in, mana efficiency. Stored in SQLite. Queryable: "What has Pierce reviewed in the auth domain?" "How many findings has Mara filed on accessibility?" Experience informs worker scoring (P8-L) — familiarity bonus based on real history, not just role match)
- SQLite migration V23: `persona_experience` table (id INTEGER PK, persona TEXT, dispatch_id TEXT, domain TEXT, surface TEXT, findings_count INTEGER, severity_distribution TEXT, mana_spent REAL, duration_ms INTEGER, timestamp TEXT)
- Tauri commands: `get_persona_experience`, `get_experience_summary`, `get_domain_expertise`

**Gate:** Experience records accumulate from mock dispatches. Summary correctly aggregates by domain. Domain expertise query returns ranked domains per persona.
**Depends on:** P8-Q (dispatch pipeline generates experience data)
**Push:** Yes

---

### P8-AA: Personality Drift Detection + Temporal Relationship Graph

**Goal:** Detect when a persona's behavior drifts from its established patterns. Track how persona relationships evolve over time.

**Files:**
- `src-tauri/src/evolution/drift.rs` (`DriftDetector`: compare current batch findings against historical patterns per persona. Metrics: finding severity distribution shift, domain coverage change, mana efficiency trend, false positive rate (findings marked "pre-existing" or dismissed). Alert when drift exceeds threshold — e.g., Pierce suddenly filing fewer HIGH findings may indicate calibration drift. Z-score based anomaly detection on finding distributions)
- `src-tauri/src/evolution/relationships.rs` (`TemporalRelationshipGraph`: persona relationships evolve based on interaction history. Track: agreement rate between persona pairs on shared surfaces, conflict frequency by domain, complementary coverage patterns. Relationships carry temporal edges — "Pierce and Kehinde agreed on 90% of auth findings in Phase 7, but only 60% in Phase 8" signals domain divergence. Feeds into Arbiter CONSORTIUM weighting)
- Tauri commands: `check_persona_drift`, `get_drift_alerts`, `get_relationship_graph`, `get_relationship_history`

**Gate:** Drift detector flags when mock persona finding distribution shifts significantly. Relationship graph tracks agreement rate between two personas across mock dispatches. Temporal query shows relationship change over time.
**Depends on:** P8-Z (experience data), P8-O (Arbiter uses relationship weighting)
**Push:** Yes

---

### P8-AB: Dream Consolidation Integration + Session 8.5 Gate

**Goal:** Wire persona evolution into the dreamtime ritual. Dreamtime compiles persona experiences into evolution suggestions — proposed updates to INTROSPECTION.md via the Agora proposal system.

**Edits:**
- `src-tauri/src/evolution/consolidation.rs` — NEW: `DreamConsolidator`: during dreamtime ritual, reads accumulated experience + drift alerts + relationship changes. Produces evolution suggestions: "Pierce's auth domain accuracy has improved 15% — consider increasing confidence threshold." "Mara and Riven have 95% agreement on design system surfaces — consider merging their gate dispatch for token-only batches." Suggestions filed as Agora proposals with `source: DreamConsolidation`. Operator approves before any persona identity changes
- Edit `vault/rituals/dreamtime.md` — add persona evolution step to dreamtime ritual spec: after sigil regeneration, before ley line generation, run DreamConsolidator
- `src-tauri/src/lib.rs` — register Session 8.5 modules and Tauri commands

**Gate:** DreamConsolidator produces evolution suggestion from mock experience data. Suggestion filed as Agora proposal. Dreamtime ritual spec includes evolution step. Drift alerts propagated to operator.
**Depends on:** P8-Z, P8-AA (experience + drift data), P8-G (ritual system)
**Push:** Yes

---

### Session 8.6 — Messaging Gateway (2 batches)

**Architectural goal:** Notification layer enabling the OS to reach the operator outside the desktop app. Outbound notifications to messaging platforms. Selective inbound approval for critical decisions.

> **Note:** Session 8.6 was added 2026-04-04 (not in original Phase 8 spec). Specifications below derived from BOOT.md expansion notes.

---

### P8-AC: Messaging Gateway — Outbound Notifications

**Goal:** Send notifications to configured messaging platforms when important events occur — batch completion, gate failures, ritual alerts, critical findings.

**Files:**
- `src-tauri/src/messaging/mod.rs` (module declaration)
- `src-tauri/src/messaging/gateway.rs` (`MessagingGateway`: multi-platform outbound notifications. Platform adapters: Telegram (Bot API), Discord (webhook), Slack (webhook). Notification types enum: `BatchComplete`, `GateFailure`, `RitualAlert`, `CriticalFinding`, `DriftAlert`, `CheckpointReverted`. Rate limiting: max 1 notification per type per 5 minutes. Batching: accumulate low-priority notifications, send digest every 15 minutes. Configuration stored in SQLite)
- `src-tauri/src/messaging/adapters.rs` (Platform adapter trait + Telegram, Discord, Slack implementations. Each adapter: `send(notification: Notification) -> Result<()>`, `test_connection() -> Result<()>`. Markdown formatting per platform)
- SQLite migration V24: `messaging_config` table (id INTEGER PK, platform TEXT, webhook_url TEXT, enabled INTEGER, notification_types TEXT, rate_limit_seconds INTEGER DEFAULT 300), `notification_log` table (id INTEGER PK, notification_type TEXT, platform TEXT, sent_at TEXT, payload_summary TEXT)
- Tauri commands: `configure_messaging`, `test_messaging`, `send_notification`, `get_notification_log`, `update_notification_preferences`

**Gate:** Notification sent to mock webhook endpoint. Rate limiter blocks rapid duplicate. Batching accumulates 3 low-priority notifications into one digest. Configuration persists across restart. V24 applies.
**Depends on:** P8-Q (dispatch pipeline events trigger notifications)
**Push:** Yes
**Notes:** Webhook URLs are the only supported transport initially — no OAuth flows. Telegram Bot API requires a bot token from the operator. All messaging is outbound-first; inbound approval is P8-AD.

---

### P8-AD: Messaging Gateway — Inbound Approval + Phase 8 Gate

**Goal:** Selective inbound approval from messaging platforms for critical decisions. Phase 8 completion validation.

**Files:**
- `src-tauri/src/messaging/inbound.rs` (`InboundApproval`: when ConfirmationRouter (Phase 7.2) produces a confirmation request and operator is not at the desktop, gateway sends approval request to configured messaging platform. Operator replies with approve/reject/defer. Reply parsed and routed back to ConfirmationRouter's oneshot channel. Timeout: 30 minutes — if no response, request deferred to next session. Security: approval messages include one-time token to prevent spoofing)
- Edit `src-tauri/src/dispatch/jsonrpc.rs` — add messaging fallback: if desktop ConfirmationRouter times out (operator away), forward to MessagingGateway for remote approval
- `src-tauri/src/lib.rs` — register all Session 8.6 modules and Tauri commands
- Tauri commands: `get_pending_approvals`, `configure_inbound_approval`

**Gate — Phase 8 completion criteria:**
1. **Vault infrastructure stable:** Watcher detects changes, sigils regenerate, context assembly produces correct tiers
2. **Skills crystallizing:** Auto-crystallization triggers, skill injection works, decomposition proposes splits
3. **Projects onboardable:** `/init` completes full wizard, `/link` produces architecture report with backfill
4. **Dispatch pipeline operational:** Full Scout → Build → Triad → Sentinel flow with worktree isolation
5. **Retrieval engine operational:** Vault indexed via fastembed + sqlite-vec, hybrid search returns relevant results, temporal edges work, Knowledge Garden renders
6. **All ritual specs present:** Heartbeat, dreamtime, scrying — all disabled by default, all loadable
7. **Mana economy tracking:** Balance, Pareto frontier, emanation allocation all functional
8. **Batch checkpoints operational:** Create, revert, list — git tags + SQLite state
9. **Plan mode available:** `/plan` enters read-only exploration mode
10. **Persona evolution engine:** Experience accumulates, drift detects, dreamtime consolidates
11. **Messaging gateway:** Outbound notifications, inbound approval with timeout fallback
12. `cargo check` zero errors. `tsc --noEmit` zero errors. Sentinel clean. Meridian clean.

**Depends on:** P8-AC (outbound gateway), all prior Phase 8 sessions
**Push:** Yes
**Notes:** The inbound approval flow is the first step toward true async operation — the OS can request decisions even when the operator isn't at their desk. The Phase 8 gate is the most comprehensive gate in the build plan — 12 criteria reflecting the breadth of the intelligence foundation.

---

### Phase 8 Persona + Intelligence Gates

| Batch | Gates | Rationale |
|-------|-------|-----------|
| P8-A | Build Triad + Sentinel | Carried risk resolution — systematic edits across ~20 files, regression risk high |
| P8-B | Kehinde + Tanaka | New Rust module architecture — systems design + security (mana economy, network allow-list) |
| P8-C | Kehinde | Data layer — trace schema, FTS5 index design, edge traversal correctness |
| P8-D | Kehinde | Signal extraction — time-series schema, aggregation correctness |
| P8-E | Kehinde | Filesystem operations — watcher reliability, parser correctness, state aggregation |
| P8-F | Kehinde | Context assembly — tier separation, mana accounting, required_artifacts filtering |
| P8-G | Kehinde + Tanaka | Scheduled automation — circuit breaker correctness, capability scoping, mana enforcement |
| P8-H | Build Triad + Sentinel | Skills + provider services — auto-crystallization patterns, network security, provider hot-swap |
| P8-I | Build Triad + Sentinel + Meridian | Session 8.1 exit — full integration, regression, cross-surface consistency |
| P8-J | Kehinde | State machine — transition correctness, persistence, stage resume |
| P8-K | Kehinde + Tanaka | Transport + lifecycle — JSONL integrity, hook security, queue crash recovery |
| P8-L | Kehinde | Dispatch logic — scoring correctness, capability strategy, diff-aware routing |
| P8-M | Kehinde | Handoff + progress — structured data integrity, overlay template isolation |
| P8-N | Kehinde + Tanaka | Audit + chains — confound isolation, chain cycle detection, event subscription security |
| P8-O | Build Triad | Conflict resolution + injection — Arbiter synthesis, trade-off patterns, injection regex coverage |
| P8-P | Kehinde + Tanaka | Safety infrastructure — worktree isolation integrity, checkpoint revert correctness, provider fallback |
| P8-Q | Build Triad + Sentinel + Meridian | Session 8.2 exit — full pipeline integration, regression, cross-surface consistency |
| P8-R | Kehinde + Tanaka | Retrieval engine — sqlite-vec integration, embedding pipeline security, hybrid search correctness |
| P8-S | Kehinde | Knowledge graph — temporal edge correctness, ley line bidirectionality |
| P8-T | Kehinde + Tanaka | Virtual filesystem — RBAC enforcement, mount composition, lazy resolution security |
| P8-U | Build Triad + Sentinel + Meridian + Mara + Riven | Session 8.3 exit — Knowledge Garden visual quality, retrieval integration, cross-surface consistency |
| P8-V | Mara | Wizard UX — discovery flow, question adaptation, progressive disclosure |
| P8-W | Pierce + Tanaka | Spec + security — spec quality review, security circle enforcement, ritual configuration |
| P8-X | Build Triad + Sentinel | /link integration — parallel agent dispatch, backfill correctness, MCP detection |
| P8-Y | Mara + Riven | Customer-facing — simulator quality, PDF output, Pretext detection accuracy |
| P8-Z | Kehinde | Experience tracking — accumulation correctness, domain expertise ranking |
| P8-AA | Kehinde | Drift detection — statistical correctness, relationship graph temporal queries |
| P8-AB | Build Triad + Sentinel | Session 8.5 exit — evolution integration, dreamtime wiring |
| P8-AC | Kehinde + Tanaka | Messaging — webhook security, rate limiting, credential handling |
| P8-AD | Build Triad + Sentinel + Meridian | Phase 8 exit — 12-criteria gate, full regression, cross-surface consistency |

**Gate autonomy notes:**
- Sessions 8.1 and 8.2 are Kehinde-heavy because they're Rust systems architecture. Tanaka gates on any module touching security (network, injection, credentials, capabilities)
- Mara gates on wizard UX (8.4) and customer-facing output (8.4)
- Pierce gates on spec generation quality (8.4)
- Build Triad (Pierce + Kehinde + Mara/Riven) gates at every session exit and at high-risk batches
- Sentinel + Meridian at every session exit for regression and cross-surface consistency

**New ADL decisions expected:**
- **OS-ADL-019**: Mana economy — gradient tiers, Grimoire as single source of truth, Pareto frontier tracking, per-persona execution limits
- **OS-ADL-020**: Echo + Trace dual-layer data model — JSONL echoes for raw fidelity, SQLite traces for structured query, ATIF trajectory format
- **OS-ADL-021**: Ritual system — cron-based scheduling, circuit breaker pattern, mana-bounded execution, disabled by default
- **OS-ADL-022**: Dispatch pipeline — typed stages, formal state machine, worktree isolation, batch checkpoints
- **OS-ADL-023**: Retrieval engine — SQLite-native (sqlite-vec + FTS5 + entity graph), RetrievalBackend trait for upgrade path, hybrid RRF fusion, no external database dependencies
- **OS-ADL-023b**: Virtual filesystem — per-persona RBAC pruning, composable mounts, lazy content resolution
- **OS-ADL-023c**: Knowledge Garden — react-three-fiber L-system botanical visualization (poetengineer reference), 2D→3D orbit, timeline scrubber, cross-pollination particles, observatory aesthetic
- **OS-ADL-024**: Messaging gateway — webhook-based outbound, token-secured inbound approval, timeout fallback
- **OS-ADL-025**: Composable halt conditions — HaltCondition trait with `&`/`|` combinators (AutoGen TerminationCondition pattern). Mana budget is one halt condition, not the only one. TurnLimit, TimeoutHalt, ConflictDetected, ExternalHalt all compose
- **OS-ADL-026**: Context compression — rolling condenser pipeline (OpenHands pattern). Composable chain: ToolResultCondenser → ObservationMaskingCondenser → LLMSummarizingCondenser. Agents can request condensation proactively. Condenser metadata tracks what was forgotten for audit
- **OS-ADL-027**: Dispatch governance — progress ledger (AutoGen MagenticOne) + stuck detection (OpenHands). Per-turn structured assessment with stall detection and auto-replanning. 5 loop patterns detected with per-pattern recovery strategies

**Phase 8 infrastructure totals:**
| Metric | Count |
|--------|-------|
| **Batches** | 30 (P8-A through P8-AD) |
| **Sessions** | 6 (8.1-8.6) |
| **New Rust modules** | ~45 files across adapters/, mana/ (economy, tracker, grimoire, **halt**), echoes/, context_graph/, signals/, vault/, sigils/, context/ (assembly, **condenser**), rituals/, skills/, providers/, recipes/, network/, dispatch/ (pipeline, transport, hooks, composition, scoring, strategy, ancestry, overlay, handoff, progress, **ledger**, audit, response_handler, worktree, checkpoint), intelligence/ (chains, subscriptions, ax_tree, arbiter, tradeoffs, **stuck**), security/, retrieval/ (backend, sqlite_backend, embedder, entities, relationships, leylines), vault/ (virtualfs, pruning, mounts), onboarding/ (init, discovery, spec, planning, security, ritual_config, link, backfill, simulator, brief, pretext), evolution/ (experience, drift, relationships, consolidation), messaging/ (gateway, adapters, inbound) |
| **SQLite migrations** | V16 through V24 (9 migrations) |
| **New Tauri commands** | ~105 (bringing total from 103 to ~208) |
| **New managed states** | ~25 |
| **External dependencies** | `notify` crate (Rust), `fastembed` crate (Rust/ONNX), `sqlite-vec` (C extension), `@react-three/fiber` + `three` (frontend) |

**Deferred to Phase 9:**
- TimesFM forecasting (needs 32+ signal data points — Phase 8 bootstraps the signal store)
- Observatory panel (needs forecast data + signal visualization)
- Prediction confidence calibration
- Signal threshold auto-tuning

**Deferred to Phase 10:**
- ACP transport (Agent Communication Protocol — multi-machine dispatch)
- Terminal transport (CLI-based agent dispatch)
- Full PDF rendering for gate reports (Phase 8 stubs the trigger)

---

## Phase 9-11: To Be Written

Phase 9: Observatory + Predictions + Signal Intelligence (5 sessions)
Phase 10: Platform Integration + External Transports (4 sessions)
Phase 11: Integration Testing + Launch Readiness (2-3 sessions)
