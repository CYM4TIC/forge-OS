# Awesome-Copilot Repo Mining Report
## Source: github/awesome-copilot (1,868 files)
## Date: 2026-04-05 | Session: 7.5 (Phase 8 Prep)

---

## REPO OVERVIEW

The `github/awesome-copilot` repository is a **community-curated collection** of 200+ agents, 170+ instructions, 200+ skills, 6 hooks, 7 workflows, and 70+ plugins for GitHub Copilot. It represents the largest known catalog of agent patterns, prompt engineering techniques, and orchestration architectures in the Copilot ecosystem.

### Structure
```
agents/           # *.agent.md files - persona definitions with frontmatter
instructions/     # *.instructions.md - file-pattern-scoped coding standards
skills/           # folders with SKILL.md + bundled assets - self-contained capabilities
hooks/            # event-driven automation (preToolUse, sessionStart/End, userPromptSubmitted)
workflows/        # GitHub Actions agentic workflows (.md with cron/slash_command triggers)
plugins/          # installable bundles grouping agents + skills + instructions
cookbook/          # SDK recipes (Node.js, Python, Go, .NET) for session management
.schemas/         # JSON schemas for collections, tools, cookbooks
```

---

## PATTERN CATALOG

### CATEGORY 1: MULTI-AGENT ORCHESTRATION

---

