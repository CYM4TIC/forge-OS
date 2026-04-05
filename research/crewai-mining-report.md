# crewAI Mining Report
## Agent Orchestration & Intelligence Patterns
### Source: github.com/crewAIInc/crewAI (main branch, April 2026)

---

## 1. AGENT ORCHESTRATION

### 1.1 Process Enum (The Execution Topology)
crewAI defines exactly two execution modes as a simple string enum:

```python
class Process(str, Enum):
    sequential = "sequential"
    hierarchical = "hierarchical"
    # TODO: consensual = 'consensual'  <-- never shipped
```

**Sequential**: Tasks execute in list order. Output of task N becomes context for task N+1. Simple pipeline.

**Hierarchical**: A manager agent is auto-created (or user-supplied). The manager receives ALL tasks, then delegates them to worker agents. The manager decides who does what and validates results before accepting.

Key insight: there is NO formal state machine. The "process" is really just a dispatch strategy selector inside `Crew.kickoff()`. The crew iterates tasks and either runs them in order or hands them to a manager. State transitions are implicit in the loop, not modeled as first-class objects.

### 1.2 Crew Composition (The Orchestrator)
`Crew` (77KB, ~2000 lines) is the central orchestration object. It is a Pydantic BaseModel with:

- `agents: list[BaseAgent]` -- the roster
- `tasks: list[Task]` -- the work units
- `process: Process` -- sequential or hierarchical
- `memory: bool | Memory` -- shared memory toggle
- `planning: bool` -- enables pre-execution planning phase
- `manager_agent: Agent | None` -- explicit manager for hierarchical
- `manager_llm: str | None` -- LLM for auto-created manager
- `max_rpm: int | None` -- rate limiting across all agents
- `share_crew: bool` -- telemetry opt-in

The `kickoff()` method is the entry point. It:
1. Validates agents/tasks configuration
2. Interpolates template variables into agent roles/goals/backstories
3. Sets up shared memory (if enabled)
4. Sets up agent tools (delegation tools injected into each agent)
5. Runs the planning phase (if enabled) -- uses a separate LLM call to create step-by-step plans
6. Executes tasks via the selected Process
7. Returns `CrewOutput` with all task results

### 1.3 Task Sequencing
`Task` (52KB) is the unit of work. Key fields:

```
description: str           # What to do
expected_output: str       # Quality gate description
agent: BaseAgent | None    # Assigned agent (can be None for manager to assign)
context: list[Task]        # Predecessor tasks whose output feeds into this one
tools: list[BaseTool]      # Task-specific tools
output_json: type | None   # Pydantic model for structured output
output_pydantic: type | None
output_file: str | None    # Write result to file
human_input: bool          # Pause for human approval before completing
async_execution: bool      # Run in background
```

The `context` field is the dependency graph. When a task has `context=[task_a, task_b]`, the outputs of task_a and task_b are formatted and injected into the prompt. This is how information flows between agents without explicit message passing.

### 1.4 Async Execution
Tasks with `async_execution=True` are submitted to a thread pool via `concurrent.futures.Future`. The crew tracks these futures and awaits them before any dependent task starts. This gives a basic fan-out/fan-in pattern within sequential processing.

---

## 2. MULTI-AGENT COORDINATION

### 2.1 Context-Based Handoff (Not Message Passing)
crewAI does NOT use message passing between agents. Instead, coordination happens through:

1. **Task context chains**: Task B lists Task A in its `context`. When B executes, A's output is formatted and injected into B's prompt.
2. **Shared crew memory**: When `memory=True`, all agents write to and read from the same Memory instance with scoped isolation via `root_scope`.
3. **Delegation tools**: Agents can invoke other agents as tools.

### 2.2 Delegation as Tool Invocation
Delegation is implemented as two tools injected into agents when `allow_delegation=True`:

```python
class DelegateWorkTool(BaseAgentTool):
    name = "Delegate work to coworker"
    # args: task, context, coworker (role name)

class AskQuestionTool(BaseAgentTool):
    name = "Ask question to coworker"
    # args: question, context, coworker (role name)
```

The `_execute` method on `BaseAgentTool`:
1. Sanitizes the coworker name (case-insensitive, whitespace-tolerant)
2. Looks up the agent by role name from the agents list
3. Creates a NEW Task with the delegated work
4. Calls `selected_agent.execute_task(task, context)` synchronously
5. Returns the result string back to the delegating agent

This means delegation is blocking and recursive -- agent A can delegate to agent B who can delegate to agent C. There is no DAG enforcement or cycle detection.

