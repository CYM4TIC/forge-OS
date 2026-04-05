# GitNexus Mining Report
**Repo**: github.com/abhigyanpatwari/GitNexus (22.2k stars, 569 commits)
**Date**: 2026-04-05
**Mined by**: Research Agent
**Classification**: Context graph / knowledge graph / Graph RAG engine for codebases

---

## REPO SUMMARY

GitNexus is a zero-server code intelligence engine that transforms codebases into knowledge graphs. It parses source via Tree-sitter, builds a typed property graph (41 node labels, 21 relationship types), runs Leiden community detection, traces execution flows from entry points, and exposes everything through MCP tools and hybrid search (BM25 + semantic + RRF). The web UI uses Sigma.js/WebGL for graph visualization. Storage is LadybugDB (an embedded graph DB using Cypher queries). 14 languages supported.

Core insight: **precompute everything at index time** so agents get reliable one-call context retrieval instead of multi-hop exploration.

---

## STEAL PATTERNS (20 patterns)

---

### Pattern 1: Reciprocal Rank Fusion (RRF) for Hybrid Search
**What**: Combines BM25 keyword search and semantic vector search using the formula `1/(K + rank)` where K=60. Scores from both systems are summed per document. No normalization needed -- RRF naturally balances disparate score scales.
**Where**: `gitnexus/src/core/search/hybrid-search.ts`
**Data structures**: `HybridSearchResult { filePath, score, rank, sources: ('bm25'|'semantic')[], bm25Score?, semanticScore? }`
**How Forge uses it**: **KAIROS memory retrieval**. KAIROS currently plans FTS5 + sqlite-vec. RRF is the missing fusion layer. When a query hits both FTS5 and vector search, merge results with RRF instead of picking one. Also applicable to Scout (pre-build reconnaissance) combining structural and semantic search.
**Steal priority**: **HIGH** -- implement in KAIROS retrieval layer (Phase 7/8)

---

### Pattern 2: Multi-Table FTS with Score Aggregation
**What**: Runs parallel full-text searches across 5 separate node tables (File, Function, Class, Method, Interface), then merges results by key (filePath), summing scores for the same entity across tables. A function hit + file hit = boosted relevance.
**Where**: `gitnexus/src/core/search/bm25-index.ts`
**How Forge uses it**: **KAIROS memory**. Memory stores different entity types (decisions, code snippets, conversations, personas). Run FTS5 across each table independently, then merge with score summing before RRF fusion with vector results. This catches entities relevant in multiple contexts.
**Steal priority**: **HIGH** -- Phase 7 KAIROS schema design

---

### Pattern 3: Tiered Resolution with Confidence Scoring
**What**: Symbol resolution uses three tiers: same-file (0.95 confidence), import-scoped (0.9), global (0.5). Each resolution tier maps to an edge confidence value. Edges only emit when exactly one target survives filtering -- ambiguous matches are refused.
**Where**: `gitnexus/src/core/ingestion/resolution-context.ts`, `gitnexus/src/core/ingestion/call-processor.ts`
**How Forge uses it**: **Agent dispatch routing**. When dispatch receives a task, resolve which agent/sub-agent handles it using tiered confidence: exact match on agent capability (0.95), domain-adjacent agent (0.8), global fallback (0.5). Refuse dispatch when ambiguous. Also applicable to Build Triad gate evaluation -- confidence-tagged edges between build artifacts and their test coverage.
**Steal priority**: **HIGH** -- core dispatch intelligence pattern

---

### Pattern 4: Leiden Community Detection for Functional Clustering
**What**: Builds a Graphology graph from code symbols + relationships, runs Leiden algorithm with resolution tuning (higher for large graphs >10K nodes), generates heuristic labels from file path patterns and function name prefixes. Computes cohesion scores (internal edge density).
**Where**: `gitnexus/src/core/ingestion/community-processor.ts`
**Key details**: 60s timeout with fallback to single community. Filters low-confidence edges (<0.5) and degree-1 nodes in large graphs. 12-color palette for visualization.
**How Forge uses it**: **Knowledge Garden visualization**. When rendering the react-three-fiber knowledge graph, use community detection to cluster related nodes. KAIROS memories could be clustered into semantic neighborhoods. Agent workspace boundaries could be discovered rather than hardcoded.
**Steal priority**: **MEDIUM** -- Phase 8+ Knowledge Garden, but the concept of auto-discovered agent domains is HIGH

---

