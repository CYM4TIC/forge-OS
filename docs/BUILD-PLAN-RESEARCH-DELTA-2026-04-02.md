# Build Plan Research Delta — April 2, 2026
## For Merge Into: `docs/TAURI-BUILD-PLAN.md`
## Sources: Excalibur + Meta-Harness (2603.28052) + Karpathy + Block Engineering (prior session)

> **Purpose:** This document contains all build plan modifications from the April 2 research sessions.
> Each section targets a specific session in the build plan with exact additions.
> When ready, Nyx merges these into TAURI-BUILD-PLAN.md as a single update.

---

## Vocabulary Reference (use throughout build plan after merge)

| Term | Replaces | Definition |
|------|----------|-----------|
| **Mana** | "token budget", "charge" | Resource that powers agent actions. Depletes with use, regenerates under conditions. |
| **Emanation** | "sub-agent spawn" | Bounded projection of parent agent's will and mana budget. |
| **Ritual** | "scheduled job", "cron task" | Automated job with purpose, boundaries, mana budget, and timeout. |
| **Dreamtime** | "nightly consolidation" | Nightly ritual: alchemy pass, sigil regeneration, persona evolution. |
| **Heartbeat** | "hourly check" | Hourly ritual: incremental frontier advances, checkpoints. |
| **Scrying** | "vault health check" | Weekly ritual: knowledge integrity, gap detection, connection discovery. |
| **Grimoire** | "cost config", "chargebook" | Single tuning surface for all mana costs. One file, no scatter. |
| **Echoes** | "raw execution traces" | Append-only trace data. Never summarized-then-discarded. |
| **Sigils** | "auto-maintained indexes" | Compact index entries — cheap navigation keys to vault articles. |
| **Ley Lines** | "backlinks" | Knowledge graph edges connecting vault articles bidirectionally. |
| **Alchemy** | "compilation", "consolidation" | Process of transmuting raw echoes into compiled vault knowledge. |

---

## Delta 1: Session 7.1 — Agent Registry + Team Panel

### Addition: Dispatch-Scoped Capability Grants

Insert after the "Tool Availability Gating" section:

**Dispatch-Scoped Capability Grants (from Excalibur spellbook model)**

Tool availability gating (above) is layer 1 — binary connectivity checks. Dispatch scoping is layer 2 — even when a tool is technically available, the dispatch may restrict it for this specific run.

Each `DispatchRequest` includes a `granted_capabilities: Vec<CapabilityFamily>` field:

```rust
enum CapabilityFamily {
    ReadOnly,       // file reads, schema queries, grep — always granted
    WriteCode,      // file edits, new files — build dispatches only
    WriteVault,     // vault articles, BUILD-LEARNINGS, ADL — compile/consolidation
    Database,       // migrations, DML — requires explicit grant
    External,       // web search, API calls — mana-costed
    Destructive,    // delete, drop, red-team — requires explicit operator grant
}
```

- Gate review dispatches get `ReadOnly` only — personas find, Nyx fixes
- Build dispatches get `ReadOnly + WriteCode`
- Dreamtime ritual gets `ReadOnly + WriteVault`
- Red-team (Wraith) gets `ReadOnly + Destructive` only with operator approval
- The dispatch audit trail records which capabilities were granted per run

**Two-layer capability control:**
1. **Connectivity gating** (existing): Is the MCP connected? Binary.
2. **Dispatch scoping** (new): Is this capability *granted for this run*? Per-dispatch.

---

## Delta 2: Session 8.1 — Vault Watcher + State Engine + Skills Crystallization

### Addition: Mana Economy

Insert as a new subsection after "Auto-memory extraction":

**Mana Economy (from Excalibur + Meta-Harness Pareto research)**

Every dispatch run has a mana budget. Mana governs how much expansion (tool calls, emanations, depth reads) the run can perform.

`src-tauri/src/mana/` — Rust module:
- `economy.rs` — `ManaEconomy` struct: load grimoire, price lookups, budget allocation
- `tracker.rs` — per-run mana tracking: starting budget, current balance, spend log
- `grimoire.rs` — parse `GRIMOIRE.md` (repo root) for cost definitions

**Grimoire format** (`GRIMOIRE.md`):

```markdown
## Mana Costs

| Operation | Mana | Notes |
|-----------|------|-------|
| File read / grep / schema query | 0 | Local reads are free |
| Artifact write / vault update | 0 | Durable work product is free |
| Depth article read | 1 | Vault article beyond sigil |
| Web search | 2 | External acquisition |
| Document generation | 2 | PDF/markdown render |
| LightRAG query | 3 | Cross-article semantic search |
| Emanation (sub-agent) | 10-20 | Drawn from parent budget |
| Image generation | 3 | Heavy generation |

## Run Budgets

| Context | Starting Mana | Cap | Emanation Alloc |
|---------|--------------|-----|-----------------|
| Interactive (operator-initiated) | 120 | 120 | 20 |
| Heartbeat ritual | 60 | 120 | 20 |
| Dreamtime ritual | 40 | 80 | 20 |
| Scrying ritual | 40 | 80 | 20 |
| Automated dispatch (Sentinel, Beacon) | 60 | 60 | 15 |
```