### 2.3 Hierarchical Process (Manager Pattern)
In hierarchical mode, the crew auto-creates a manager agent if none is provided. The manager:
- Gets all tasks in its prompt
- Has delegation tools to all worker agents
- Decides task assignment order
- Validates results before accepting them
- Can re-delegate if quality is insufficient

The manager prompt includes the full list of available agents with their roles, goals, and backstories.

---

## 3. MEMORY / KNOWLEDGE SYSTEMS

### 3.1 Unified Memory Architecture
crewAI has a sophisticated unified memory system (`unified_memory.py`, 40KB). The `Memory` class:

**Storage backends**: Pluggable via `StorageBackend` abstract class. Ships with LanceDB (default) and Qdrant Edge.

**Hierarchical scoping**: Memories are organized in a tree via scope paths (e.g., `/crew/research/agent_1`). Each crew/agent gets a `root_scope` that isolates its memories.

**Composite scoring**: Recall uses a weighted score combining three factors:
```python
composite = (semantic_weight * similarity    # default 0.5
           + recency_weight * decay          # default 0.3
           + importance_weight * importance)  # default 0.2
# where decay = 0.5^(age_days / half_life_days)
```

**MemoryRecord** fields:
- `content: str` -- the memory text
- `scope: str` -- hierarchical path (e.g., `/crew/research`)
- `categories: list[str]` -- tags
- `metadata: dict` -- arbitrary metadata
- `importance: float` -- 0.0 to 1.0
- `embedding: list[float]` -- vector
- `source: str | None` -- provenance (agent ID, session ID)
- `private: bool` -- visibility control

### 3.2 EncodingFlow (Save Pipeline)
Memory saves go through a 5-step Flow:

1. **Batch embed**: ONE embedder call for all items
2. **Intra-batch dedup**: Cosine similarity matrix, drop items above 0.98 threshold
3. **Parallel find similar**: Concurrent storage searches for each item
4. **Parallel analyze**: N concurrent LLM calls for field resolution + consolidation
   - Group A: all fields provided + no similar -> fast insert (0 LLM calls)
   - Group B: fields provided + similar above threshold -> 1 consolidation call
   - Group C: fields missing + no similar -> 1 field resolution call
   - Group D: fields missing + similar -> 2 concurrent calls
5. **Execute plans**: Batch re-embed updates + bulk insert

The consolidation LLM call decides whether to MERGE, UPDATE, or DELETE overlapping records. This prevents memory bloat.

### 3.3 RecallFlow (Retrieval Pipeline)
Memory recall uses an adaptive-depth flow:

1. **analyze_query**: LLM distills query into sub-queries (skipped for short queries under 250 chars). Extracts time filters, suggested scopes.
2. **filter_and_chunk**: Select candidate scopes from LLM suggestions or storage listing.
3. **search_chunks**: Parallel vector search across (embeddings x scopes) matrix.
4. **decide_depth** (router): Confidence-based routing:
   - confidence >= 0.8 -> "synthesize" (return results)
   - confidence < 0.5 AND budget > 0 -> "explore_deeper"
   - complex query AND confidence < 0.7 -> "explore_deeper"
5. **recursive_exploration**: Feed top results back to LLM, extract deeper context, track evidence gaps. Decrements budget.
6. **re_search** -> **re_decide_depth** (loop back to router)
7. **synthesize_results**: Deduplicate, composite-score, rank, attach evidence gaps.

Key pattern: the exploration budget creates a bounded iterative deepening loop.

### 3.4 Knowledge System (Separate from Memory)
`Knowledge` is a separate system for static/reference data. It uses:
- `BaseKnowledgeSource` for data ingestion (PDF, text, CSV, etc.)
- `BaseKnowledgeStorage` for vector storage (ChromaDB-based)
- Queried during agent execution for domain-specific context
- Does NOT have the LLM-analyzed save/recall flows of Memory

### 3.5 Background Write Queue
Memory saves use a `ThreadPoolExecutor(max_workers=1)` write queue:
- `remember()` blocks until save completes (synchronous path)
- `remember_many()` submits to background thread and returns immediately
- `recall()` calls `drain_writes()` first -- read barrier ensures all pending writes are flushed before search

---

## 4. INTELLIGENCE PATTERNS

### 4.1 Planning Phase
When `Crew(planning=True)`, before task execution:
1. A separate LLM call generates step-by-step plans for each task
2. Plans are injected into agent prompts during execution
3. Uses a dedicated `planning_llm` (can differ from agent LLMs)

### 4.2 Training Data Integration
Agents can load training data from previous runs:
```python
apply_training_data(agent, task)
# Reads from agent's training data store
# Injects "lessons learned" into the prompt
```

