# Research Synthesis: April 3, 2026

## Sources: 11 repos — Block Goose, AutoAgent, just-bash, ChromaFs, oh-my-codex, OpenCLI, Glaze, SQLite.swift, background-agents, Lighthouse, awesome-cryptography
## Participants: Nyx (research session)

---

## The Eleven Sources Tell Four Stories

The first three sources (Goose, AutoAgent, just-bash) converge on **how agents should be equipped** — tool registration, capability gating, execution isolation. ChromaFs converges with our prior Karpathy research on **how agents should access knowledge** — virtual filesystems over indexed content. OMX provides the **orchestration layer** — typed state machines, pipeline stages, declarative agent metadata. The infrastructure cluster (OpenCLI, Glaze, SQLite.swift) delivers **performance patterns** for IPC and storage. Background-agents contributes the **lifecycle discipline** — pure decision functions, circuit breakers, recovery sweeps. Lighthouse and awesome-cryptography round out **quality scoring** and **security tooling**.

| Source | Framing | Key Evidence |
|--------|---------|-------------|
| Block Goose | Production agent framework (Rust, 9 crates) | 7 extension transport types, tool whitelist per extension, provider factory registry |
| AutoAgent | Meta-agent optimization loop (Python, 10 files) | Three-tier capability layering, adapter boundary pattern, hill-climbing persona tuning |
| just-bash | Sandboxed execution environment (TypeScript) | Lazy-loading command registry, 18 execution limits, composable filesystems |
| ChromaFs | Virtual FS for documentation AI (Chroma + Redis) | Path tree as index, two-stage grep, per-user RBAC at FS level |
| oh-my-codex | Multi-agent workflow orchestration (TS + Rust) | 30+ agent roles, pipeline stage interface, formal state machine, worker allocation scoring |
| OpenCLI | CLI hub with 73+ site adapters | Dual adapter YAML+code, lifecycle hooks, strategy cascade |
| Glaze | C++23 high-performance serialization | Compile-time key hashing, buffer reuse, binary format for hot paths |
| SQLite.swift | Type-safe SQLite query builder (Swift) | Expression<T> template+bindings, PRAGMA introspection, migration tracking |
| background-agents | Autonomous agent scheduling (CF Workers + Modal) | Pure decision functions, circuit breaker, auto-pause, recovery sweep, dispatch queue |
| Lighthouse | Web performance auditing (Google) | Log-normal scoring with percentile control points, audit base class pattern |
| awesome-cryptography | Curated cryptography library index | Rust security tooling: ring, sodiumoxide, BLAKE3, rage for credential storage |

---

## Convergence Map: 50 Patterns, 10 Themes

### Theme 1: Capability Registration Should Be Lazy, Layered, and Gated

**Patterns:**
| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Extension type registry + tool whitelist | Goose | P7-C patch |
| Three-tier capability layering (preset/custom/MCP) | AutoAgent | P7-C patch |
| Lazy-loading command registry | just-bash | P7-C patch |
| Command allow-list per instance | just-bash | P7-C patch |
| Factory-based tool registration | AutoAgent | P7-C patch |
| Built-in extension macro (DuplexStream) | Goose | P7-C patch |

**Synthesis:** Three independent systems converge on the same architecture: register capabilities eagerly (metadata), load implementations lazily (on first use), gate availability per-consumer (allow-lists). Goose does it with extension configs and tool whitelists. AutoAgent does it with three-tier layering. just-bash does it with lazy imports and constructor allow-lists.

**Forge OS synthesis:** Our CommandRegistry (P7-C, now complete) should be enhanced with:
1. **Lazy handler loading** — `CommandDef` metadata registered at scan time, dispatch handler loaded on first invocation via `OnceCell`
2. **Per-persona tool allow-lists** — derived from `CapabilityFamily` grants at dispatch time, not static config
3. **Three-tier capability model** — base (all personas) → persona-specific → external MCP. The `CapabilityFamily` enum is the preset layer.

This is the **single most actionable cluster** from this research session — 6 patterns all pointing at P7-C enhancement.

---

