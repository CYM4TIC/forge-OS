# Phase 8 Manifest Reference — External Repo Intelligence

> **Purpose:** Consolidated reference for writing Phase 8 batch manifests. Combines mined patterns (awesome-copilot) with surveyed repos awaiting deep-mining. Organized by Phase 8 sub-session.
> **Generated:** 2026-04-05 | Session 7.5 (P7.5-D.0)
> **Sources:** awesome-copilot mining (35 patterns) + GitHub/Microsoft/LangChain/MCP org survey (38 repos)

---

## How to Use This Document

When writing Phase 8 batch manifests:
1. Find the relevant sub-session section below
2. Check **Mined Patterns** — these are concrete, already-extracted patterns with implementation guidance
3. Check **Repos to Mine** — these need deep-mining before or during manifest writing
4. Reference pattern IDs (AC-XX for awesome-copilot, prior mining IDs for existing patterns)
5. Every pattern listed here should appear in a batch manifest or be explicitly excluded with rationale

---

## Phase 8.1 — KAIROS Memory System

### Mined Patterns (awesome-copilot)

| ID | Pattern | Description | Steal Priority |
|----|---------|-------------|----------------|
| AC-05 | Memory Bank Hierarchy | 6-file dependency graph: projectbrief → productContext/systemPatterns/techContext → activeContext → progress. Structured tiers with update triggers. | HIGH |
| AC-06 | Domain-Organized Self-Categorizing Memory | Auto-discovery of memory domains via glob, intelligent matching of learnings to domains with fallback to new domain creation. Global vs workspace scope. | HIGH |
| AC-07 | Memory Merger (Knowledge Consolidation) | 5-step merge process: parse → propose → quality bar → merge to 10/10 → update. Zero knowledge loss, minimal redundancy. | MED |
| AC-09 | Ralph Loop (Disk-as-State) | State on disk, fresh context per iteration. IMPLEMENTATION_PLAN.md as ritual state. Backpressure from tests/builds steers quality. | HIGH |
| AC-10 | Session Persistence and Resumption | Save/restore sessions via custom IDs. Create, destroy without data loss, resume by ID, list available, get message history. | MED |
| AC-22 | Model Recommendation Routing | 8 task categories: Simple Repetitive, Code Generation, Complex Refactoring, Debugging, Planning/Research, Code Review, Specialized Domain, Advanced Reasoning. Each maps to model capabilities. | HIGH |
| AC-15 | Session Logger | Structured JSON logging of session start/end + prompt submissions. Privacy-aware. Append-only. | LOW |

### Repos to Mine

| Repo | What to Extract | Priority |
|------|----------------|----------|
| byte5ai/palaia | SQLite-vec + MCP agent memory. Auto-capture, crash-safe, multi-agent. Almost exactly KAIROS — mine for schema design, embedding strategy, MCP interface patterns. | HIGH |
| microsoft/semantic-kernel | Memory store abstractions, planner architecture, function calling patterns, multi-model connector design. | HIGH |
| langchain-ai/langgraph | State machine checkpointing, persistence layer, graph-based state management. | HIGH |

### Existing Research (cross-reference)

- KAIROS Memory System Patterns table in RESEARCH-PERSONA-MAP.md (K1-K12 + 7 cross-cutting)
- StixDB patterns: exponential decay, touch-boost, hybrid LRU+LFU, tier-based promotion
- ArsContexta: Three-Space routing, session lifecycle
- CrewAI: composite memory scoring, scoped isolation, background write queue
- OpenHands: rolling condenser, view projection, conversation memory

---

## Phase 8.2 — Swarm Parallel Dispatch

### Mined Patterns (awesome-copilot)

| ID | Pattern | Description | Steal Priority |
|----|---------|-------------|----------------|
| AC-01 | RUG Protocol (Pure Orchestrator) | Orchestrator NEVER does work. Decomposes tasks, launches sub-agents, validates via separate validation sub-agents, loops until pass. "Context window is sacred." | HIGH |
| AC-02 | Wave-Based Parallel Orchestration (GEM) | 7-phase workflow. Wave-based parallelism (4-8 concurrent). Conflict detection (shared file targets = serial). Integration checks between waves. Magic keyword dispatch. Multi-plan selection. Constitutional constraints. | HIGH |
| AC-03 | 10-Agent Specialized Team (GEM Ensemble) | Narrow roles with typed JSON delegation contracts per agent type. Orchestrator delegates via schema. | MED |
| AC-35 | Polyglot Pipeline (Ultra-Narrow Specialization) | 8 agents in pipeline. Builder ONLY builds, tester ONLY tests. Prevents context pollution via extreme specialization. | LOW |

