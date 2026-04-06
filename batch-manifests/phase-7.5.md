## Session 7.5: Ecosystem Refinement + Intelligence Retrofit (10 batches)

**Session map:** 7.5 = P7.5-A through P7.5-J
**Prerequisite:** Phase 7 complete. SQLite at V15.
**Repo:** CYM4TIC/forge-OS | **Local:** `.`

> **Restructured 2026-04-05.** Original scope (3 Rust retrofit batches) expanded to 10 batches across two workstreams:
>
> **Workstream 1 — People (B-F):** Ecosystem refinement collapses 42 agents into 14 world-class personas. Research audit maps 182+ mined patterns to personas. 14 professional profiles authored. Design system governance formalized.
>
> **Workstream 2 — Infrastructure (G-J):** Rust retrofits from April 4-5 repo mining. KAIROS scoring improvements, condenser architecture, RRF hybrid search, Three-Space memory partition.
>
> People first, infrastructure second. The team is fully formed and equipped before building the runtime they use.

**Source lineage:** CrewAI, AutoGen, OpenHands, METATRON (April 4 mining). design-md, GitNexus, StixDB, ArsContexta (April 5 mining). Trail of Bits, UI/UX Pro Max, Antigravity, and 10 additional reference sources. elder-plinius G0DM0D3/P4RS3LT0NGV3/L1B3RT4S/ST3GG/GLOSSOPETRAE (embedded attack libraries).
**Decision doc:** `docs/ECOSYSTEM-REFINEMENT.md`
**Architecture doc:** `docs/KNOWLEDGE-LOADING-ARCHITECTURE.md`

---

### P7.5-A: Dispatch Queue Intelligence + Secret Scrubbing

**Goal:** Add composable halt condition trait to the dispatch queue and secret scrubbing to event persistence. The halt trait becomes the foundation Phase 8's mana budget plugs into. Secret scrubbing prevents API keys from persisting to disk.

**Edits:**
- `src-tauri/src/dispatch/halt.rs` — NEW: `HaltCondition` trait with `check(&self, ctx: &DispatchContext) -> Option<HaltReason>` and `reset(&mut self)`. Implement `BitAnd` and `BitOr` for `Box<dyn HaltCondition>` enabling `condition_a & condition_b` and `condition_a | condition_b` composition. Built-in conditions: `TurnLimit { max_turns, current }`, `TimeoutHalt { timeout_secs, started_at }`, `ExternalHalt { signal: Arc<AtomicBool> }`. Phase 8 adds `ManaBudgetExhausted`, `ConflictDetected`. Each condition implements `Serialize`/`Deserialize` for state persistence.
- `src-tauri/src/dispatch/queue.rs` — Add `halt_conditions: Vec<Box<dyn HaltCondition>>` to `DispatchQueue`. On every dequeue, evaluate all conditions. If any fires (OR mode) or all fire (AND mode, if configured), return `HaltReason` instead of the next request. Default: `TurnLimit(100) | TimeoutHalt(600)` — no dispatch runs forever.
- `src-tauri/src/dispatch/mod.rs` — Register `halt` module.
- `src-tauri/src/database/sanitize.rs` — NEW: `SecretScrubber` that scans string fields for known secrets before SQLite persistence. Loads API keys from keychain store, builds a replacement set. `scrub(payload: &str) -> String` replaces each secret with `<secret:key_name>`. Wire into `dispatch_events` INSERT and `mailbox` INSERT — every persisted payload is scrubbed.
- `src-tauri/src/database/queries.rs` — Wire `SecretScrubber::scrub()` before every `dispatch_events` INSERT.
- `src-tauri/src/swarm/mailbox.rs` — Wire `SecretScrubber::scrub()` before every `mailbox` INSERT.

