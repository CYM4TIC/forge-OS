# Repo Mining Synthesis — April 5, 2026

> 4 repos. 72 documented patterns. Cross-repo integration map for Forge OS.
> Companion to April 4 synthesis (CrewAI, AutoGen, OpenHands, METATRON — 43 patterns).

---

## Repos Mined

| Repo | Stars | Patterns | HIGH | Language | Classification |
|------|-------|----------|------|----------|---------------|
| VoltAgent/awesome-design-md | — | 20 | 6 | Markdown | Design system governance (55 DESIGN.md files) |
| abhigyanpatwari/GitNexus | 22.2k | 20 | 9 | TypeScript | Code intelligence / knowledge graph engine |
| Pr0fe5s0r/StixDB | — | 13 | 4 | Python | Self-adjusting memory for AI agents |
| agenticnotetaking/arscontexta | — | 15 | 5 | Markdown | Cognitive architecture / skill-context graphs |
| **TOTAL** | | **68** | **24** | | |

---

## Cross-Repo Pattern Synthesis

Patterns organized by Forge OS target system, not by source repo.

### 1. KAIROS Memory System (12 patterns)

| # | Pattern | Source | Priority | Phase |
|---|---------|--------|----------|-------|
| K1 | **Exponential decay with half-life** `importance * 2^(-t/48h)` | StixDB | **HIGH** | Retrofit |
| K2 | **Touch-boost on access** `min(1.0, score * 1.2 + 0.1)` | StixDB | **HIGH** | Retrofit |
| K3 | **Hybrid LRU+LFU scoring** `0.6*freq + 0.4*recency` | StixDB | **HIGH** | Retrofit |
| K4 | **RRF hybrid search** `1/(60+rank)` fusion of FTS5 + sqlite-vec | GitNexus | **HIGH** | Retrofit |
| K5 | **Multi-table FTS with score aggregation** | GitNexus | **HIGH** | 8 |
| K6 | **Three-Space routing** (kernel/garden/ops partition) | ArsContexta | **HIGH** | Retrofit |
| K7 | **Incremental embedding with skip sets** | GitNexus | **HIGH** | 8 |
| K8 | Tier-based promotion/demotion (WORKING/SEMANTIC/ARCHIVED) | StixDB | MEDIUM | 8 |
| K9 | Working memory boost in re-ranking (+0.15 for hot tier) | StixDB | MEDIUM | 8 |
| K10 | Staleness via operation distance (not just time) | GitNexus | MEDIUM | 8 |
| K11 | Confidence floor per relationship type | GitNexus | MEDIUM | 8 |
| K12 | Per-type text generation for embeddings | GitNexus | MEDIUM | 8 |

**Key constants to adopt:**
- Decay half-life: 48h (persona-configurable)
- Touch boost: `min(1.0, score * 1.2 + 0.1)`
- RRF K-value: 60
- Consolidation threshold: 0.88 cosine similarity
- Hot tier cap: 256 nodes
- Promotion threshold: 0.65 combined score
- Demotion threshold: 0.26 (0.65 * 0.4)
- Archive threshold: 0.08 decay score
- Prune threshold: 0.05 importance

### 2. Condenser Pipeline (5 patterns)

| # | Pattern | Source | Priority | Phase |
|---|---------|--------|----------|-------|
| C1 | **Similarity-based consolidation** (merge at 0.88 cosine, avg embeddings, 0.95 importance preservation) | StixDB | **HIGH** | Retrofit (P7.5-B) |
| C2 | Hash-based exact dedup pre-pass (before expensive vector dedup) | StixDB | MEDIUM | 8 |
| C3 | Lineage-safe consolidation (pin source nodes, preserve provenance) | StixDB | MEDIUM | 8 |
| C4 | Autonomous maintenance planner (self-healing via coverage gap analysis) | StixDB | MEDIUM | 8+ |
| C5 | Condition-based triggers (replace time-based scheduling) | ArsContexta | MEDIUM | 8 |