### Pattern 5: Process/Execution Flow Tracing via BFS
**What**: Identifies entry points via multi-factor scoring, then traces execution flows via BFS following CALLS edges. Deduplicates paths by removing subsets. Keeps only longest path per entry-terminal pair. Configurable: maxTraceDepth=10, maxBranching=4, maxProcesses=75, minSteps=3.
**Where**: `gitnexus/src/core/ingestion/process-processor.ts`
**How Forge uses it**: **Agent workflow tracing / KAIROS provenance**. Trace how a user request flows through dispatch -> agent -> sub-agents -> tools. Store as Process nodes in KAIROS. Enable "show me how this decision was made" queries. Also: Scout pre-build reconnaissance can trace build dependency chains.
**Steal priority**: **HIGH** -- applies to agent dispatch tracing and KAIROS provenance

---

### Pattern 6: Entry Point Scoring (Multi-Factor)
**What**: `score = baseScore * exportMultiplier * nameMultiplier * frameworkMultiplier` where baseScore = `calleeCount / (callerCount + 1)`. Functions with many outgoing calls and few incoming are entry points. Utility functions get 0.3x penalty. 13-language pattern support with universal patterns (main, init, handle*, on*).
**Where**: `gitnexus/src/core/ingestion/entry-point-scoring.ts`
**How Forge uses it**: **Agent importance scoring**. In KAIROS, score memory nodes by access patterns: nodes frequently queried but rarely updated = high-value reference material. Nodes that trigger many downstream actions = entry points worth preserving. The multiplier-based scoring is a clean pattern for multi-factor importance.
**Steal priority**: **MEDIUM** -- refine KAIROS importance scoring

---

### Pattern 7: Blast Radius / Impact Analysis via BFS
**What**: Bidirectional graph traversal (upstream callers / downstream callees) using BFS with configurable depth. Enriches results with affected processes and modules. Risk scoring: d=1 = "will break", d=2+ = "indirect risk". Risk levels (none/low/medium/high/critical) based on direct impact count + affected process quantity.
**Where**: `gitnexus/src/mcp/local/local-backend.ts` (impact tool handler)
**How Forge uses it**: **Build Triad gate evaluation**. Before any build operation, run impact analysis: which files/modules will be affected? How many downstream tests need re-running? This is exactly what the Build Triad gates need for go/no-go decisions. Also: Meridian cross-surface consistency -- when a change propagates, what surfaces are affected?
**Steal priority**: **HIGH** -- Build Triad + Meridian, Phase 7

---

### Pattern 8: Next-Step Hint Workflow Guidance
**What**: After each tool response, the MCP server appends a "next-step hint" guiding the agent to the logical next action (e.g., after context() -> suggest impact() to check blast radius). Self-guiding workflows without explicit orchestration hooks.
**Where**: `gitnexus/src/mcp/server.ts` (`getNextStepHint()` function)
**How Forge uses it**: **Agent dispatch chaining**. After each agent completes a task, append recommended next actions based on what was just done. This is lighter than full orchestration -- the agent decides whether to follow. Applicable to all 10 intelligence agents.
**Steal priority**: **HIGH** -- trivial to implement, huge UX improvement for agent continuity

---

### Pattern 9: Staleness Detection via Git Commit Distance
**What**: Compares stored commit hash against HEAD using `git rev-list --count`. Binary stale/fresh with commit distance. Simple, fast, zero-overhead.
**Where**: `gitnexus/src/core/git-staleness.ts`
**How Forge uses it**: **KAIROS recency decay**. Instead of pure time-based decay, track "commits since last access" or "operations since last reference" as a staleness metric. Combine with time decay for richer recency scoring. Also: build artifact staleness for Scout.
**Steal priority**: **MEDIUM** -- KAIROS recency enhancement

---

### Pattern 10: Symbol Table with Four Index Strategies
**What**: SymbolTable maintains 4 parallel indexes: file-scoped (O(1) exact lookup), global (project-wide fuzzy), callable-only (lazy, invalidated on mutation), field-by-owner (class.field resolution). Properties bypass global indexing to avoid namespace pollution.
**Where**: `gitnexus/src/core/ingestion/symbol-table.ts`
**How Forge uses it**: **KAIROS entity resolution**. Memories reference entities (files, agents, surfaces, users). Build a multi-strategy lookup: exact (by ID), scoped (by agent/surface), fuzzy (by name/description), owner-scoped (persona.tool). The lazy callable index pattern is useful -- only build expensive indexes when queried.
**Steal priority**: **MEDIUM** -- Phase 8 KAIROS entity layer

---

