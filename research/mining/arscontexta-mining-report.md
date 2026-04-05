# Ars Contexta Mining Report

**Repository:** github.com/agenticnotetaking/arscontexta
**Mined:** 2026-04-05
**Files read:** 20+ source files across skills/, skill-sources/, reference/, generators/, agents/, platforms/, hooks/
**Verdict:** EXTREMELY HIGH RELEVANCE -- deepest agent-native cognitive architecture found to date

---

## Executive Summary

Ars Contexta is a Claude Code plugin that generates individualized knowledge systems from conversation. It implements a **derivation engine** that extracts signals from natural language, maps them to confidence-weighted configuration dimensions, validates coherence through cascade constraints, and generates a complete agent-native cognitive architecture. The patterns here are directly applicable to Forge OS kernel derivation, multi-agent dispatch, memory partitioning, and skill routing.

**Key steal targets for Forge OS:**
1. Signal-to-Dimension Derivation with confidence scoring
2. Three-Space Content Routing (identity/knowledge/operations)
3. Dimension Cascade Constraints (forcing functions between capabilities)
4. Ralph Subagent Spawning with mandatory context isolation
5. Three-Tier Query Classification (WHY/HOW/WHAT)
6. Session Lifecycle (Orient/Work/Persist)
7. Condition-Based Maintenance Triggers (replace time-based scheduling)
8. 10 Documented Failure Modes with prevention patterns
9. Vocabulary Transform System (domain-native terminology)
10. 15-Primitive Kernel Validation (invariant architectural guarantees)

---

## PATTERN 1: Signal-to-Dimension Derivation Engine

**Source:** `skills/setup/SKILL.md` (the core derivation engine)
**Forge OS mapping:** Kernel configuration, persona calibration, capability profiling

### Architecture

The engine extracts conversational signals PASSIVELY -- it never asks about dimensions directly. Users describe their world; the engine listens for patterns that indicate architectural needs.

### Eight Configuration Dimensions

| Dimension | Positions | Description |
|-----------|-----------|-------------|
| **Granularity** | Atomic / Moderate / Coarse | Size of knowledge units |
| **Organization** | Flat / Hierarchical | Structure topology |
| **Linking** | Explicit / Implicit / Both | Connection strategy |
| **Processing** | Light / Moderate / Heavy | Pipeline depth |
| **Navigation** | 2-tier / 3-tier | Discovery hierarchy depth |
| **Maintenance** | Condition-based (fixed) | Review trigger strategy |
| **Schema** | Minimal / Moderate / Dense | Metadata richness |
| **Automation** | Manual / Convention / Full | Degree of autonomous operation |

### Confidence Scoring Framework

```
HIGH   (1.0) -- Explicit domain language with concrete examples
MEDIUM (0.6) -- Implicit tone, general preferences, domain defaults
LOW    (0.3) -- Ambiguous phrasing, single mentions, contradictions
INFERRED (0.2) -- Cascaded from resolved dimensions, not directly stated
```

**Resolution threshold:** Dimension becomes "resolved" when cumulative confidence >= 1.5

**Completeness detection conditions:**
- All 8 resolved (confidence >= 1.5 each) -> proceed immediately
- 6+ resolved, 2 tentative (>= 0.6) -> proceed with cascade filling
- After 4 conversation turns -> proceed regardless, use preset defaults
- User signals impatience -> use domain defaults for all unresolved

### Conflict Resolution Decision Tree

1. Is one signal EXPLICIT and other IMPLICIT? -> Explicit wins
2. Both same confidence? -> Later in conversation wins; more SPECIFIC wins
3. USER SIGNAL vs DOMAIN DEFAULT? -> User signal always wins
4. USER SIGNAL vs CASCADE PRESSURE? -> User signal wins, but log warning

### Anti-Signal Detection

The engine identifies misleading patterns:
- Requesting "Zettelkasten" may indicate label preference, not actual atomic discipline
- "AI should handle organizing" may signal outsourcing anxiety, not automation readiness
- Vocabulary-signaling vs actual behavioral intent must be distinguished

### Forge OS Application

**Steal for:** Kernel calibration during persona onboarding. When an operator describes their project, extract signals mapping to capability dimensions (concurrency tolerance, memory depth, creativity vs rigor, autonomy level, domain expertise). Use the same confidence-weighted resolution with cascade filling.

**Data structure to adopt:**
```
Signal -> Dimension -> Position -> Confidence
Cumulative confidence per dimension -> Resolution threshold
Unresolved dimensions -> Cascade pressure or preset defaults
```

---

## PATTERN 2: Three-Space Content Routing

**Source:** `reference/three-spaces.md`
**Forge OS mapping:** Memory partitioning between kernel state, knowledge garden, and operational workspace

### The Three Spaces

