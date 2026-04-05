# Research: StixDB - Self-Adjusting Memory Layer

**Repo**: https://github.com/Pr0fe5s0r/StixDB
**Mined**: 2026-04-05
**Agent**: Research Agent (repo mining pass)
**Language**: Python (Pydantic + asyncio + numpy)
**Size**: ~15 source files across 8 packages

## Executive Summary

StixDB is a self-organizing memory database for AI agents. It implements a graph-backed memory system with autonomous consolidation, tier-based promotion/demotion, exponential decay, and heuristic maintenance planning. The architecture maps remarkably well onto KAIROS: it solves the same class of problems (composite scoring, context compression, scoped agent memory, deduplication) with clean, well-separated abstractions.

**Verdict**: 13 steal-worthy patterns identified. 4 HIGH priority (retrofit into KAIROS now), 5 MEDIUM (Phase 8+), 4 LOW (nice-to-have / design inspiration).

---

## Pattern Inventory

### Pattern 1: Exponential Decay with Half-Life Configuration
**What**: Every memory node carries a `decay_score` field computed as `importance * 2^(-elapsed_hours / half_life)`. Configurable half-life (default 48h). Decay is recomputed on every agent cycle and on retrieval.
**Where**: `stixdb/graph/node.py` -- `MemoryNode.compute_decay()` method
**Algorithm**:
```
decay_score = importance * 2^(-elapsed_hours / half_life_hours)
```
**How Forge OS uses it**: KAIROS already has recency scoring. This specific formula (importance-weighted exponential decay with configurable half-life) is cleaner than a linear decay. The half-life parameter is per-AgentConfig, meaning different persona agents could have different memory decay rates (Pierce remembers longer than ephemeral task agents).
**Steal Priority**: **HIGH** -- retrofit into KAIROS `importance_score` calculation. The `2^(-t/h)` formula is superior to linear decay and trivial to implement in Rust/SQL.

---

### Pattern 2: Touch-Boost on Access (Anti-Decay)
**What**: When a node is accessed, its decay score gets a boost: `decay_score = min(1.0, decay_score * 1.2 + 0.1)`. This creates a "use it or lose it" dynamic where frequently-accessed memories resist decay.
**Where**: `stixdb/graph/node.py` -- `MemoryNode.touch()` method
**Algorithm**:
```
access_count += 1
last_accessed = now
decay_score = min(1.0, decay_score * 1.2 + 0.1)
```
**How Forge OS uses it**: KAIROS retrieval should call `touch()` equivalent on every memory access. The multiplicative + additive boost formula is elegant -- the 1.2x multiplier amplifies existing health, while the +0.1 additive term ensures even near-dead memories get meaningfully revived on access.
**Steal Priority**: **HIGH** -- implement in KAIROS memory access path.

---

### Pattern 3: Hybrid LRU+LFU Access Scoring (AccessPlanner)
**What**: A combined frequency + recency score: `alpha * frequency_score + (1-alpha) * recency_score`. Recency uses 12-hour half-life exponential decay. Frequency counts accesses within a sliding 24h window, normalized to 10 accesses = max score. Default alpha=0.6 (frequency weighs more).
**Where**: `stixdb/agent/planner.py` -- `AccessRecord` dataclass
**Algorithms**:
```
recency_score = 2^(-elapsed_hours / 12.0)     # 1.0 now, ~0.5 at 12h, ~0.01 at 72h
frequency_score = min(1.0, recent_24h_accesses / 10.0)
combined_score = 0.6 * frequency + 0.4 * recency
```
**How Forge OS uses it**: This is the missing piece for KAIROS composite scoring. Currently KAIROS has semantic + recency + importance. This adds a proper access-frequency signal. The alpha-weighted combination and the specific normalization constants are ready to port.
**Steal Priority**: **HIGH** -- integrate into KAIROS composite score formula alongside existing semantic/recency/importance signals.

---