### 4.3 Reasoning Support
The `handle_reasoning()` utility supports chain-of-thought reasoning by allowing agents to produce explicit reasoning steps before their final answer.

### 4.4 Memory-Based Learning
The memory system enables cross-run learning:
- Task results are saved to memory with scope/categories/importance
- Subsequent runs recall relevant past results
- The consolidation pipeline prevents duplicate knowledge
- Evidence gap tracking identifies what the system does NOT know

### 4.5 LLM Analysis on Every Save
Every memory save (unless all fields are explicitly provided) triggers an LLM call that:
- Infers the appropriate scope in the hierarchy
- Extracts categories/tags
- Scores importance (0.0-1.0)
- Extracts structured metadata
- Checks for consolidation with existing memories

This means the memory system actively curates itself.

---

## 5. TOOL DISPATCH

### 5.1 Tool Registration
Tools are Pydantic BaseModels with:
```python
class BaseTool(BaseModel, ABC):
    name: str
    description: str
    args_schema: type[BaseModel]  # Auto-generated from _run() signature
    max_usage_count: int | None   # Usage limiting
    current_usage_count: int
    cache_function: Callable      # Custom cache decision
    result_as_answer: bool        # Tool result becomes final answer
```

The `@tool` decorator converts plain functions into Tool instances, auto-generating the args schema from type annotations.

### 5.2 Tool Usage Pipeline
`ToolUsage` class manages execution:

1. **Parse**: Extract tool name and arguments from LLM output (JSON, Python literal, JSON5, repaired JSON -- 4 parsing attempts)
2. **Select**: Fuzzy-match tool name using `SequenceMatcher` (>0.85 similarity threshold)
3. **Cache check**: Look up (tool_name, input) in cache before executing
4. **Execute**: Invoke tool with validated arguments + security fingerprint config
5. **Cache store**: Save result with optional custom cache_function
6. **Format**: Add format reminders every N tool uses
7. **Retry**: Up to 3 attempts on failure, with error messages fed back to agent
8. **Events**: ToolUsageStarted, ToolUsageFinished, ToolUsageError events emitted

### 5.3 Usage Limiting
Tools can have `max_usage_count`. A thread-safe `_claim_usage()` method atomically checks and increments the counter. Once exhausted, the tool returns an error message.

### 5.4 Delegation Detection in Tool Usage
The tool_usage layer has special handling for delegation tools:
```python
if sanitize_tool_name(calling.tool_name) in [
    sanitize_tool_name("Delegate work to coworker"),
    sanitize_tool_name("Ask question to coworker"),
]:
    task.increment_delegations(coworker)
```

This tracks delegation counts on the task for telemetry/monitoring.

---

## 6. DELEGATION AND HIERARCHY

### 6.1 Flat Peer Delegation
Any agent with `allow_delegation=True` gets DelegateWorkTool and AskQuestionTool injected. Delegation is peer-to-peer: any agent can delegate to any other agent in the crew.

### 6.2 Hierarchical Manager
In hierarchical mode:
- Manager agent controls ALL task execution
- Worker agents only execute when delegated to
- Manager validates results and can re-delegate
- No direct worker-to-worker delegation (goes through manager)

### 6.3 No Formal Authority Model
There is no priority system, no capability matching, no workload balancing. The manager relies entirely on LLM judgment to decide which agent gets which task. Agent selection is based on role name matching, not capability metadata.

---

## 7. QUALITY / VALIDATION

### 7.1 Expected Output
Every task requires `expected_output: str`, which is injected into the agent prompt as quality criteria. The agent must produce output matching this description.

### 7.2 Structured Output Validation
Tasks can specify `output_json` or `output_pydantic` for schema enforcement:
- The output is parsed against the schema
- Failed parsing triggers a retry (the error is fed back to the agent)
- Uses `Converter` class with configurable `max_attempts`

### 7.3 Human-in-the-Loop
Tasks with `human_input=True` pause after the agent produces output and present it for human approval before accepting. Rejection sends the output back to the agent with feedback.

### 7.4 Max Iterations Guard
`BaseAgent.max_iter = 25` (default). The agent execution loop terminates after this many iterations to prevent infinite loops. Each tool use or LLM call counts as one iteration.

### 7.5 Max Execution Time
Configurable timeout per agent. Validated by `validate_max_execution_time()`.

### 7.6 RPM Controller
`RPMController` throttles API calls per agent. Agents wait for rate limit clearance before making LLM calls.

### 7.7 Tool Error Tracking
Tasks track `tools_errors` count. The crew can monitor and respond to high error rates.