#### Pattern 1: Pure Orchestrator with Sub-Agent Delegation (RUG Protocol)
- **Source**: `plugins/rug-agentic-workflow/agents/rug-orchestrator.md`
- **What it does**: Implements a "Repeat Until Good" orchestration protocol. The orchestrator NEVER does implementation work. It decomposes tasks, launches sub-agents via `runSubagent`, validates via separate validation sub-agents, and loops until all acceptance criteria pass. Context window is preserved by delegating ALL work including file reads.
- **Key mechanisms**:
  - Task decomposition: one file = one sub-agent, one concern = one sub-agent
  - Separate validation sub-agents (never trust self-reported completion)
  - Anti-laziness measures in sub-agent prompts (explicit "DO NOT skip", "You MUST complete ALL")
  - Specification adherence enforcement (user's tech choices are hard constraints, validated separately)
  - Todo list as persistent memory across delegations
- **Forge OS mapping**: Phase 8 Agent Runtime - Swarm dispatch architecture. The RUG pattern maps directly to how Nyx should orchestrate persona sub-agents. The "context window is sacred" principle validates our kernel isolation model where each persona gets fresh context.
- **Steal priority**: **HIGH**

---

#### Pattern 2: Wave-Based Parallel Orchestration (GEM)
- **Source**: `agents/gem-orchestrator.agent.md`
- **What it does**: Multi-phase workflow with 7 phases: Phase Detection, Discuss, PRD Creation, Research, Planning, Execution Loop, Summary. Execution uses wave-based parallelism (up to 4-8 concurrent sub-agents) with conflict detection (shared file targets run serially within wave).
- **Key mechanisms**:
  - Magic keyword detection for fast-track modes (`autopilot`, `deep-interview`, `fast`, `debug`, `simplify`, `critique`)
  - Task type detection auto-assigns agents (UI tasks -> designer, bugs -> debugger then implementer, security -> reviewer)
  - Multi-plan selection for complex tasks (3 plans generated in parallel, best selected by metrics)
  - Integration checks after each wave (build, tests, lint)
  - Wave contracts: when wave > 1, includes interface contracts from prior tasks
  - PRD as YAML with user stories, scope, acceptance criteria, state machines
  - Constitutional constraints (hard rules that override everything)
  - AGENTS.md maintenance (discovered patterns written back after plan completion)
- **Forge OS mapping**: Phase 8.2 Swarm parallel dispatch. Wave-based execution with conflict detection is exactly what we need. Magic keywords map to ritual invocation. Task type detection maps to persona routing. Multi-plan selection for complex tasks is a powerful pattern for KAIROS decision points.
- **Steal priority**: **HIGH**

---

#### Pattern 3: 10-Agent Specialized Team (GEM Ensemble)
- **Source**: `agents/gem-*.agent.md` (10 agents), `plugins/gem-team/`
- **What it does**: Defines a complete software team: orchestrator, researcher, planner, implementer, reviewer, browser-tester, devops, debugger, critic, code-simplifier, designer, documentation-writer.
- **Key insight**: Each agent has a narrow, well-defined role with explicit tool permissions. The orchestrator delegates via typed JSON contracts with specific fields per agent type.
- **Forge OS mapping**: Phase 7 persona kernel design. Our 14 personas parallel this but with cognitive differentiation rather than just role differentiation. The typed delegation protocol (JSON schemas per agent type) should inform our IPC message format between kernels.
- **Steal priority**: **MED**

---

#### Pattern 4: Software Engineering Team Plugin (7 Specialists)
- **Source**: `plugins/software-engineering-team/`
- **What it does**: 7 agents covering full SDLC: UX/UI designer, technical writer, GitOps/CI specialist, product manager advisor, responsible AI specialist, system architecture reviewer, security reviewer.
- **Key insight**: Includes a "Responsible AI" agent for bias prevention, accessibility compliance, ethical development. Not seen in other repos.
- **Forge OS mapping**: Phase 8 agent roster. The Responsible AI agent maps to potential persona governance, where Tanaka (Security) could be augmented with ethical AI oversight. The product manager advisor maps to how Pierce might operate.
- **Steal priority**: **LOW**

---

### CATEGORY 2: MEMORY AND CONTEXT MANAGEMENT

---

#### Pattern 5: Memory Bank (Hierarchical File-Based Memory)
- **Source**: `instructions/memory-bank.instructions.md`
- **What it does**: Implements a complete memory system using markdown files in a hierarchy: projectbrief.md -> productContext.md / systemPatterns.md / techContext.md -> activeContext.md -> progress.md + tasks/ folder. Memory resets completely between sessions; the Memory Bank is the ONLY link to previous work.
- **Key mechanisms**:
  - 6 core files forming a dependency graph (brief shapes everything else)
  - Task management with individual task files (TASKID-taskname.md) plus index
  - Plan Mode vs Act Mode workflows
  - Progress tracking with subtask tables AND narrative progress logs
  - "Instructions" files as learning journals (patterns, preferences, project intelligence)
  - Explicit update triggers (new patterns, significant changes, user request)
  - Mermaid flowcharts for workflow documentation
- **Forge OS mapping**: KAIROS memory system (Phase 8.1). This validates our file-based memory approach but suggests a more structured hierarchy than flat files. The core file dependency graph (brief -> context -> active -> progress) maps to KAIROS memory tiers. Task files with subtask tables + progress logs inform our ritual state tracking.
- **Steal priority**: **HIGH**

---

#### Pattern 6: Domain-Organized Memory with Self-Categorization (Remember Skill)
- **Source**: `skills/remember/SKILL.md`
- **What it does**: Transforms lessons learned into domain-organized memory instruction files. Self-organizing knowledge base that automatically categorizes learnings by domain and creates new memory files as needed. Supports global (all projects) and workspace (project-specific) scopes.
- **Key mechanisms**:
  - Auto-discovery of existing memory domains via glob patterns
  - Intelligent matching of learnings to domains with fallback to new domain creation
  - Generalization beyond specifics (extract reusable patterns from specific instances)
  - Positive reinforcement (what to do, not what to avoid)
  - Memory file structure: frontmatter with applyTo globs, headline, tagline, L2 sections per lesson
- **Forge OS mapping**: KAIROS memory layer. The self-categorization pattern is directly applicable to how Garden knowledge nodes could auto-organize. Domain scoping (global vs workspace) maps to our user-level vs project-level memory distinction.
- **Steal priority**: **HIGH**

---

#### Pattern 7: Memory Merger (Knowledge Consolidation)
- **Source**: `skills/memory-merger/SKILL.md`
- **What it does**: Merges mature lessons from memory files into instruction files with a quality bar: zero knowledge loss, minimal redundancy, maximum scannability. 5-step process: parse, propose for review, define quality bar, merge and iterate to 10/10, update files.
- **Forge OS mapping**: KAIROS memory consolidation. When ephemeral session memories mature, they need a consolidation pass into long-term kernel memory. This pattern provides the workflow for that. The quality bar concept (10/10 criteria) is useful for any knowledge distillation.
- **Steal priority**: **MED**

---

#### Pattern 8: Context Map (Pre-Change Impact Analysis)
- **Source**: `skills/context-map/SKILL.md`, `agents/context-architect.agent.md`
- **What it does**: Before any changes, generates a structured map: files to modify, dependencies that may need updates, test coverage, reference patterns to follow, risk assessment checklist. The Context Architect agent traces dependency graphs and plans change sequences.
- **Forge OS mapping**: Phase 8 agent task planning. Before any persona takes action, a context map should be generated. This maps to the "research before act" pattern we need in kernel dispatch. Could be a standard pre-execution step for all persona operations.
- **Steal priority**: **MED**

---

#### Pattern 9: Ralph Loop (Disk-as-State Autonomous Iteration)
- **Source**: `cookbook/copilot-sdk/nodejs/ralph-loop.md`
- **What it does**: Autonomous development loop where each iteration gets a fresh context window. State lives on disk (IMPLEMENTATION_PLAN.md), not in the model's context. Two modes: PLANNING (gap analysis) and BUILDING (implement from plan). Backpressure from tests/builds steers quality.
- **Key insight**: "State lives on disk, not in the model's context." Each iteration starts fresh, reads current state from files, does one task, writes results back, exits. This is the inverse of stateful conversation.
- **Forge OS mapping**: Phase 8.3 Agent Runtime loop. This is the pattern for long-running agent tasks in Forge OS. A persona can run in Ralph Loop mode: read kernel state from SQLite, pick next task, execute, write results back, yield. Fresh context per iteration prevents degradation. IMPLEMENTATION_PLAN.md maps to our ritual state in KAIROS.
- **Steal priority**: **HIGH**

---

#### Pattern 10: Session Persistence and Resumption
- **Source**: `cookbook/copilot-sdk/nodejs/persisting-sessions.md`
- **What it does**: Save and restore conversation sessions across application restarts using custom session IDs. Create session with ID, destroy without losing data, resume by ID, list available sessions, get message history.
- **Forge OS mapping**: Phase 8.1 KAIROS session management. Direct pattern for persisting persona conversation state across Tauri app restarts. Session IDs could be ritual IDs. Message history retrieval enables conversation replay.
- **Steal priority**: **MED**

---

### CATEGORY 3: GOVERNANCE, SAFETY, AND TRUST

---

#### Pattern 11: Tool Guardian (Pre-Execution Safety Net)
- **Source**: `hooks/tool-guardian/`
- **What it does**: Intercepts every tool invocation at `preToolUse` event. Scans against ~20 threat patterns across 6 categories: destructive file ops, destructive git ops, database destruction, permission abuse, network exfiltration, system danger. Two modes: block or warn. Structured JSON logging. Allowlist support.
- **Key mechanism**: Hook receives tool invocation as JSON on stdin (toolName + toolInput), scans combined text against regex patterns, suggests safer alternatives, writes structured audit log.
- **Forge OS mapping**: Phase 8 Agent Safety. Direct implementation pattern for tool-use governance in our agent runtime. Every Tauri command invoked by a persona should pass through a Tool Guardian. The hook architecture (preToolUse event) maps to our Rust-side command interceptor.
- **Steal priority**: **HIGH**

---

#### Pattern 12: Governance Audit (Prompt Threat Detection)
- **Source**: `hooks/governance-audit/`
- **What it does**: Real-time threat detection scanning user prompts BEFORE the agent processes them. 5 threat categories with severity scores: data exfiltration (0.7-0.95), privilege escalation (0.8-0.95), system destruction (0.9-0.95), prompt injection (0.6-0.9), credential exposure (0.9-0.95). 4 governance levels: open, standard, strict, locked.
- **Key insight**: Prompts are never logged (privacy), only matched threat patterns and metadata. Append-only audit trail.
- **Forge OS mapping**: Phase 8 Agent Safety + KAIROS audit. Governance levels map to our trust tiers. The pattern of scanning inputs before agent processing is essential for any user-facing agent system. The privacy-preserving audit (log decisions, not content) is the right approach for our audit trail.
- **Steal priority**: **HIGH**

---

#### Pattern 13: Agent Governance Patterns (Full Framework)
- **Source**: `skills/agent-governance/SKILL.md`, `agents/agent-governance-reviewer.agent.md`, `instructions/agent-safety.instructions.md`
- **What it does**: Complete governance framework with 6 patterns: GovernancePolicy (declarative allowlist/blocklist/rate limits), Semantic Intent Classification (weighted threat signals), Tool-Level Governance Decorator (@govern), Trust Scoring with temporal decay, Audit Trail (append-only JSON Lines), Framework Integration.
- **Key mechanisms**:
  - Policy composition: most-restrictive-wins merging across org/team/agent levels
  - Trust scores with temporal decay (trust erodes without activity)
  - Trust gates: score >= 0.7 autonomous, >= 0.4 with oversight, < 0.4 requires approval
  - Policy as YAML configuration (change without deploys)
  - Fail-closed principle: deny on ambiguity
  - Content safety: scan both user inputs AND agent-generated tool arguments
  - Multi-agent trust: never allow inner agent broader permissions than outer agent
- **Forge OS mapping**: Phase 8 Agent Runtime + Governance. This is the most complete governance pattern in the repo. Trust scoring with decay maps directly to persona trust levels. Policy composition (org -> team -> agent) maps to our system -> project -> persona policy hierarchy. The `@govern` decorator pattern should be adapted for Rust traits on Tauri commands.
- **Steal priority**: **HIGH**

---

#### Pattern 14: Secrets Scanner (Session-End Safety)
- **Source**: `hooks/secrets-scanner/`
- **What it does**: Scans all modified files at session end for 20+ categories of secret patterns (AWS keys, GitHub PATs, private keys, connection strings, JWTs, etc.). Smart filtering skips binary files, lock files, and placeholder values. Allowlist support. Two modes: warn (log) or block (exit non-zero to prevent commit).
- **Forge OS mapping**: Phase 8 Agent Safety. When a persona generates or modifies code, run a secrets scan before committing. Pairs with auto-commit pattern. The regex pattern catalog is directly reusable.
- **Steal priority**: **MED**

---

#### Pattern 15: Session Logger (Comprehensive Audit)
- **Source**: `hooks/session-logger/`
- **What it does**: Logs session start/end events and user prompt submissions as structured JSON. Three hook events: sessionStart, sessionEnd, userPromptSubmitted. Privacy-aware with configurable log levels.
- **Forge OS mapping**: Phase 8 KAIROS audit trail. Every persona session should be logged with start/end timestamps and working context. Maps to our SQLite audit table.
- **Steal priority**: **LOW**

---

### CATEGORY 4: PROMPT ENGINEERING AND AGENT DESIGN

---

#### Pattern 16: Blueprint Mode (Self-Scoring Workflows with Retry)
- **Source**: `agents/blueprint-mode.agent.md`
- **What it does**: Four workflow types (Loop, Debug, Express, Main) with strict execution. Key innovation: Self-Reflection rubric with 5 categories scored 1-10 (Correctness, Robustness, Simplicity, Maintainability, Consistency). All must score > 8 to pass. Max 3 iterations. Confidence-based ambiguity resolution (>90 proceed, <90 ask one question).
- **Key mechanisms**:
  - Workflow selection based on task type (repetitive -> Loop, bug -> Debug, small change -> Express, else -> Main)
  - Self-reflection as quality gate before completion
  - Persistence rules: confidence scoring to minimize user interruption
  - Anti-pattern: Never externalize thought/self-reflection
  - Tool usage policy: batch read-only calls, sequence dependent calls, prefer integrated tools over terminal
- **Forge OS mapping**: Phase 8 Agent Quality. The self-scoring rubric should be adapted for persona output quality gates. The confidence-based ambiguity resolution maps to how personas should decide when to ask the user vs proceed autonomously. The 4 workflow types (Loop/Debug/Express/Main) could become standard dispatch modes.
- **Steal priority**: **HIGH**

---

#### Pattern 17: Structured Autonomy (Plan/Generate/Implement Pipeline)
- **Source**: `plugins/structured-autonomy/`, `skills/structured-autonomy-{plan,implement,generate}/`
- **What it does**: Three-phase pipeline. Plan: research via sub-agent, decompose into commits, generate plan.md with NEEDS CLARIFICATION markers. Implement: follow plan exactly, check off items, run tests. "Premium planning, thrifty implementation."
- **Key insight**: Planning agent uses sub-agents for research and never writes code. Implementation agent follows plan literally and never deviates. Separation of planning intelligence from execution intelligence.
- **Forge OS mapping**: Phase 8 Agent Runtime. Maps to how Pierce (Strategy) generates plans that Kehinde (Systems) implements literally. The NEEDS CLARIFICATION markers are useful for ritual pause points where user input is required.
- **Steal priority**: **MED**

---

#### Pattern 18: Spec-Driven Workflow (6-Phase with EARS Notation)
- **Source**: `instructions/spec-driven-workflow-v1.instructions.md`
- **What it does**: 6-phase loop: ANALYZE, DESIGN, IMPLEMENT, VALIDATE, REFLECT, HANDOFF. Uses EARS notation for requirements (WHEN/WHILE/IF conditions). Confidence scoring determines execution strategy (>85% full implementation, 66-85% PoC first, <66% research first). Automated technical debt management with auto-issue creation.
- **Key mechanisms**:
  - Three persistent artifacts: requirements.md, design.md, tasks.md
  - Action Documentation Template (objective, context, decision, execution, output, validation, next)
  - Decision Record Template with review conditions
  - Troubleshooting retry protocol (re-analyze -> re-design -> re-plan -> retry -> escalate)
  - EARS notation: Ubiquitous, Event-driven, State-driven, Unwanted behavior, Optional, Complex
- **Forge OS mapping**: Phase 8 Ritual lifecycle. The 6-phase loop maps to ritual stages. EARS notation could standardize how we express persona capabilities and triggers. The confidence-based execution strategy (full/PoC/research) maps to how personas should handle uncertain tasks. Technical debt auto-creation maps to our issue tracking integration.
- **Steal priority**: **HIGH**

---

#### Pattern 19: Custom Agent Foundry (Meta-Agent Creation)
- **Source**: `agents/custom-agent-foundry.agent.md`
- **What it does**: Expert at designing and creating new agents. Defines tool selection strategies by agent type (read-only, implementation, testing, deployment, MCP integration). Instruction writing best practices. Handoff design patterns (sequential, iterative, TDD, research-to-action). Quality checklist for agent finalization.
- **Key insight**: Tool selection strategy matrix - different agent roles need fundamentally different tool sets. Handoff design with `send: true/false` for automated vs review-required transitions.
- **Forge OS mapping**: Phase 7 Kernel design. This is essentially a "kernel compiler" - it could inform how we generate or validate persona kernel definitions. The tool selection strategy matrix maps to persona capability profiles.
- **Steal priority**: **MED**

---

#### Pattern 20: Critical Thinking Mode (Socratic Agent)
- **Source**: `agents/critical-thinking.agent.md`
- **What it does**: Read-only agent that challenges assumptions. Does not suggest solutions. Asks "Why?" repeatedly until reaching root cause. Plays devil's advocate. Strong opinions held loosely. One question at a time.
- **Forge OS mapping**: Phase 7 persona design. Maps to a cognitive mode that any persona could enter. Tanaka's security review or Pierce's strategy review could use this mode. The "one question at a time" discipline is important for agent UX.
- **Steal priority**: **LOW**

---

#### Pattern 21: Demonstrate Understanding Mode (Knowledge Validation)
- **Source**: `agents/demonstrate-understanding.agent.md`
- **What it does**: Validates that the user truly comprehends code/patterns before proceeding. Asks user to explain their understanding, probes for gaps, guides to correct understanding through their own reasoning. Escalation protocol when fundamental misunderstanding detected.
- **Forge OS mapping**: Phase 8 UI/UX. Novel interaction pattern for our chat interface. Before a persona executes a complex operation, it could enter "demonstrate understanding" mode to ensure the user grasps the implications.
- **Steal priority**: **LOW**

---

#### Pattern 22: Model Recommendation (Multi-Model Routing)
- **Source**: `skills/model-recommendation/SKILL.md`
- **What it does**: Analyzes agent definitions and recommends optimal AI models based on task complexity, required capabilities, cost-efficiency. Decision tree with 8 task categories and model capability matrix. Considers subscription tiers and auto-selection behavior.
- **Key insight**: 8 task categories with model mapping: Simple Repetitive, Code Generation, Complex Refactoring, Debugging, Planning/Research, Code Review, Specialized Domain, Advanced Reasoning. Each has different model requirements.
- **Forge OS mapping**: Phase 8 Multi-model routing. Direct pattern for KAIROS model selection. Our personas should route to different models based on task complexity. Simple tasks -> fast/cheap models, complex architecture -> premium models. The 8 task categories could become our model routing taxonomy.
- **Steal priority**: **HIGH**

---

#### Pattern 23: Quality Playbook (6 Artifacts from Codebase Exploration)
- **Source**: `skills/quality-playbook/SKILL.md`
- **What it does**: Explores any codebase from scratch and generates 6 quality artifacts: quality constitution (QUALITY.md), spec-traced functional tests, code review protocol with regression test generation, integration testing protocol, multi-model spec audit (Council of Three), AI bootstrap file (AGENTS.md). Includes state machine completeness analysis.
- **Key insight**: "Council of Three" - three different models independently audit code against specs, then results are cross-referenced. State machine completeness analysis catches missing transitions/guards.
- **Forge OS mapping**: Phase 8 Quality. The Council of Three pattern (multi-model consensus) maps to how multiple personas could independently verify critical decisions. State machine completeness analysis is directly applicable to our ritual lifecycle state machines.
- **Steal priority**: **MED**

---

#### Pattern 24: Eval-Driven Development (LLM QA Pipeline)
- **Source**: `skills/eval-driven-dev/SKILL.md`
- **What it does**: Sets up evaluation-based QA for LLM applications. 6-step workflow: understand app + define eval criteria, instrument + observe real run, write utility function for e2e, build dataset, write + run eval tests, investigate + iterate. Uses LLM-as-judge evaluators instead of assertEqual for non-deterministic outputs.
- **Key insight**: eval_input (app input + mock external data) -> eval_output (app response + side effects + intermediate states). Evaluators are mapped from application-specific criteria, not generic metrics.
- **Forge OS mapping**: Phase 8 Testing. Pattern for testing persona outputs. Since persona responses are non-deterministic, we need evaluator-based testing rather than exact match. The eval criteria -> evaluator mapping workflow applies directly.
- **Steal priority**: **MED**

---

### CATEGORY 5: PLUGIN AND EXTENSION ARCHITECTURE

---

#### Pattern 25: Plugin Manifest System (Declarative Composition)
- **Source**: `plugins/*/plugin.json`, `.schemas/collection.schema.json`
- **What it does**: Plugins are folders with a `plugin.json` manifest declaring name, description, version, keywords, and references to agents, commands, and skills as relative paths. Collections group items with ordering and display options. Marketplace JSON auto-generated from all plugins during build.
- **Key mechanisms**:
  - Declarative composition (agents + skills + instructions bundled by theme)
  - Semantic versioning on plugins
  - CLI-installable (`copilot plugin install name@source`)
  - Auto-generated marketplace index
  - Collection schema with item kinds (prompt, instruction, agent, skill)
- **Forge OS mapping**: Phase 8 Plugin system. Direct pattern for our persona extension system. A "plugin" in Forge OS could bundle a kernel definition + skills + instructions + tools. The manifest approach enables community contributions and marketplace.
- **Steal priority**: **MED**

---

#### Pattern 26: Skill Specification (Self-Contained Capability Units)
- **Source**: `skills/*/SKILL.md`, skill validation system
- **What it does**: Each skill is a folder with SKILL.md (frontmatter + instructions) and optional bundled assets (scripts, templates, data files, reference docs). Skills follow the agentskills.io specification. Assets referenced from instructions, under 5MB per file.
- **Key insight**: Skills are the composable unit - they can be mixed into any agent. The SKILL.md is both the definition and the instruction set. Reference files are loaded on-demand per step (SKILL.md has the "what/why", references have the "how").
- **Forge OS mapping**: Phase 8 Persona capabilities. Skills map directly to persona capabilities in our system. Each persona kernel could reference a set of skills. The "SKILL.md for what/why, references for how" split is useful for our kernel instruction architecture.
- **Steal priority**: **MED**

---

#### Pattern 27: Hook Event System (Lifecycle Automation)
- **Source**: `hooks/*/hooks.json`
- **What it does**: Hooks fire on specific events: preToolUse, sessionStart, sessionEnd, userPromptSubmitted. Each hook is a shell command with env vars, working directory, and timeout. Multiple hooks can fire on same event (ordered execution). Exit codes control flow (non-zero from preToolUse blocks the tool call).
- **Key mechanisms**:
  - Event types: preToolUse (intercept before execution), sessionStart/End (lifecycle), userPromptSubmitted (input processing)
  - JSON on stdin (tool invocations passed as structured data)
  - Environment variable configuration
  - Timeout enforcement
  - Composable (multiple hooks per event)
- **Forge OS mapping**: Phase 8 Agent Runtime hooks. Our Tauri command system should have similar lifecycle hooks. preToolUse maps to our command interceptor. sessionStart/End maps to ritual begin/end. The stdin JSON pattern maps to our IPC message format.
- **Steal priority**: **HIGH**

---

#### Pattern 28: Instruction File Pattern-Matching (ApplyTo Globs)
- **Source**: `instructions/*.instructions.md` (170+ files)
- **What it does**: Each instruction file has an `applyTo` glob pattern that determines when it activates. Pattern examples: `'**.rs'` for Rust files, `'**/Cargo.toml'` for Cargo configs, `'**'` for all files. Instructions are automatically applied when working on matching files.
- **Key insight**: Context is delivered just-in-time based on what files the agent is touching. No manual activation needed. Different coding standards for different file types/languages.
- **Forge OS mapping**: Phase 8 Context management. Our personas should receive different instruction sets based on what they're working on. A Rust-focused instruction set when touching backend code, React instructions for frontend. This is the "ambient context" pattern.
- **Steal priority**: **MED**

---

### CATEGORY 6: UI/UX PATTERNS FOR AI TOOLS

---

#### Pattern 29: Boost Prompt (Interactive Refinement)
- **Source**: `skills/boost-prompt/SKILL.md`
- **What it does**: Interactive prompt refinement workflow. Interrogates scope, deliverables, constraints. Explores project structure to understand context. Produces improved prompt as markdown, copies to clipboard. Iterates on user feedback.
- **Forge OS mapping**: Phase 8 Chat UI. Pattern for our prompt refinement feature. Before a complex ritual, the user could invoke a "boost" mode that refines their request through structured questioning.
- **Steal priority**: **LOW**

---

#### Pattern 30: Handoff Chains (Agent-to-Agent UX)
- **Source**: `agents/custom-agent-foundry.agent.md` (handoff section)
- **What it does**: Defines agent-to-agent transition patterns in the UI. Four patterns: Sequential (Plan -> Implement -> Review -> Deploy), Iterative (Draft -> Review -> Revise -> Finalize), TDD (Write Tests -> Implement -> Verify), Research-to-Action (Research -> Recommend -> Implement). Handoffs can auto-send or wait for user review.
- **Key mechanism**: `send: true/false` controls whether transitions are automatic or require user confirmation. Handoff buttons with pre-filled context from current session.
- **Forge OS mapping**: Phase 8 Persona routing UI. When a persona completes its work and needs to hand off to another persona, the UI should show handoff buttons with context. `send: true/false` maps to our autonomous vs supervised dispatch modes.
- **Steal priority**: **MED**

---

#### Pattern 31: Context Engineering (Maximize AI Effectiveness)
- **Source**: `instructions/context-engineering.instructions.md`, `plugins/context-engineering/`
- **What it does**: Guidelines for structuring code and projects to maximize AI effectiveness. Key principles: descriptive file paths, colocated related code, explicit types, semantic names, strategic comments, COPILOT.md for architecture docs.
- **Forge OS mapping**: Phase 8 Context optimization. These principles should inform how we structure our own codebase and how we present context to personas. The COPILOT.md pattern maps to our forge-os.config.json.
- **Steal priority**: **LOW**

---

#### Pattern 32: Agentic Workflows (GitHub Actions AI Automation)
- **Source**: `workflows/*.md`
- **What it does**: AI-powered workflows triggered by schedule or slash commands in GitHub Actions. Examples: daily issues report, relevance check on issues/PRs, OSPO health monitoring. Workflows have permissions, safe-outputs (constrained actions like create-issue with title-prefix), and roles.
- **Key insight**: Safe-outputs pattern - workflows declare what actions they're allowed to take and with what constraints (e.g., can only create issues with a specific label, max 1 comment).
- **Forge OS mapping**: Phase 8 Scheduled automation. The safe-outputs pattern is directly applicable to our agent permissions model. A persona should declare what outputs it's allowed to produce and with what constraints.
- **Steal priority**: **MED**

---

### CATEGORY 7: ARCHITECTURAL PATTERNS

---

#### Pattern 33: Frontmatter-as-Config (Agent Definition Schema)
- **Source**: All `*.agent.md`, `*.instructions.md`, `SKILL.md` files
- **What it does**: YAML frontmatter defines agent metadata: description, name, tools (array), model (string), argument-hint, handoffs (array of {label, agent, prompt, send}), disable-model-invocation, user-invocable. Body is the instruction set in markdown.
- **Key insight**: Agent definitions are just markdown files with structured frontmatter. This makes them human-readable, version-controllable, diffable, and composable.
- **Forge OS mapping**: Phase 7 Kernel format. Our kernel.md files already follow this pattern. Validates our approach. Consider adding: tools array, model preference, handoff definitions, argument-hint.
- **Steal priority**: **LOW** (already implemented)

---

#### Pattern 34: SDK Session Architecture (Multi-Session Management)
- **Source**: `cookbook/copilot-sdk/nodejs/multiple-sessions.md`, `cookbook/copilot-sdk/nodejs/persisting-sessions.md`
- **What it does**: CopilotClient manages multiple independent conversation sessions. Each session has its own context, model preference, permission handler, and event listeners. Sessions can be created, destroyed, persisted, resumed, and listed.
- **Forge OS mapping**: Phase 8 Session management. Each persona could have its own session with independent context. The CopilotClient pattern maps to our AgentRuntime that manages multiple persona sessions.
- **Steal priority**: **MED**

---

#### Pattern 35: Polyglot Multi-Agent Pipeline (Research -> Plan -> Implement)
- **Source**: `plugins/polyglot-test-agent/`
- **What it does**: 8 specialized agents in a pipeline: generator (orchestrator), researcher (analyze codebase), planner (create test plan), implementer (write tests per phase), builder (run builds), tester (run tests), fixer (fix compilation errors), linter (format code). Each agent has a narrow scope.
- **Key insight**: The pipeline separates concerns so thoroughly that the builder agent ONLY runs build commands, the tester ONLY runs test commands. Ultra-narrow specialization prevents context pollution.
- **Forge OS mapping**: Phase 8 Swarm dispatch. This validates our approach of having specialized personas for narrow tasks. The separation of builder/tester/fixer into distinct agents (rather than one agent that does everything) is the right pattern for reliability.
- **Steal priority**: **LOW**

---

## SUMMARY STATISTICS

| Category | Patterns Found | HIGH Priority | MED Priority | LOW Priority |
|----------|---------------|---------------|--------------|--------------|
| Multi-Agent Orchestration | 4 | 2 | 1 | 1 |
| Memory/Context Management | 6 | 4 | 2 | 0 |
| Governance/Safety/Trust | 5 | 3 | 1 | 1 |
| Prompt Engineering/Agent Design | 9 | 4 | 3 | 2 |
| Plugin/Extension Architecture | 4 | 1 | 3 | 0 |
| UI/UX Patterns | 4 | 0 | 2 | 2 |
| Architectural Patterns | 3 | 0 | 1 | 2 |
| **TOTAL** | **35** | **14** | **13** | **8** |

---

## HIGH-PRIORITY STEAL LIST (14 patterns)

### Phase 8.1 - KAIROS Memory System
1. **Memory Bank hierarchy** (Pattern 5) - 6-file dependency graph for project memory
2. **Domain-organized self-categorizing memory** (Pattern 6) - Auto-categorize learnings by domain
3. **Ralph Loop disk-as-state** (Pattern 9) - State on disk, fresh context per iteration
4. **Model recommendation routing** (Pattern 22) - Task-type-based model selection

### Phase 8.2 - Swarm Parallel Dispatch
5. **RUG Protocol** (Pattern 1) - Pure orchestrator never does work, validates separately
6. **Wave-based parallel orchestration** (Pattern 2) - Conflict-aware parallel execution with integration checks

### Phase 8.3 - Agent Runtime
7. **Tool Guardian** (Pattern 11) - Pre-execution safety interception on every tool call
8. **Governance Audit** (Pattern 12) - Prompt threat detection with governance levels
9. **Agent Governance Framework** (Pattern 13) - Trust scoring with decay, policy composition, audit trails
10. **Hook event system** (Pattern 27) - Lifecycle hooks (preToolUse, sessionStart/End)

### Phase 8.4 - Agent Quality
11. **Blueprint Mode self-scoring** (Pattern 16) - 5-category rubric with threshold, max 3 iterations
12. **Spec-driven 6-phase workflow** (Pattern 18) - EARS notation, confidence-based execution strategy

### Cross-Phase
13. **Magic keyword dispatch** (from Pattern 2) - Fast-track modes triggered by keywords in user input
14. **Constitutional constraints** (from Pattern 2) - Hard rules that override everything in agent behavior

---

## PHASE 8 GAP ANALYSIS

Comparing these 35 patterns against Forge OS Phase 8 plan:

| Forge OS Component | Patterns Found | Gap Status |
|-------------------|----------------|------------|
| Agent Runtime (dispatch) | RUG, GEM, Polyglot Pipeline | WELL COVERED |
| KAIROS Memory | Memory Bank, Remember, Memory Merger, Ralph Loop | WELL COVERED |
| Swarm Dispatch | Wave-based parallel, conflict detection | COVERED |
| Tool Governance | Tool Guardian, Governance Audit, Agent Governance | WELL COVERED |
| Multi-Model Routing | Model Recommendation skill | COVERED |
| Persona Kernels | Agent Foundry, Frontmatter-as-Config | COVERED (validates existing) |
| Chat UI | Handoff chains, Boost Prompt | PARTIAL - need more UI patterns |
| Plugin System | Plugin manifests, Skill specification | COVERED |
| Eval/Testing | Eval-Driven Dev, Quality Playbook | COVERED |
| Scheduled Automation | Agentic Workflows, safe-outputs | PARTIAL |
| Knowledge Garden | Context Engineering, Context Map | PARTIAL - need graph patterns |

**Key gap**: The repo is weaker on visual/graph-based knowledge representations (our Knowledge Garden with react-three-fiber) and on real-time collaboration patterns. It is very strong on governance, orchestration, and memory - exactly what we need for Phase 8.

---

## INTEGRATION MAP (for batch manifests)

| Pattern # | Forge OS File/Component | Action |
|-----------|------------------------|--------|
| 1, 2 | `forge/dispatch/swarm.rs` | Implement RUG + Wave orchestration |
| 5, 6, 7 | `forge/memory/kairos.rs` | Implement hierarchical memory with self-categorization |
| 9 | `forge/runtime/loop.rs` | Implement Ralph Loop for long-running tasks |
| 11, 12, 13 | `forge/safety/guardian.rs` | Implement tool guardian + governance audit + trust scoring |
| 16 | `forge/quality/rubric.rs` | Implement self-scoring quality gates |
| 18 | `forge/ritual/lifecycle.rs` | Implement 6-phase ritual workflow |
| 22 | `forge/routing/model.rs` | Implement task-type model routing |
| 27 | `forge/runtime/hooks.rs` | Implement lifecycle hook system |