**Mana gradient shapes behavior:** Free (local reads, artifact writes) → Low (depth reads) → Medium (external, generation) → High (emanations, LightRAG). Agents self-optimize toward cheap paths.

**Pareto frontier tracking (from Meta-Harness):**
- `pareto.rs` — track mana spent vs finding quality per persona per surface type
- Empirical frontier: "At 40 mana, Pierce's gate pass rate is 78%. At 80 mana: 94%. At 120 mana: 96%."
- Grimoire exposes operator-selectable operating point: velocity mode (constrained) vs quality mode (full budget)
- Canvas HUD: mana allocation sparkline with Pareto frontier overlay

Tauri commands: `get_mana_balance`, `get_grimoire`, `update_grimoire_entry`, `get_pareto_frontier`

### Addition: Echo Ledger

Insert after "Context Graph: Decision Trace Store":

**Echo Ledger (from Meta-Harness + Excalibur daily thread)**

Raw execution traces — echoes — are the highest-fidelity record of what happened. Meta-Harness proved echoes beat LLM-generated summaries by +15.1 accuracy points.

`src-tauri/src/echoes/` — Rust module:
- `ledger.rs` — append-only daily JSONL. Path: `vault/echoes/<YYYY-MM-DD>.jsonl`
- Each line is a structured echo: `{ timestamp, type, source, data }`
- Types: `dispatch`, `finding`, `tool_call`, `checkpoint`, `gate_result`, `operator_query`, `ritual_event`
- Never summarized-then-discarded. Retained for full history queries.
- `query.rs` — grep-style access: filter by type, source, date range, keyword. Supports the Meta-Harness filesystem-access pattern — agents query echoes selectively, not monolithically.

**Relationship to decision traces:** Decision traces (above) are *structured summaries* of meaningful actions. Echoes are *raw event streams*. The dreamtime ritual reads echoes and *alchemizes* them into decision traces, vault articles, and sigils. Both are retained.

Tauri commands: `append_echo`, `query_echoes`, `get_echo_stats`

### Addition: Vault Sigils (Auto-Maintained Indexes)

Insert after "Echo Ledger":

**Vault Sigils — Auto-Maintained Indexes (from Karpathy)**

Sigils are compact index files — one-line entries with tags and file references. They serve as the cheap navigation layer that eliminates RAG dependency for structured queries.

Generated by the dreamtime ritual. Never manually edited.

**Sigil files:**
- `vault/sigils/BUILD-LEARNINGS-INDEX.md` — one line per learning, domain tags, file ref
- `vault/sigils/SKILLS-INDEX.md` — one line per skill, `requires_tools`, `platforms` tags
- `vault/sigils/ADL-INDEX.md` — one line per decision, status (locked/proposed/superseded)
- `vault/sigils/FINDINGS-INDEX.md` — summary per finding pattern, persona, severity distribution
- `vault/sigils/ECHOES-INDEX.md` — daily summary of echo volume by type

**Three-tier knowledge access (mana-aware):**

| Tier | Cost | What | When |
|------|------|------|------|
| Sigils | 0 mana | Index scan — "what do we know about auth?" | First lookup |
| Articles | 1 mana | Full article read — "what does ADL-017 say?" | Need depth |
| Ley lines (LightRAG) | 3 mana | Cross-article query — "what connects auth to payments?" | Cross-cutting |

Tauri commands: `get_sigil`, `list_sigils`, `regenerate_sigils`

### Addition: Ritual System

Insert after "Vault Sigils":

**Ritual System (from Excalibur + Karpathy)**

Rituals are scheduled automated jobs with purpose, mana budgets, and governance.

`src-tauri/src/rituals/` — Rust module:
- `engine.rs` — ritual scheduler. Reads ritual specs from `vault/rituals/`. Manages cron triggers, mana allocation, timeout enforcement.
- `spec.rs` — ritual spec parser (markdown with YAML frontmatter)
- `guard.rs` — ritual governance: read-only enforcement (rituals cannot modify their own spec), mana cap enforcement, timeout kill

**Three built-in rituals:**

```yaml
# vault/rituals/heartbeat.md
name: heartbeat
enabled: false  # operator enables explicitly
schedule: "0 * * * *"  # hourly
starting_mana: 60
mana_cap: 120
timeout_minutes: 45
capabilities: [ReadOnly, WriteVault]
purpose: Incremental frontier advances, checkpoint progress, surface urgent findings
```