### Repos to Mine

| Repo | What to Extract | Priority |
|------|----------------|----------|
| github/gh-aw | Production orchestration — task decomposition, workflow execution, dispatch patterns. GitHub's actual agent dispatch stack. | HIGH |
| openai/swarm | Original swarm concept — handoff patterns, routine/function design, context passing between agents. | MED |
| langchain-ai/langgraph-swarm-py | Multi-agent swarm with LangGraph — handoff protocols, agent coordination, state sharing. | MED |
| langchain-ai/deepagents | Hierarchical dispatch — planning tool, filesystem backend, subagent spawning architecture. | MED |

### Existing Research (cross-reference)

- SWARM-PROTOCOL.md: Queen/Worker dispatch, TeamFile, Mailbox, concurrency limits
- AutoGen: Handoff-as-Tool, Parallel Speaker Dispatch, MagenticOne ledger orchestrator
- CrewAI: Delegation-as-Tool, Flow Decorator DAG, event bus with topological sort
- OpenHands: Delegation with Budget Partitioning, Pending Action Queue

---

## Phase 8.3 — Agent Runtime & Safety

### Mined Patterns (awesome-copilot)

| ID | Pattern | Description | Steal Priority |
|----|---------|-------------|----------------|
| AC-11 | Tool Guardian | Pre-execution interception on every tool call. ~20 threat patterns across 6 categories. Block or warn modes. Structured JSON audit log. Allowlist support. | HIGH |
| AC-12 | Governance Audit (Prompt Threat Detection) | Real-time scanning of user prompts BEFORE agent processing. 5 threat categories with severity scores (0.6-0.95). 4 governance levels: open/standard/strict/locked. Privacy-preserving (log decisions, not content). | HIGH |
| AC-13 | Agent Governance Framework | Trust scoring with temporal decay (erodes without activity). Three gates: ≥0.7 autonomous, ≥0.4 with oversight, <0.4 requires approval. Policy composition: most-restrictive-wins. YAML-configured. Fail-closed on ambiguity. Multi-agent: inner agent ≤ outer agent permissions. | HIGH |
| AC-27 | Hook Event System (Lifecycle) | Events: preToolUse, sessionStart/End, userPromptSubmitted. Shell commands with JSON on stdin, env vars, timeouts. Composable (multiple hooks per event). Exit codes control flow. | HIGH |
| AC-14 | Secrets Scanner | Session-end scan of all modified files. 20+ secret pattern categories. Smart filtering (skip binaries, lock files, placeholders). Allowlist. Block or warn. | MED |
| AC-32 | Agentic Workflows (Safe-Outputs) | Workflows declare allowed actions with constraints (e.g., can only create issues with specific label, max 1 comment). Permissions + safe-outputs = bounded agent behavior. | MED |

### Repos to Mine

| Repo | What to Extract | Priority |
|------|----------------|----------|
| github/gh-aw-firewall | Agent sandboxing, policy enforcement, permission boundaries. How GitHub constrains agent actions in production. | HIGH |
| github/gh-aw-mcpg | MCP gateway architecture — routing agent requests through MCP, protocol patterns. | HIGH |
| microsoft/SafeAgents | Safety evaluation frameworks (ARIA, DHARMA), attack detection, governance benchmarks. | MED |
| github/copilot-engine-sdk | Lower-level engine architecture — kernel execution, agent lifecycle, tool registration. | MED |
| anthropics/claude-agent-sdk-typescript | Agent dispatch, tool use patterns, conversation management, system prompt assembly. | MED |

### Existing Research (cross-reference)

- BYTEROVER: Content Boundary Markers, Encrypted State, Credential Vault
- JUST-BASH: Network Allow-List, Composable Filesystem
- OpenHands: Security Analyzer as Event Stream Listener, Secret Scrubbing, Confirmation Mode
- AutoGen: InterventionHandler (message interception)
- BLOCK-GOOSE: ToolConfirmationRouter, Extension Malware Check

---

## Phase 8.4 — Agent Quality & Workflow

### Mined Patterns (awesome-copilot)