### 7.8 Security Fingerprinting
Agents and tasks carry `SecurityConfig` with `Fingerprint` objects. These are passed through to tool invocations as context metadata, enabling audit trails.

---

## 8. FLOW SYSTEM (Event-Driven Orchestration)

### 8.1 Flow Architecture
`Flow[StateType]` is a separate orchestration layer from Crews. It uses decorator-based DAG construction:

```python
class MyFlow(Flow[MyState]):
    @start()
    def step_one(self): ...

    @listen(step_one)
    def step_two(self): ...

    @router(step_two)
    def decide(self):
        if self.state.confidence > 0.8:
            return "high"
        return "low"

    @listen("high")
    def high_path(self): ...

    @listen("low")
    def low_path(self): ...
```

Decorators:
- `@start()` -- entry point(s)
- `@listen(method_or_string)` -- triggered when method completes or router returns string
- `@router(method)` -- returns a string route name, listeners match on that string
- `or_()` / `and_()` -- combine triggers

### 8.2 State Management
Flows have typed state (Pydantic BaseModel). State is mutable and shared across all steps. Flow state can be persisted/serialized via `FlowSerializer`.

### 8.3 Flow Persistence
The `flow/persistence/` directory indicates flows can checkpoint and resume.

### 8.4 Human Feedback in Flows
`human_feedback.py` (26KB) provides HITL support within flows -- pause execution, collect feedback, resume.

---

## 9. EVENT BUS

### 9.1 Singleton Event Bus
`CrewAIEventsBus` is a singleton with:
- `RWLock` for handler registration/access
- Lazy `ThreadPoolExecutor(max_workers=10)` for sync handlers
- Lazy `asyncio.EventLoop` in a daemon thread for async handlers
- Dependency-aware handler execution via `build_execution_plan()`
- `flush()` method to await all pending handlers
- `scoped_handlers()` context manager for temporary handlers

### 9.2 Event Types
Rich event taxonomy: TaskStarted/Completed/Failed, ToolUsageStarted/Finished/Error, MemorySave/Query events, LLMCall events, CrewKickoff events.

### 9.3 ExecutionContext
Thread-safe context propagation via `contextvars`:
- `current_task_id`
- `flow_request_id`, `flow_id`, `flow_method_name`
- Event ID stack for parent/child relationships
- Platform integration token

Can be captured (`capture_execution_context()`) and restored (`apply_execution_context()`) across thread boundaries.

---

## 10. STEAL LIST -- Patterns for Forge OS

### Pattern 1: Composite Memory Scoring (STEAL)
**What**: `composite = semantic_weight * similarity + recency_weight * decay + importance_weight * importance`
**Where**: Memory recall ranking
**Forge adaptation**: Use for mana-weighted recall. Replace `importance` with `persona_affinity` (how relevant a memory is to the active persona). Add `ritual_phase` weight that boosts memories from the current build phase.

### Pattern 2: EncodingFlow 4-Group Classification (STEAL)
**What**: Classify saves into Groups A-D based on (fields_provided, has_similar) matrix to minimize LLM calls
**Where**: Memory save pipeline
**Forge adaptation**: Adopt directly for Forge memory. Group A (explicit + novel) is the hot path for ritual outputs. Group D (inferred + consolidation) is for ambient learning from build logs.

### Pattern 3: Exploration Budget Loop (STEAL)
**What**: Bounded iterative deepening in RecallFlow. Router checks confidence, decrements budget, loops back for deeper search.
**Where**: Memory recall
**Forge adaptation**: This IS the mana budget pattern. Each exploration round costs mana. Router checks `remaining_mana > cost_per_exploration`. Directly maps to the intelligence chain depth control.

### Pattern 4: Delegation-as-Tool (ADAPT)
**What**: Agent-to-agent delegation implemented as tool invocation, not message passing
**Where**: DelegateWorkTool / AskQuestionTool
**Forge adaptation**: Persona-to-persona delegation as formal tool calls through the dispatch pipeline. But add: capability matching (not just role name), priority weighting, and mana cost tracking per delegation.

### Pattern 5: Flow Decorator DAG (STEAL)
**What**: `@start`, `@listen`, `@router` decorators build an execution DAG at class definition time
**Where**: Flow system
**Forge adaptation**: This is the formal state machine foundation. Map to Rust traits: `#[start]`, `#[listen]`, `#[router]` proc macros on state machine methods. Router returns enum variants instead of strings for type safety.