| Space | Purpose | Growth | Load Pattern |
|-------|---------|--------|-------------|
| **self/** | Agent persistent mind -- identity, methodology, goals | Slow (tens of files) | Full load at session start |
| **notes/** | Knowledge graph -- composable domain knowledge | Steady (10-50/week) | Progressive disclosure via MOC, search, traversal |
| **ops/** | Operational coordination -- queue state, sessions | Fluctuating | Targeted access (queue, today's log) |

### Content Routing Decision Tree

```
Agent self-knowledge?
  YES + Durable? -> self/ (identity, methodology, goals, memory)
  YES + Temporal? -> ops/ (session log, processing state)
  NO: Domain knowledge?
    YES + Durable/Composable? -> notes/ (atomic note with schema)
    YES + Temporal? -> ops/ (observation, friction log)
                       May promote later if persistent
    NO: Operational coordination? -> ops/ (queue, health, handoff)
```

### Six Documented Conflation Failures

| # | Conflation | Consequence |
|---|-----------|-------------|
| 1 | **Ops into Notes** | Search returns processing debris; inflated note counts; noisy MOCs; knowledge graph polluted with temporal content |
| 2 | **Self into Notes** | Schema confusion; search pollution; agent content obscures domain knowledge |
| 3 | **Notes into Ops** | Knowledge lost at purge; insights cannot be linked; vault appears thinner than work invested |
| 4 | **Self into Ops** | Orientation fails; identity drifts; no authoritative self-model |
| 5 | **Ops into Self** | Self/ bloats beyond session-load capacity; temporal noise in orientation |
| 6 | **Notes into Self** | Self/ bloats; domain knowledge does not scale in self/; boundary between agent and domain collapses |

### One-Directional Promotion Rule

Content moves from temporal to durable, NEVER reverse:
```
ops/observations/ -> notes/     (when observation proves durable)
ops/observations/ -> self/methodology.md  (when about agent operation)
ops/sessions/ -> self/memory/   (when session insight personally significant)
```

### Forge OS Application

**Steal for:** Direct mapping to Forge OS memory architecture:
- `self/` -> **Kernel state** (persona identity, methodology, goals per persona)
- `notes/` -> **Knowledge Garden** (SQLite-vec + FTS5 composable knowledge)
- `ops/` -> **Operational workspace** (task queues, session logs, batch state)

The six conflation failures are EXACTLY the failure modes to guard against in Forge OS memory partitioning. The routing decision tree can be adapted as a dispatch rule for the memory subsystem.

---

## PATTERN 3: Dimension Cascade Constraints

**Source:** `reference/interaction-constraints.md`
**Forge OS mapping:** Capability dependency graph, persona configuration validation

### Architecture

8 dimensions with 3 positions each = 6,561 theoretical combinations, but cascade constraints eliminate incoherent states. Choosing one capability position forces or pressures others.

### Primary Cascades

**Granularity Cascade (strongest coupling):**
- Atomic granularity -> forces explicit linking -> deep navigation -> heavy processing -> semantic search
- Coarse granularity -> permits lightweight linking -> shallow navigation -> light processing
- INCOHERENT: atomic + 2-tier navigation, atomic + light processing, coarse + heavy processing

**Automation Cascade:**
- Full automation -> forces dense schemas -> heavy processing -> condition-based maintenance
- Manual operation -> pressures minimal schemas -> light processing -> lax maintenance
- INCOHERENT: manual + dense schema, manual + heavy processing without pipelines

**Volume Cascade:**
- High volume (>200 notes) -> requires deep navigation -> semantic search -> automated maintenance
- Low volume (<50 notes) -> permits shallow navigation -> keyword search -> manual maintenance

### Constraint Classification

**Hard Constraints (BLOCK generation):**
1. Atomic + 2-tier navigation + volume > 100 -> "navigational vertigo"
2. Full automation + no platform support -> platform cannot deliver
3. Heavy processing + manual automation + no pipeline skills -> unsustainable

**Soft Constraints (WARN, auto-adjust cascaded dimensions):**
1. Atomic + light processing -> leaves notes disconnected
2. Dense schema + convention-only automation -> maintenance burden
3. Explicit+implicit linking + no semantic search -> degraded discovery
4. Volume > 200 + disabled maintenance conditions -> drift risk
5. Coarse + heavy processing -> diminishing returns

**Compensating Mechanisms (when soft violations remain):**

| Mismatch | Mechanism | Effectiveness |
|----------|-----------|---------------|
| Atomic + medium processing | Semantic search compensates | Moderate |
| Dense schema + convention | Strong templates reduce burden | Moderate |
| High volume + shallow nav | Semantic search enables discovery | Moderate |
| Manual + moderate processing | Batch sessions | Low |

### Constraint Format

```
[dimension_A == position] + [dimension_B == position] + [optional_volume_condition]
-> HARD (blocks) or SOFT (warns with compensating mechanism)
```

Cascaded values carry INFERRED confidence (0.2) -- user signals ALWAYS override cascade pressure.

### Forge OS Application

**Steal for:** Persona capability validation. When configuring a kernel (e.g., Kehinde for systems architecture), validate that chosen capabilities are coherent. A persona with "deep analysis" capability but "minimal context loading" is an incoherent state. Build a constraint graph:
```
capability_A.position -> forces/pressures capability_B.position
hard_constraint: [A.pos + B.pos] -> BLOCK with explanation
soft_constraint: [A.pos + B.pos] -> WARN + compensating_mechanism
```

---

## PATTERN 4: Ralph Subagent Spawning with Context Isolation

**Source:** `platforms/shared/skill-blocks/ralph.md`, `skill-sources/ralph/SKILL.md`
**Forge OS mapping:** Multi-agent dispatch, batch orchestration, persona task delegation

### Core Architecture

Ralph is a PURE ORCHESTRATOR that never executes work inline. Every task MUST be processed via subagent spawning (Task tool). The lead session reads queue state, spawns workers, evaluates returns, and advances pipeline state.

### Mandatory Rules

1. **Every task processed via Task tool** -- inline execution is a process violation
2. **One phase per subagent** -- create, reflect, reweave, verify are separate spawns
3. **Fresh context per phase** -- prevents context contamination and attention degradation
4. **Subagent count MUST equal task count** -- mismatch indicates inline execution (violation)

### Spawning Protocol

```
1. Read task metadata from queue entry
2. Construct phase-specific prompt:
   - Task ID, metadata, file path
   - Phase-specific skill reference (/reduce --handoff, /reflect --handoff)
   - Sibling awareness (titles of co-batch claims for linking)
   - "ONE PHASE ONLY" constraint
3. Call Task tool with prompt
4. Parse RALPH HANDOFF block from return:
   - Work Done (completion status)
   - Learnings (friction, surprises, methodology insights)
   - Queue Updates (state changes)
5. Advance queue state (next phase or mark done)
```

### Serial vs Parallel Mode

**Serial (default):**
- Process tasks sequentially, one per iteration
- Re-filter queue after each phase advancement
- After batch completion (all tasks done), run cross-connect validation

**Parallel (--parallel flag):**
- Phase A: Spawn up to 5 concurrent workers (each processes full claim pipeline)
- Workers receive sibling awareness for proactive linking
- Phase B: After ALL workers complete, spawn ONE validation subagent for gap detection
- Phase A and B cannot overlap

### Cross-Connect Validation

Triggered when batch completes with 2+ claims:
- Lists all created notes from batch
- Validates sibling connections exist between batch notes
- Adds missed links (worker's reflect may have run before sibling notes existed)
- Reports gaps via RALPH HANDOFF block

### Queue Data Structure

```yaml
phase_order:
  claim: [create, reflect, reweave, verify]
  enrichment: [enrich, reflect, reweave, verify]

tasks:
  - id: "claim-001"
    type: claim
    status: pending    # pending | done
    current_phase: create
    completed_phases: []
    file: "source-001.md"
    target: "human-readable description"
    batch: "source-batch-1"
```

### Error Recovery

- Subagent crash: task remains pending at failed phase; rerun auto-picks it up
- Queue corruption: report and stop (no auto-fix)
- Empty queue: "Use /seed or /pipeline to add sources"
- Handoff missing: log warning, continue
- All tasks blocked: report blocking reasons + remediation

### Forge OS Application

**Steal for:** This is the EXACT pattern for Forge OS batch dispatch. Adapt Ralph as the orchestrator kernel pattern:
- Nyx (or conductor persona) reads task queue, spawns persona-specific workers
- Each persona gets fresh context with task-specific prompt
- Handoff protocol returns structured results for orchestrator to parse
- Cross-connect validation ensures batch coherence
- Queue state tracks multi-phase pipelines (design -> implement -> test -> review)

The "subagent count MUST equal task count" verification is a critical integrity check to adopt.

---

## PATTERN 5: Three-Tier Query Classification (WHY/HOW/WHAT)

**Source:** `skills/ask/SKILL.md`
**Forge OS mapping:** Knowledge retrieval routing, query dispatch

### Classification Dimensions

| Type | Description | Routes To | Search Strategy |
|------|-------------|-----------|-----------------|
| **WHY** | Theoretical foundations, reasoning, trade-offs | Research Graph (Tier 1) | Deep semantic search with LLM reranking |
| **HOW** | Operational procedures, workflows | Guidance Docs (Tier 2) | Keyword matching with semantic fallback |
| **WHAT** | Domain applications, examples | Domain Examples (Tier 3) | Vector semantic search |
| **COMPARE** | Trade-off analysis | Research + Examples | Multi-tier |
| **DIAGNOSE** | System failures | Guidance + Failure-Modes | Multi-tier |
| **CONFIGURE** | Dimension settings | References + Research | Multi-tier |
| **EVOLVE** | System changes | Evolution Lifecycle + Guidance | Multi-tier |

### Routing Algorithm

1. **Route via Claim-Map** -- read routing index first to identify relevant topic areas
2. **Primary tier search** -- use tier-specific search strategy (deep_search for WHY, keyword for HOW, vector for WHAT)
3. **Secondary tier consultation** -- most questions benefit from supplementary tiers
4. **Deep reading** -- read 3-7 sources fully, follow wiki links +1 hop
5. **User context integration** -- apply derivation config and vocabulary transforms
6. **Local methodology check** -- read system-specific learnings that may supersede research

### Knowledge Base Architecture (Three Tiers)

**Tier 1: Research Graph (213 claims)**
- Cognitive science foundations
- System design dimensions with trade-off spectrums
- Failure modes and anti-patterns
- Agent-specific constraints
- Confidence levels: speculative -> emerging -> supported -> established

**Tier 2: Guidance Docs (9 operational documents)**
- Schema enforcement, pipeline philosophy, MOC methodology
- Maintenance triggers, memory architecture, vocabulary transforms

**Tier 3: Domain Examples (12 compositions)**
- Research vaults, personal assistants, project management, creative systems, etc.

### Answer Synthesis Structure

1. Direct answer (state it first, no search process narration)
2. Research backing (cite specific claims)
3. Practical implications (domain vocabulary)
4. Tensions/caveats (honest conflicts)
5. Further exploration (related topics)
6. Source accounting (which layers informed answer)

### Forge OS Application

**Steal for:** Knowledge Garden query routing. When a persona queries the knowledge base:
- WHY queries -> deep semantic search over research/theory nodes
- HOW queries -> keyword search over procedural/operational nodes
- WHAT queries -> vector search over example/instance nodes
- Confidence-weighted results with source attribution
- Multi-tier consultation for complex queries

---

## PATTERN 6: Session Lifecycle (Orient/Work/Persist)

**Source:** `reference/session-lifecycle.md`
**Forge OS mapping:** Kernel boot sequence, session management, state handoff

### Three-Phase Universal Pattern

Every agent session follows Orient -> Work -> Persist because LLM agents have no persistent memory and must externalize state between sessions.

### Orientation Loading Order (STRICT)

1. `self/identity.md` (voice, values, approach)
2. `self/methodology.md` (quality standards)
3. `self/goals.md` (active work threads, priorities)
4. Task context (specific files for current work)

Skipping this order produces inconsistent voice and degraded quality.

### Context Budget Management

The "smart zone" occupies the FIRST ~40% of context capacity where attention quality is highest.

| Session Type | Orientation | Work |
|---|---|---|
| Processing | 10% | 90% |
| Exploration | 25% | 75% |
| Maintenance | 20% | 80% |
| Capture | Minimal | Maximum |

### State Handoff Mechanisms

**goals.md (Primary handoff):**
- Active work threads with current status
- Next actions and immediate priorities
- Recent discoveries affecting direction
- Updated at session end, read at session start

**reminders.md (Time-bound actions):**
- `- [ ] YYYY-MM-DD: action description`

**Session logs (ops/sessions/):**
- Append-only historical record preventing rediscovery of prior insights

### Condition-Based Triggers (Replace Time Scheduling)

Evaluated at session start against ACTUAL vault state:
- "Topic MOC exceeds 50 notes" (when true, not on schedule)
- "Stale notes exceed 20%" (metric-driven, not calendar-driven)
- "Unprocessed sessions exceed N" (accumulation-based)
- "Orphan notes detected" (graph topology based)

Conditions surface via /next; they do NOT stack during inactive periods.

### Critical Anti-Pattern: Skipping Persist

**Skipping persist is the most damaging session failure.** Without explicit closure:
- goals.md remains outdated
- Observations are lost
- Newly created notes may go uncommitted
- Next session starts without handoff

### Forge OS Application

**Steal for:** This maps DIRECTLY to the Forge OS boot sequence (BOOT.md). The Orient phase IS kernel loading. The Persist phase IS the session close protocol. Adopt:
- Strict loading order for persona activation
- Context budget allocation by task type
- goals.md as primary inter-session handoff vehicle
- Condition-based triggers replacing scheduled maintenance

---

## PATTERN 7: Skill Routing and Capability Indexing

**Source:** `skills/help/SKILL.md`, `generators/claude-md.md`
**Forge OS mapping:** Persona capability dispatch, skill discovery

### Dynamic Skill Discovery

Skills are discovered by scanning skill directories for `SKILL.md` files. Each skill's frontmatter provides name and description -- no hardcoded command lists.

### Contextual Suggestion Logic (Priority Cascade)

| Priority | Trigger Condition | Recommended Action |
|----------|------------------|-------------------|
| 1 | Inbox items exist | Process oldest item |
| 2 | Pipeline has pending tasks | Resume with /next |
| 3 | 10+ observations OR 5+ tensions | Review via /rethink |
| 4 | Health warnings present | Run diagnostics |
| 5 | Sparse connections detected | Build connections |

### Infrastructure Routing Table

| User Request Type | Routes To | Fallback |
|---|---|---|
| Structure/organization questions | /architect | Apply methodology directly |
| System research | /ask | Bundled references |
| Queue/priority decisions | /next | Reconcile queue + recommend |
| Assumption challenges | /rethink | Triage observations |

### Content Pipeline Enforcement

```
NEVER write directly to notes/
All content routes through: inbox/ -> /process -> notes/
```

Memory type routing:
- Durable knowledge -> notes/
- Agent identity/methodology -> self/
- Temporal coordination -> ops/
- Raw material -> inbox/
- Friction signals -> ops/observations/

### Forge OS Application

**Steal for:** Persona skill dispatch. Each persona has discoverable skills (SKILL.md equivalent). The contextual suggestion logic provides a priority-based "what should this persona do next?" engine. The content pipeline enforcement prevents write-anywhere chaos.

---

## PATTERN 8: Knowledge Graph Analysis

**Source:** `skill-sources/graph/SKILL.md`
**Forge OS mapping:** Knowledge Garden graph metrics, connection quality

### Eight Graph Operations

1. **Health Analysis** -- density (actual / possible links), orphans, dangling refs, MOC coverage
   - Benchmarks: <0.02 sparse, 0.02-0.06 healthy, 0.06-0.15 dense, >0.15 very dense
2. **Triangle Detection** -- open triadic closures (A links B and C, but B-C missing)
3. **Bridge Identification** -- structurally critical nodes whose removal fragments graph
4. **Cluster Discovery** -- connected components via bidirectional traversal
5. **Hub Ranking** -- authority (incoming) + hub (outgoing) scores; "synthesizers" score high on both
6. **Sibling Analysis** -- unconnected peers within topic map
7. **N-Hop Traversal** -- forward/backward walks showing propagation paths
8. **Schema Query** -- YAML field-based filtering (type, topic, status, source, date)

### Data Structures

- **Adjacency list** built from `[[wikilink]]` pattern extraction
- **Metrics:** link count, density ratio, component IDs, authority/hub scores
- **Thresholds:** configurable from ops/config.yaml

### Forge OS Application

**Steal for:** Knowledge Garden health metrics. The density benchmarks, triangle detection (missing connections), bridge identification (critical knowledge nodes), and hub ranking (synthesizer detection) map directly to monitoring the Knowledge Garden's graph quality.

---

## PATTERN 9: Self-Improvement Recursive Loop

**Source:** `reference/evolution-lifecycle.md`, `generators/claude-md.md`
**Forge OS mapping:** System evolution, drift detection, kernel self-improvement

### Seed-Evolve-Reseed Cycle

**Seed:** Derivation engine generates minimum viable system (Gall's Law -- never design complex from scratch)
**Evolve:** Operational use validates and revises initial hypothesis
**Reseed:** When accumulated changes create incoherence, re-derive from first principles incorporating operational learning as hard constraints

### Drift Detection Framework

| Drift Type | Detection | Resolution |
|---|---|---|
| **Staleness** | Config mtime > newest methodology note | /remember or /rethink updates |
| **Coverage Gap** | Active features lack methodology notes | Create documentation for undocumented behavior |
| **Assertion Mismatch** | Methodology contradicts actual config | Update spec or system; flag for human review |

### Friction Detection Channels

Two accumulation paths:
1. **Observations** (ops/observations/) -- atomic notes: friction | surprise | process-gap | methodology
2. **Tensions** (ops/tensions/) -- conflicting claims with resolution status

**Threshold triggers:**
- 10+ pending observations -> Run /rethink
- 5+ pending tensions -> Run /rethink

### Reseed Triggers

- Context file contradicts itself across sections
- Schema fields exist that no query uses
- MOC structures follow different conventions
- Hooks enforce rules the context file no longer documents
- Context file growth exceeds 50% since generation through patches

### User Override Preservation

`ops/user-overrides.md` tracks all customizations. Reseed reads this FIRST, treating customizations as immutable constraints. Prevents re-derivation from destroying accumulated learning.

### Forge OS Application

**Steal for:** Kernel evolution lifecycle. The seed-evolve-reseed pattern maps to Forge OS kernel versioning. Drift detection categories (staleness, coverage gap, assertion mismatch) are directly applicable. The override preservation pattern ensures operator customizations survive kernel updates.

---

## PATTERN 10: Personality Layer Derivation

**Source:** `reference/personality-layer.md`
**Forge OS mapping:** Persona voice calibration, cognitive posture derivation

### Four Personality Dimensions

| Dimension | Spectrum | Description |
|-----------|----------|-------------|
| **Warmth** | clinical <-> warm <-> playful | Emotional tone in language |
| **Opinionatedness** | neutral <-> opinionated | Proactive preference expression |
| **Formality** | formal <-> casual | Sentence structure and register |
| **Emotional Awareness** | task-focused <-> emotionally attentive | Emotional context acknowledgment |

### Core Invariant

**"Personality never contradicts methodology."** All profiles enforce identical quality gates regardless of voice. Personality controls HOW standards are communicated, not WHETHER they are enforced.

### Signal Patterns

- "Feel like a friend" -> warm/playful, casual
- "Keep it professional" -> clinical, formal
- "Help me see what matters" -> opinionated
- "Notice patterns I miss" -> opinionated, emotionally attentive
- Emoji/fragments -> casual
- Emotional domains (therapy, relationships) -> warm, casual, emotionally attentive
- Intellectual domains (research, PM) -> clinical/neutral, formal, task-focused

### Conflict Resolution

1. **Domain takes priority over affect** -- research requires rigor; therapy requires trust
2. **Explicit beats implicit** -- except when explicit preference contradicts methodology integrity
3. **Clarifying question when ambiguous** -- rather than assuming

### Encoding in Derivation

```yaml
personality:
  warmth: [clinical | warm | playful]
  opinionatedness: [neutral | opinionated]
  formality: [formal | casual]
  emotional_awareness: [task-focused | emotionally_attentive]
  derivation_signals: [signal -> dimension mappings]
  conflicts_resolved: [resolution decisions]
```

### Forge OS Application

**Steal for:** This IS what Forge OS personas already do, but with a formalized derivation framework. The four dimensions can augment kernel personality encoding. The invariant "personality never contradicts methodology" is a constraint to enforce in every kernel.

---

## PATTERN 11: 15-Primitive Kernel Validation

**Source:** `reference/kernel.yaml`, `skills/setup/SKILL.md`
**Forge OS mapping:** Kernel integrity checks, build validation

### Three Validation Layers

**Foundation Layer (3 primitives):**
1. Markdown files with YAML frontmatter (complete artifact)
2. Wiki links (navigable relationships via spreading activation)
3. Filesystem graph database (vault as queryable nodes/edges/properties)

**Convention Layer (10 primitives):**
4. MOC hierarchy (Hub -> Domain -> Topic -> Notes)
5. Tree injection (immediate orientation before action)
6. Description fields (progressive disclosure, filter-before-read)
7. Topics footers (bidirectional navigation)
8. Schema enforcement (templates as single source of truth)
9. Self space (identity, methodology, goals across sessions)
10. Session rhythm (orient/work/persist cycles)
11. Discovery-first design (future findability before creation)
12. Operational learning loop (friction signals, system evolution)
13. Task stack (lifecycle visibility and work prioritization)
14. Methodology folder (self-knowledge about configuration)

**Automation Layer (2 primitives):**
15. Semantic search (meaning-based discovery)
-- Session capture (transcript preservation, insight mining)

### Invariant Primitives (Cannot Disable)

4 of 15 are INVARIANT:
- Wiki links (Primitive 2)
- Schema enforcement (Primitive 8)
- Methodology folder (Primitive 14)
- Session capture (Primitive 15)

### Three-Pass Coherence Check

**Pass 1 -- Hard Constraints:** Violations BLOCK generation with user-facing explanation
**Pass 2 -- Soft Constraints:** Auto-adjust cascaded dimensions, preserve user choices
**Pass 3 -- Compensating Mechanisms:** Verify remaining violations have active compensations

### Post-Generation Validation Metrics

1. >95% valid frontmatter
2. >90% links resolve
3. 3+ MOCs exist, every note in >= 1 MOC
4. Session start loads file structure
5. >95% unique descriptions
6. >95% have topics field
7. Templates as single source of truth
8. Semantic search configured or documented
9. self/ with identity/methodology/goals
10. Orient/work/persist cycle documented
11. Optimized for agent findability
12. obs/tensions/ exist, /rethink present
13. ops/tasks.md + queue with conditions + /next
14. ops/methodology/ with MOC + derivation-rationale
15. ops/sessions/ exists, end-hook present

### Forge OS Application

**Steal for:** Kernel build validation. Define Forge OS kernel primitives with similar invariant/configurable classification. Run validation passes after kernel generation to ensure coherence. The three-pass model (hard block -> soft adjust -> compensate) is directly applicable.

---

## PATTERN 12: Vocabulary Transform System

**Source:** `reference/vocabulary-transforms.md`
**Forge OS mapping:** Domain-native terminology per persona

### Universal-to-Domain Mapping

Same structural operations, different cognitive framing per domain:

| Universal | Research | Therapy | Learning | Creative | PM |
|-----------|----------|---------|----------|----------|-----|
| note | claim | reflection | concept note | idea | decision |
| extract | reduce | surface | break down | discover | document |
| connect | reflect | find patterns | relate | associate | trace impact |
| MOC | topic map | theme | study guide | project hub | decision register |
| inbox | inbox | journal | study-inbox | inspiration | action-items |

### Implementation Protocol

1. Determine use case
2. Consult mapping table
3. Replace all instances systematically
4. Verify naturalness for target domain
5. Extend with custom vocabularies for mixed use cases

### Forge OS Application

**Steal for:** Each persona could have a vocabulary transform layer. Nyx speaks in orchestration terms, Pierce in narrative terms, Mara in analytical terms. The same underlying operation (e.g., "process batch") surfaces as domain-native language per persona.

---

## PATTERN 13: 10 Documented Failure Modes

**Source:** `reference/failure-modes.md`
**Forge OS mapping:** System health monitoring, anti-pattern detection

| # | Failure | Core Problem | Prevention |
|---|---------|-------------|-----------|
| 1 | **Collector's Fallacy** | Accumulation without synthesis | Processing pipelines, WIP limits, condition-based reviews |
| 2 | **Orphan Drift** | Unconnected notes fragment system | Mandatory reflection after creation, orphan detection |
| 3 | **Link Rot** | Broken references from renames/deletes | Rename scripts, periodic link health, archive-not-delete |
| 4 | **Schema Erosion** | Inconsistent metadata | Template enforcement, automated validation, minimal schemas |
| 5 | **MOC Sprawl** | Excessive unmaintained maps | 20+ threshold for creation, merge below 10, size checks |
| 6 | **Verbatim Risk** | Copy without transformation | Generation-effect gating, composability test |
| 7 | **Cognitive Outsourcing** | Delegating judgment entirely to systems | Periodic human review, propose-not-implement |
| 8 | **Over-Automation** | Hooks encoding judgment instead of verification | Determinism boundaries, fail-loud, graduated enforcement |
| 9 | **Productivity Porn** | System-building displaces actual work | Gall's Law, time-box improvements to <20%, track creation-to-modification ratio |
| 10 | **Temporal Staleness** | Outdated content unmarked | meta_state fields, staleness sweeps, date-aware health checks |

### Forge OS Application

**Steal for:** Direct mapping to Forge OS system health. Every one of these failure modes has an analog in a multi-agent orchestration system. Collector's Fallacy = task accumulation without execution. Orphan Drift = isolated knowledge nodes. Over-Automation = personas making decisions that should be operator decisions. Build detection mechanisms for each.

---

## PATTERN 14: Extraction Pipeline (6 Rs)

**Source:** `skill-sources/reduce/SKILL.md`, `skill-sources/reflect/SKILL.md`
**Forge OS mapping:** Knowledge ingestion pipeline, insight extraction

### The 6 Rs Pipeline

| Phase | Action | Forge OS Equivalent |
|-------|--------|-------------------|
| **Record** | Zero-friction capture into inbox | Task/signal ingestion |
| **Reduce** | Extract insights with domain categories | Signal processing, pattern extraction |
| **Reflect** | Find connections, update MOCs | Knowledge graph linking |
| **Reweave** | Backward pass -- update older notes with new connections | Graph densification |
| **Verify** | Schema + health + description checks | Quality gate validation |
| **Rethink** | Challenge system assumptions | Meta-cognitive self-improvement |

### Extraction Category Detection

Signal categories with linguistic markers:
- **Domain-core:** Direct assertions, evidence, named methods
- **Comparison:** Trade-off language ("X vs Y")
- **Tension:** Contradictory markers ("however", "contrary to")
- **Anti-pattern:** Failure indicators ("systems fail when")
- **Implementation:** Actionable techniques ("we could build")
- **Validation:** Confirmatory language ("supports", "confirms")

### Critical Rule: Categories Before Gates

Mandatory categorization BEFORE filtering. Prevents applying rejection gates to content designed for extraction (implementation ideas, tensions, validations). Only off-topic content faces the selectivity gate.

### Connection Validation (Articulation Test)

Must complete: "[[note A]] connects to [[note B]] because [specific reason]"

Valid relationship types: extends, grounds, contradicts, exemplifies, synthesizes, enables

### Forge OS Application

**Steal for:** Knowledge Garden ingestion pipeline. The 6 Rs map to: Record (signal capture) -> Reduce (kernel processing) -> Reflect (knowledge graph integration) -> Reweave (backward connection pass) -> Verify (quality validation) -> Rethink (self-improvement). The articulation test for connections prevents garbage links in the knowledge graph.

---

## PATTERN 15: Feature Block Composition

**Source:** `generators/claude-md.md`
**Forge OS mapping:** Kernel module composition, feature flags

### Composable Feature Blocks (17 total)

**Always-included (11):** wiki-links, processing-pipeline, schema, maintenance, self-evolution, methodology-knowledge, session-rhythm, templates, ethical-guardrails, helper-functions, graph-analysis

**Conditional (6):** atomic-notes, MOCs, semantic-search, personality, multi-domain, self-space

### Generation Order

1. Generate `ops/derivation.md` FIRST (source of truth for all subsequent steps)
2. Compose feature blocks based on dimension configuration
3. Apply vocabulary transforms throughout
4. Validate 15 kernel primitives
5. Run smoke test (create test note -> verify structure -> delete -> cleanup)

### Self-Improvement Loop Structure

Two accumulation channels:
1. **Observations** (ops/observations/) -- friction | surprise | process-gap | methodology
2. **Tensions** (ops/tensions/) -- conflicting claims with resolution status

Threshold triggers:
- 10+ pending observations -> /rethink
- 5+ pending tensions -> /rethink

### Forge OS Application

**Steal for:** Kernel composition. Each persona kernel is composed from feature blocks (capabilities). Some blocks are always-included (identity, methodology, session-rhythm), others are conditional (domain-specific skills, automation level). The derivation-first generation order ensures consistency.

---

## CROSS-CUTTING PATTERNS

### A. Handoff Protocol (used across Ralph, pipeline, sessions)

Structured return blocks enabling orchestrator-to-worker communication:
```
--=={ HANDOFF }==--
Work Done: [completion status]
Learnings: [friction, surprises, methodology insights]
Queue Updates: [state changes]
```

### B. Context Window Resilience

Key strategy: generate source-of-truth files FIRST (derivation.md), then reference them in later steps rather than relying on conversation memory. This prevents context degradation in long sessions.

### C. Propose-Not-Implement Pattern

Agent identity and methodology changes follow: observe -> propose -> await approval -> implement. Prevents uncontrolled drift. Applies to all self-modifying operations.

### D. Composability Test

Every knowledge unit must pass: "This note argues that [TITLE]" -- if the title cannot complete this sentence as a grammatical proposition, it is a topic label, not a composable claim.

### E. Smart Zone Allocation

First ~40% of context window gets highest attention quality. Place identity and critical instructions there. Process-heavy content fills the remaining 60%.

---

## FORGE OS INTEGRATION PRIORITY

### Tier 1 -- Immediate Steal (directly applicable)

| Pattern | Forge OS Target | Effort |
|---------|----------------|--------|
| Three-Space Routing | Memory partitioning (kernel/garden/ops) | Medium |
| Ralph Subagent Spawning | Multi-agent dispatch | High |
| Session Lifecycle | Boot sequence + session close | Low |
| 6 Conflation Failures | Memory boundary enforcement | Low |
| Condition-Based Triggers | Maintenance scheduling | Medium |

### Tier 2 -- Adapt and Integrate

| Pattern | Forge OS Target | Effort |
|---------|----------------|--------|
| Signal-to-Dimension Derivation | Kernel calibration | High |
| Cascade Constraints | Capability validation graph | High |
| Query Classification (WHY/HOW/WHAT) | Knowledge Garden retrieval | Medium |
| 15-Primitive Validation | Kernel build checks | Medium |
| Extraction Pipeline (6 Rs) | Knowledge ingestion | Medium |

### Tier 3 -- Strategic Adoption

| Pattern | Forge OS Target | Effort |
|---------|----------------|--------|
| Personality Layer | Persona voice calibration | Low |
| Vocabulary Transforms | Domain-native terminology | Low |
| Knowledge Graph Analysis | Garden health metrics | Medium |
| Seed-Evolve-Reseed | Kernel versioning | High |
| Feature Block Composition | Kernel module system | High |
| 10 Failure Modes | System health monitoring | Low |

---

## NOVEL INSIGHTS NOT SEEN ELSEWHERE

1. **Confidence-weighted dimension resolution** -- no other mined repo has a formal confidence aggregation system for configuration derivation
2. **Cascade constraints as forcing functions** -- the hard/soft/compensating trichotomy is unique and directly applicable to capability dependency graphs
3. **Six conflation failures** -- the most thorough taxonomy of memory-space contamination found in any repo
4. **Subagent count verification** -- "spawned count MUST equal task count" as integrity invariant is a novel enforcement pattern
5. **Categories before gates** -- preventing premature rejection of extractable content is a subtle but critical insight for knowledge ingestion
6. **Context window budget allocation** -- explicit percentage allocation by session type with "smart zone" concept
7. **Propose-not-implement** for self-modification -- prevents agent identity drift
8. **Anti-signals** -- detecting misleading patterns (vocabulary-signaling vs behavioral intent) in configuration derivation