### Theme 2: Execution Isolation = Fresh State + Shared Workspace

**Patterns:**
| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Per-exec isolation with shared filesystem | just-bash | Validates dispatch model |
| Subagent context isolation | Goose | Validates dispatch model |
| Immutable sessions (read-only FS) | ChromaFs | Validates capability families |

**Synthesis:** Both just-bash and Goose converge on the same isolation boundary: each execution gets clean state (env, context, functions), but the workspace persists across calls. ChromaFs adds that read-only is the default — writes require explicit capability.

**Forge OS validation:** Our dispatch model already does this. Each persona dispatch starts with fresh context (kernel + goal ancestry + relevant findings) but shares the project workspace. `ReadOnly` capability family enforces immutability for gate dispatches. Three independent systems confirm this is the right boundary.

---

### Theme 3: The Filesystem Is the Interface, Not the Storage

**Patterns:**
| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Virtual FS over indexed content | ChromaFs | 8.3 |
| Page reconstruction from chunks | ChromaFs | 8.1/8.2 |
| Composable filesystem (MountableFs) | just-bash | 8.3 |
| Per-user RBAC at FS level | ChromaFs | 8.3 |
| Lazy content resolution (pointers) | ChromaFs | 8.3 |

**Synthesis:** ChromaFs and just-bash's MountableFs converge on: agents should interact with a filesystem *abstraction*, not actual files. The real storage is a database (Chroma, SQLite). The filesystem is an interface layer that provides familiar navigation (ls/cat/grep) while controlling access, caching, and performance at the boundary.

**Forge OS synthesis:** The vault should expose itself as a virtual filesystem to agents:
- **Path tree from sigils** — sigil index files ARE the gzipped JSON path tree. Zero-cost navigation.
- **Chunk-indexed content** — vault articles stored as indexed chunks in SQLite. Reconstructed on `cat`, cached after first assembly.
- **Per-persona tree pruning** — each persona sees a different vault tree based on domain and capabilities. Pruned content doesn't exist, not "permission denied."
- **Lazy resolution** — large artifacts (PDFs, gate reports) stored as pointers. Materialized only on explicit read.

This converges with our prior Karpathy research (vault as living compilation) and Excalibur research (three-tier knowledge access). The virtual FS is the implementation mechanism.

---

### Theme 4: Security Is Layered, Not Binary

**Patterns:**
| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Network allow-list + header injection | just-bash | 8.1 |
| Extension malware check | Goose | Reference |
| Defense-in-depth box | just-bash | Reference |
| AST transform plugin pipeline | just-bash | 7.2 / 8.2 |

**Synthesis:** just-bash implements four security layers: architecture (isolation), defense-in-depth (monkey-patching), network (allow-list), and audit (AST transforms). Goose adds malware checking on extension commands and env var filtering (31 blocked vars). No single layer is sufficient.

**Forge OS synthesis:** Our security model should be:
1. **Architecture** — capability family scoping (what can this persona do?)
2. **Network** — URL allow-list with header injection for external calls
3. **Audit** — dispatch pipeline as transform chain (every action logged before execution)
4. **Runtime** — execution limits per persona (max tool calls, max output size)

---

### Theme 5: The Meta-Agent Pattern Validates Kernel Architecture

**Patterns:**
| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Program-as-markdown | AutoAgent | Validates kernels |
| Adapter boundary (fixed vs. editable) | AutoAgent | Validates kernels |
| Three-tier agent instruction files | just-bash | Validates kernel tiers |
| Meta-agent hill-climbing | AutoAgent | 8.5 |

**Synthesis:** AutoAgent's `program.md` is a kernel file. just-bash's three-tier documentation (CLAUDE.md / AGENTS.md / AGENTS.npm.md) maps to our kernel / persona / dispatch prompt tiers. AutoAgent's adapter boundary IS our kernel boundary — the fixed infrastructure that evolution cannot break.

**Forge OS validation:** Three of four patterns are pure validation of existing architecture. The fourth (hill-climbing) enhances Session 8.5 — persona evolution can use benchmark-driven iteration with keep/discard cycles, gated by dreamtime ritual schedule.