### 3. Agent Dispatch (10 patterns)

| # | Pattern | Source | Priority | Phase |
|---|---------|--------|----------|-------|
| D1 | **Tiered resolution with confidence** (exact 0.95 / adjacent 0.8 / global 0.5, refuse on ambiguity) | GitNexus | **HIGH** | 8 |
| D2 | **Next-step hint guidance** (agent returns suggest next action) | GitNexus | **HIGH** | Retrofit |
| D3 | **Ralph subagent spawning** (fresh context per phase, count verification) | ArsContexta | **HIGH** | 8 |
| D4 | **Blast radius analysis** (BFS upstream/downstream, risk scoring) | GitNexus | **HIGH** | 8 |
| D5 | **WHY/HOW/WHAT query classification** for retrieval routing | ArsContexta | **HIGH** | 8 |
| D6 | **Signal-to-dimension derivation** (confidence-weighted capability profiling) | ArsContexta | MEDIUM | 8+ |
| D7 | Cascade constraints (hard/soft/compensating capability validation) | ArsContexta | MEDIUM | 8+ |
| D8 | Topological sort for dependency ordering (Kahn's algorithm) | GitNexus | **HIGH** | Retrofit |
| D9 | Augmentation engine (batch-query related context before agent tasks) | GitNexus | **HIGH** | 8 |
| D10 | Global registry for agent capability discovery | GitNexus | **HIGH** | 8 |

### 4. Build Process & Governance (7 patterns)

| # | Pattern | Source | Priority | Phase |
|---|---------|--------|----------|-------|
| B1 | **Session lifecycle** (Orient/Work/Persist) — validates BOOT.md pattern | ArsContexta | **HIGH** | Retrofit |
| B2 | **6 conflation failures** (memory-space contamination taxonomy) | ArsContexta | **HIGH** | Retrofit |
| B3 | 15-primitive kernel validation (3-pass coherence check) | ArsContexta | MEDIUM | 8+ |
| B4 | Feature block composition (always-included vs conditional modules) | ArsContexta | MEDIUM | 8+ |
| B5 | Seed-evolve-reseed lifecycle (kernel versioning with drift detection) | ArsContexta | MEDIUM | 9+ |
| B6 | 10 documented failure modes (Collector's Fallacy, Orphan Drift, etc.) | ArsContexta | LOW | Reference |
| B7 | Propose-not-implement for self-modification | ArsContexta | LOW | Reference |

### 5. Design Intelligence (10 patterns)

| # | Pattern | Source | Priority | Phase |
|---|---------|--------|----------|-------|
| V1 | **9-Section DESIGN.md format** (standardized, agent-optimized) | design-md | **HIGH** | Retrofit |
| V2 | **Border-as-depth system** (replace shadows with rgba white overlays) | design-md | **HIGH** | Retrofit |
| V3 | **Persona-colored glow effects** (`drop-shadow(0 0 Npx {color})`) | design-md | **HIGH** | Retrofit |
| V4 | **Luminance stacking** (rgba white 0.02/0.04/0.05 surface hierarchy) | design-md | **HIGH** | Retrofit |
| V5 | **Do's/Don'ts as machine-readable constraints** | design-md | **HIGH** | Retrofit |
| V6 | **Off-white text** (never pure `#ffffff` on dark) | design-md | **HIGH** | Retrofit |
| V7 | Three-font system (display/body/code triplet) | design-md | MEDIUM | 8+ |
| V8 | Weight hierarchy inversion (cap at 500-600, avoid 700+) | design-md | MEDIUM | 8+ |
| V9 | Letter-spacing compression at display sizes | design-md | MEDIUM | 8+ |
| V10 | HSL+alpha color tokens for programmatic persona-color derivation | design-md | MEDIUM | 8+ |

### 6. Knowledge Garden (5 patterns)

| # | Pattern | Source | Priority | Phase |
|---|---------|--------|----------|-------|
| G1 | Leiden community detection for functional clustering | GitNexus | MEDIUM | 9+ |
| G2 | Knowledge graph analysis (8 ops: health, triangles, bridges, hubs, siblings, traversal, schema, clusters) | ArsContexta | MEDIUM | 9+ |
| G3 | Graph expansion from seed nodes (vector + BFS) | StixDB | LOW | 9+ |
| G4 | 6 Rs extraction pipeline (Record/Reduce/Reflect/Reweave/Verify/Rethink) | ArsContexta | MEDIUM | 8+ |
| G5 | LLM-based cluster enrichment with batch processing | GitNexus | LOW | 9+ |

---

## Retrofit Map (Phases 1-7)

Patterns that warrant going back to patch shipped code:

### Immediate Retrofits (apply to P7.5 or before Phase 8)

| ID | Pattern | Target File(s) | Action |
|----|---------|----------------|--------|
| K1 | Exponential decay | `src-tauri/src/database/memory.rs` (or KAIROS scoring module) | Replace linear decay with `2^(-t/48h)` formula |
| K2 | Touch-boost | KAIROS retrieval path | Add `touch()` side-effect on every memory access |
| K3 | Hybrid scoring | KAIROS composite score | Add access_count + frequency_score to composite |
| K4 | RRF fusion | KAIROS retrieval | Implement `1/(60+rank)` fusion of FTS5 + sqlite-vec results |
| K6 | Three-Space routing | KAIROS schema + memory.rs | Add `space` column (kernel/garden/ops) to enforce partition |
| C1 | Consolidation merge | `src-tauri/src/database/condenser.rs` | Merge nodes at 0.88 cosine, avg embeddings, 0.95 importance |
| D2 | Next-step hints | All agent return formats | Append `suggested_next:` to agent output blocks |
| D8 | Topological sort | Batch manifest tooling | Validate batch dependencies with Kahn's algorithm |
| B1 | Orient/Work/Persist | BOOT.md + kernel boot | Validate existing boot sequence maps to this pattern (it does — document explicitly) |
| B2 | 6 conflation failures | Memory partitioning rules | Add to KAIROS design constraints / BUILD-LEARNINGS |
| V1 | DESIGN.md | New: `docs/DESIGN.md` | Create using 9-section format |
| V2 | Border-as-depth | `globals.css`, component tokens | Replace shadow-based elevation with rgba white overlays |
| V3 | Persona glows | Persona color token system | Define glow levels per persona color |
| V4 | Luminance stacking | Surface hierarchy tokens | Define 3-4 surface levels as rgba white increments |
| V5 | Do's/Don'ts | Riven gate criteria | Encode as design lint rules |
| V6 | Off-white text | Text color tokens | Set primary text to `#f2f2f2` - `#fafafa`, never `#ffffff` |

### Phase 8 Integration Points

| ID | Pattern | Integration Session | Notes |
|----|---------|-------------------|-------|
| K5 | Multi-table FTS | Session 8.1 (KAIROS) | Query each memory type table separately, merge scores |
| K7 | Incremental embedding | Session 8.1 | Skip unchanged, cap at constraint |
| D1 | Tiered confidence | Session 8.2 (dispatch) | Exact/adjacent/global resolution tiers |
| D3 | Ralph spawning | Session 8.2 | Fresh context per phase, count verification |
| D4 | Blast radius | Session 8.3 (gates) | BFS impact analysis before build ops |
| D5 | WHY/HOW/WHAT | Session 8.1 (KAIROS) | Query classification → routing strategy |
| D9 | Augmentation engine | Session 8.2 | Batch-query context before agent dispatch |
| D10 | Global registry | Session 8.2 | Agent capability discovery API |
| C2 | Hash dedup | Session 8.1 | Content hash pre-pass before FTS5 dedup |
| C3 | Lineage-safe | Session 8.1 | Pinned flag + lineage metadata on condensed nodes |

---

## Agent/Kernel Augmentation Targets

Files that should be augmented with new patterns from this mining session:

### Persona Kernels

| Kernel | New Patterns | Source |
|--------|-------------|--------|
| `forge/kernels/mara-kernel.md` | 9-section DESIGN.md validation, dark-mode Do's/Don'ts checklist, border-as-depth audit, off-white text check | design-md |
| `forge/kernels/riven-kernel.md` (or Riven sub-agents) | Luminance stacking tokens, persona glow system, HSL+alpha tokens, weight hierarchy, three-font system, pill/sharp radius discipline | design-md |
| `forge/kernels/sable-kernel.md` | Vocabulary transforms per persona, personality dimension framework | ArsContexta |
| `forge/kernels/pierce-kernel.md` | Blast radius analysis (BFS impact), topological dependency validation | GitNexus |
| `forge/kernels/kehinde-kernel.md` | Three-Space memory partition, RRF hybrid search, tiered confidence dispatch | GitNexus, ArsContexta, StixDB |

### Intelligence Agents

| Agent | New Patterns | Source |
|-------|-------------|--------|
| `agents/scout.md` | Augmentation engine (batch context assembly), WHY/HOW/WHAT query classification | GitNexus, ArsContexta |
| `agents/sentinel.md` | Condition-based maintenance triggers, drift detection framework | ArsContexta |
| `agents/meridian.md` | Cross-repo contract matching, community detection for surface clustering | GitNexus |
| `agents/arbiter.md` | Signal-to-dimension derivation, cascade constraints | ArsContexta |
| `agents/kiln.md` | Incremental embedding skip sets, chunk budget for memory-bounded processing | GitNexus |

### Governance Files

| File | New Content | Source |
|------|------------|--------|
| `docs/TAURI-BUILD-PLAN.md` Integration Map | 16 new patterns targeting Sessions 8.1-8.3 | All repos |
| `BUILD-LEARNINGS.md` | Three-Space conflation failures, dark-mode Do's/Don'ts, RRF constants | All repos |
| New: `docs/DESIGN.md` | Forge OS design system in 9-section format | design-md |

---

## Novel Insights (not found in April 4 mining)

1. **RRF hybrid search** — the missing fusion algorithm for FTS5 + sqlite-vec (GitNexus)
2. **Three-Space routing with 6 conflation failures** — most thorough memory partition taxonomy found (ArsContexta)
3. **Confidence-weighted dimension resolution** — formal aggregation for capability profiling (ArsContexta)
4. **Cascade constraints as forcing functions** — hard/soft/compensating trichotomy for capability coherence (ArsContexta)
5. **Subagent count verification invariant** — `spawned == tasks` as integrity check (ArsContexta)
6. **Touch-boost formula** — `min(1.0, score * 1.2 + 0.1)` revives memories on access (StixDB)
7. **Luminance stacking** — persona-color-independent surface hierarchy via white overlays (design-md)
8. **9-section DESIGN.md format** — standardized, agent-optimized design system governance (design-md)
9. **Next-step hint guidance** — self-chaining agent workflows without orchestration (GitNexus)
10. **Categories before gates** — prevent premature rejection of extractable content (ArsContexta)

---

## Session Accounting

| Metric | Count |
|--------|-------|
| Repos mined | 4 |
| Mining reports written | 4 (research/mining/) |
| Patterns documented | 68 |
| HIGH priority | 24 |
| MEDIUM priority | 30 |
| LOW priority | 14 |
| Immediate retrofits identified | 16 |
| Phase 8 integration points | 10 |
| Agent/kernel augmentation targets | 10 agents + 5 kernels |
| Novel insights (not in April 4 mining) | 10 |
| **Combined mining total (April 4 + 5)** | **111 patterns across 8 repos** |