### Pattern 11: Topological Sort for Dependency Propagation (Kahn's Algorithm)
**What**: Groups files by import dependency level using Kahn's algorithm. Files at the same level can be processed in parallel. Detects and isolates circular dependencies. Enables cross-file type propagation in dependency order.
**Where**: `gitnexus/src/core/ingestion/pipeline.ts` (`topologicalLevelSort()`)
**How Forge uses it**: **Build Triad dependency ordering**. When multiple agents contribute to a build, determine execution order. Also: batch manifests -- determine which batches can run in parallel vs. which have dependencies. KAIROS knowledge propagation -- when a fact is updated, propagate to dependent memories in topological order.
**Steal priority**: **HIGH** -- Build Triad + batch scheduling, Phase 7

---

### Pattern 12: Connection Pool with LRU Eviction
**What**: Per-repo connection pool: max 5 repos (LRU eviction), 8 connections per repo, 5-min idle timeout. Deduplicates concurrent initialization. Write-blocking on read-only connections. Query timeout (30s), waiter queue timeout (15s).
**Where**: `gitnexus/src/core/lbug/pool-adapter.ts`
**How Forge uses it**: **Agent database access**. With 10 agents + 35 sub-agents potentially querying SQLite concurrently, need a connection pool with LRU eviction for workspace databases. The write-blocking pattern prevents read-only agents from corrupting data. Directly applicable to KAIROS SQLite access.
**Steal priority**: **MEDIUM** -- Phase 8 performance optimization, but design for it in Phase 7

---

### Pattern 13: Confidence Floor per Relationship Type
**What**: Different relationship types have minimum confidence thresholds: CALLS/IMPORTS=0.9, EXTENDS/IMPLEMENTS=0.85, ACCESSES=0.8, HAS_METHOD/HAS_PROPERTY=0.95, fallback=0.5. Used to filter noise from graph queries.
**Where**: `gitnexus/src/mcp/local/local-backend.ts`
**How Forge uses it**: **KAIROS edge confidence**. When agents create memory connections (e.g., "this decision relates to that requirement"), assign confidence by relationship type. Direct references=0.95, inferred connections=0.7, temporal proximity=0.5. Filter low-confidence edges in queries to reduce noise.
**Steal priority**: **MEDIUM** -- KAIROS schema design

---

### Pattern 14: Augmentation Engine (Graph-Enriched Search)
**What**: Takes a search pattern, runs BM25, maps file results to specific symbols, then batches 3 relationship queries (callers, callees, process participation). Sorts by community cohesion. Returns structured text with pure relationships. Graceful degradation -- returns empty string on any error.
**Where**: `gitnexus/src/core/augmentation/engine.ts`
**How Forge uses it**: **Agent context assembly**. When an agent receives a task, augment it with related context from KAIROS: what other agents have done in this area, what decisions were made, what test results exist. The batch-query-then-sort-by-cohesion pattern is directly applicable.
**Steal priority**: **HIGH** -- agent context assembly, Phase 7/8

---

### Pattern 15: LLM-Based Cluster Enrichment with Batch Processing
**What**: Sends community members to LLM for semantic naming and description. Batch mode: groups 5 clusters per LLM call. Fallback to heuristic labels on failure. Token estimation via `chars/4`. Progress callbacks.
**Where**: `gitnexus/src/core/ingestion/cluster-enricher.ts`
**How Forge uses it**: **KAIROS auto-documentation**. When memory clusters are detected, use LLM to name them. "This cluster of 12 memories is about: Authentication Flow Refactoring." Also: Knowledge Garden node labeling. The batch-5-per-call pattern reduces API costs.
**Steal priority**: **LOW** -- nice-to-have for Knowledge Garden, Phase 9+

---

### Pattern 16: Service Boundary Detection
**What**: Identifies service boundaries in monorepos by scanning for markers (package.json, go.mod, Dockerfile, pom.xml) + source file presence. Confidence scoring: 1.0 for 3+ markers, 0.9 for 2, 0.75 for 1. Longest-path matching assigns files to services.
**Where**: `gitnexus/src/core/group/service-boundary-detector.ts`
**How Forge uses it**: **Agent workspace discovery**. Auto-detect which parts of Forge OS belong to which agent's domain. If a directory has Rust files + Cargo.toml + test files, it's a Rust agent workspace. Useful for Scout reconnaissance -- map the project landscape before build.
**Steal priority**: **LOW** -- Forge OS has explicit agent boundaries, but useful for user projects

---

