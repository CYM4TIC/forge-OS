# Research-to-Persona Map

> **Generated:** P7.5-C Research Audit (2026-04-05)
> **Purpose:** Every research artifact accounted for. Every persona's full professional depth visible.
> **Sources audited:** 3 synthesis docs, 6 mining reports, 19 research docs, 14 reference NOTES.md, 5 skills, 2 attack libraries, 6 absorbed agent capabilities.

---

## Source Inventory

| Category | Count | Documents |
|----------|-------|-----------|
| Synthesis docs | 3 | RESEARCH-SYNTHESIS-2026-04-{02,03}.md, SYNTHESIS-APRIL5.md |
| Mining reports | 6 | crewai, autogen, openhands, gitnexus, arscontexta, design-md (METATRON patterns embedded in crewai/autogen/openhands reports — no standalone report exists) |
| Research docs | 19 | 17 non-synthesis RESEARCH-*.md in docs/ + BUILD-PLAN-RESEARCH-DELTA in docs/ + touchdesigner-visual-patterns in research/ (2 synthesis RESEARCH-SYNTHESIS-*.md counted separately above) |
| Reference NOTES | 14 | references/*/NOTES.md |
| Skills | 5 | nextjs, postgres, security-auditor, stripe, tailwind |
| Attack libraries | 2 | wraith.md (6 vectors), wraith-parseltongue.md (6-phase protocol) |
| Absorbed agents | 6 | Chronicle→Nyx, Scribe→Nyx, Arbiter→Discussion Protocol, Kiln→Kehinde, Compass→Kehinde, Beacon→Sentinel |

> **Note:** Manifest lists "4 synthesis docs" but the April 4 mining session (CrewAI, AutoGen, OpenHands, METATRON) produced no standalone synthesis doc — those 43 patterns are in the 3 individual mining reports. METATRON's patterns are embedded in the crewai/autogen/openhands reports. The 3 synthesis docs above are the complete set.
>
> **Note:** Manifest lists "13 reference sources" per `references/INDEX.md`, but 14 NOTES.md files exist (`oh-my-claudecode` is present but missing from INDEX.md). This map includes all 14. INDEX.md update is a separate task.

---

## Per-Persona Research Map

---

### 1. NYX — Build Orchestration

**Role:** Sole builder. Translates specs into production code. Holds all constraint scales simultaneously.

**Absorbed capabilities:**
- **Chronicle** → Phase 5 bookkeeping, build history analysis, historical pattern detection
- **Scribe** → Documentation synthesis, knowledge writing as build orchestration

#### Synthesis Patterns (April 2)

| Pattern | Description | Target |
|---------|-------------|--------|
| Charge economy | Agent runs bounded via charge/mana system | 8.1, 8.2 |
| Emanation charge semantics | Sub-agent spawns carry cost from parent budget | 8.2 |
| Pareto frontier optimization | Visible quality/cost tradeoff curve | 8.1, 8.2 |
| Raw traces > summaries | Full traces beat summaries by +15 points | 8.1, 8.5 |
| Non-Markovian credit assignment | Full history for causal reasoning | 8.2, 8.3b |
| Filesystem-based selective access | Agents read selectively from FS, not context-stuffing | 8.1, 8.2 |
| Daily thread as canonical ledger | JSONL ledger = canonical dispatch timeline | 8.1 |
| Read-only rituals | Rituals cannot modify own spec | 8.1 |
| Dreamtime consolidation | Nightly full-day consolidation + persona evolution | 8.1, 8.5 |
| Environment bootstrapping | Auto env setup before first agent run | Phase 0 |
| Single tuning surface (grimoire) | One config governs all costs | 8.1, 8.2 |
| Disabled by default | Rituals require explicit opt-in | 8.1 |

#### Synthesis Patterns (April 3)

| Pattern | Description | Target |
|---------|-------------|--------|
| Pure decision functions | All lifecycle decisions as pure functions | 8.1 |
| Circuit breaker for dispatch | N failures opens circuit, blocks further spawns | 8.1, 8.2 |
| Auto-pause on 3 failures | Rituals auto-disable after 3 consecutive failures | 8.1 |
| Recovery sweep on every tick | Heartbeat detects/cleans stuck dispatches | 8.1 |
| Proactive warming on intent | Pre-assemble context before scheduled fire | 8.1 |
| Dispatch queue with serial execution | One dispatch per persona, queue in SQLite | 8.2 |
| Declarative capability metadata | reasoning_effort, model_class, routing_role | P7-C |
| Pipeline stage with checkpoint/resume | Build phases as stages with skip/checkpoint | 8.2 |
| Formal state machine with fix loop | Typed transitions with bounded retry | 8.2 |
| Phase-based agent composition | Different personas per pipeline phase | 8.2 |
| Worker allocation scoring | Role + scope + load composite | 8.2 |
| Runtime overlay injection | Marker-bounded context assembly | 7.2, 8.2 |
| Underspecification gating | Vague inputs redirect to planning | 7.2 |
| Three-tier memory sections | Priority/working/manual | 8.1 |
| Configurable execution limits | 18 limits with conservative defaults | 8.1, 8.2 |
| Thinking budget control | Explicit reasoning token allocation | 8.1, 8.2 |
| Fast model fallback | Cheap model first, fallback on failure | 8.1, 8.2 |
| Dispatch lifecycle hooks | Before/after/startup extension points | 8.2 |
| Strategy cascade | Minimum privilege escalation | 8.2 |

#### Synthesis Patterns (April 5)

| ID | Pattern | Target |
|----|---------|--------|
| D2 | Next-step hint guidance | Retrofit |
| D3 | Ralph subagent spawning (fresh context per phase) | 8 |
| D8 | Topological sort for dependency ordering | Retrofit |
| D9 | Augmentation engine (batch context before tasks) | 8 |
| D10 | Global registry for agent capability discovery | 8 |
| B1 | Session lifecycle (Orient/Work/Persist) | Retrofit |

#### Mining Report Patterns

| Source | Pattern | Description |
|--------|---------|-------------|
| CrewAI | Exploration Budget Loop | Bounded iterative deepening with confidence check |
| CrewAI | Delegation-as-Tool | Agent delegation via tool invocation |
| CrewAI | Flow Decorator DAG | @start/@listen/@router build execution DAG |
| CrewAI | Tool Usage Count Limiting | Mana cost per tool invocation |
| CrewAI | Event Bus with Dependency-Aware Handlers | Singleton event bus, topological sort |
| CrewAI | Fuzzy Tool Name Matching | SequenceMatcher >0.85 for resilient selection |
| CrewAI | Task Context as Dependency Graph | task.context creates implicit data flow |
| AutoGen | Ledger-Based Orchestrator (MagenticOne) | Outer task ledger + inner progress ledger |
| AutoGen | GraphFlow Directed Execution | Validated directed graph with conditional edges |
| AutoGen | Handoff-as-Tool (Swarm) | Auto-generated transfer_to_{target} tools |
| AutoGen | SocietyOfMind Nesting | Team-as-single-agent recursive composition |
| AutoGen | Composable Termination Conditions | AND/OR combinable halt conditions |
| AutoGen | State Persistence Protocol | Universal save_state/load_state on all components |
| AutoGen | Event-Driven Observability | Fine-grained typed events for mission viz |
| AutoGen | Parallel Speaker Dispatch | Multiple agents activated simultaneously |
| AutoGen | Component Serialization | _to_config/_from_config for declarative teams |
| OpenHands | Event-Sourced State Machine | Append-only event stream with source attribution |
| OpenHands | View Projection Pattern | Filtered LLM-ready projection from raw history |
| OpenHands | Delegation with Budget Partitioning | Parent snapshots metrics before delegating |
| OpenHands | Stuck Detection | 5 distinct loop patterns with recovery |
| OpenHands | Control Flags (Iteration + Budget) | Generic ControlFlag[T] with step/reached_limit |
| OpenHands | Pending Action Queue | Multi-tool deque, pop one at a time |
| OpenHands | Nested Event Store | Child sees slice of parent's event stream |
| OpenHands | Replay System for Testing | Recorded events replayed for regression |

#### Research Doc Patterns

| Source | Key Patterns |
|--------|-------------|
| AGENTIC-DEV-ENVIRONMENTS | Embedded Terminal Panel (P1), ACP Support (P2), Git Worktree Isolation (P3), Issue-Tracker-as-Dispatch (P5), plus 15 enrichments/validations |
| AUTOAGENT | Meta-Agent Hill-Climbing (8.5 — system-level self-improvement), ATIF Trajectory Serialization |
| BACKGROUND-AGENTS | Pure Decision Functions, Circuit Breaker, Auto-Pause, Recovery Sweep, Proactive Warming, Prompt Queue |
| BLOCK-GOOSE | ToolConfirmationRouter (7.2), SharedProvider Double-Arc, Subagent Context Isolation, Recipe System (rituals), Large Response Handler |
| BYTEROVER | Persistent Context Tree, Hub & Connectors, Tool Registry with Factory, Policy Engine, Priority Queue, Plugin Hooks, Session Overrides, Daemon Architecture, Dual-Lane Routing, Conversational Tool Discovery, Phase Detection |
| CHROMAFS | Virtual FS over Indexed Content, Page Reconstruction from Chunks (also feeds Kehinde architecture + KAIROS cross-cutting) |
| CONTEXT-GRAPHS | Context Graph (decision traces), Self-Directing Development Intelligence |
| EXCALIBUR | Charge Economy, Emanation Semantics, Capability Widening, Dreamtime, Single Tuning Surface |
| FACTORY-AI | 28 patterns: JSONL-over-stdio, Two-layer state machine, DroidWorkingState/MissionState, InteractionMode x AutonomyLevel, ToolConfirmationType, SettingsLevel, MissionFeature schema, Handoff packets, ProgressLogEntry, returnToOrchestrator, SkillFeedback, DismissalRecord, MilestoneValidationTriggered, Bidirectional JSON-RPC, Notification-to-AsyncGenerator, Injectable transport |
| JUST-BASH | Lazy-Loading Command Registry, Configurable Execution Limits, AST Transform Plugin Pipeline |
| KARPATHY | LLM-Compiled Knowledge, Knowledge Compounding, No RAG at Small Scale, Output Diversity (also feeds KAIROS cross-cutting + Sable voice-as-compiled-knowledge) |
| META-HARNESS | Harness is the Variable, Raw Traces > Summaries, Non-Markovian Credit, FS-Based Access, Pareto Frontier, Confound Isolation, Environment Bootstrapping, Code-Space Regularization |
| OH-MY-CODEX | Agent Definition Registry, Keyword Trigger Registry, Phase-Based Composition, Worker Allocation, Three-Tier Memory, Pipeline Stage Interface, Formal State Machine, Runtime Overlay |
| OPENCLI-GLAZE-SQLITE | Dual Adapter System, Lifecycle Hooks, Strategy Cascade |
| STIXDB | Exponential Decay, Touch-Boost, Hybrid LRU+LFU, Tier-Based Promotion, Similarity Consolidation, Ring Buffer Trace |

#### Reference Sources

| Reference | What It Provides |
|-----------|-----------------|
| claude-code | Generator-based streaming, tool concurrency partitioning, lazy skill extraction, dual truncation, context injection |
| claude-agent-sdk | Message flow loop, agent spawning with isolated context, system prompt assembly |
| rosehill | CLAUDE.md turnstile, Agent junction (7-phase build loop + BOOT.md handoff), workspace model |
| ruflo | Token optimization, worker count reduction, stall detection + auto-disable, iteration limits, atomic file writes |
| oh-my-claudecode | Ralph persistence loop, Worker Hierarchy, Handoff Documents, Deslop pass, Circuit breaker, Progress.txt |

#### Skills

| Skill | Activation |
|-------|-----------|
| nextjs-best-practices | On Next.js projects (server/client components, data fetching, caching, routing) |

**Pattern count: ~120+ patterns directly feeding Nyx**

---

### 2. PIERCE — QA & Spec Conformance

**Role:** The spec doesn't negotiate. Gate enforcement. Severity calibration. Pattern clustering.

#### Research Patterns

| Source | Pattern | Description |
|--------|---------|-------------|
| OpenHands | Replay System for Testing (S13) | Regression testing of persona behavior via event replay |
| LIGHTHOUSE | Audit Base Class | Declarative dependency, standardized output (score + details), static meta |
| META-HARNESS | Confound Isolation | One fix per finding; no bundling that creates attribution ambiguity |
| FACTORY-AI | Agent output lint rules | Static analysis encoding architectural invariants for AI-generated code |
| AGENTIC-DEV-ENVIRONMENTS | Verification Spectrum (O5) | Products arrange from passive to institutional verification |
| AGENTIC-DEV-ENVIRONMENTS | Worker Pool for Diff (E4) | Offload diff computation for findings review |
| POETENGINEER | Recipe E: Findings Feed upgrade | Feedback trails on scroll + severity bursts + glow hierarchy |

#### Reference Sources

| Reference | What It Provides |
|-----------|-----------------|
| oh-my-claudecode | Critic self-audit + realist check, Multi-perspective review lenses |

#### Gate Consumption

Pierce consumes output from ALL 5 skills during gates. Not a direct user of skills, but the ultimate validator of skill-informed code.

**Pattern count: ~10 patterns directly feeding Pierce, but leverages ALL research indirectly through gates**

---

### 3. MARA — UX Evaluation

**Role:** 10-item UX checklist. Accessibility. Mobile. Moment-of-use. 6-state analysis. Seam analysis.

#### Research Patterns

| Source | Pattern | Description |
|--------|---------|-------------|
| BYTEROVER | Snapshot-Based Page Understanding | Accessibility tree snapshots instead of raw DOM |
| POETENGINEER | Feedback trails, Perlin noise drift, Spring physics, Flow field particles | Visual pattern vocabulary for UX animation |
| POETENGINEER | State machine transitions | WILL_APPEAR → APPEARING → VISIBLE |
| POETENGINEER | Breathing/pulsing, Phase-staggered animation | Motion patterns for data-driven UX |
| touchdesigner | Data-to-Geometry Mapping, Radial Layouts, Particle Emission | Visualization technique reference |
| AGENTIC-DEV-ENVIRONMENTS | Browser-as-Surface Peer (E2) | Browser panes as dispatch targets for DOM interaction |
| AGENTIC-DEV-ENVIRONMENTS | Agent Following (E15) | Real-time observation of agent navigation |

#### Reference Sources

| Reference | What It Provides |
|-----------|-----------------|
| ui-ux-pro-max | 15-item pre-delivery checklist (mandatory gate), Top 30 UX guidelines across 6 categories, dark theme palette |

**Pattern count: ~15 patterns directly feeding Mara**

---

### 4. RIVEN — Design Systems

**Role:** Token enforcement. Touch targets. Component architecture. Dark-mode intelligence.

#### Synthesis Patterns (April 5)

| ID | Pattern | Target |
|----|---------|--------|
| V1 | 9-Section DESIGN.md format | Retrofit |
| V2 | Border-as-depth system | Retrofit |
| V3 | Persona-colored glow effects | Retrofit |
| V4 | Luminance stacking (rgba white hierarchy) | Retrofit |
| V5 | Do's/Don'ts as machine-readable constraints | Retrofit |
| V6 | Off-white text (never pure #ffffff) | Retrofit |
| V7 | Three-font system | 8+ |
| V8 | Weight hierarchy inversion (cap at 500-600) | 8+ |
| V9 | Letter-spacing compression at display sizes | 8+ |
| V10 | HSL+alpha color tokens | 8+ |

#### Mining Report Patterns (design-md — all 20 directly feed Riven)

| Pattern | Description |
|---------|-------------|
| 9-Section DESIGN.md | Agent-optimized design system document format |
| Agent Prompt Guide | Color reference + component templates + foundation rules |
| Border-as-Depth | rgba white overlays for depth on dark backgrounds |
| Persona-Colored Glow | drop-shadow with persona color |
| Luminance Stacking | 0.02/0.04/0.05 surface hierarchy |
| Do's/Don'ts as constraints | Machine-readable lint rules |
| Three-Font System | Display/body/code triplet |
| Semantic Feature Colors | Per-capability accent palette |
| OpenType Feature Enforcement | cv01, ss01, ss03, calt, kern, liga |
| Weight Hierarchy Inversion | Dark-mode lighter weights |
| Letter-Spacing Compression | Negative tracking at display sizes |
| Off-White Text | #f2f2f2 to #fafafa, never #ffffff |
| Opacity-Based Hover | Opacity shifts not color changes |
| Pill vs Sharp Radius | Only 2-3 radius values |
| HSL+Alpha Tokens | Programmatic color derivation |
| Tabular Numbers | font-feature-settings: "tnum" |
| Warm vs Cool Dark | Cool-dark = technical, warm-dark = organic |
| Photography vs Component | Visual strategy direction |
| Shadow-as-Border | box-shadow instead of CSS borders |
| Section Padding | 48-96px vertical, cinematic pacing |

#### Research Doc Patterns

| Source | Key Patterns |
|--------|-------------|
| POETENGINEER | 30 visual patterns + 5 composite recipes + Observatory Palette (neon-on-dark, glow sprite stamping, additive blending, domain warping, SDF, bloom, aurora, Hilbert curve, Voronoi, curl noise, etc.) |
| touchdesigner | 30+ TD techniques across 9 sections (noise terrain, force-directed, flow fields, GLSL shaders, color palettes, motion patterns) |
| AGENTIC-DEV-ENVIRONMENTS | MSDF Text Rendering (E11) for crisp zoom |

#### Reference Sources

| Reference | What It Provides |
|-----------|-----------------|
| ui-ux-pro-max | Dark theme palette, font pairings (Inter+Roboto, Poppins+OpenSans, JetBrains Mono+Inter), 67 styles, 161 palettes, 57 pairings |
| pretext | Canvas text measurement (two-phase prepare+layout, ~0.09ms hot), zero-CLS, DOM/Canvas/SVG targets |

#### Skills

| Skill | Activation |
|-------|-----------|
| tailwind-design-system | 3-layer token hierarchy, CSS variable tokens, component architecture, dark mode, accessibility, animation |

**Pattern count: ~85+ patterns directly feeding Riven (richest research library)**

---

### 5. KEHINDE — Systems Architecture

**Role:** Thinks in failure modes. Database-agnostic. Provider architecture. Performance profiling.

**Absorbed capabilities:**
- **Kiln** → Performance profiling, query analysis, optimization as architecture concern
- **Compass** → Impact analysis (BFS dependency graph), change impact scoring

#### Synthesis Patterns (April 3)

| Pattern | Description | Target |
|---------|-------------|--------|
| Compile-time key hash tables | Integer comparison eliminates string hashing | Phase 9 |
| Buffer reuse + padding | Zero-alloc IPC | Phase 9 |
| Binary format for hot paths | ~3x JSON throughput | Phase 9 |
| Expression<T> template+bindings | Type-safe SQL by construction | Phase 9 |
| Schema reader via PRAGMA | Schema discovery via PRAGMA introspection | Phase 9 |

#### Mining Report Patterns

| Source | Pattern | Description |
|--------|---------|-------------|
| GitNexus | Blast Radius / Impact Analysis via BFS | Bidirectional traversal with risk scoring |
| GitNexus | Topological Sort (Kahn's) | Dependency-level grouping for parallel processing |
| GitNexus | Connection Pool with LRU Eviction | Per-repo pool with idle timeout |
| GitNexus | A1-A5 Architecture Meta-Patterns | Precompute at index time, property graph > triples, single relation table, CSV bulk loading, chunk budget |

#### Research Doc Patterns

| Source | Key Patterns |
|--------|-------------|
| AGENTIC-DEV-ENVIRONMENTS | WASM Plugin Sandboxing (P4), Protocol Split MCP/ACP (O2), Thin Desktop Shell (E13), Provider Factory with Hot-Swap (E14), Context Compaction as Model Capability (E12) |
| BLOCK-GOOSE | SharedProvider Double-Arc, Provider Factory Registry |
| BYTEROVER | Engine Abstraction Layer, Hierarchical Config with Merge |
| FACTORY-AI | Injectable transport interface |
| OPENCLI-GLAZE-SQLITE | All 9 patterns (Dual Adapter, Lifecycle Hooks, Strategy Cascade, Compile-Time Keys, Buffer Reuse, Binary Format, Expression<T>, Schema Reader, PRAGMA Migration) |
| CONTEXT-GRAPHS | World Models, Four-Layer Architecture |

#### Reference Sources

| Reference | What It Provides |
|-----------|-----------------|
| claude-code | External store pattern, tool concurrency partitioning, feature gates for DCE |
| claude-agent-sdk | System prompt assembly from 5 sources |

#### Skills

| Skill | Activation |
|-------|-----------|
| postgres-best-practices | Index strategy, N+1 avoidance, cursor pagination, connection pooling, RLS, migration discipline, function patterns |

**Pattern count: ~35+ patterns directly feeding Kehinde**

---

### 6. TANAKA — Security & Compliance

**Role:** Locks down auth, RLS, PII, TCPA. Trust boundaries. Threat modeling.

#### Research Patterns

| Source | Pattern | Description |
|--------|---------|-------------|
| CrewAI | SecurityConfig + Fingerprinting | Agent/task security metadata for audit trails |
| OpenHands | Security Analyzer as Event Stream Listener | Pluggable security analysis on every action |
| OpenHands | Secret Scrubbing in Event Serialization | Scan/replace secrets before storage |
| OpenHands | Confirmation Mode as Toggle | Per-session security gate |
| AutoGen | InterventionHandler | Message interception for logging/modification/dropping |
| JUST-BASH | Network Allow-List with Header Injection | URL prefix matching, secret injection at boundary |
| JUST-BASH | Composable Filesystem | Symlink defense, mount isolation |
| BYTEROVER | Content Boundary Markers + Error Translation | Nonce-bounded output prevents prompt injection |
| BYTEROVER | Encrypted State Persistence | AES-256-GCM via CDP targets |
| BYTEROVER | Credential Vault with {{vault:key}} | System keychain + AES fallback |
| AGENTIC-DEV-ENVIRONMENTS | WASM Plugin Sandboxing (P4) | Memory isolation + capability restriction |
| LIGHTHOUSE | Rust Cryptography Library Landscape | ring, sodiumoxide, BLAKE3, age/rage, argon2 |
| BLOCK-GOOSE | Extension Malware Check | Malware checking on extension commands |

#### Reference Sources

| Reference | What It Provides |
|-----------|-----------------|
| trail-of-bits | Semgrep static analysis, Supply chain risk auditor, Insecure defaults detection, Custom Semgrep rule creation, Differential security review |

#### Skills

| Skill | Activation |
|-------|-----------|
| security-auditor | 12 security domains: Auth, Input Validation, Insecure Defaults, Supply Chain, Data Protection, TCPA/CAN-SPAM, API Security, Cryptography, Infrastructure, Differential Review, Container, Testing |

**Pattern count: ~20+ patterns directly feeding Tanaka**

---

### 7. VANE — Financial Architecture

**Role:** Payment flows. Rate calculations. Audit trails. Margin protection.

#### Research Patterns

| Source | Pattern | Description |
|--------|---------|-------------|
| design-md | Tabular Number Feature | font-feature-settings: "tnum" for financial data alignment |
| EXCALIBUR | Single Tuning Surface | Grimoire pattern for fiscal governance |

#### Reference Sources

(No dedicated reference source beyond skill)

#### Skills

| Skill | Activation |
|-------|-----------|
| stripe-integration | 4 payment flows, webhook handling (signature, idempotency, 8 events), test methodology (6 cards, 6 scenarios, clocks), 8 pitfalls, financial accuracy (integer cents, reconciliation) |

**Pattern count: ~5 patterns directly feeding Vane (domain-deep via skill)**

---

### 8. VOSS — Platform Legal

**Role:** TCPA. TOS architecture. Consent verification. Regulatory foresight.

#### Research Patterns

No research docs directly target Voss. Legal compliance patterns are embedded in:
- security-auditor skill (Communication Compliance section: TCPA, CAN-SPAM, double opt-in, quiet hours, STOP keyword)
- Tanaka's findings (which Voss reviews for legal implications)

#### Coverage Note

Voss operates from pure persona identity + skill consumption. Legal domain research was not part of the 8 mined repos or 20+ research docs. Gap acknowledged — not actionable until legal-specific sources are mined.

**Pattern count: 0 direct, ~3 indirect via security-auditor skill**

---

### 9. CALLOWAY — Growth Strategy

**Role:** Pricing. Tiers. Competitive positioning. Adoption velocity.

#### Research Patterns

| Source | Pattern | Description |
|--------|---------|-------------|
| CONTEXT-GRAPHS | World Models (Company + Customer) | AI as lossless info routing replacing lossy management layers |
| META-HARNESS | Pareto Frontier Optimization | Quality vs velocity tradeoff curve for operator UX |

#### Coverage Note

Calloway operates from persona identity + operator conversations. Growth strategy research was not part of the mined corpus. Gap acknowledged — addressable in P7.5-D.8 profile session.

**Pattern count: ~2 direct**

---

### 10. SABLE — Brand Voice & Copy

**Role:** Tone consistency. UX writing. Register control. Vocabulary transforms.

#### Research Patterns

| Source | Pattern | Description |
|--------|---------|-------------|
| ArsContexta | Vocabulary Transform System | Universal-to-domain mapping preserving structural operations |
| ArsContexta | Personality Layer Derivation | 4 dimensions: warmth, opinionatedness, formality, emotional awareness |

#### Coverage Note

Sable's research depth comes from ArsContexta's vocabulary and personality systems. Additional voice/copy research addressable in P7.5-D.9 profile session.

**Pattern count: ~2 direct**

---

### 11. SCOUT — Pre-Build Intelligence

**Role:** Pre-build recon. Terrain mapping. WHY/HOW/WHAT classification. Brief assembly.

#### Synthesis Patterns

| Source | Pattern | Target |
|--------|---------|--------|
| April 3 | Environment Bootstrapping | Phase 0 |
| April 5 D5 | WHY/HOW/WHAT query classification | 8 |
| April 5 D4 | Blast radius analysis (BFS impact) | 8 |

#### Mining Report Patterns

| Source | Pattern | Description |
|--------|---------|-------------|
| CrewAI | Evidence Gap Tracking | RecallFlow tracks search misses; gaps drive discovery |
| CrewAI | Planning Phase Pre-Execution | Separate LLM call generates step-by-step plans |
| GitNexus | Augmentation Engine | Graph-enriched search with BM25 + community cohesion |
| GitNexus | Service Boundary Detection | Scanning for package.json/go.mod/Dockerfile markers |
| ArsContexta | WHY/HOW/WHAT Query Classification | Type-based retrieval routing |

#### Research Doc Patterns

| Source | Key Patterns |
|--------|-------------|
| META-HARNESS | Environment Bootstrapping (+1.7pp Opus, +3.9pp Haiku) |
| CONTEXT-GRAPHS | AGENTS.md Progressive Disclosure |

#### Reference Sources

| Reference | What It Provides |
|-----------|-----------------|
| oh-my-claudecode | Ralplan-First Gate (vague request detection, <=15 words), Pre-mortem analysis |

**Pattern count: ~12 patterns directly feeding Scout**

---

### 12. SENTINEL — Monitoring & Regression

**Role:** Post-build regression sweep. Differential scanning. Stuck detection.

**Absorbed capabilities:**
- **Beacon** → Post-deploy monitoring, differential scanning, event-driven health checks

#### Synthesis Patterns

| Source | Pattern | Target |
|--------|---------|--------|
| April 3 | Typed event condition registry | 8.2 |

#### Mining Report Patterns

| Source | Pattern | Description |
|--------|---------|-------------|
| OpenHands | Stuck Detection (S5) | 5 loop patterns with different recovery options |

#### Research Doc Patterns

| Source | Key Patterns |
|--------|-------------|
| BACKGROUND-AGENTS | Event Condition Registry (typed triggers for event-driven automations) |
| LIGHTHOUSE | Log-Normal Scoring with Percentile Control Points |
| POETENGINEER | Event particle bursts (severity = velocity magnitude) |
| CONTEXT-GRAPHS | Continuously Evolving Policies (agents propose new checks from failure data) |

#### Reference Sources

| Reference | What It Provides |
|-----------|-----------------|
| oh-my-claudecode | SubagentStop verification, Sentinel gate on team completion |

#### Absorbed Research (from Beacon)

- elder-plinius (ST3GG/ALLSIGHT, P4RS3LT0NGV3/Mutation Lab) for security regression detection
- sobolevn/awesome-cryptography for cryptographic regression detection
- OpenHands StuckDetector patterns
- AutoGen MagenticOne progress ledger for differential scanning
- ArsContexta condition-based maintenance triggers + drift detection

**Pattern count: ~15 patterns directly feeding Sentinel**

---

### 13. WRAITH — Adversarial Red Team

**Role:** READ-ONLY attacker. Input fuzzing. Auth probing. Concurrency attacks. AI-facing surface attacks.

#### Embedded Attack Library (6 vectors)

| Vector | Techniques | Source Lineage |
|--------|-----------|----------------|
| 1. Input Fuzzing | Empty strings, SQL injection, XSS, boundary values, Unicode edge cases, oversized payloads | Standard OWASP |
| 2. Auth Probing | Unauth routes, privilege escalation, cross-tenant, JWT manipulation | Standard pentest |
| 3. Concurrency | Rapid toggle, double-submit, concurrent serialize, dual-tab | Standard race conditions |
| 4. State Manipulation | localStorage mod, token forgery, devtools state, crafted API payloads | Standard state attacks |
| 5. AI-Facing (Parseltongue) | 12 perturbation + 9 prompt structure + 5 token-level + 7 steganographic + 4 linguistic = 37 techniques | elder-plinius (G0DM0D3, P4RS3LT0NGV3, L1B3RT4S, ST3GG, GLOSSOPETRAE) |
| 6. Cryptographic | 10 techniques: padding oracle, timing, JWT alg:none, PRNG, hash collision, cert bypass, downgrade, Bleichenbacher, replay, ECB | sobolevn/awesome-cryptography |

#### Sub-Agent Attack Protocols

| Sub-Agent | Focus | Protocol |
|-----------|-------|----------|
| wraith-input-fuzzer | Automated input boundary testing | Per-field sweep |
| wraith-auth-probe | Role/tenant boundary testing | Privilege matrix |
| wraith-concurrency | Race condition exploitation | Timing attacks |
| wraith-parseltongue | AI-facing surface attacks (6-phase) | Map → Perturbation → Structure → Token → Stego → Consequence Climb |

#### Research Doc Patterns

| Source | Pattern | Description |
|--------|---------|-------------|
| LIGHTHOUSE | Rust Cryptography Library Landscape | Vetted libs for credential storage (ring, BLAKE3, age/rage) |
| AGENTIC-DEV-ENVIRONMENTS | Container isolation (V4) | E2B sandbox for safe exploit testing |

#### Reference Sources

| Reference | What It Provides |
|-----------|-----------------|
| trail-of-bits | Zeroize audit (8 finding categories, assembly-level), Audit context building (First Principles + 5 Whys/Hows), Constant-time analysis |
| security-auditor skill | Inherits attack methodology from sections 1-4, 7, 10 |

**Pattern count: ~60+ attack techniques + ~10 research patterns**

---

### 14. MERIDIAN — Cross-Surface Consistency

**Role:** Sibling audit at scale. Cross-surface pattern drift detection. Contract matching.

#### Mining Report Patterns

| Source | Pattern | Description |
|--------|---------|-------------|
| GitNexus | Blast Radius / Impact Analysis via BFS | Bidirectional upstream/downstream traversal |
| GitNexus | Cross-Repo Contract Matching | Provider/consumer contract normalization + matching |

#### Research Doc Patterns

| Source | Key Patterns |
|--------|-------------|
| CONTEXT-GRAPHS | Inter-Agent Negotiation (conflict traces with win/loss tracking) |

#### Coverage Note

Meridian's methodology is deeply embedded in the build loop (Phase 4 exit dispatch, sibling audits, FM-12 defense) but has minimal dedicated research. Cross-surface consistency was validated by GitNexus patterns, not augmented with new methodology.

**Pattern count: ~3 direct patterns**

---

## Dispatcher Research Map

### DISCUSSION PROTOCOL (Dispatcher, not persona)

**Absorbed:** Arbiter → Decision synthesis, structured debate, multi-perspective arbitration

The Discussion Protocol dispatcher (`--council`, `--decide`, `--debate`) absorbed Arbiter's methodology:
- Structured synthesis from multiple cognitive lenses
- Verdict generation with dissent tracking
- Peer review cycles with keep/revise/escalate outcomes

This is the only absorbed agent whose target is a dispatcher rather than a persona. Discussion Protocol has no profile session (P7.5-D/E cover personas only). Its methodology is embedded in the dispatcher definition (`agents/discussion-protocol.md`), not in a persona profile.

#### Research Patterns Feeding Discussion Protocol

| Source | Pattern | Description |
|--------|---------|-------------|
| AutoGen | Parallel Speaker Dispatch | Multiple agents activated simultaneously |
| AutoGen | SocietyOfMind Nesting | Team-as-single-agent recursive composition |
| CONTEXT-GRAPHS | Inter-Agent Negotiation | Typed conflict traces with win/loss tracking |
| ArsContexta | Propose-Not-Implement | Changes follow observe → propose → await → implement |
| oh-my-claudecode | Critic self-audit + realist check | Severity calibration in deliberation |

---

## Cross-Cutting Patterns (All Personas)

These patterns apply to the entire system, not any single persona.

| Source | Pattern | Description |
|--------|---------|-------------|
| April 2 Synthesis | 3-file identity split | Config/personality/capabilities → kernel/personality/agent-def |
| April 2 Synthesis | Harness is the variable | Same model + different harness = 6x gap |
| April 2 Synthesis | Mana-aware access tiers | Knowledge access priced by tier |
| April 2 Synthesis | Knowledge compounding | Every interaction compounds org knowledge |
| April 2 Synthesis | Human reads, LLM writes | Operator steers, system maintains |
| April 2 Synthesis | Cornerstone self-modification | Agent proposes changes to own system prompt (8.5) |
| April 3 Synthesis | Extension type registry + tool whitelist | P7-C CommandRegistry |
| April 3 Synthesis | Three-tier capability layering | Preset/custom/MCP |
| April 3 Synthesis | Lazy-loading command registry | Metadata at scan, handler on first use |
| April 3 Synthesis | Command allow-list per instance | Per-persona tool availability |
| April 3 Synthesis | Factory-based tool registration | Factory pattern for registration |
| April 3 Synthesis | Per-exec isolation with shared FS | Validates dispatch model |
| April 3 Synthesis | Program-as-markdown | Validates kernel system |
| April 3 Synthesis | Adapter boundary (fixed vs editable) | Immutable infra fence |
| April 3 Synthesis | Three-tier agent instruction files | Validates kernel tiers |
| April 5 Synthesis | B2: 6 conflation failures | Memory-space contamination taxonomy |
| April 5 Synthesis | B3: 15-primitive kernel validation | 3-pass coherence check |
| April 5 Synthesis | B4: Feature block composition | Always-included vs conditional modules |
| April 5 Synthesis | B5: Seed-evolve-reseed lifecycle | Kernel versioning with drift detection |
| April 5 Synthesis | B6: 10 documented failure modes | Collector's Fallacy, Orphan Drift, etc. |
| April 5 Synthesis | B7: Propose-not-implement | Agents propose, never implement directly |
| April 5 Synthesis | D1: Tiered resolution with confidence | Exact/adjacent/global with refuse-on-ambiguity |
| April 5 Synthesis | D6: Signal-to-dimension derivation | Confidence-weighted capability profiling |
| April 5 Synthesis | D7: Cascade constraints | Hard/soft/compensating validation trichotomy |
| April 5 Synthesis | C1-C5 | Condenser pipeline (similarity consolidation, hash dedup, lineage-safe, autonomous planner, condition triggers) |
| ArsContexta | Session Lifecycle, Three-Space Routing, Dimension Cascade, Skill Routing, Knowledge Graph Analysis, Self-Improvement Loop, 15-Primitive Kernel Validation, Vocabulary Transform, 10 Failure Modes, Extraction Pipeline (6 Rs), Feature Block Composition, Handoff Protocol, Context Window Resilience, Propose-Not-Implement, Composability Test, Smart Zone Allocation |
| OpenHands | Microagent/Skill Injection, Error Classification, Rolling Condenser, Conversation Memory |
| AutoGen | Memory-as-Context-Injection, Workbench (dynamic tool collections), Structured Output with Reflection, Multi-Turn Tool Iteration |

---

## KAIROS Memory System Patterns (Cross-Persona, Nyx-Implemented)

The KAIROS memory system is implemented by Nyx but serves all personas. Concentrated pattern source.

| ID | Pattern | Source | Target |
|----|---------|--------|--------|
| K1 | Exponential decay with half-life | StixDB | Retrofit |
| K2 | Touch-boost on access | StixDB | Retrofit |
| K3 | Hybrid LRU+LFU scoring | StixDB | Retrofit |
| K4 | RRF hybrid search | GitNexus | Retrofit |
| K5 | Multi-table FTS with score aggregation | GitNexus | 8 |
| K6 | Three-Space routing | ArsContexta | Retrofit |
| K7 | Incremental embedding with skip sets | GitNexus | 8 |
| K8 | Tier-based promotion/demotion | StixDB | 8 |
| K9 | Working memory boost in re-ranking | StixDB | 8 |
| K10 | Staleness via operation distance | GitNexus | 8 |
| K11 | Confidence floor per relationship type | GitNexus | 8 |
| K12 | Per-type text generation for embeddings | GitNexus | 8 |
| -- | CrewAI Composite Memory Scoring | CrewAI | 8 |
| -- | CrewAI EncodingFlow 4-Group Classification | CrewAI | 8 |
| -- | CrewAI Scoped Memory Isolation | CrewAI | 8 |
| -- | CrewAI Background Write Queue with Read Barrier | CrewAI | 8 |
| -- | AutoGen Memory-as-Context-Injection | AutoGen | 8 |
| -- | OpenHands View Projection Pattern | OpenHands | 8 |
| -- | OpenHands Rolling Condenser | OpenHands | 8 |
| -- | OpenHands Conversation Memory | OpenHands | 8 |

---

## Knowledge Garden Patterns (Phase 9+)

| ID | Pattern | Source | Target |
|----|---------|--------|--------|
| G1 | Leiden community detection | GitNexus | 9+ |
| G2 | Knowledge graph analysis (8 ops) | ArsContexta | 9+ |
| G3 | Graph expansion from seed nodes | StixDB | 9+ |
| G4 | 6 Rs extraction pipeline | ArsContexta | 8+ |
| G5 | LLM-based cluster enrichment | GitNexus | 9+ |

---

## Reference Sources — Per-Persona Activation

| Reference | Primary Persona(s) | Activation Trigger |
|-----------|--------------------|--------------------|
| anthropic-plugins | All | 9 MCP categories mapped to personas, 3 loading sources (bundled/disk/MCP) |
| antigravity | All (via skills) | Modular rules (30+ files + compiled AGENTS.md), YAML frontmatter, skill-to-persona wiring |
| claude-agent-sdk | Nyx | Message flow loop, agent spawning with isolated context, system prompt assembly |
| claude-code | All | Generator streaming, tool concurrency partitioning, lazy skill extraction, dual truncation |
| ecosystem | All | 5-tier priority triage, 7 key decisions (coordinator, tiering, skills, gates, anti-drift) |
| lightrag | All (Phase 7+) | Hybrid vector+graph search, 4 query modes, 6-category tool taxonomy |
| n8n | All (Phase 7+) | 2,709 workflow templates, AI workflow validation, 13 management tools |
| oh-my-claudecode | Nyx, Pierce, Scout, Sentinel | Dispatch, gates, recon, monitoring |
| pretext | Riven | Canvas text measurement |
| rosehill | Nyx | Workspace model reference |
| ruflo | Nyx, All | Token optimization, iteration limits |
| trail-of-bits | Tanaka, Wraith | Security audit methodology, attack patterns |
| ui-ux-pro-max | Mara, Riven | UX checklist, design intelligence |
| wshobson-agents | All (Kehinde owns tiering) | 4-tier model tiering (Opus/Inherit/Sonnet/Haiku), PluginEval quality framework (10 dimensions), progressive disclosure (3-tier agent loading) |

---

## Skills — Per-Persona Activation

| Skill | Primary Persona | Secondary Users |
|-------|----------------|-----------------|
| nextjs-best-practices | Nyx (on Next.js projects) | Build Triad (reviewing Next.js), all agents modifying app/ |
| postgres-best-practices | Kehinde | All agents writing SQL/migrations, schema drift sub-agents |
| security-auditor | Tanaka | Wraith (inherits attack patterns), /deps (supply chain), PR gates |
| stripe-integration | Vane | Nyx (checkout/billing), Systems Triad (financial flows), Wraith (payment attacks) |
| tailwind-design-system | Riven | All agents creating/modifying UI, token audit, theme check, touch targets |

---

## Coverage Summary

| Persona | Direct Patterns | Research Depth | Coverage |
|---------|----------------|----------------|----------|
| **Nyx** | ~120+ | Deep (dispatch, state, lifecycle, mana, rituals, traces) | Saturated |
| **Pierce** | ~10 | Moderate (consumes all via gates) | Adequate |
| **Mara** | ~15 | Moderate (UX reference + visual patterns) | Adequate |
| **Riven** | ~85+ | Deep (design tokens, visual patterns, typography, shaders) | Saturated |
| **Kehinde** | ~35+ | Deep (architecture, perf, schema, provider systems) | Saturated |
| **Tanaka** | ~20+ | Deep (security audit methodology, crypto libs) | Saturated |
| **Vane** | ~5 | Domain-deep via skill | Adequate |
| **Voss** | ~0 direct | Indirect via security-auditor | Gap |
| **Calloway** | ~2 | Minimal | Gap |
| **Sable** | ~2 | Minimal (vocabulary transform + personality) | Gap |
| **Scout** | ~12 | Moderate (recon, query classification, gap tracking) | Adequate |
| **Sentinel** | ~15 | Moderate (stuck detection, drift, event triggers) | Adequate |
| **Wraith** | ~70+ | Deep (6 vectors, 37+ AI techniques, crypto attacks) | Saturated |
| **Meridian** | ~3 | Minimal (validated, not augmented) | Gap — acceptable |

### Identified Gaps

1. **Voss** — No legal-specific research sources. Relies on security-auditor skill's TCPA/CAN-SPAM section. Address in P7.5-D.7 profile session or mine legal-tech repos.
2. **Calloway** — No growth/pricing strategy research. Address in P7.5-D.8 profile session.
3. **Sable** — Minimal voice/copy research beyond ArsContexta vocabulary transforms. Address in P7.5-D.9 profile session.
4. **Meridian** — Minimal but acceptable. Cross-surface consistency is methodological, not research-dependent.

### Orphan Check

Every research source is accounted for:
- All 3 synthesis docs → mapped (21 + 50 + 68 = 139 patterns)
- All 6 mining reports → mapped (CrewAI 14, AutoGen 14, OpenHands 15, GitNexus 25, ArsContexta 20, design-md 20)
- All 19 research docs → mapped
- All 14 reference NOTES → mapped
- All 5 skills → mapped
- Both attack libraries → mapped (Wraith)
- All 6 absorbed agents → mapped (Nyx: Chronicle+Scribe, Kehinde: Kiln+Compass, Sentinel: Beacon, Discussion Protocol dispatcher: Arbiter — see Dispatcher Research Map section)

**No orphaned research. All sources assigned to at least one persona.**