| ID | Pattern | Description | Steal Priority |
|----|---------|-------------|----------------|
| AC-16 | Blueprint Mode Self-Scoring | 5-category rubric: Correctness, Robustness, Simplicity, Maintainability, Consistency. All must score >8. Max 3 iterations. Confidence-based ambiguity resolution (>90% proceed, <90% ask one question). | HIGH |
| AC-18 | Spec-Driven 6-Phase Workflow (EARS) | ANALYZE→DESIGN→IMPLEMENT→VALIDATE→REFLECT→HANDOFF. EARS notation for requirements (WHEN/WHILE/IF). Confidence-based execution (>85% full, 66-85% PoC, <66% research). Auto-issue creation for tech debt. | HIGH |
| AC-17 | Structured Autonomy Pipeline | Plan→Generate→Implement. Planning agent uses sub-agents for research, never writes code. Implementation agent follows plan literally. "Premium planning, thrifty implementation." | MED |
| AC-24 | Eval-Driven Development | LLM QA pipeline. eval_input → eval_output → evaluators. LLM-as-judge for non-deterministic outputs. Application-specific criteria, not generic metrics. | MED |
| AC-23 | Quality Playbook (Council of Three) | Three different models independently audit code against specs, results cross-referenced. State machine completeness analysis. | MED |

### Repos to Mine

| Repo | What to Extract | Priority |
|------|----------------|----------|
| github/spec-kit | Spec-driven development toolkit — structured task specs for agent execution. | MED |
| microsoft/hve-core | Hypervelocity engineering components — production-grade agent instructions, prompt patterns. | MED |

### Existing Research (cross-reference)

- META-HARNESS: Confound Isolation, Raw Traces > Summaries
- FACTORY-AI: Agent output lint rules, ToolConfirmationType
- oh-my-claudecode: Critic self-audit, multi-perspective review

---

## Phase 8.5 — Plugin & Extension Architecture

### Mined Patterns (awesome-copilot)

| ID | Pattern | Description | Steal Priority |
|----|---------|-------------|----------------|
| AC-25 | Plugin Manifest System | Declarative `plugin.json` with name, version, keywords, refs to agents/commands/skills. CLI-installable. Auto-generated marketplace index. | MED |
| AC-26 | Skill Specification (Self-Contained Units) | Folder with SKILL.md (frontmatter + instructions) + bundled assets. Composable into any agent. "SKILL.md for what/why, references for how." | MED |
| AC-28 | ApplyTo Glob Pattern-Matching | Instructions activate based on file globs (e.g., `**.rs` for Rust). Just-in-time context delivery. No manual activation. | MED |
| AC-33 | Frontmatter-as-Config | YAML frontmatter: tools array, model preference, handoffs, argument-hint. Markdown body = instructions. Human-readable, diffable, composable. | LOW (validates existing) |

### Repos to Mine

| Repo | What to Extract | Priority |
|------|----------------|----------|
| github/copilot-plugins | Official MCP servers, skills, hooks — extensibility architecture patterns. | MED |
| github/copilot-sdk | Multi-platform SDK — plugin/skill/hook integration patterns for desktop apps. | MED |
| modelcontextprotocol/rust-sdk | Rust-native MCP server/client — tool registration, resource handling, transport. | HIGH |
| modelcontextprotocol/typescript-sdk | Frontend MCP client — tool interaction from React chat interface. | MED |
| modelcontextprotocol/servers | Reference MCP server implementations — filesystem, git, sqlite. | MED |

### Existing Research (cross-reference)

- BLOCK-GOOSE: Recipe System (rituals as plugins)
- BYTEROVER: Plugin Hooks, Conversational Tool Discovery
- oh-my-claudecode: Worker Hierarchy, skill loading

---

## Phase 8+ — UI Patterns

### Mined Patterns (awesome-copilot)

| ID | Pattern | Description | Steal Priority |
|----|---------|-------------|----------------|
| AC-30 | Handoff Chains (Agent-to-Agent UX) | 4 patterns: Sequential, Iterative, TDD, Research-to-Action. `send: true/false` for auto vs user-review transitions. Handoff buttons with pre-filled context. | MED |
| AC-29 | Boost Prompt (Interactive Refinement) | Interrogates scope/deliverables/constraints. Explores project structure. Produces improved prompt. Iterates on feedback. | LOW |
| AC-08 | Context Map (Pre-Change Impact Analysis) | Before changes: files to modify, dependencies, test coverage, reference patterns, risk checklist. | MED |
| AC-31 | Context Engineering | Descriptive file paths, colocated code, explicit types, semantic names, strategic comments. COPILOT.md for architecture docs. | LOW |
| AC-19 | Custom Agent Foundry (Meta-Agent) | Tool selection strategy matrix by agent type. Handoff design patterns. Quality checklist for agent definitions. | MED |
| AC-20 | Critical Thinking Mode | Read-only Socratic agent. Challenges assumptions. One question at a time. | LOW |
| AC-21 | Demonstrate Understanding Mode | Validates user comprehension before executing complex operations. | LOW |
| AC-34 | SDK Multi-Session Management | Independent sessions with own context, model preference, permission handler, event listeners. | MED |

