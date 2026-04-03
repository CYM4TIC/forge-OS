# Research: ByteRover CLI + Vercel Agent Browser + AiDesigner MCP

> **Date:** 2026-04-03
> **Sources:** campfirein/byterover-cli, vercel-labs/agent-browser, bacoco/AiDesigner
> **Researcher:** Nyx (research session)
> **Status:** Mined — patterns extracted, integration map populated

---

## Source Summaries

### ByteRover CLI (campfirein/byterover-cli)
**What:** Terminal-based orchestration system providing persistent, structured memory for AI coding agents. TypeScript/Node.js. REPL interface built with React/Ink. 24 built-in tools, 18+ LLM providers, cloud-synced context trees. Works with 22+ AI coding agents via MCP connectors.

**Key architectural features:** Daemon architecture for background persistent state. "Agentic map" context tree for codebase understanding. Hub & Connectors extensible skill/bundle system. Per-project configuration stored locally. Memory retrieval benchmarks: 96.1% accuracy (LoCoMo), 92.8% (LongMemEval-S).

### Vercel Agent Browser (vercel-labs/agent-browser)
**What:** Rust-based browser automation daemon with CDP (Chrome DevTools Protocol) client. Provides snapshot-based page understanding, form interaction, navigation, screenshots, and element queries for AI agents. Dual engine support (Chrome + Lightpanda). Dashboard UI package. Skill system. ~320 unit tests + 18 e2e tests.

**Key architectural features:** Native daemon architecture (`cli/src/native/` — daemon, actions, browser, CDP client, snapshot, state). Engine abstraction (`--engine` flag selects Chrome vs Lightpanda). Phase-based command pipeline (Phase 8 commands in e2e tests). State management module. Domain filtering. Diff-based page change detection.

### AiDesigner (bacoco/AiDesigner)
**What:** AI agent orchestration for product development. Bridges ideation → UI design → development through conversational AI. 6 specialist agents (analyst, PM, architect, scrum master, developer, QA). Dual-lane execution (Quick Lane 3-5min vs Complex Lane 10-15min). 15+ MCP server integrations. Invisible orchestration — methodology hidden from user.

**Key architectural features:** BMAD multi-agent framework with specialist roles. Dual-lane routing with automatic complexity escalation. Invisible orchestrator that manages tools conversationally. Profile-based environment separation (dev/staging/prod). Secure credential vault with `{{vault:keyName}}` reference syntax. Phase detection via filesystem + intent + conversation flow.

---

## Patterns Mined

### Pattern 1: Persistent Context Tree (ByteRover)
**What:** Structured, persistent memory that survives across sessions. Not just chat history — a curated "agentic map" of the codebase that agents query for understanding. Cloud-syncable for team sharing.
**Relevance:** Validates our KAIROS + vault sigils architecture. ByteRover's benchmark numbers (96.1% retrieval accuracy) provide a target for our three-tier knowledge access (sigils → articles → ley lines).
**Target:** 8.1 (vault sigils), 8.3 (LightRAG)

### Pattern 2: Hub & Connectors / Extensible Skill Bundles (ByteRover)
**What:** Plugin architecture where skills and integrations are bundled as connectors that can be installed, enabled, and composed. Not hardcoded — dynamically discoverable and installable.
**Relevance:** Validates our skills system (8.1). ByteRover's "hub" pattern is essentially our grimoire + skill marketplace concept. The connector abstraction maps to our MCP integration tiers.
**Target:** 8.1 (skills crystallization)

### Pattern 2b: Tool Registry with Factory + Dependency Injection (ByteRover deep dive)
**What:** Central `TOOL_REGISTRY` maps tool names to `{ factory, requiredServices, markers, descriptionFile }`. Tools instantiate via factory function receiving a `ToolServices` bag. Tools only register if all `requiredServices` are present. Hot-swap via `replaceTools()` — stages new tools, validates, atomically updates.
**Relevance:** Directly informs Action Palette design. Each persona's available actions follow same pattern — register with required capabilities, only surface actions whose dependencies are satisfied. The `requiredServices` array pattern prevents runtime errors from missing deps.
**Target:** 7.2 (Action Palette), P7-C.1 (factory-based tool registration — already in build plan, this is 2nd validation)