```yaml
# vault/rituals/dreamtime.md
name: dreamtime
enabled: false
schedule: "0 2 * * *"  # 2am local
starting_mana: 40
mana_cap: 80
timeout_minutes: 90
capabilities: [ReadOnly, WriteVault]
purpose: >
  Full alchemy pass — read day's echoes, compile into vault articles,
  regenerate sigils, generate ley lines (backlinks), trigger persona
  evolution, prune stale knowledge
```

```yaml
# vault/rituals/scrying.md
name: scrying
enabled: false
schedule: "0 3 * * 1"  # 3am Monday
starting_mana: 40
mana_cap: 80
timeout_minutes: 60
capabilities: [ReadOnly, WriteVault, External]
purpose: >
  Vault integrity — find inconsistent BUILD-LEARNINGS, skills referencing
  removed tools, ADL decisions contradicting current code, knowledge gaps
  where surfaces exist but vault coverage doesn't. Impute via web search
  where appropriate. Suggest connection candidates.
```

**Ritual governance:**
- All rituals disabled by default — operator enables explicitly
- Rituals are read-only during execution — cannot modify their own spec
- Mana-bounded — each has starting budget and cap
- Timeout-guarded — hard kill after `timeout_minutes`
- Capability-scoped — each ritual declares its capability families

Tauri commands: `list_rituals`, `enable_ritual`, `disable_ritual`, `get_ritual_status`, `get_ritual_history`

### Enhancement: Skills System

Append to existing skills section:

**Enhancements from Meta-Harness + Excalibur research:**

- **Algorithmic skills, not prompt skills.** Skills describe procedures (retrieve → compare → classify → verify), not personality prompts ("you are an expert at..."). Algorithmic skills generalize across projects. Prompt-based skills overfit. (Meta-Harness: code-space regularization)
- **Generalization testing.** When auto-crystallization produces a new skill, verify it works on a different surface/batch before setting `version: 1`. A skill crystallized from a payment RPC batch must also work on an auth RPC batch. (Meta-Harness: held-out model testing)
- **Mana cost per skill injection.** Skills injected into agent context consume mana proportional to their token size. The grimoire prices skill injection. Large skills cost more to load — incentivizes atomic decomposition. (Excalibur: charge economy)

---

## Delta 3: Session 8.2 — Agent Dispatch Pipeline

### Addition: Emanation Mana Semantics

Insert after "Orchestration engine in Rust":

**Emanation Mana Semantics (from Excalibur)**

When the dispatch pipeline spawns sub-agents (emanations), each emanation draws mana from the parent run's budget:

- Emanation cast cost: 0 (spawning is free)
- Emanation mana allocation: drawn from parent (default: 20 per emanation)
- Parent's remaining mana decreases by allocation amount
- Child's mana budget equals allocation amount
- `max_emanation_depth: 2` — no recursive chains beyond 2 levels

**Example:** Triad dispatch at 120 mana. 3 emanations × 20 mana = 60 allocated to children. Orchestrator retains 60 for integration and fix cycles.

Canvas HUD visualization: emanation flows render as mana streams flowing from parent node to child nodes. Stream width proportional to mana allocation.

### Enhancement: Confound Isolation in Fix Cycles

Append to existing fix cycle description:

**Confound Isolation (from Meta-Harness qualitative analysis)**

When gate findings require fixes, each fix is isolated:
- One finding → one fix → one verification
- Fixes are applied and verified independently before proceeding to the next
- If multiple fixes are applied and a regression occurs, the confound is identifiable
- Additive modifications (new code) preferred over subtractive (rewriting existing code)
- This extends Rule 25 (micro-batches) to the fix level

Meta-Harness empirical evidence: bundled changes created confounds that required 6 iterations to untangle. Isolated changes produced wins on the first attempt.

---

## Delta 4: Session 8.3 — LightRAG Integration

### Addition: Ley Line Generation

Append to existing LightRAG section:

**Ley Line Generation (from Karpathy backlink pattern)**

During LightRAG indexing, generate bidirectional ley lines (backlinks) between vault articles:

- When article A references article B, both articles get ley line entries
- Ley lines stored in `vault/ley-lines/<article-slug>.json` — array of `{ target, relationship, context }`
- Vault browser panel (Phase 5.3) renders ley lines as a "Referenced By" section on each article
- Graph Viewer (Phase 5.3) renders ley lines as edges between vault article nodes
- Dreamtime regenerates ley lines nightly alongside sigils

---

## Delta 5: Session 8.3b — Predictive Intelligence Layer

### Enhancement: Full Echo History Queries

Append to "Reasoning engine" section:

**Non-Markovian Credit Assignment (from Meta-Harness)**