**Gate:** `TurnLimit(3)` fires after 3 dequeues. `TimeoutHalt(1)` fires after 1 second. `TurnLimit(3) | TimeoutHalt(600)` fires when turns exceeded (OR). `TurnLimit(3) & TimeoutHalt(600)` fires only when both exceeded (AND). Secret scrubber replaces test API key with `<secret:test_key>` in dispatch event payload. Scrubbed payload persisted to SQLite. Original key not recoverable from DB.
**Depends on:** Phase 7 complete
**Push:** Yes

---

### P7.5-B: Ecosystem Refinement

**Goal:** Restructure the agent ecosystem from 42 agents into 14 world-class personas. Retire absorbed agents. Consolidate orchestrators. Elevate 4 intelligences to full personas. Clean identity artifacts.

**Source:** `docs/ECOSYSTEM-REFINEMENT.md` (decision doc, 2026-04-05)

**Governance docs to commit (written during planning session, not yet pushed):**
- `docs/ECOSYSTEM-REFINEMENT.md` — Decision doc: 14-persona team, absorptions, orchestrator collapse, sub-agent refinement
- `docs/KNOWLEDGE-LOADING-ARCHITECTURE.md` — Three-layer assembly pipeline (Identity/Context/Reference), self-updating loop, profile format, multi-project knowledge isolation, drift detection