### Pattern 2c: Tool Markers / Semantic Classification (ByteRover deep dive)
**What:** `ToolMarker` enum classifies tools: Core, Discovery, Execution, Modification, ContextBuilding, Planning, Optional. Registry entries carry `markers[]` array. `getToolsByMarker()` enables filtering by operational mode.
**Relevance:** Action Palette categories. Our `CommandCategory` enum (Build/Persona/Quality/Analysis/Reporting/Operations) is the same idea. ByteRover's markers are finer-grained — could enrich our category system.
**Target:** P7-C (CommandCategory — validates existing design)

### Pattern 2d: Policy Engine with Rule-Based Access Control (ByteRover deep dive)
**What:** `PolicyEngine` evaluates tool invocations against ordered `PolicyRule[]` entries. Rules: `toolPattern` (string/RegExp), optional `condition` fn, `decision` (ALLOW/DENY). First match wins. Default ALLOW. `CoreToolScheduler` calls `policyEngine.evaluate()` before every execution.
**Relevance:** Maps to our capability enforcement pipeline. Currently binary (has capability or not). A policy engine adds nuance: ALLOW for routine ops, DENY for destructive ops, and a new PROPOSE decision that routes to the proposal approval flow. The rule ordering (first-match-wins) is cleaner than our current if/else chains.
**Target:** 7.3 (proposal system — policy engine evaluation before action execution), 8.2 (dispatch pipeline — rule-based access control)

### Pattern 2e: Priority-Based Invocation Queue (ByteRover deep dive)
**What:** `ToolInvocationQueue` with 4 priority tiers (Critical/High/Normal/Low). Priority first, FIFO within tier. Batch execution with configurable concurrency limit (default 5). Returns execution statistics (count, duration, failures). Supports early termination on errors.
**Relevance:** Almost exactly our Dispatch Queue (P7-L) spec. The 4 tiers map to dispatch priorities. Batch execution with concurrency limits handles multi-triad parallel work. Statistics tracking provides the observability layer for the queue panel.
**Target:** 7.3 (P7-L dispatch queue — adopt 4-tier priority model + concurrency limiting + stats tracking)

### Pattern 2f: Plugin Before/After Hooks (ByteRover deep dive)
**What:** `IToolPlugin` with `beforeExecute` and `afterExecute` hooks. `PluginManager` sorts by priority (lower = earlier). **Critical design:** before hooks run sequentially (each can modify args for next, any can block with `{ proceed: false, reason }`). After hooks run in parallel (errors silenced). Register/unregister by name.
**Relevance:** Informs our dispatch lifecycle hooks (already in 8.2 build plan from OpenCLI). The sequential-before / parallel-after distinction is a key insight we should adopt. Before: capability gate → injection scan → context injection (sequential, blocking). After: echo logging → state update → notification (parallel, non-blocking).
**Target:** 8.2 (dispatch lifecycle hooks — adopt sequential before / parallel after pattern)

### Pattern 2g: Session Overrides on Immutable Baseline (ByteRover deep dive)
**What:** `AgentStateManager` holds baseline config (immutable `structuredClone`) + runtime config (mutable). Per-session overrides via `Map<sessionId, SessionOverride>`. `getRuntimeConfig(sessionId)` merges baseline with override. `resetToBaseline()` clears all. State changes emit events.
**Relevance:** Our persona kernels are the baseline. Per-dispatch context (capability grants, mana budget, goal ancestry) are session overrides. The `structuredClone` baseline pattern prevents config corruption across concurrent dispatches. Important for when Build Triad dispatches 3 concurrent personas — each needs isolated state.
**Target:** 8.2 (dispatch pipeline — immutable kernel baseline + per-dispatch session overrides)