### Pattern 4: Tier-Based Memory Promotion/Demotion
**What**: Nodes live in tiers: WORKING (hot), EPISODIC, SEMANTIC, PROCEDURAL, ARCHIVED (cold). An AccessPlanner runs each cycle, promoting nodes with combined_score >= 0.65 to WORKING tier, demoting nodes that drop below 0.26 (0.65 * 0.4), and flagging nodes with decay_score < 0.08 for archival. Working memory has a configurable cap (default 256 nodes).
**Where**: `stixdb/agent/planner.py` -- `AccessPlanner.plan()` and `apply_promotions()`
**How Forge OS uses it**: KAIROS could implement a hot/warm/cold tier system. Working memory = the nodes currently in a persona's active context window. Semantic = long-term knowledge. Archived = candidates for deletion. The bounded working memory (256 nodes) maps directly to context window management.
**Steal Priority**: **MEDIUM** -- Phase 8. Requires KAIROS tier column + periodic sweep. The tier concept is already implicit in Forge OS's condenser pipeline; this makes it explicit with clear promotion/demotion thresholds.

---

### Pattern 5: Similarity-Based Memory Consolidation
**What**: The Consolidator scans memory nodes in batches, computes pairwise cosine similarity, and merges any pair above a 0.88 threshold into a SUMMARY node. The merged embedding is the normalized average of both parents. Merged nodes get archived (not deleted), importance halved, and pinned if lineage_safe_mode is on. The summary node gets importance = `max(parent_a, parent_b) * 0.95`.
**Where**: `stixdb/agent/consolidator.py` -- `Consolidator._find_and_merge()` and `_merge_nodes()`
**Algorithm**:
```
similarity = dot(emb_a, emb_b)  # both already normalized
if similarity >= 0.88:
    avg_emb = normalize((emb_a + emb_b) / 2)
    summary_importance = max(a.importance, b.importance) * 0.95
    # Archive parents, create summary node, add DERIVED_FROM edges
```
**How Forge OS uses it**: This is the condenser's consolidation pass. KAIROS already has sqlite-vec for embeddings. Running a periodic sweep that merges near-duplicate findings/memories above 0.88 cosine similarity is exactly what the condenser pipeline needs. The 0.95 importance preservation prevents information loss during consolidation.
**Steal Priority**: **HIGH** -- retrofit into condenser pipeline. The merge algorithm (average embeddings, preserve max importance, archive parents) is directly portable.

---

### Pattern 6: Exact Duplicate Detection via Content Hashing
**What**: Before semantic dedup, the Consolidator runs exact-duplicate detection using composite hash keys: `question:{hash}`, `document:{hash}:{chunk}`, or `content:{type}:{hash}`. Duplicates are ranked by tier priority (WORKING > SEMANTIC > PROCEDURAL > EPISODIC > ARCHIVED), then importance, then access_count, then recency. The canonical (highest-ranked) survives; others are deleted.
**Where**: `stixdb/agent/consolidator.py` -- `_prune_exact_duplicates()`, `_exact_duplicate_key()`, `_duplicate_rank()`
**How Forge OS uses it**: KAIROS findings deduplication. Currently uses FTS5 similarity matching. This pattern adds a fast pre-pass: hash-based exact dedup before the more expensive FTS5/vector similarity check. The composite key strategy (combining content type + hash) prevents false matches across different node types.
**Steal Priority**: **MEDIUM** -- Phase 8. Add content_hash column to KAIROS findings table, run hash-based dedup before FTS5 dedup.

---

### Pattern 7: Lineage-Safe Consolidation (Provenance Preservation)
**What**: When `lineage_safe_mode=True` (default), source nodes that contribute to summaries are pinned and marked with `lineage_preserved=True` + `lineage_summary_ids`. This prevents the decay system from pruning nodes that are cited by summaries, maintaining audit trails. Summary nodes carry `source_lineage` metadata with original file paths, page numbers, character offsets, and timestamps.
**Where**: `stixdb/agent/consolidator.py` -- `_merge_nodes()` lineage handling
**Metadata preserved**:
```
{
  "node_id", "source", "filepath", "page_number",
  "page_start", "page_end", "char_start", "char_end",
  "created_at", "last_accessed"
}
```
**How Forge OS uses it**: Critical for condenser pipeline. When condensed memories are created, the source memories must remain traceable. The `pinned` flag concept (exempt from decay/pruning) is essential for user-created memories, system memories, and persona kernel memories.
**Steal Priority**: **MEDIUM** -- Phase 8. Add `pinned` boolean and `lineage_summary_ids` to KAIROS schema.