---

### Theme 6: Budget Systems Shape Agent Behavior

**Patterns:**
| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Configurable execution limits | just-bash | 8.1/8.2 |
| Thinking budget control | AutoAgent | 8.1/8.2 |
| SharedProvider double-Arc (hot-swap) | Goose | 8.1 |
| Fast model fallback | Goose | 8.1/8.2 |
| Provider factory registry | Goose | 8.1 |

**Synthesis:** All three code-heavy sources implement budget/limit systems. just-bash has 18 execution limits. AutoAgent exposes thinking token budgets. Goose has provider hot-swapping and fast-model fallback for cost optimization.

**Forge OS synthesis:** The grimoire should define three budget dimensions per persona:
1. **Mana budget** — total token/cost allocation per dispatch (existing)
2. **Thinking budget** — explicit reasoning token allocation (from AutoAgent)
3. **Execution limits** — hard caps on tool calls, file reads, output size (from just-bash)

Fast-model fallback and provider hot-swapping enable the mana economy to optimize automatically — lightweight tasks route to cheap models, heavy tasks get full models, rate limits trigger fallback without failing the dispatch.

---

### Theme 7: Agent Lifecycle Requires Pure Decision Logic + Circuit Protection

**Patterns:**
| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Pure decision functions for lifecycle | background-agents | 8.1 |
| Circuit breaker for dispatch | background-agents | 8.1/8.2 |
| Auto-pause on 3 consecutive failures | background-agents | 8.1 |
| Recovery sweep on every heartbeat tick | background-agents | 8.1 |
| Proactive warming on intent | background-agents | 8.1 |
| Dispatch queue with serial execution | background-agents | 8.2 |
| Typed event condition registry | background-agents | 8.2 |

**Synthesis:** background-agents isolates ALL lifecycle decisions as pure functions — no side effects, fully unit-testable. The lifecycle manager calls decisions, then acts. Circuit breakers prevent retry storms. Recovery sweeps self-heal stuck state. This is the single highest-value addition for our ritual engine: every scheduling decision (`should_fire_heartbeat`, `should_pause_ritual`, `evaluate_circuit_breaker`) becomes a tested pure function.

**Forge OS synthesis:** The ritual engine (8.1) adopts the complete lifecycle discipline:
1. **Pure decision functions** — all scheduling logic isolated from side effects
2. **Circuit breaker** — 3 failures within window → open circuit → operator notified
3. **Auto-pause** — rituals that fail 3 consecutive times auto-disable with logged reason
4. **Recovery sweep** — heartbeat's first action is detecting and cleaning up stuck dispatches/rituals
5. **Proactive warming** — pre-assemble ritual context 5 minutes before scheduled fire time
6. **Serial dispatch queue** — one dispatch per persona at a time, queue persisted in SQLite

---

### Theme 8: Orchestration Needs Typed Pipelines + State Machines

**Patterns:**
| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Declarative capability metadata (reasoning_effort, model_class, routing_role) | oh-my-codex | P7-C patch |
| Pipeline stage interface with canSkip + checkpoint/resume | oh-my-codex | 8.2 |
| Formal state machine with fix loop (max N attempts) | oh-my-codex | 8.2 |
| Phase-based agent composition (per-phase persona recs) | oh-my-codex | 8.2 |
| Worker allocation scoring (role + scope + load) | oh-my-codex | 8.2 |
| Runtime overlay injection (marker-bounded context assembly) | oh-my-codex | 7.2/8.2 |
| Underspecification gating (redirect vague input to planning) | oh-my-codex | 7.2 |
| Three-tier memory sections (priority/working/manual) | oh-my-codex | 8.1 |

**Synthesis:** OMX provides the most complete orchestration reference in this batch. The `PipelineStage` trait with `canSkip` and checkpoint/resume maps directly to our 6-phase build loop. The formal state machine with typed transitions and fix loop (max 3 attempts) enforces what our protocol currently enforces through prose. The declarative capability metadata on agent definitions (reasoning_effort, model_class, routing_role) feeds mana budgets and provider routing without per-agent hardcoding.