### Pattern 3: Daemon Architecture for Background State (ByteRover + Agent Browser)
**What:** Both ByteRover and agent-browser use a persistent daemon that runs independently of the CLI/UI session. State survives session restarts. Background processes (memory indexing, health checks) run continuously.
**Relevance:** Validates our ritual engine concept (8.1/8.2). The heartbeat/dreamtime/scrying rituals are daemon-like background processes. Agent-browser's daemon specifically manages browser lifecycle — maps to our DevServerManager pattern.
**Target:** 8.1 (vault watcher), 8.2 (ritual engine)

### Pattern 4: Engine Abstraction Layer (Agent Browser)
**What:** `--engine` flag selects between Chrome and Lightpanda. Single interface, multiple backends. Engine-specific adapters handle protocol differences while exposing uniform API.
**Relevance:** Validates our `ProviderFactory` pattern for AI providers (already in build plan 8.1). The dual-engine approach maps directly to our dual-adapter YAML+code pattern (4th validation from OpenCLI, now 5th).
**Target:** 8.1 (provider factory registry)

### Pattern 5: Snapshot-Based Page Understanding (Agent Browser)
**What:** Rather than raw DOM, agent-browser provides structured "snapshots" — accessibility tree representations with element references. Agents reason about page structure, not HTML. Diff detection shows what changed between snapshots.
**Relevance:** Informs our agent DOM access pattern (P6-F `read_preview_dom`). Current implementation reads raw `outerHTML` — snapshot-based approach would give personas (especially Mara) structured page understanding for more precise UX evaluation.
**Target:** 8.2 (gate pipeline enhancement — snapshot vs raw DOM for Mara's evaluation)

### Pattern 5b: Action Policy System — Allow/Deny/Confirm Trichotomy (Agent Browser deep dive)
**What:** JSON-configurable policy engine gating every action. Three outcomes: Allow, Deny(reason), RequiresConfirmation. Precedence: deny > confirm > allow > default. If allow-list exists and action not in it, default-deny. Checked inside `execute_command()` before any action runs.
**Relevance:** Combined with ByteRover's Policy Engine (Pattern 2d), this is the second independent implementation of the same pattern. The RequiresConfirmation outcome IS the proposal pattern — action suspends, returns confirmation flag, waits for approval. Adopt this trichotomy for our capability enforcement: `CapabilityFamily::Destructive` → RequiresConfirmation (routes to Tool Confirmation Router from P7-H).
**Target:** 7.2 (P7-H Tool Confirmation Router — adopt Allow/Deny/Confirm trichotomy), 7.3 (proposals)

### Pattern 5c: WebSocket Multiplexer with ID-Correlated Dispatch (Agent Browser deep dive)
**What:** CDP client multiplexes concurrent commands over single WebSocket. Atomic `next_id` counter. `PendingMap: HashMap<u64, oneshot::Sender>` correlates responses to waiters. Reader task routes: ID'd messages → pending waiters, events → broadcast subscribers. 30s keepalive pings. 30s command timeout with cleanup. Connection closure drops all senders.
**Relevance:** This IS the dispatch queue's internal messaging model. Multiple persona requests in-flight concurrently, correlated by ID. The oneshot sender pattern matches our Tool Confirmation Router (P7-H already uses oneshot channels). The timeout + cleanup prevents hung dispatches from blocking the queue.
**Target:** 7.3 (P7-L dispatch queue internals — adopt multiplexer pattern)

### Pattern 5d: Content Boundary Markers + AI-Friendly Error Translation (Agent Browser deep dive)
**What:** Output wrapped in cryptographic boundary markers (`nonce=<random> origin=<url>`) to prevent content injection. Errors translated to actionable agent guidance: "strict mode violation" → "Use a more specific selector", timeouts → "check page load state". Truncation with metadata: `[truncated: showing X of Y chars]`.
**Relevance:** Boundary markers with nonces prevent prompt injection from page content — essential for Tanaka's security model. AI-friendly error translation should apply to all error surfaces: translate Tauri/Rust errors into guidance personas can reason about. The truncation-with-metadata pattern keeps context windows bounded.
**Target:** 8.2 (agent security — boundary markers), 8.1 (error translation layer for persona-facing errors)

### Pattern 5e: Encrypted State Persistence with Session Isolation (Agent Browser deep dive)
**What:** Full session state (cookies, storage per origin) captured, encrypted AES-256-GCM (SHA-256 derived key, random 12-byte nonce), persisted to disk. Temporary CDP targets created to collect storage without contaminating main session. Auto-generated encryption keys with `0o600` permissions.
**Relevance:** Second implementation of AES-256-GCM vault pattern (AiDesigner Pattern 10 uses the same crypto). The temporary-target pattern (disposable contexts for safe state collection) maps to checkpoint/snapshot for persona memory. Combined with AiDesigner's `{{vault:key}}` reference syntax, this gives us a complete credential storage architecture for R-DS-01.
**Target:** Phase 9 (R-DS-01 — AES-256-GCM with auto-key-gen, 2nd validation alongside AiDesigner)

### Pattern 5f: Retry with Transient Error Classification (Agent Browser deep dive)
**What:** 5 retries, 200ms exponential backoff. Errors classified as transient (connection refused, broken pipe, EAGAIN, EOF, reset) vs permanent. Platform-specific error codes: macOS (35/54/61), Linux (11/104/111), Windows (10061/10054). Non-transient errors fail immediately.
**Relevance:** Our circuit breaker pattern (from background-agents research, already in 8.2) needs this transient/permanent distinction. The platform-specific error code mapping is essential for our Tauri desktop app running across macOS/Linux/Windows. Retry transient, escalate permanent.
**Target:** 8.2 (circuit breaker — add transient/permanent classification + platform-specific error codes)

### Pattern 5g: Hierarchical Config with Merge Semantics (Agent Browser deep dive)
**What:** 4-tier: CLI flags > env vars > project config > user config. Extension arrays concatenate (additive merge). All other fields: highest priority wins. Boolean tracking for explicitly-set flags prevents ambient config from overriding intentional overrides.
**Relevance:** Configuration cascade for persona settings: per-dispatch overrides > per-persona kernel > project config > system defaults. The explicit-set-tracking pattern prevents GRIMOIRE defaults from overriding intentional mana budget overrides on a specific dispatch. Additive merge for capabilities means project can ADD capabilities, never remove system-level ones.
**Target:** 8.1 (grimoire config cascade), 8.2 (dispatch config resolution)

### Pattern 6: Invisible Orchestration (AiDesigner)
**What:** The orchestrator is transparent — users never see agent names, phase labels, or methodology. "Never say MCP server — call them tools or integrations." Multi-agent activation happens silently. Phase transitions are automatic. One consistent voice.
**Relevance:** Our operator-facing layer could adopt this for non-technical users. Currently Forge OS is explicit about personas and phases (appropriate for the builder audience). But the `/init` and `/link` flows for new projects could use invisible orchestration — Scout, Kehinde, and Pierce run behind a natural conversation without the user needing to understand the team.
**Target:** 8.5 (persona evolution — selectable orchestration visibility), Phase 9 (onboarding UX)

### Pattern 7: Dual-Lane Routing with Automatic Escalation (AiDesigner)
**What:** Simple requests take a fast, linear path (Quick Lane). Complex requests automatically escalate to full multi-agent orchestration (Complex Lane). Same output format from both paths. No manual switching — complexity detection is automatic.
**Relevance:** Maps directly to our underspecification gating (just added to P7-G). But goes further — instead of just blocking underspecified requests, route them to a lightweight planning agent that determines whether the full orchestrator is needed. Quick Lane = single persona dispatch. Complex Lane = full triad.
**Target:** 7.2 (underspecification gating), 8.2 (dispatch pipeline — complexity-aware routing)

### Pattern 8: Conversational Tool Discovery (AiDesigner)
**What:** "I need database access" → system suggests and installs PostgreSQL MCP. No config file editing. Credentials prompted naturally. Health checks confirm success. Context-aware suggestions based on project analysis (package.json, file structure).
**Relevance:** Our `/init` and `/link` commands already do project analysis, but MCP setup is still manual. The AiDesigner pattern suggests: during `/init`, scan project dependencies → suggest MCP connections → prompt for credentials → auto-configure. Eliminates the "Tier 1/2/3/4" manual setup.
**Target:** Phase 9 (onboarding), 8.1 (vault watcher could detect missing MCPs from project structure)

### Pattern 9: Profile-Based Environment Separation (AiDesigner)
**What:** Configurations split by environment (dev/staging/prod). Profiles auto-detected via env vars, NODE_ENV, or git branch. Inheritance model — staging inherits from prod with overrides. Import/export for team sharing. Diff tools for comparing profiles.
**Relevance:** Our workspace presets (build/review/focus/etc.) are UI-level profiles. AiDesigner's pattern extends this to the full configuration stack — different MCP connections, different capability grants, different mana budgets per environment. A "production" profile would restrict Destructive capabilities entirely.
**Target:** 8.1 (grimoire environment profiles), Phase 9 (multi-environment support)

### Pattern 10: Credential Vault with Reference Syntax (AiDesigner)
**What:** Two-tier credential storage: system keychain (preferred) or AES-256-GCM encrypted vault (fallback). Config files use `{{vault:SECRET_NAME}}` references instead of plaintext. Migration command (`mcp:secure`) scans and encrypts existing plaintext secrets automatically.
**Relevance:** Directly addresses our carried risk R-DS-01 (keyring migration for HealthCheckManager credentials). The `{{vault:keyName}}` reference syntax is elegant — config files remain readable while secrets stay encrypted. The auto-migration scan is exactly what we need for the Phase 9 pre-release keyring migration.
**Target:** Phase 9 (R-DS-01 keyring migration — adopt `{{vault:key}}` reference pattern + auto-migration scan)

### Pattern 11: Phase Detection via Filesystem State (AiDesigner)
**What:** Current phase determined by checking which files exist: `docs/brief.md` → discovery phase, `docs/prd.md` → planning phase, `docs/architecture.md` → design phase. Combined with intent keywords and conversation flow for multi-signal detection.
**Relevance:** Our BOOT.md YAML header tracks phase explicitly. But AiDesigner's filesystem-based detection provides a validation/fallback — if BOOT.md says "Phase 7" but the expected Phase 7 artifacts don't exist, something's wrong. The vault watcher (8.1) could verify phase claims against filesystem evidence.
**Target:** 8.1 (vault watcher — phase integrity verification via filesystem evidence)

### Pattern 12: Meta-Agent Ecosystem (AiDesigner)
**What:** Agents that create other agents: meta-agent-developer (creates specialized agents), meta-agent-genesis (bootstraps new agent types), meta-agent-librarian (catalogs agents), meta-agent-orchestrator (composes agents), meta-agent-refactor (improves agents), meta-agent-mcp-inspector (validates MCP configs).
**Relevance:** Our persona evolution engine (8.5) is already planned. AiDesigner's meta-agent ecosystem validates the concept and adds: a librarian that auto-catalogs (our ENTITY-CATALOG.md is manual), a refactor agent (our introspection protocol evolves personas but doesn't refactor their definitions), and an MCP inspector (our `mcp:doctor` equivalent).
**Target:** 8.5 (persona evolution — adopt librarian + refactor meta-agent patterns)