---

### Pattern 8: Autonomous Maintenance Planner (Self-Healing Memory)
**What**: The MaintenancePlanner generates maintenance questions based on coverage gaps in the memory graph. It identifies: uncovered nodes (not referenced by any summary), dominant terms without summaries, source documents without overviews, and co-occurring topics without relationship summaries. Each question gets a priority score. The agent then answers these questions against its own memory, creating/refreshing summary nodes.
**Where**: `stixdb/agent/maintenance.py` -- `MaintenancePlanner` class (6 question builders)
**Question types**:
1. `collection_overview` -- refresh overall memory summary
2. `workflow_verification` -- verify workflow descriptions against source
3. `source_summary` -- summarize per-source-document
4. `tag_summary` -- summarize per-tag/topic
5. `topic_gap` -- fill uncovered high-frequency terms
6. `relationship` -- summarize relationships between co-occurring themes
**How Forge OS uses it**: The condenser pipeline's "rolling condensation" phase. Instead of blindly compressing all memories, this pattern identifies which areas need summary refresh based on coverage analysis. The priority scoring ensures the most valuable summaries get generated first within the mana budget.
**Steal Priority**: **MEDIUM** -- Phase 8+. This is sophisticated and requires the full condenser pipeline to be operational first.

---

### Pattern 9: Collection-Scoped Agent Memory (Per-Persona Isolation)
**What**: Each "collection" in StixDB gets its own MemoryAgent, MemoryGraph, ContextBroker, and background worker loop. Collections are completely isolated -- different agents can't see each other's memories. Cross-collection search is available via `engine.search(collections=[...])`.
**Where**: `stixdb/engine.py` (collection management), `cookbooks/multi-agent/concurrent_agents.py`
**How Forge OS uses it**: Direct mapping to persona-scoped memory in Forge OS. Each persona (Nyx, Pierce, Mara, etc.) gets its own KAIROS collection. The `search(collections=[...])` pattern maps to cross-persona memory retrieval when needed (e.g., Nyx querying Pierce's architectural decisions).
**Steal Priority**: **LOW** -- KAIROS already has scoped memory via the `scope` column. The pattern validates the existing design but doesn't add new capability. The cross-collection search API pattern is worth noting.

---

### Pattern 10: Working Memory Boost in Retrieval Re-ranking
**What**: The ContextBroker applies a re-ranking pass after vector retrieval. Nodes in WORKING tier get a flat +0.15 score boost. High-importance nodes (>0.5) get a graduated boost: `(importance - 0.5) * 0.1`. This means working memory nodes surface more readily in retrieval results without completely overriding semantic relevance.
**Where**: `stixdb/context/broker.py` -- `ContextBroker._rerank()` method
**Algorithm**:
```
adjusted_score = vector_score
if node.tier == WORKING:
    adjusted_score += 0.15
if node.importance > 0.5:
    adjusted_score += (importance - 0.5) * 0.1
```
**How Forge OS uses it**: KAIROS retrieval re-ranking. After sqlite-vec returns initial results, apply tier-based and importance-based boosts before final ranking. This bridges the gap between "semantically relevant" and "contextually important right now."
**Steal Priority**: **MEDIUM** -- integrate into KAIROS retrieval pipeline once tier system exists.

---

### Pattern 11: Ring Buffer Trace System (Bounded Observability)
**What**: The STIXTracer uses a `deque(maxlen=10_000)` as a ring buffer for thinking traces. Every agent decision (query, consolidation, tier change, reasoning) gets recorded as a structured ThinkingTrace. The buffer auto-evicts oldest entries, preventing unbounded memory growth. Optional Prometheus metrics export.
**Where**: `stixdb/observability/tracer.py` -- `STIXTracer` class
**Trace types**: query, user_query, maintenance_query, store, consolidation, promotion, agent_cycle, reasoning, maintenance_summary_refresh
**How Forge OS uses it**: Dispatch queue telemetry. The ring buffer pattern (fixed-size deque) is perfect for keeping the last N dispatch events, agent decisions, and mana expenditures without growing unbounded. The structured trace format with event_type discrimination is clean.
**Steal Priority**: **LOW** -- nice observability pattern. Forge OS may want something more persistent (SQLite-backed), but the ring buffer for hot/recent traces is a good complement.

---

### Pattern 12: Sliding Window Session Management
**What**: Chat sessions use a bounded message history (default max_history=10) with a sliding window -- when the limit is exceeded, oldest messages are dropped. Sessions auto-expire after 24 hours of inactivity. The SessionManager lazily prunes expired sessions on each access.
**Where**: `stixdb/agent/sessions.py` -- `Session` and `SessionManager` classes
**How Forge OS uses it**: Context window management for persona chat sessions. The sliding window with configurable max_history maps to the condenser's context compression. The lazy TTL-based session pruning is a clean pattern for dispatch queue session management.
**Steal Priority**: **LOW** -- basic sliding window. KAIROS needs more sophisticated context management (rolling condensation), but this validates the bounded-history approach.

---

### Pattern 13: Graph Expansion from Seed Nodes (Semantic + Structural Retrieval)
**What**: Retrieval combines vector similarity search with BFS graph expansion. First, top-k nodes are retrieved by cosine similarity. Then, BFS traversal (configurable depth, default 2) follows edges from seed nodes to discover structurally-related context. Results are deduplicated and re-ranked. The graph expansion catches relevant context that might not match the query embedding directly but is connected to matching nodes.
**Where**: `stixdb/graph/memory_graph.py` -- `semantic_search_with_graph_expansion()`, `stixdb/context/broker.py` -- `prepare_context()`
**How Forge OS uses it**: KAIROS retrieval enhancement. After sqlite-vec returns semantic matches, follow edges (if KAIROS has a relation table) to pull in connected memories. This is especially valuable for persona memories where a finding about "authentication" should also pull in connected findings about "session management" even if the query didn't mention sessions.
**Steal Priority**: **LOW** -- requires KAIROS to have an edge/relation table (not currently in scope). Good design target for Phase 9+ knowledge graph features.

---

## Consolidated Steal Map

| # | Pattern | Target System | Priority | Phase |
|---|---------|--------------|----------|-------|
| 1 | Exponential decay with half-life | KAIROS scoring | **HIGH** | Now |
| 2 | Touch-boost on access | KAIROS access path | **HIGH** | Now |
| 3 | Hybrid LRU+LFU scoring | KAIROS composite score | **HIGH** | Now |
| 5 | Similarity-based consolidation | Condenser pipeline | **HIGH** | Now |
| 4 | Tier promotion/demotion | KAIROS tier system | MEDIUM | Phase 8 |
| 6 | Hash-based exact dedup | Findings dedup | MEDIUM | Phase 8 |
| 7 | Lineage-safe consolidation | Condenser provenance | MEDIUM | Phase 8 |
| 8 | Autonomous maintenance planner | Condenser planning | MEDIUM | Phase 8+ |
| 10 | Working memory boost re-ranking | KAIROS retrieval | MEDIUM | Phase 8 |
| 9 | Collection-scoped agent memory | Persona memory | LOW | Validates existing |
| 11 | Ring buffer traces | Dispatch telemetry | LOW | Nice-to-have |
| 12 | Sliding window sessions | Context management | LOW | Validates existing |
| 13 | Graph expansion retrieval | Knowledge graph | LOW | Phase 9+ |

---

## Key Constants Worth Stealing

| Constant | Value | Source | Purpose |
|----------|-------|--------|---------|
| Consolidation similarity threshold | 0.88 | `config.py` | Merge near-duplicates |
| Decay half-life | 48 hours | `config.py` | Memory freshness curve |
| Prune importance threshold | 0.05 | `config.py` | Below this = dead memory |
| Working memory cap | 256 nodes | `config.py` | Hot context limit |
| Max consolidation batch | 64 nodes | `config.py` | Per-cycle merge budget |
| Agent cycle interval | 30 seconds | `config.py` | Background sweep frequency |
| Recency half-life (access scoring) | 12 hours | `planner.py` | Access recency curve |
| Frequency window | 24 hours | `planner.py` | Access frequency window |
| Frequency/recency alpha | 0.6 | `planner.py` | Frequency weighs more |
| Hot promotion threshold | 0.65 | `planner.py` | Combined score for WORKING |
| Cold demotion threshold | 0.26 | `planner.py` | 0.65 * 0.4, exit WORKING |
| Archive threshold | 0.08 | `planner.py` | Decay score for archival |
| Working memory boost | +0.15 | `broker.py` | Re-ranking bonus |
| Touch boost formula | `min(1.0, score * 1.2 + 0.1)` | `node.py` | Access revival |
| Summary importance preservation | 0.95 * max(parents) | `consolidator.py` | Merge importance |
| Session max history | 10 messages | `sessions.py` | Sliding window |
| Session TTL | 24 hours | `sessions.py` | Auto-expire |

---

## Architecture Comparison: StixDB vs Forge OS KAIROS

| Aspect | StixDB | KAIROS (Forge OS) |
|--------|--------|-------------------|
| Storage | Neo4j/KuzuDB/NetworkX graph + vector store | SQLite + sqlite-vec + FTS5 |
| Embeddings | sentence-transformers (384d) | sqlite-vec (dimension TBD) |
| Scoring | decay_score (exponential) + access frequency + importance | semantic + recency + importance (composite) |
| Consolidation | Agent-driven merge at 0.88 cosine threshold | Condenser pipeline (rolling condensation) |
| Dedup | Hash-based exact + vector similarity | FTS5 similarity matching |
| Scoping | Collection per agent | Scope column per persona |
| Context management | Sliding window (10 messages) | Condenser with context budget |
| Background agent | 30s cycle (plan -> promote -> consolidate -> maintain) | Mana-budgeted dispatch queue |
| Tier system | WORKING/EPISODIC/SEMANTIC/PROCEDURAL/ARCHIVED | Not yet explicit |
| Provenance | DERIVED_FROM edges + lineage metadata | TBD |

---

## Implementation Notes for HIGH Priority Patterns

### Decay Formula (SQL-compatible)
```sql
-- KAIROS decay score computation (can run in SQLite)
UPDATE memories SET
  decay_score = importance * POWER(2.0, -(CAST(strftime('%s','now') - last_accessed AS REAL) / 3600.0) / decay_half_life_hours)
WHERE scope = ?;
```

### Touch-Boost (Rust side-effect on retrieval)
```rust
// On every memory retrieval in KAIROS
fn touch_memory(memory: &mut Memory) {
    memory.access_count += 1;
    memory.last_accessed = now();
    memory.decay_score = f64::min(1.0, memory.decay_score * 1.2 + 0.1);
}
```

### Composite Score (retrieval ranking)
```rust
// KAIROS composite score combining all signals
fn composite_score(semantic_sim: f64, memory: &Memory, alpha: f64) -> f64 {
    let recency = 2.0_f64.powf(-(elapsed_hours(memory.last_accessed) / 12.0));
    let frequency = f64::min(1.0, recent_24h_accesses(memory) as f64 / 10.0);
    let access_score = alpha * frequency + (1.0 - alpha) * recency;

    // Weighted combination: semantic relevance + access pattern + importance
    0.5 * semantic_sim + 0.3 * access_score + 0.2 * memory.importance
}
```

### Consolidation Merge (condenser)
```rust
// Condenser merge pass
fn should_merge(emb_a: &[f32], emb_b: &[f32]) -> bool {
    cosine_similarity(emb_a, emb_b) >= 0.88
}

fn merge_importance(a: f64, b: f64) -> f64 {
    f64::max(a, b) * 0.95  // Preserve near-maximum importance
}
```

---

## Repo Quality Assessment

- **Code quality**: Excellent. Clean Pydantic models, well-documented, consistent async patterns.
- **Architecture**: Mature separation of concerns (graph/agent/context/storage/observability).
- **Testing**: Not observed in this mining pass (no test directory visible in tree).
- **Novelty**: The MaintenancePlanner (Pattern 8) is genuinely novel -- self-healing memory via generated maintenance questions is not commonly seen.
- **Applicability to Forge OS**: Very high. StixDB solves the same problem space as KAIROS but in Python/graph-DB land. The algorithms and constants are directly portable to Rust/SQLite.