### Pattern 6: Scoped Memory Isolation via root_scope (STEAL)
**What**: Each crew/agent gets a `root_scope` prefix. All reads/writes are transparently namespaced under this prefix.
**Where**: Unified Memory
**Forge adaptation**: Each persona gets a `root_scope = /persona/{name}`. Crew-level scope at `/ritual/{ritual_id}`. Worktree isolation maps to scope boundaries. Cross-persona memory requires explicit scope traversal.

### Pattern 7: Background Write Queue with Read Barrier (STEAL)
**What**: `ThreadPoolExecutor(max_workers=1)` for async writes. `drain_writes()` called before every `recall()`.
**Where**: Unified Memory
**Forge adaptation**: Adopt directly for SQLite-backed memory. Single writer, multiple readers. `drain_writes()` before any persona recalls. Maps to SQLite WAL mode naturally.

### Pattern 8: Evidence Gap Tracking (STEAL)
**What**: RecallFlow tracks what the system looked for but couldn't find. Gaps are attached to the first result.
**Where**: RecallFlow.recursive_exploration
**Forge adaptation**: Feed evidence gaps into the next ritual phase as explicit unknowns. Personas can declare "I searched for X but it doesn't exist yet" -- this drives discovery tasks.

### Pattern 9: Tool Usage Count Limiting (ADAPT)
**What**: `max_usage_count` per tool with thread-safe atomic claiming
**Where**: BaseTool._claim_usage()
**Forge adaptation**: Mana cost per tool invocation instead of hard count limit. Each tool declares its mana cost. Agent checks `remaining_mana >= tool.mana_cost` before invocation. Exhaustion triggers graceful degradation, not hard failure.

### Pattern 10: Event Bus with Dependency-Aware Handler Execution (STEAL)
**What**: Singleton event bus with RWLock, lazy initialization, topological sort of handler dependencies, scoped handler contexts
**Where**: CrewAIEventsBus
**Forge adaptation**: Port to Rust with `tokio::sync::broadcast` channels. Handler dependency graph is pre-computed. Scoped handlers map to ritual lifecycle -- handlers registered at ritual start, cleaned up at ritual end.

### Pattern 11: SecurityConfig + Fingerprinting (STEAL)
**What**: Every agent and task carries a SecurityConfig with Fingerprint. Passed to tools as context metadata for audit trails.
**Where**: BaseAgent.security_config, tool_usage._build_fingerprint_config()
**Forge adaptation**: Persona fingerprints for audit trails. Every LLM call, tool use, and memory write carries the persona fingerprint. Enables post-hoc analysis of which persona contributed what.

### Pattern 12: Fuzzy Tool Name Matching (ADAPT)
**What**: `SequenceMatcher(None, sanitized_tool, sanitized_input).ratio() > 0.85` for tool selection
**Where**: ToolUsage._select_tool()
**Forge adaptation**: Useful for resilience when LLMs produce slightly wrong tool names. But add a strict mode for high-mana operations where exact match is required.

### Pattern 13: Task Context as Dependency Graph (ADAPT)
**What**: `task.context = [task_a, task_b]` creates implicit data flow. Outputs of context tasks are formatted into the prompt.
**Where**: Task.context field
**Forge adaptation**: Formalize as a proper DAG with explicit edges. In Forge, ritual steps declare their inputs/outputs as typed artifacts. The scheduler validates the DAG before execution and can parallelize independent branches.

### Pattern 14: Planning Phase Pre-Execution (STEAL)
**What**: Before executing tasks, a separate LLM call generates step-by-step plans for each task
**Where**: Crew.kickoff() with planning=True
**Forge adaptation**: Pre-ritual planning phase where a planning persona (or the ritual architect) generates execution plans. Plans are stored as artifacts and can be reviewed/modified before execution begins.

---

## ANTI-PATTERNS TO AVOID

1. **No formal state machine**: crewAI's process is just a loop selector, not a state machine. State transitions are implicit. Forge needs explicit states with typed transitions.

2. **Role-name-based delegation**: Agent selection by string matching on role names is fragile. Forge should use capability tags and affinity scoring.

3. **Unbounded delegation recursion**: Agent A delegates to B who delegates to C with no depth limit. Forge should enforce max delegation depth and detect cycles.

4. **No conflict resolution**: When multiple agents write to shared memory, there is no merge strategy beyond "last write wins" at the storage level. The consolidation LLM helps but is not deterministic. Forge should implement formal conflict resolution.

5. **Monolithic Crew class**: At 77KB / 2000 lines, the Crew class does too much. Forge should decompose into Scheduler, Dispatcher, and Evaluator.

6. **No capability metadata**: Agents have role/goal/backstory but no structured capability declarations. Tool availability is the only capability signal. Forge personas should declare typed capabilities.