**Actions:**
- Retire 6 absorbed agent files: `agents/chronicle.md`, `agents/scribe.md`, `agents/arbiter.md`, `agents/kiln.md`, `agents/compass.md`, `agents/beacon.md` — move to `agents/_retired/` (preserve, don't delete)
- Retire 6 absorbed kernel files: `forge/kernels/{chronicle,scribe,arbiter,kiln,compass,beacon}-kernel.md` — move to `forge/kernels/_retired/`
- Retire 15 absorbed sub-agent files: sable-voice-consistency, calloway-competitive-scan, meridian-pattern-scan, compass-dependency-map, compass-change-impact, kiln-query-profiler, kiln-bundle-analyzer, beacon-error-watch, beacon-performance-watch, instrumentation-audit, council-contrarian, council-first-principles, council-expansionist, council-outsider, council-executor — move to `agents/sub-agents/_retired/`
- Consolidate 10 orchestrator files → 2: create `agents/gate-dispatcher.md` and `agents/discussion-protocol.md`. Move old orchestrator files to `agents/_retired/`.
- Convert 5 utility agents → commands: seed-generator, test-generator, api-docs, scaffold, changelog → ensure `/seed`, `/test-gen`, `/api-docs`, `/scaffold`, `/changelog` commands handle the work. Move agent files to `agents/_retired/`.
- Create persona directories: `personas/scout/`, `personas/sentinel/`, `personas/wraith/`, `personas/meridian/` — each with minimal `JOURNAL.md` and `RELATIONSHIPS.md` (content populated during future introspection sessions)
- Update `forge/ENTITY-CATALOG.md` — new counts, new structure
- Update `forge/KERNEL-INDEX.md` — 14 persona kernels + 2 dispatcher kernels, fix Riven listing
- Drop "Dr." prefix from all persona files in `personas/*/PERSONALITY.md`, `personas/*/INTROSPECTION.md`, kernel titles, agent file headers
- Catalog `agents/smart-review.md` — absorb routing logic into gate-dispatcher.md, retire smart-review.md

**Gate:** Kehinde (architecture coherence — do all references resolve? do absorbed capabilities appear in their new parent's kernel?)
**Depends on:** P7.5-A
**Push:** Yes
**Notes:** All retirements are moves to `_retired/` directories, not deletions. Nothing is lost. The ecosystem goes from 42 agents + 35 sub-agents to 14 personas + 2 dispatchers + 5 utilities + 20 sub-agents. See `docs/ECOSYSTEM-REFINEMENT.md` for full decision rationale.

---

### P7.5-C: Research Audit

**Goal:** Map all research sources (182+ patterns, 13 reference sources, 5 embedded attack libraries, 5 skills) to the 14 personas. Every research artifact accounted for. Every persona's full professional depth visible.

**Output:** `docs/RESEARCH-PERSONA-MAP.md` — per-persona inventory of all research sources, patterns, references, and skills that feed their profile.

**Sources to audit:**
- 4 synthesis docs: `RESEARCH-SYNTHESIS-2026-04-{02,03}.md`, `research/mining/SYNTHESIS-APRIL5.md`, April 4 mining (CrewAI, AutoGen, OpenHands, METATRON)
- 6 mining reports: `research/{crewai,autogen,openhands}-mining-report.md`, `research/mining/{gitnexus,arscontexta,design-md}-mining-report.md`
- 19 research docs in `docs/RESEARCH-*.md`
- 13 reference sources in `references/*/NOTES.md`
- 5 skills in `.claude/skills/*/SKILL.md`
- Embedded attack libraries in `agents/wraith.md` and `agents/sub-agents/wraith-parseltongue.md`
- Agent files for absorbed capabilities (what methodology from Chronicle, Scribe, Arbiter, Kiln, Compass, Beacon transfers to the absorbing persona)

**Gate:** Pierce (completeness — no research source orphaned, every pattern assigned to at least one persona)
**Depends on:** P7.5-B (audit the refined 14, not the old 42)
**Push:** Yes

---

### P7.5-D.0 through D.9: Guided Profile Sessions — 10 Original Personas

**Goal:** Each persona activates, reads the ecosystem refinement plan and their research audit, has a guided conversation with the operator about their domain expertise, identifies research gaps, and self-authors their professional profile.

**Process per session (4 phases):**

**Phase A — Load context**
1. Activate persona (read kernel + PERSONALITY.md + INTROSPECTION.md)
2. Persona reads `docs/ECOSYSTEM-REFINEMENT.md` + `docs/KNOWLEDGE-LOADING-ARCHITECTURE.md`
3. Persona reads their section of `docs/RESEARCH-PERSONA-MAP.md` (from P7.5-C)
4. Persona reads Repo Mining Targets from their research map section (repos surveyed 2026-04-05)

**Phase B — Guided conversation**
5. Operator-led conversation: what the new structure means for them, their domain expertise, their methodologies, how they think, what they see first
6. Persona identifies gaps — deeper research wells they want mined
7. Operator mines additional research if requested (between sessions or live)

**Phase C — Reference bank (heavy step)**
8. Persona reads source material for each methodology (research docs, mining reports, reference NOTES, synthesis docs — following the research map pointers)
9. Persona self-authors `forge/profiles/{name}-references.md` — full depth Layer 3 knowledge bank. One self-contained section per methodology with anchor IDs. Full reasoning, formulas, decision trees, edge cases, examples. Extracted and rewritten from sources, not copied.

**Phase D — Profile + index (derived from the bank)**
10. Persona self-authors `forge/profiles/{name}-profile.md` — ~50 lines, compresses the reference bank into Layer 1 identity
11. Persona self-authors `forge/profiles/{name}-reference-index.md` — lookup table mapping each profile methodology → bank section → original source file/line range → KAIROS tag
12. Update kernel: add profile + reference index to Reference Index section

**Sessions:**
| Sub-Batch | Persona | Key Focus |
|-----------|---------|-----------|
| P7.5-D.0 | **Nyx** | Build orchestration, scalar cognition, absorbed Chronicle + Scribe |
| P7.5-D.1 | **Pierce** | QA methodology, blast radius, pattern clustering, severity calibration |
| P7.5-D.2 | **Mara** | UX evaluation, moment-of-use, 6-state, seam analysis, accessibility |
| P7.5-D.3 | **Kehinde** | Systems architecture, absorbed Kiln + Compass, database-agnostic expertise |
| P7.5-D.4 | **Tanaka** | Security architecture, trust boundaries, Trail of Bits methodology |
| P7.5-D.5 | **Riven** | Design systems, token architecture, dark-mode intelligence |
| P7.5-D.6 | **Vane** | Financial architecture, payment flows, margin protection |
| P7.5-D.7 | **Voss** | Platform legal, TOS architecture, regulatory foresight |
| P7.5-D.8 | **Calloway** | Growth strategy, adoption velocity, competitive positioning |
| P7.5-D.9 | **Sable** | Brand voice, register consistency, vocabulary transforms |

**Output format — three files per session:**

1. **Reference bank** (`forge/profiles/{name}-references.md`, variable length) — Layer 3 deep knowledge. The actual content behind each methodology. Organized by section with anchor IDs. Each entry is self-contained: full reasoning, formulas, decision trees, edge cases, examples — extracted and rewritten from source material. An agent reads a section of this file when the profile's compressed line isn't enough. **Written first — this is the source of truth the other two files derive from.**

2. **Profile** (`forge/profiles/{name}-profile.md`, ~50 lines) — Layer 1 identity. Loaded every dispatch. Compresses the reference bank.
   - Voice & Posture (2-3 lines)
   - Domain Methodologies (5-8 action-ready protocols with execution detail, includes sub-agent dispatch awareness)
   - Failure Signatures (3-5 domain failure patterns)
   - Quality Signals (3-5 good-vs-great indicators)

3. **Reference index** (`forge/profiles/{name}-reference-index.md`, ~30-50 lines) — Lookup table and KAIROS ingestion manifest. Maps each profile methodology → reference bank section → original source file/line range. Includes a `KAIROS Tag` column (future namespace for sqlite-vec embedding metadata).

   ```
   | Methodology | Bank Section | Original Source | KAIROS Tag |
   |-------------|-------------|-----------------|------------|
   | Blast radius BFS | #impact-analysis | research/mining/gitnexus:45-78 | architecture.impact |
   ```

**Layer relationship:**
- Reference bank is the source of truth (HOW and WHY in full depth)
- Profile compresses it into WHAT to do (always loaded in Layer 1)
- Reference index maps between them and provides KAIROS ingestion path

**Gate:** Each set of files is self-authored by the persona in conversation with the operator. No external gate — the operator IS the gate.
**Depends on:** P7.5-C (research audit provides the source mapping)
**Push:** After each session

---

### P7.5-E: Guided Profile + Introspection Session — Wraith

> **Restructured at P7.5-D.0.** Original E-series was 4 sessions (Scout, Sentinel, Wraith, Meridian).
> Scout, Sentinel, Meridian demoted to Nyx sub-agents — their definitions are authored as part of Nyx's D.0 session.
> Only Wraith remains as a full persona requiring profile + introspection.

**Goal:** Wraith activates, reads the plan, reviews research, has a deep guided conversation with the operator, self-authors professional profile, AND runs a full introspection matrix session to build INTROSPECTION.md. Wraith is being fully formed — profile establishes professional identity, introspection gives cognitive depth.

**Process (6 phases):**

**Phase A — Load context**
1. Activate Wraith (read kernel + agent file — no PERSONALITY.md or INTROSPECTION.md yet)
2. Wraith reads `docs/ECOSYSTEM-REFINEMENT.md` + `docs/KNOWLEDGE-LOADING-ARCHITECTURE.md`
3. Wraith reads their section of `docs/RESEARCH-PERSONA-MAP.md`
4. Wraith reads Repo Mining Targets from research map section

**Phase B — Guided conversation**
5. Operator-led deep conversation: attack methodology, how Wraith thinks, what Wraith sees first
6. Wraith identifies research gaps — operator mines additional sources

**Phase C — Reference bank (heavy step)**
7. Wraith reads source material for each methodology (following research map pointers)
8. Wraith self-authors `forge/profiles/wraith-references.md` — full depth Layer 3 knowledge bank

**Phase D — Profile + index (derived from the bank)**
9. Wraith self-authors `forge/profiles/wraith-profile.md` — ~50 lines, compresses the bank
10. Wraith self-authors `forge/profiles/wraith-reference-index.md` — lookup table + KAIROS manifest

**Phase E — Introspection (operator-guided)**
11. Introspection matrix session: cognitive lens, default assumptions, blind spots, value hierarchy, decision heuristics, emotional register, failure modes
12. Wraith self-authors `personas/wraith/INTROSPECTION.md`
13. Wraith self-authors `personas/wraith/PERSONALITY.md`

**Phase F — Kernel update**
14. Update kernel: add profile + reference index to Reference Index section

**Gate:** No external gate — operator-guided deep session. The operator IS the gate.
**Depends on:** P7.5-D (calibrate from original persona profiles)
**Push:** After session
**Notes:** Wraith's voice is l33tspeak throughout all authored files. Wraith's banger-mode sub-agent ("bang on it until it breaks") is defined during this session.

---

### P7.5-F: Design System Governance + Persona Return Hints + Build Learnings Integration

**Goal:** Create Forge OS DESIGN.md using the 9-section format. Add next-step hints to persona dispatch returns. Log all mining findings to BUILD-LEARNINGS. This batch is governance + documentation — no Rust code, all markdown.

**Source:** design-md (9-section format), GitNexus Pattern 8 (next-step hints), ArsContexta (6 conflation failures)

**Files:**
- `docs/DESIGN.md` — NEW: Forge OS design system in 9-section format: (1) Visual Theme (alchemical arcade mystical neon rave), (2) Color Palette (persona-colored accents on near-black canvas, luminance stacking), (3) Typography (three-font system, weight cap 500-600, negative tracking at display), (4) Component Stylings (glow effects, border-as-depth, pill/sharp radius binary), (5) Layout Principles (8px base, 48-96px section rhythm), (6) Depth & Elevation (rgba white overlays 0.02/0.04/0.05, zero shadows), (7) Do's and Don'ts (consolidated from 9 dark-native systems), (8) Responsive Behavior (touch targets, breakpoints), (9) Agent Prompt Guide (persona color reference, component prompts, foundation rules).
- Persona dispatch return format — Add `suggested_next:` field to all 14 persona dispatch returns. After each task, persona appends recommended next action based on what was found.
- `forge/EXECUTION-PROTOCOL.md` — Add `suggested_next:` to persona return schema.
- `BUILD-LEARNINGS.md` — Add entries for: Three-Space conflation failures (6 anti-patterns), dark-mode Do's/Don'ts (10 each), RRF constants (K=60), consolidation threshold (0.88), exponential decay formula, touch-boost formula, key StixDB constants table.

**Gate:** Mara + Sable + Riven (design system governance + voice + persona return format)
**Depends on:** P7.5-E (profiles establish persona voices that inform DESIGN.md authoring)
**Push:** Yes

---

### P7.5-G: Finding Deduplication + Compaction Condenser Architecture

**Goal:** Add finding similarity detection to prevent duplicate findings. Add the `Condenser` trait to the compaction system so Phase 8's full condenser pipeline inherits the architecture.

**Edits:**
- `src-tauri/src/build_state/findings.rs` — Add `find_similar(conn, description, threshold) -> Option<Finding>` function. Uses FTS5 `MATCH` on finding descriptions to detect >80% overlap with existing open findings. When `add_finding()` is called, check for similar first. If found, return `FindingDuplicate { existing_id, similarity }` instead of creating a new row. Caller decides: link as instance of existing finding, or override to create anyway.
- `src-tauri/src/build_state/findings.rs` — Add `cluster_by_pattern(conn) -> Vec<FindingCluster>` function. Groups open findings by FTS5 similarity. Each cluster: `{ root_finding_id, instance_count, common_pattern, suggested_severity }`. Systemic escalation: 3+ instances of same LOW pattern → cluster severity MED. 3+ MEDs → cluster severity HIGH.
- `src-tauri/src/compact/condenser.rs` — NEW: `Condenser` trait: `fn should_condense(&self, usage: &ThresholdStatus) -> bool` and `fn condense(&self, messages: &[Message]) -> CondensationResult`. `CondensationResult` enum: `View(Vec<Message>)` (trimmed messages) | `Condensation { summary, forgotten_ids }` (compression signal). `CondenserPipeline` chains condensers — first to return `Condensation` triggers compression.
- `src-tauri/src/compact/condenser.rs` — Implement `TtlCondenser` (wraps existing TTL logic from `ttl.rs` as a Condenser). Implement `ThresholdCondenser` (wraps existing threshold logic as a Condenser).
- `src-tauri/src/compact/mod.rs` — Add `pub mod condenser;`. Wire `CondenserPipeline` into `CompactionEngine` as the new evaluation path. Existing TTL + threshold logic now runs through the pipeline. Behavior is identical — this is a refactor into the trait, not a behavior change. Phase 8 adds `ObservationMaskingCondenser` and `LLMSummarizingCondenser` to the pipeline.

**Gate:** `find_similar` detects duplicate finding (>80% FTS5 match). `cluster_by_pattern` groups 3 similar findings into one cluster with escalated severity. `CondenserPipeline` with `TtlCondenser` + `ThresholdCondenser` produces identical compaction behavior to pre-refactor. Pipeline correctly short-circuits on first `Condensation` result.
**Depends on:** P7.5-A
**Push:** Yes

---

### P7.5-H: KAIROS Composite Scoring + Swarm Event Triggers + Session Integration

**Goal:** Add composite scoring to memory recall. Add event-driven trigger subscriptions to the swarm mailbox. Wire everything together and verify.

**Edits:**
- `src-tauri/src/memory/engine.rs` — Add `composite_score(recency_days, importance, fts5_rank) -> f64` function. Formula: `semantic_weight * fts5_rank + recency_weight * decay + importance_weight * importance` where `decay = 0.5^(age_days / half_life_days)`. Default weights: semantic=0.5, recency=0.3, importance=0.2. Half-life: 30 days. Wire into `query_memory()` — results sorted by composite score instead of raw FTS5 rank.
- `src-tauri/src/memory/dream.rs` — Add composite scoring to topic consolidation. When merging daily logs into topics, weight by composite score. Higher-scored entries contribute more to topic content. Low-scored entries (>90 days, low importance) flagged for pruning.
- `src-tauri/src/swarm/triggers.rs` — NEW: `TriggerSubscription` struct: `{ subscriber_agent, event_pattern, conditions_json, enabled }`. `TriggerRegistry` with `subscribe(agent, pattern, conditions)` and `evaluate(event) -> Vec<agent_slug>`. Event patterns: `finding.critical`, `finding.high`, `dispatch.completed`, `dispatch.failed`, `scan.regression`. Conditions: JSON filter (e.g., `{"domain": "auth"}` only fires for auth-domain findings). Registry persists to SQLite.
- SQLite migration V15b: `trigger_subscriptions` table (id TEXT PK, subscriber_agent TEXT, event_pattern TEXT, conditions_json TEXT, enabled INTEGER DEFAULT 1, created_at TEXT).
- `src-tauri/src/swarm/mailbox.rs` — After `send_message()`, evaluate `TriggerRegistry` against the message type+payload. If any subscriptions match, queue the subscriber agent for dispatch via `DispatchQueue`.
- `src-tauri/src/commands/triggers.rs` — NEW: Tauri commands `subscribe_trigger`, `list_triggers`, `remove_trigger`.
- `src-tauri/src/lib.rs` — Register new modules: `dispatch::halt`, `database::sanitize`, `compact::condenser`, `swarm::triggers`, `commands::triggers`. Register new Tauri commands.

**Gate — Session 7.5 Rust proof-of-life:**
1. Composite scoring: memory recall returns results ordered by composite score. 90-day-old entry ranks below 1-day-old entry with same FTS5 match.
2. Finding deduplication: adding a near-duplicate finding returns `FindingDuplicate` with existing ID.
3. Finding clustering: 3 similar findings cluster with escalated severity.
4. Condenser pipeline: `TtlCondenser | ThresholdCondenser` pipeline produces identical output to pre-refactor compaction.
5. Halt conditions: dispatch queue stops on `TurnLimit | TimeoutHalt`.
6. Secret scrubbing: API key in dispatch payload scrubbed before SQLite persistence.
7. Trigger subscriptions: `finding.critical` trigger fires and queues subscriber agent.
8. `cargo check` zero errors. `tsc --noEmit` zero errors.

**Depends on:** P7.5-A, P7.5-G
**Push:** Yes

---

### P7.5-I: KAIROS Scoring Retrofit — Exponential Decay + Touch-Boost + Access Frequency

**Goal:** Replace linear memory decay with exponential half-life formula. Add touch-boost on access. Add hybrid LRU+LFU access frequency signal to composite scoring.

**Source:** StixDB Patterns 1-3 (exponential decay, touch-boost, hybrid LRU+LFU)

**Edits:**
- `src-tauri/src/memory/engine.rs` — Replace `composite_score()` decay calculation from linear to exponential: `importance * 2.0_f64.powf(-(elapsed_hours / 48.0))`. Half-life configurable per-persona (default 48h). Add `access_count` and `last_accessed` tracking. Add access frequency signal: `freq_score = min(1.0, recent_24h_accesses / 10.0)`, `recency_score = 2^(-elapsed_hours / 12.0)`, `access_score = 0.6 * freq_score + 0.4 * recency_score`. New composite: `0.4 * semantic + 0.3 * access_score + 0.2 * importance + 0.1 * decay`.
- `src-tauri/src/memory/engine.rs` — Add `touch_memory(conn, memory_id)` function called on every retrieval: `access_count += 1`, `last_accessed = now()`, `decay_score = min(1.0, decay_score * 1.2 + 0.1)`.
- SQLite migration V15c: ALTER `memories` table — add `access_count INTEGER DEFAULT 0`, `last_accessed TEXT`, `decay_score REAL DEFAULT 1.0`, `decay_half_life_hours REAL DEFAULT 48.0`.

**Gate:** 90-day-old memory with 0 accesses scores lower than 1-day-old memory with same semantic match. Touching a decayed memory (decay=0.1) boosts to ≥0.22. Frequently accessed memory (10+ in 24h) outranks infrequent memory with same semantic score. `cargo check` clean.
**Depends on:** P7.5-H (builds on composite scoring)
**Push:** Yes

---

### P7.5-J: RRF Hybrid Search + Three-Space Memory Partition + Consolidation Merge

**Goal:** Add Reciprocal Rank Fusion to merge FTS5 + sqlite-vec results. Add `space` column enforcing Three-Space memory partition (kernel/garden/ops). Add similarity-based consolidation merge to condenser pipeline.

**Source:** GitNexus Pattern 1 (RRF), ArsContexta Pattern 2 (Three-Space), StixDB Pattern 5 (consolidation)

**Edits:**
- `src-tauri/src/memory/engine.rs` — Add `rrf_merge(fts5_results, vec_results, k: u32) -> Vec<ScoredMemory>` function. Algorithm: for each result, score = `1.0 / (k + rank)` where k=60. Sum scores per memory_id across both result sets. Sort by combined score descending. Dedup by memory_id. Wire into `query_memory()` — run FTS5 and sqlite-vec in parallel, merge with RRF, then apply touch-boost on returned results.
- `src-tauri/src/memory/engine.rs` — Add `space` enforcement: `MemorySpace` enum with `Kernel`, `Garden`, `Ops`. Routing decision tree: agent identity/methodology/goals → Kernel (full load at boot, slow growth). Composable domain knowledge → Garden (progressive disclosure, steady growth). Operational coordination/session state → Ops (targeted access, fluctuating). Query functions accept optional `space` filter. Cross-space queries explicitly requested (not default).
- SQLite migration V15c (same as P7.5-I): ALTER `memories` — add `space TEXT DEFAULT 'garden' CHECK(space IN ('kernel', 'garden', 'ops'))`.
- `src-tauri/src/compact/condenser.rs` — Add `SimilarityCondenser` implementing `Condenser` trait. Scans memory pairs using sqlite-vec cosine similarity. Pairs above 0.88 threshold: merge embeddings (average + normalize), set importance = `max(a, b) * 0.95`, archive parents with `lineage_summary_id` pointing to merged node. Add to `CondenserPipeline` after existing condensers.

**Gate:** RRF fusion returns results mixing FTS5 and vector hits. Memory with high FTS5 rank but low vector rank still surfaces if RRF combined score is top-N. Memories created with explicit `space` filter correctly. Cross-space query returns all spaces. Consolidation merges two 0.90-similarity memories into one summary node with preserved importance. `cargo check` clean.
**Depends on:** P7.5-I (scoring must be in place)
**Push:** Yes

---

### Session 7.5 Persona Gates

| Batch | Gates | Rationale |
|-------|-------|-----------|
| P7.5-A | Kehinde + Tanaka | Dispatch queue architecture + secret scrubbing security |
| P7.5-B | Kehinde | Architecture coherence — all references resolve after restructuring |
| P7.5-C | Pierce | Completeness — no research source orphaned |
| P7.5-D.0–D.9 | Operator (guided sessions — the operator IS the gate) | Self-authored profiles + Nyx sub-agent defs |
| P7.5-E | Operator (guided deep session — profile + introspection) | Wraith profile + introspection + banger-mode def |
| P7.5-F | Mara + Sable + Riven | Design system governance + voice + persona return format |
| P7.5-G | Kehinde + Pierce | Finding deduplication correctness + condenser architecture |
| P7.5-H | Kehinde + Pierce + Sentinel | Full Rust integration — regression risk from touching 6 existing modules |
| P7.5-I | Kehinde + Pierce | Scoring formula correctness + migration safety |
| P7.5-J | Kehinde + Pierce + Sentinel | RRF integration + schema migration + condenser merge correctness |

### Session 7.5 Infrastructure Totals

| Metric | Count |
|--------|-------|
| **Batches** | 10 (P7.5-A through P7.5-J) |
| **Workstream 1 (People, B-F)** | Ecosystem refinement (B), research audit (C), 10 guided profile sessions (D.0–D.9), 4 deep profile+introspection sessions (E.0–E.3), design governance (F) |
| **Workstream 2 (Rust, G-J)** | 4 batches: finding dedup, composite scoring + triggers, decay + touch-boost, RRF + Three-Space + consolidation |
| **Agent files retired** | ~27 (6 agents + 6 kernels + 15 sub-agents → `_retired/` dirs) |
| **New profile files** | 14 (forge/profiles/*.md — 14 personas, equal depth) |
| **New doc files** | 4 (ECOSYSTEM-REFINEMENT.md, RESEARCH-PERSONA-MAP.md, DESIGN.md, KNOWLEDGE-LOADING-ARCHITECTURE.md already committed) |
| **New Rust files** | 4 (halt.rs, sanitize.rs, condenser.rs, triggers.rs) |
| **Edited Rust files** | 9 (queue.rs, queries.rs, mailbox.rs, findings.rs, engine.rs, dream.rs, lib.rs, condenser.rs, compact/mod.rs) |
| **SQLite migrations** | V15b (trigger_subscriptions), V15c (memory scoring + space columns) |
| **New Tauri commands** | 3 (subscribe_trigger, list_triggers, remove_trigger) |
| **Source repos** | 22 repos mined (182+ patterns), 13 reference sources, 5 embedded attack libraries, 5 skills |

---