### Pattern 13: Checkpoint Validation Pattern (AiDesigner)
**What:** Before major phase transitions, the orchestrator pauses: "Does this capture your needs? (y/n/edit)". After validation, provides progress recap + numbered options for next direction. User drives, system suggests.
**Relevance:** Our operator approval is implicit (operator says "next batch"). AiDesigner's checkpoint pattern makes it explicit — before Phase 3 (gate), present a summary of what was built and ask for direction. This maps to our dispatch queue panel (P7-L) where `canAdvance` gates batch progression. The UI could surface a checkpoint prompt.
**Target:** 7.3 (P7-L dispatch queue — checkpoint validation before batch advancement)

---

## Integration Map

| # | Pattern | Source | Target | Fit |
|---|---------|--------|--------|-----|
| 1 | Persistent context tree | ByteRover | 8.1, 8.3 | Validates KAIROS + sigils |
| 2 | Hub & Connectors | ByteRover | 8.1 | Validates skills marketplace |
| 2b | Tool Registry + Factory DI | ByteRover (deep) | 7.2, P7-C.1 | 2nd validation factory tool reg |
| 2c | Tool Markers / semantic tags | ByteRover (deep) | P7-C | Validates CommandCategory |
| 2d | Policy Engine (ALLOW/DENY/PROPOSE) | ByteRover (deep) | 7.3, 8.2 | Proposal approval engine |
| 2e | Priority Queue (4-tier) | ByteRover (deep) | 7.3 (P7-L) | Dispatch Queue priority model |
| 2f | Plugin before/after hooks | ByteRover (deep) | 8.2 | Sequential before / parallel after |
| 2g | Session overrides on immutable baseline | ByteRover (deep) | 8.2 | Per-dispatch isolated state |
| 3 | Daemon architecture | ByteRover + Agent Browser | 8.1, 8.2 | Validates ritual engine |
| 4 | Engine abstraction | Agent Browser | 8.1 | 5th validation of dual-adapter |
| 5 | Snapshot-based page understanding | Agent Browser | 8.2 | Enhances Mara gate evaluation |
| 5b | Action Policy Allow/Deny/Confirm | Agent Browser (deep) | 7.2, 7.3 | 2nd validation of policy trichotomy |
| 5c | WebSocket Multiplexer (ID-correlated) | Agent Browser (deep) | 7.3 (P7-L) | Dispatch queue internals |
| 5d | Boundary markers + AI error translation | Agent Browser (deep) | 8.1, 8.2 | Agent security + error UX |
| 5e | AES-256-GCM encrypted state | Agent Browser (deep) | Phase 9 | 2nd validation R-DS-01 crypto |
| 5f | Transient error classification + retry | Agent Browser (deep) | 8.2 | Circuit breaker enhancement |
| 5g | Hierarchical config merge | Agent Browser (deep) | 8.1, 8.2 | Grimoire + dispatch config cascade |
| 6 | Invisible orchestration | AiDesigner | 8.5, Phase 9 | Selectable visibility for onboarding |
| 7 | Dual-lane routing + auto-escalation | AiDesigner | 7.2, 8.2 | Enhances underspecification gating |
| 8 | Conversational tool discovery | AiDesigner | Phase 9 | Auto-MCP setup during /init |
| 9 | Profile-based env separation | AiDesigner | 8.1, Phase 9 | Grimoire environment profiles |
| 10 | Credential vault `{{vault:key}}` refs | AiDesigner | Phase 9 | R-DS-01 keyring migration pattern |
| 11 | Phase detection via filesystem | AiDesigner | 8.1 | Vault watcher integrity check |
| 12 | Meta-agent ecosystem | AiDesigner | 8.5 | Librarian + refactor meta-agents |
| 13 | Checkpoint validation | AiDesigner | 7.3 | Dispatch queue advancement UX |