### Repos to Mine

| Repo | What to Extract | Priority |
|------|----------------|----------|
| microsoft/magentic-ui | Human-centered web agent UI — chat patterns, step visualization, approval workflows. | MED |
| langchain-ai/agent-chat-ui | React chat interface for agents — streaming, tool visualization, multi-turn conversations. | MED |
| microsoft/UFO | Desktop agent interaction patterns — how agents interact with desktop UI elements. | MED |
| modelcontextprotocol/ext-apps | MCP embedded UI apps — UIs embedded in AI chatbots. | LOW |

### Existing Research (cross-reference)

- POETENGINEER: feedback trails, spring physics, flow field particles, state machine transitions
- AGENTIC-DEV-ENVIRONMENTS: Embedded Terminal, Browser-as-Surface, Agent Following
- touchdesigner: data-to-geometry mapping, radial layouts, particle emission

---

## Cross-Phase — Infrastructure

### Repos to Mine (not sub-session specific)

| Repo | What to Extract | Phase Relevance | Priority |
|------|----------------|-----------------|----------|
| tauri-apps/plugins-workspace | Official Tauri v2 plugins: SQL, stronghold, shell, fs, websocket, window-state | All Phase 8 | MED |
| github/semantic | Code analysis engine — AST parsing, semantic understanding | 8.5+ (code intelligence) | MED |
| github/models-ai-sdk | Multi-model inference API SDK — model selection, routing abstractions | 8.1 (model routing) | MED |
| microsoft/TaskWeaver | Code-first agent framework — task planning, code execution, plugin system | 8.2-8.3 | MED |
| microsoft/autogen | Multi-agent conversations — evolved since last mine, worth refresh | 8.2-8.3 | MED |
| github/github-mcp-server | Official MCP server implementation — tool registration, transport layer | 8.5 (MCP) | MED |

---

## Tauri-Stack Cousins (Architecture Validation)

| Repo | Stack | What to Check |
|------|-------|---------------|
| open-vibe/open-vibe | Tauri + AI agents | Thread-centric workflows, workspace management, Git tooling integration |
| germanhl36/opencli-agent | Tauri 2 + Rust + React | Exact same tech stack — Tauri 2 integration patterns, IPC design |

---

## Summary Statistics

| Category | Mined Patterns | Repos to Mine | Total Sources |
|----------|---------------|---------------|---------------|
| Phase 8.1 (KAIROS) | 7 | 3 | 10 |
| Phase 8.2 (Swarm) | 4 | 4 | 8 |
| Phase 8.3 (Runtime/Safety) | 6 | 5 | 11 |
| Phase 8.4 (Quality) | 5 | 2 | 7 |
| Phase 8.5 (Plugins) | 4 | 5 | 9 |
| Phase 8+ (UI) | 8 | 4 | 12 |
| Cross-Phase | 0 | 6 | 6 |
| **TOTAL** | **34** | **29 unique** | **63** |

> awesome-copilot Pattern 4 (Software Engineering Team Plugin) omitted — LOW priority, minimal novel patterns.

---

## Mining Workflow

When preparing to write Phase 8 batch manifests:

1. **Deep-mine HIGH repos first:** gh-aw trifecta, semantic-kernel, palaia, langgraph, MCP rust-sdk
2. **For each mined repo:** Add patterns to this document under the relevant sub-session
3. **Cross-reference** with existing RESEARCH-PERSONA-MAP.md patterns (already mapped to sessions)
4. **Write manifests** with every pattern accounted for — either as a batch deliverable or as a design constraint annotation
5. **Update Integration Map** in TAURI-BUILD-PLAN.md with new pattern → session mappings

---

*Phase 8 Manifest Reference — generated 2026-04-05 from awesome-copilot mining (35 patterns) + org survey (38 repos).*
*Living document: update as repos are mined.*