### Pattern 17: Cross-Repo Contract Matching
**What**: Extracts provider/consumer contracts (HTTP endpoints, gRPC services, library exports), normalizes IDs, performs exact + wildcard matching across repos. Creates CrossLink objects with 1.0 confidence for exact matches. Filters same-repo matches.
**Where**: `gitnexus/src/core/group/matching.ts`, `gitnexus/src/core/group/contract-extractor.ts`
**How Forge uses it**: **Meridian cross-surface consistency**. When Frontend surface exports a component API and Backend surface consumes it, detect contract mismatches. Also: inter-agent contract validation -- if Agent A produces output consumed by Agent B, validate the contract.
**Steal priority**: **MEDIUM** -- Meridian Phase 8

---

### Pattern 18: Incremental Embedding with Skip Sets
**What**: Embedding pipeline accepts `skipNodeIds` parameter to avoid re-embedding unchanged nodes. Loads cached embeddings from previous runs. Only re-embeds when dimensions change. Caps at 50K nodes before skipping entirely.
**Where**: `gitnexus/src/core/embeddings/embedding-pipeline.ts`
**How Forge uses it**: **KAIROS incremental indexing**. When new memories are added, only embed the new ones. Track which memories have valid embeddings. Re-embed only on model change or schema migration. The 50K cap is a useful precedent for RTX 3050 constraint.
**Steal priority**: **HIGH** -- KAIROS embedding efficiency, Phase 7

---

### Pattern 19: Text Generation for Embeddings (Symbol-to-Text)
**What**: Converts code symbols to embedding-friendly text by combining metadata (name, file path, directory) with truncated code snippets. Different generators for functions, classes, methods, interfaces, files. Max 300 chars for file snippets. Preserves word boundaries during truncation.
**Where**: `gitnexus/src/core/embeddings/text-generator.ts`
**How Forge uses it**: **KAIROS memory embedding**. Different memory types need different text representations for embedding: decision memories should emphasize rationale, code memories should emphasize structure, conversation memories should emphasize intent. The per-type generator pattern is the right architecture.
**Steal priority**: **MEDIUM** -- KAIROS embedding pipeline design

---

### Pattern 20: Global Registry with MCP Discovery
**What**: Repositories self-register in `~/.gitnexus/registry.json`. Single MCP server registration works across all projects. Any working directory can discover and access any indexed repo. Staleness tracked per-repo.
**Where**: Architecture-level pattern across `gitnexus/src/mcp/server.ts`, `gitnexus/src/core/run-analyze.ts`
**How Forge uses it**: **Agent workspace registry**. Each agent registers its capabilities and workspace scope in a central registry. Dispatch queries the registry to route tasks. Knowledge Garden queries the registry to know what knowledge domains exist. This is the "nervous system" pattern GitNexus claims -- a global registry that makes everything discoverable.
**Steal priority**: **HIGH** -- core Forge OS architecture, Phase 7

---

## ARCHITECTURE PATTERNS (meta-level)

### A1: Precompute at Index Time, Not Query Time
GitNexus's core philosophy: build the graph, detect communities, trace processes, score entry points -- all at analysis time. Queries are lookups, not computations. Forge OS implication: KAIROS should precompute relationship graphs, importance scores, and cluster memberships during memory ingestion, not during retrieval.

### A2: Property Graph > Triple Store
GitNexus uses a typed property graph (nodes with labels + properties, edges with types + confidence + reason). This is richer than RDF triples and supports confidence-scored fuzzy relationships. KAIROS should follow this model, not a flat key-value store.

### A3: Single Relation Table with Type Property
Instead of separate tables per relationship type, one CodeRelation table with a `type` column. Simplifies queries (single JOIN), enables type-agnostic traversal, still allows type-specific filtering. KAIROS should use this pattern for memory relationships.

### A4: CSV Bulk Loading for Graph Ingestion
LadybugDB adapter streams nodes and relationships as CSV for bulk import, with retry logic and fallback to one-by-one inserts. For KAIROS, batch memory ingestion via CSV import will be faster than individual INSERT statements.

### A5: Chunk Budget for Memory-Bounded Processing
Pipeline processes source in 20MB chunks with AST cache (LRU, 50 files). This prevents OOM on large repos. Forge OS agents should have similar mana-like budgets for memory operations -- don't load the entire knowledge graph, work in bounded chunks.

---

## PRIORITY SUMMARY