The reasoning engine queries the full echo history, not just recent traces:
- When Beacon detects an anomaly, the reasoning engine walks the complete echo ledger for similar patterns across all time
- Pattern matching spans the entire project history, not just a sliding window
- Cross-project echo queries supported when skills reference patterns from prior projects
- Meta-Harness evidence: proposer read 82 files per iteration across 20+ prior candidates. Compressed feedback (recent-only) produced 15 fewer accuracy points.

### Enhancement: Scrying Ritual Integration

Append to "Incident-Driven Policy Evolution" section:

**Scrying Ritual — Vault-Level Policy Evolution (from Karpathy lint+heal)**

Policy evolution (above) detects recurring *finding* patterns. The scrying ritual extends this to the *knowledge base itself*:

- Weekly vault integrity scan (scheduled ritual, see 8.1)
- Detects: BUILD-LEARNINGS contradictions, skills referencing removed tools, ADL decisions not validated against current code, knowledge gaps where surfaces exist without vault coverage, stale persona relationship edges
- Produces: integrity findings filed through the Proposal Feed (7.3) with `source: Automated`
- Can impute missing data via web search (External capability granted)
- Files connection candidates as proposals: "Findings from Tanaka and Kehinde on auth RPCs share a root cause — propose linked skill"

---

## Delta 6: Session 8.4 — /init + /link Flows

### Enhancement: Security Circle in /init

Append to `/init` flow:

**Mandatory Security Circle (from Excalibur Warden pattern)**

After initial project scaffold, `/init` includes a security configuration step:

- "Configure security audit schedule" — operator sets Tanaka and Wraith dispatch frequency
- Default: Tanaka runs on every gate. Wraith runs on high-risk surfaces (auth, payments, PII).
- Operator can enable automated Tanaka dispatch as a ritual (weekly security sweep)
- No project completes `/init` without explicit security audit configuration — the circle must be closed

### Enhancement: Ritual Configuration in /init

Append after security circle:

**Ritual Configuration (from Excalibur invocation ceremony)**

`/init` includes a ritual enablement step:

- Present three built-in rituals: heartbeat, dreamtime, scrying
- Explain purpose and mana cost of each
- Operator enables/disables each explicitly
- Disabled rituals can be enabled later via `enable_ritual` command
- All ship disabled by default — no accidental autonomous behavior

---

## Delta 7: Session 8.5 — Persona Evolution Engine

### Enhancement: Dreamtime as Alchemy Trigger

Prepend to "Dream Consolidation Integration" section:

**Dreamtime Alchemy (from Excalibur + Karpathy synthesis)**

The dreamtime ritual performs alchemy — transmuting raw echoes into compiled knowledge:

1. **Read day's echoes** — full JSONL ledger, not summaries (Meta-Harness: raw traces beat summaries by +15.1 points)
2. **Compile vault articles** — new BUILD-LEARNINGS entries, skill crystallizations, ADL updates
3. **Regenerate sigils** — rebuild all index files from current vault state
4. **Generate ley lines** — rebuild backlink maps from article cross-references
5. **Trigger persona evolution** — scan echoes for drift signals, relationship changes, expertise deepening
6. **Prune stale knowledge** — archive echoes older than retention window, invalidate expired ley lines

This is the "overnight reflection" — the system processes the day's experiences and integrates them into organizational memory. Raw echoes are retained in the archive. Compiled artifacts (vault articles, sigils, ley lines) are regenerated from source truth nightly.

---

## Summary of All Deltas

| Delta | Target Session | Type | New Artifacts/Systems |
|-------|---------------|------|----------------------|
| 1 | 7.1 | Enhancement | Dispatch-scoped capability grants |
| 2 | 8.1 | Major addition | Mana economy, echo ledger, vault sigils, ritual system, skills enhancements |
| 3 | 8.2 | Enhancement | Emanation mana semantics, confound isolation |
| 4 | 8.3 | Addition | Ley line generation |
| 5 | 8.3b | Enhancement | Full echo history queries, scrying ritual |
| 6 | 8.4 | Enhancement | Security circle, ritual configuration in `/init` |
| 7 | 8.5 | Enhancement | Dreamtime as alchemy trigger |

**New Rust modules:** `src-tauri/src/mana/`, `src-tauri/src/echoes/`, `src-tauri/src/rituals/`
**New vault paths:** `vault/echoes/`, `vault/sigils/`, `vault/rituals/`, `vault/ley-lines/`
**New repo root file:** `GRIMOIRE.md`
**New Tauri commands:** ~18 across all deltas
**New ADL candidates:** OS-ADL-028 (mana economy), OS-ADL-029 (echo ledger — raw traces always retained), OS-ADL-030 (ritual governance — read-only, disabled-by-default, mana-bounded)

---

*Build Plan Research Delta — Compiled 2026-04-02.*
*Merge into TAURI-BUILD-PLAN.md when ready to build affected sessions.*
*No new sessions. 7 existing sessions enhanced.*