---

## Summary

**26 patterns from 3 sources** (13 top-level + 6 ByteRover deep-dive + 7 Agent Browser deep-dive). 0 new sessions — all fit existing seams.

**Strongest signal:** AiDesigner's invisible orchestration + conversational tool discovery patterns. These map perfectly to our Phase 9 onboarding story — `/init` becomes a natural conversation that auto-discovers needed MCPs and configures them without the user ever seeing "MCP server" or "Tauri command."

**Second signal:** Agent Browser's Rust architecture is the deepest validation yet of our technical choices. The client-daemon model, oneshot multiplexer, Allow/Deny/Confirm policy trichotomy, AES-256-GCM state encryption, transient error classification with platform-specific codes, and hierarchical config merge are all production-grade Rust patterns we can reference directly during implementation. Two independent repos (AiDesigner + Agent Browser) converged on AES-256-GCM for credential encryption — that's our R-DS-01 crypto choice locked.

**Carried risk update:** R-DS-01 (keyring migration) now has a concrete implementation pattern from AiDesigner: `{{vault:keyName}}` reference syntax + AES-256-GCM encrypted vault + auto-migration scan command.

---

*Research doc — 2026-04-03. 3 sources, 26 patterns (13 + 6 + 7 deep-dive), 0 new sessions.*