### HIGH (implement Phase 7-8) -- 9 patterns
1. Reciprocal Rank Fusion (RRF) for hybrid search
2. Multi-table FTS with score aggregation
3. Tiered resolution with confidence scoring
5. Process/execution flow tracing (agent provenance)
7. Blast radius / impact analysis (Build Triad gates)
8. Next-step hint workflow guidance
11. Topological sort for dependency ordering
14. Augmentation engine (agent context assembly)
18. Incremental embedding with skip sets
20. Global registry with MCP discovery

### MEDIUM (Phase 8+) -- 8 patterns
4. Leiden community detection (Knowledge Garden)
6. Entry point scoring (KAIROS importance)
9. Staleness via commit distance (recency decay)
10. Symbol table with 4 index strategies
12. Connection pool with LRU eviction
13. Confidence floor per relationship type
17. Cross-repo contract matching (Meridian)
19. Text generation for embeddings

### LOW (nice-to-have) -- 3 patterns
15. LLM-based cluster enrichment
16. Service boundary detection

---

## KEY FILES REFERENCE

| File | Contains |
|------|----------|
| `gitnexus/src/core/search/hybrid-search.ts` | RRF fusion algorithm |
| `gitnexus/src/core/search/bm25-index.ts` | Multi-table FTS aggregation |
| `gitnexus/src/core/ingestion/pipeline.ts` | Full pipeline + topological sort |
| `gitnexus/src/core/ingestion/community-processor.ts` | Leiden clustering |
| `gitnexus/src/core/ingestion/process-processor.ts` | Execution flow tracing |
| `gitnexus/src/core/ingestion/entry-point-scoring.ts` | Multi-factor scoring |
| `gitnexus/src/core/ingestion/call-processor.ts` | Tiered resolution + confidence |
| `gitnexus/src/core/ingestion/resolution-context.ts` | 3-tier symbol resolution |
| `gitnexus/src/core/ingestion/symbol-table.ts` | 4-index symbol table |
| `gitnexus/src/core/ingestion/cluster-enricher.ts` | LLM batch enrichment |
| `gitnexus/src/core/lbug/schema.ts` | Graph DB schema (41 node types) |
| `gitnexus/src/core/lbug/lbug-adapter.ts` | DB adapter with retry/bulk load |
| `gitnexus/src/core/lbug/pool-adapter.ts` | Connection pool + LRU eviction |
| `gitnexus/src/core/embeddings/embedding-pipeline.ts` | Incremental embedding |
| `gitnexus/src/core/embeddings/text-generator.ts` | Symbol-to-text for embeddings |
| `gitnexus/src/core/augmentation/engine.ts` | Graph-enriched search augmentation |
| `gitnexus/src/core/git-staleness.ts` | Commit-distance staleness |
| `gitnexus/src/core/group/matching.ts` | Cross-repo contract matching |
| `gitnexus/src/core/group/service-boundary-detector.ts` | Service boundary detection |
| `gitnexus/src/mcp/server.ts` | MCP server + next-step hints |
| `gitnexus/src/mcp/local/local-backend.ts` | All tool implementations |
| `gitnexus/src/mcp/resources.ts` | Resource URI templates |
| `gitnexus-shared/src/graph/types.ts` | GraphNode/GraphRelationship types |
| `gitnexus-web/src/components/GraphCanvas.tsx` | Sigma.js visualization |

---

## FORGE OS SYSTEM MAPPING

| GitNexus Concept | Forge OS Target | Notes |
|-----------------|----------------|-------|
| Hybrid search (RRF) | KAIROS retrieval | FTS5 + sqlite-vec + RRF fusion |
| Community detection | Knowledge Garden | Cluster visualization in react-three-fiber |
| Process tracing | Agent dispatch provenance | Trace task -> agent -> sub-agent -> result |
| Impact analysis | Build Triad gates | Blast radius before build operations |
| Entry point scoring | KAIROS importance | Multi-factor memory importance scoring |
| Staleness detection | KAIROS recency decay | Commit-distance + time-based hybrid |
| Next-step hints | All agents | Self-guiding workflow after each action |
| Tiered resolution | Dispatch routing | Confidence-scored agent selection |
| Topological sort | Batch manifests | Parallel vs. sequential batch ordering |
| Contract matching | Meridian | Cross-surface API consistency |
| Augmentation engine | Agent context | Batch-query related context before task |
| Global registry | Workspace registry | Agent capability discovery |
| Connection pooling | KAIROS SQLite | Multi-agent concurrent DB access |
| Incremental embedding | KAIROS indexing | Skip unchanged memories |
| Symbol table indexes | KAIROS entity lookup | Multi-strategy memory resolution |