**Forge OS synthesis:** Session 8.2 adopts the pipeline and state machine patterns. P7-C patch adds declarative metadata to `RegistryEntry`. The three-tier memory model (priority/working/manual) validates our context assembly tiers: kernel+goal (replaced per dispatch), echoes+findings (append-only, prunable), vault+ADL+grimoire (permanent reference).

---

### Theme 9: Infrastructure Patterns for Performance and Registration

**Patterns:**
| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Dual adapter system (YAML + code) | OpenCLI | P7-C patch (4th validation) |
| Dispatch lifecycle hooks (before/after/startup) | OpenCLI | 8.2 |
| Strategy cascade (minimum privilege) | OpenCLI | 8.2 |
| Compile-time key hash tables for IPC | Glaze | Phase 9 |
| Buffer reuse + padding for zero-alloc IPC | Glaze | Phase 9 |
| Binary format for hot paths | Glaze | Phase 9 |
| Expression<T> template+bindings (type-safe SQL) | SQLite.swift | Phase 9 |
| Schema reader via PRAGMA introspection | SQLite.swift | Phase 9 |
| Log-normal scoring with percentile control points | Lighthouse | 8.3b |

**Synthesis:** OpenCLI's dual adapter (YAML declarative + code imperative) is the fourth independent validation of this pattern (after Goose, AutoAgent, just-bash). Lifecycle hooks (before/after dispatch) provide clean extension points for intelligence modules. Glaze and SQLite.swift contribute Phase 9 performance optimizations — compile-time key hashing for 80+ Tauri command dispatch, buffer reuse for HUD updates, and typed SQL expressions. Lighthouse's log-normal scoring with percentile control points maps directly to the Pareto quality scoring in 8.3b.

---

### Theme 10: Security Tooling for Credential Storage

**Patterns:**
| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Rust cryptography library landscape (ring, sodiumoxide, BLAKE3, rage) | awesome-cryptography | Phase 9 / carried risk R-DS-01 |

**Synthesis:** awesome-cryptography provides the concrete library selection for carried risk R-DS-01 (keyring migration from plaintext SQLite to encrypted credential storage). Ring for TLS/signing, sodiumoxide for symmetric encryption, BLAKE3 for hashing, rage for file-level encryption. This is a Tanaka knowledge bank item — the security persona now has a vetted library shortlist for the Phase 9 pre-release security hardening.

---

## Vocabulary Additions

No new terms this session. All patterns map to existing Forge OS vocabulary (mana, grimoire, echoes, sigils, ley lines, rituals, capability families).

---

## Integration Summary

| Theme | Patterns | Primary Target | Status |
|-------|----------|---------------|--------|
| Capability registration | 6 | P7-C patch | New — enhances completed batch |
| Execution isolation | 3 | Validates existing | Confirmed |
| Virtual filesystem | 5 | Phase 8 Session 8.3 | New enhancements |
| Layered security | 4 | Phase 8 Sessions 8.1/8.2 | New enhancements |
| Kernel validation | 4 | Validates existing + 8.5 | Confirmed + 1 enhancement |
| Budget systems | 5 | Phase 8 Sessions 8.1/8.2 | New enhancements |
| Agent lifecycle discipline | 7 | Phase 8 Session 8.1/8.2 | New — highest-value ritual engine additions |
| Typed pipelines + state machines | 8 | P7-C patch + Phase 8 Session 8.2 | New — orchestration backbone |
| Infrastructure + performance | 9 | P7-C patch + Phase 9 | New — 6 deferred to Phase 9 |
| Security tooling | 1 | Phase 9 / R-DS-01 | Reference — Tanaka knowledge bank |

**50 patterns → 10 themes → 0 new sessions. All integrate into existing seams.**

---

*Research Synthesis — April 3, 2026. 11 sources, 50 patterns, 10 themes.*
*Prior synthesis (April 2): 3 sources, 21 patterns, 7 themes.*
*Cumulative: 14 sources, 71 patterns, 17 themes.*
