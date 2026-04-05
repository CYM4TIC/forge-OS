# AutoGen Mining Report

> **Source**: [microsoft/autogen](https://github.com/microsoft/autogen) (main branch)
> **Packages mined**: `autogen-core`, `autogen-agentchat`, `autogen-ext`
> **Date**: 2026-04-04

---

## 1. Agent Orchestration

AutoGen's orchestration layer lives in `autogen-agentchat/teams/`. Every team is a `BaseGroupChat` subclass that wraps a `SingleThreadedAgentRuntime` and a set of `ChatAgent` participants. The runtime manages message routing via topic-based pub/sub.

### 1.1 Team Types

| Team | File | Speaker Strategy |
|------|------|-----------------|
| `RoundRobinGroupChat` | `_round_robin_group_chat.py` | Modular index rotation |
| `SelectorGroupChat` | `_selector_group_chat.py` | LLM-based selection with retry |
| `Swarm` | `_swarm_group_chat.py` | HandoffMessage-driven transfers |
| `MagenticOneGroupChat` | `_magentic_one/` | Ledger-based orchestrator with replanning |
| `GraphFlow` | `_graph/` | Directed graph with conditional edges |

### 1.2 BaseGroupChat Architecture

```
BaseGroupChat
  |-- participants: List[ChatAgent]
  |-- termination_condition: TerminationCondition
  |-- runtime: SingleThreadedAgentRuntime (embedded or external)
  |-- group_topic / participant_topics / output_topic
```

**Execution flow** (`run_stream`):
1. Convert task input to `BaseChatMessage` sequence
2. Publish `GroupChatStart` to group chat manager
3. Manager enters select-speaker / dispatch / collect loop
4. Messages relayed to output queue via `GroupChatMessage` events
5. `GroupChatTermination` or max-turn limit ends the loop
6. Returns `TaskResult` with full message history

**State persistence** -- every team serializes via `save_state()` / `load_state()`, capturing all agent states by name in a `TeamState` mapping. This enables pause/resume across sessions.

### 1.3 BaseGroupChatManager Protocol

The manager is an internal `RoutedAgent` registered on the runtime. It processes:

- `GroupChatStart` -- initializes the message thread, calls `select_speaker()`
- `GroupChatAgentResponse` / `GroupChatTeamResponse` -- appends to thread, decrements active speaker count
- When all active speakers have responded, calls `_transition_to_next_speakers()`

```python
# Core manager loop (simplified)
class BaseGroupChatManager(SequentialRoutedAgent):
    _message_thread: List[BaseAgentEvent | BaseChatMessage]
    _current_turn: int
    _active_speakers: List[str]

    @abstractmethod
    async def select_speaker(
        self, thread: Sequence[BaseAgentEvent | BaseChatMessage]
    ) -> List[str] | str:
        """Return one or more speaker names for the next turn."""
        ...

    async def _transition_to_next_speakers(self):
        speakers = await self.select_speaker(self._message_thread)
        for speaker in speakers:
            await self.publish_message(
                GroupChatRequestPublish(),
                topic_id=TopicId(self._participant_topic_types[speaker], ...)
            )
```

**Key insight**: `select_speaker()` can return a *list* of names, enabling parallel fan-out where multiple agents respond in the same turn.

### 1.4 GraphFlow -- Directed Graph Execution

`GraphFlow` models agent orchestration as a validated `DiGraph`:

```python
class DiGraphEdge(BaseModel):
    target: str
    condition: str | Callable | None  # None = unconditional
    activation_group: str | None       # groups edges for join semantics
    activation_condition: Literal["all", "any"]

class DiGraphNode(BaseModel):
    name: str
    edges: List[DiGraphEdge]
    activation: Literal["all", "any"]  # how many incoming edges must fire

class DiGraph(BaseModel):
    nodes: Dict[str, DiGraphNode]
    default_start_node: str | None
```

**Supported patterns**:
- Sequential chains (A -> B -> C)
- Conditional branching (A -> B if "approve", A -> C if "reject")
- Parallel fan-out (A -> [B, C] unconditional)
- Fan-in / join (B + C -> D, activation="all")
- Cycles with mandatory exit conditions

**Validation** at construction time: non-empty node set, no mixed conditional/unconditional edges per node, cycle detection with exit condition enforcement.

The `DiGraphBuilder` offers a fluent API:
```python
builder = DiGraphBuilder()
builder.add_node(planner).add_node(coder).add_node(reviewer)
builder.set_entry_point("planner")
builder.add_edge("planner", "coder")
builder.add_edge("coder", "reviewer")
builder.add_edge("reviewer", "planner", condition="needs_revision")
graph = builder.build()
team = GraphFlow(participants=[planner, coder, reviewer], graph=graph)
```

---

## 2. Multi-Agent Coordination

### 2.1 RoundRobin Speaker Selection

The simplest strategy -- modular index increment:

```python
async def select_speaker(self, thread):
    idx = self._next_speaker_index
    self._next_speaker_index = (idx + 1) % len(self._participant_names)
    return self._participant_names[idx]
```

State: persists `_next_speaker_index` across save/load.

### 2.2 SelectorGroupChat -- LLM-Based Selection

Three-tier selection with fallback:

1. **Custom selector function** (optional callable): `(Sequence[messages]) -> str | None`
   - Returns a specific speaker name, or `None` to fall through to model
2. **Candidate filter function** (optional): narrows the eligible pool
3. **LLM-based selection**: constructs a prompt with roles, participants, and history

```python
# Prompt template (simplified)
SELECTOR_PROMPT = """
{roles}
Read the above conversation. Select the next role from {participants}.
Only return the role name.
"""
```

**Retry logic**: up to `max_selector_attempts` (default 3). Validates via regex that exactly one known agent name appears in the response. Falls back to previous speaker, then first participant.

**Anti-repeat**: `allow_repeated_speaker=False` by default -- filters current speaker from candidates.

### 2.3 Swarm Handoff Protocol

Agent-driven control transfer via `HandoffMessage`:

```python
class Handoff(BaseModel):
    target: str       # target agent name
    description: str  # when to trigger ("Handoff to {target}.")
    name: str         # tool name ("transfer_to_{target}")
    message: str      # context message to target

    @property
    def handoff_tool(self) -> BaseTool:
        """Auto-generates a FunctionTool from this handoff config."""
        def _handoff_tool() -> str:
            return self.message
        return FunctionTool(_handoff_tool, name=self.name, description=self.description)
```

The `SwarmGroupChatManager.select_speaker()` scans the thread in reverse for the most recent `HandoffMessage` and routes to that target. If no handoff found, keeps the current speaker.

**Validation**: at init time, verifies all handoff targets reference valid participant names.

### 2.4 MagenticOne Orchestrator -- Ledger-Based Planning

The most sophisticated coordination pattern. Uses a two-loop architecture:

**Outer Loop (Task Ledger)**:
1. **Gather Facts**: LLM pre-survey categorizing info as "given facts", "facts to look up", "facts to derive", "educated guesses"
2. **Create Plan**: bullet-point strategy based on team capabilities
3. **Full Ledger**: combines task + team description + facts + plan

**Inner Loop (Progress Ledger)**:
Each turn, the orchestrator generates a structured JSON assessment:

```python
# Progress ledger schema
{
    "is_request_satisfied": {"answer": bool, "reason": str},
    "is_progress_being_made": {"answer": bool, "reason": str},
    "is_in_loop": {"answer": bool, "reason": str},
    "instruction_or_question": {"answer": str},
    "next_speaker": {"answer": str, "reason": str}
}
```

**Stall detection and replanning**:
```python
if not progress_ledger["is_progress_being_made"]["answer"]:
    self._n_stalls += 1
elif progress_ledger["is_in_loop"]["answer"]:
    self._n_stalls += 1
else:
    self._n_stalls = max(0, self._n_stalls - 1)

# When stalls exceed threshold, reenter outer loop
if self._n_stalls >= self._max_stalls:
    await self._update_task_ledger()  # refresh facts + revise plan
```

**State**: `MagenticOneOrchestratorState` persists task, facts, plan, n_rounds, n_stalls, message_thread, and current_turn.

**MagenticOne team assembly** (from `autogen-ext/teams/magentic_one.py`):
```python
# Default team composition
agents = [
    FileSurfer("FileSurfer", model_client=client),
    MultimodalWebSurfer("WebSurfer", model_client=client),
    MagenticOneCoderAgent("Coder", model_client=client),
    CodeExecutorAgent("ComputerTerminal", code_executor=executor),
]
if hil_mode:
    agents.append(UserProxyAgent("User", input_func=input_func))
```

---

## 3. Memory / Knowledge

### 3.1 Memory Protocol (`autogen-core/memory/`)

```python
class Memory(ABC, ComponentBase[BaseModel]):
    component_type = "memory"

    @abstractmethod
    async def update_context(
        self, model_context: ChatCompletionContext
    ) -> UpdateContextResult:
        """Inject relevant memories into the model context."""
        ...

    @abstractmethod
    async def query(
        self, query: str | MemoryContent, cancellation_token: CancellationToken | None = None,
        **kwargs: Any
    ) -> MemoryQueryResult:
        ...

    @abstractmethod
    async def add(self, content: MemoryContent, cancellation_token: CancellationToken | None = None) -> None: ...

    @abstractmethod
    async def clear(self) -> None: ...

    @abstractmethod
    async def close(self) -> None: ...
```

`MemoryContent` supports strings, bytes, dicts, and Image objects with MIME type classification and optional metadata.

### 3.2 ListMemory (Core)

Simplest implementation -- chronological append-only list:

```python
class ListMemory(Memory):
    _contents: List[MemoryContent]

    async def update_context(self, model_context):
        # Formats all memories as numbered list
        # Injects as SystemMessage: "Relevant memory content (in chronological order):"
        memory_strings = [f"{i}. {m}" for i, m in enumerate(self._contents)]
        await model_context.add_message(SystemMessage(content=formatted))
        return UpdateContextResult(memories=MemoryQueryResult(results=self._contents))

    async def query(self, query, **kwargs):
        return MemoryQueryResult(results=self._contents)  # no filtering
```

### 3.3 Extended Memory Backends (`autogen-ext/memory/`)

| Backend | Description |
|---------|-------------|
| `chromadb/` | Vector-based semantic retrieval via ChromaDB |
| `mem0/` | Integration with Mem0 persistent memory service |
| `redis/` | Redis-backed memory store |
| `canvas/` | Canvas-based memory management |

### 3.4 Model Context Management

`ChatCompletionContext` is the message buffer fed to the LLM:

```python
class ChatCompletionContext(ABC):
    _messages: List[LLMMessage]

    async def add_message(self, message: LLMMessage) -> None: ...
    async def get_messages(self) -> List[LLMMessage]: ...
    async def clear(self) -> None: ...
    async def save_state(self) -> Mapping[str, Any]: ...
    async def load_state(self, state: Mapping[str, Any]) -> None: ...
```

**Context strategies** (different recall policies):

| Strategy | Behavior |
|----------|----------|
| `UnboundedChatCompletionContext` | Returns all messages (no truncation) |
| `BufferedChatCompletionContext` | Keeps last N messages |
| `HeadAndTailChatCompletionContext` | Keeps first N + last M messages |
| `TokenLimitedChatCompletionContext` | Truncates to token budget |

### 3.5 Memory Integration in AssistantAgent

The `AssistantAgent` accepts `memory: Sequence[Memory]` at construction. During `on_messages_stream`:

```python
# Step 1: add incoming messages to model_context
# Step 2: query each memory store and inject into context
for memory in self._memory:
    result = await memory.update_context(self._model_context)
    yield MemoryQueryEvent(source=self.name, content=result.memories.results, ...)
# Step 3: call LLM with enriched context
```

---

## 4. Intelligence Patterns

### 4.1 SocietyOfMindAgent -- Team-as-Agent Nesting

Wraps an entire team as a single `ChatAgent`, enabling hierarchical composition:

```python
class SocietyOfMindAgent(BaseChatAgent, Component):
    def __init__(
        self,
        name: str,
        team: BaseGroupChat,            # inner team
        model_client: ChatCompletionClient,  # for final synthesis
        instruction: str = "...",        # system prompt for synthesis
        model_context: ChatCompletionContext | None = None,
    ): ...
```

**Delegation flow** (`on_messages_stream`):
1. Retrieve prior context from `model_context`
2. Wrap as `HandoffMessage` for conversation continuity
3. Run inner team: `async for msg in self._team.run_stream(task)`
4. Collect all inner team messages (filtering streaming chunks)
5. Construct LLM prompt from inner team output + instruction
6. Call `model_client` for final synthesis response
7. Return single `TextMessage` as the outer agent's response

**Key insight**: enables recursive team composition -- a SocietyOfMindAgent can be a participant in another team, creating arbitrarily deep hierarchies.

### 4.2 MessageFilterAgent

Wraps any `ChatAgent` and selectively filters which messages from the group thread reach the inner agent. Useful for giving agents specialized views of the conversation.

### 4.3 MagenticOne's Adaptive Strategy

The orchestrator implements three intelligence modes:
- **Closed-book reasoning**: gathering facts without tools (pre-survey)
- **Open-book execution**: dispatching specialists with tools
- **Reflective replanning**: when stalls detected, refreshing facts and revising plan

The `_thread_to_context()` method transforms the multi-agent thread into role-appropriate LLM messages (orchestrator messages become AssistantMessage, everything else becomes UserMessage).

### 4.4 Structured Output

`AssistantAgent` supports structured output via `output_content_type`:
```python
agent = AssistantAgent(
    name="analyst",
    model_client=client,
    output_content_type=AnalysisReport,  # Pydantic BaseModel
)
# Response will be StructuredMessage[AnalysisReport]
```

When structured output is enabled, `reflect_on_tool_use` is auto-enabled to ensure tools produce text that can be parsed into the target schema.

---

## 5. Tool Dispatch

### 5.1 BaseTool Protocol (`autogen-core/tools/`)

```python
class BaseTool(ABC, Generic[ArgsT, ReturnT], ComponentBase[BaseModel]):
    def __init__(self, args_type, return_type, name, description, strict=False): ...

    @abstractmethod
    async def run(self, args: ArgsT, cancellation_token: CancellationToken) -> ReturnT: ...

    async def run_json(self, args: Mapping[str, Any], cancellation_token, call_id=None) -> Any:
        """Execute with dict args, auto-validates via Pydantic model_validate."""
        return_value = await self.run(self._args_type.model_validate(args), cancellation_token)
        return return_value

    @property
    def schema(self) -> ToolSchema:
        return ToolSchema(
            name=self._name,
            description=self._description,
            parameters=self._args_type.model_json_schema(),
        )
```

### 5.2 FunctionTool -- Python Functions as Tools

```python
# Registration
async def get_weather(city: str, units: str = "celsius") -> str:
    """Get weather for a city."""
    return f"72F in {city}"

tool = FunctionTool(get_weather, description="Get weather for a city")
# Auto-generates JSON schema from type annotations
# Handles both sync and async functions
# Supports CancellationToken as optional parameter
```

### 5.3 Workbench -- Tool Collections with Shared State

```python
class Workbench(ABC, ComponentBase[BaseModel]):
    """A component that provides a set of tools that may share resources and state."""

    async def list_tools(self) -> List[ToolSchema]: ...    # dynamic tool set
    async def call_tool(self, name, args, cancellation_token, call_id) -> ToolResult: ...
    async def start(self) -> None: ...
    async def stop(self) -> None: ...
    async def reset(self) -> None: ...
    async def save_state(self) / load_state(self, state): ...
```

`StaticWorkbench` manages a fixed set of tools with name/description overrides. `StreamWorkbench` extends with `call_tool_stream()` for streaming results.

**Key insight**: the Workbench abstraction supports *dynamic tool sets* -- `list_tools()` may return different tools after each execution. This enables adaptive tool discovery.

### 5.4 Tool Dispatch in AssistantAgent

The `AssistantAgent` orchestrates multi-iteration tool loops:

```python
# Simplified flow
for iteration in range(max_tool_iterations):
    result = await self._call_llm(messages, tools=all_tool_schemas)

    if result.content is text:
        yield Response(TextMessage(content=text))
        return

    if result.content has function_calls:
        yield ToolCallRequestEvent(content=result.content)
        # Execute all calls concurrently
        for call in result.content:
            exec_result = await workbench.call_tool(call.name, call.arguments)
            yield ToolCallExecutionEvent(content=[exec_result])

        # Check for handoff among executed calls
        if handoff_detected:
            yield Response(HandoffMessage(target=target, context=messages))
            return

# Post-loop: reflect or summarize
if self._reflect_on_tool_use:
    reflection = await self._call_llm(messages, tools=[])  # no tools, text-only
    yield Response(TextMessage(content=reflection))
```

### 5.5 Code Execution

```python
class CodeExecutor(ABC):
    async def execute_code_blocks(
        self, code_blocks: List[CodeBlock], cancellation_token: CancellationToken
    ) -> CodeResult: ...

    async def start(self) -> None: ...
    async def stop(self) -> None: ...
    async def restart(self) -> None: ...

@dataclass
class CodeBlock:
    code: str
    language: str

@dataclass
class CodeResult:
    exit_code: int
    output: str
```

**Executor backends** (`autogen-ext/code_executors/`):
- `local/` -- subprocess execution on host
- `docker/` -- isolated Docker container execution
- `docker_jupyter/` -- Jupyter kernel in Docker
- `jupyter/` -- direct Jupyter kernel connection
- `azure/` -- Azure Container Apps dynamic sessions

The `CodeExecutorAgent` wraps a `CodeExecutor` and extracts code blocks from incoming messages, executing them with optional retry logic (emitting `CodeGenerationEvent` and `CodeExecutionEvent`).

---

## 6. Human-in-the-Loop

### 6.1 UserProxyAgent

```python
class UserProxyAgent(BaseChatAgent, Component):
    def __init__(
        self,
        name: str,
        description: str = "A human user",
        input_func: SyncInputFunc | AsyncInputFunc | None = None,
    ): ...
```

**Input flow**:
1. Detects `HandoffMessage` from other agents
2. Yields `UserInputRequestedEvent` with unique request ID
3. Calls `input_func(prompt)` (or `asyncio.to_thread(input, prompt)` for Jupyter)
4. Returns `TextMessage` or `HandoffMessage` based on context

`InputRequestContext` provides static context tracking via `ContextVar`, allowing callers to retrieve the current request ID during input callbacks.

### 6.2 Termination Conditions

The `TerminationCondition` ABC provides composable stopping criteria:

```python
class TerminationCondition(ABC, ComponentBase[BaseModel]):
    @abstractmethod
    async def __call__(self, messages: Sequence[...]) -> StopMessage | None: ...

    @property
    @abstractmethod
    def terminated(self) -> bool: ...

    @abstractmethod
    async def reset(self) -> None: ...

    def __and__(self, other) -> "AndTerminationCondition": ...
    def __or__(self, other) -> "OrTerminationCondition": ...
```

**Built-in conditions**:

| Condition | Trigger |
|-----------|---------|
| `MaxMessageTermination` | Message count exceeds threshold |
| `TextMentionTermination` | Specific text appears in message (optional source filter) |
| `TokenUsageTermination` | Cumulative token usage exceeds budget (total/prompt/completion) |
| `TimeoutTermination` | Wall-clock time exceeds `timeout_seconds` |
| `HandoffTermination` | `HandoffMessage` with matching target received |
| `StopMessageTermination` | Any `StopMessage` received |
| `ExternalTermination` | Externally set via `set()` method |
| `SourceMatchTermination` | Message from specific source(s) |
| `TextMessageTermination` | Any `TextMessage` received (optional source filter) |
| `FunctionCallTermination` | Specific function executed in `ToolCallExecutionEvent` |
| `FunctionalTermination` | Custom callable returns `True` |

**Composition**:
```python
# Stop when BOTH budget exceeded AND a certain agent speaks
condition = TokenUsageTermination(max_total_token=10000) & SourceMatchTermination(["analyst"])

# Stop when EITHER timeout OR human says "TERMINATE"
condition = TimeoutTermination(300) | TextMentionTermination("TERMINATE")
```

### 6.3 InterventionHandler -- Runtime Message Interception

```python
class InterventionHandler(Protocol):
    async def on_send(self, message, *, message_context, recipient) -> Any | type[DropMessage]:
        """Intercept direct messages before delivery."""
        ...

    async def on_publish(self, message, *, message_context) -> Any | type[DropMessage]:
        """Intercept published messages before broadcast."""
        ...

    async def on_response(self, message, *, sender, recipient) -> Any | type[DropMessage]:
        """Intercept responses before return to caller."""
        ...
```

Returning `DropMessage` sentinel silently drops the message. Returning a modified message replaces the original. The `DefaultInterventionHandler` passes everything through unchanged.

**Use cases**: logging, approval gates, content filtering, budget enforcement, message transformation.

### 6.4 Code Execution Approval

`CodeExecutorAgent` accepts an optional `approval_func`:
```python
CodeExecutorAgent(
    "terminal",
    code_executor=executor,
    approval_func=my_approval_function,  # human gate on code execution
)
```

### 6.5 Pause/Resume Protocol

Teams support mid-execution pause and resume:
```python
await team.pause()   # sends GroupChatPause to all participants
# ... human review, state inspection ...
await team.resume()  # sends GroupChatResume, continues execution
```

---

## 7. Steal List -- 14 Patterns for Forge-OS

### Pattern 1: Ledger-Based Orchestrator (from MagenticOne)

**What it does**: Two-loop planning with facts/plan ledger, progress tracking, stall detection, and automatic replanning when stuck.

**Forge mapping**: The **Dispatch Engine** should implement a ledger per mission. Each dispatch cycle produces a progress JSON:
```rust
struct ProgressLedger {
    is_request_satisfied: BoolWithReason,
    is_progress_being_made: BoolWithReason,
    is_in_loop: BoolWithReason,
    next_persona: StringWithReason,
    instruction: String,
}
```
Stall counter increments on no-progress or loop detection. When `n_stalls >= max_stalls`, trigger a **replan phase** where the orchestrator refreshes facts from worktree state and revises the plan. This maps directly to mana budget enforcement -- each replan costs mana.

---

### Pattern 2: GraphFlow Directed Execution (from DiGraphGroupChat)

**What it does**: Models agent execution as a validated directed graph with conditional edges, parallel fan-out, fan-in joins, and cycle-with-exit semantics.

**Forge mapping**: Replace AutoGen's `DiGraph` with a Forge **Mission Graph** -- a state machine where nodes are persona dispatch slots and edges carry transition conditions. Implement in Rust:
```rust
enum EdgeCondition {
    Unconditional,
    TextMatch(String),
    Predicate(Box<dyn Fn(&DispatchResult) -> bool>),
}

struct MissionNode {
    persona: PersonaId,
    activation: ActivationMode,  // All | Any
    edges: Vec<MissionEdge>,
}
```
The graph validates at construction (no dangling edges, cycles require exit conditions). This gives formal state machine semantics to intelligence chains.

---

### Pattern 3: Handoff-as-Tool (from Swarm)

**What it does**: Each handoff is auto-generated as a `FunctionTool` that returns a context message. The LLM decides when to call `transfer_to_{target}`, and the swarm manager routes accordingly.

**Forge mapping**: Each persona declares its handoff targets as tools in its kernel config. When the LLM calls `transfer_to_pierce` or `transfer_to_mara`, the dispatch engine:
1. Captures the current context
2. Writes a handoff record to the mission log
3. Activates the target persona's worktree

This is cleaner than explicit routing tables -- the LLM learns when to hand off from the tool descriptions.

---

### Pattern 4: SocietyOfMind Nesting (Team-as-Agent)

**What it does**: Wraps an entire team as a single agent. The inner team runs to completion, then a synthesis model produces a single response.

**Forge mapping**: Implement **nested missions** -- a persona can spawn a sub-mission with its own persona team, worktree branch, and mana sub-budget. The parent persona receives only the synthesized result. Example: Nyx dispatches a "research sub-mission" with Pierce + Mara, gets back a single synthesized analysis.

```rust
struct SubMission {
    parent_mission_id: MissionId,
    inner_team: Vec<PersonaId>,
    synthesis_prompt: String,
    mana_budget: ManaBudget,  // carved from parent
    worktree: WorktreeRef,    // branched from parent
}
```

---

### Pattern 5: Composable Termination Conditions

**What it does**: Termination conditions are first-class objects combinable with `&` (AND) and `|` (OR). Includes token budget, timeout, text triggers, handoff detection, external signals, and custom callables.

**Forge mapping**: The dispatch engine needs a `HaltCondition` trait:
```rust
trait HaltCondition: Send + Sync {
    fn check(&self, ctx: &DispatchContext) -> Option<HaltReason>;
    fn reset(&mut self);
}

// Combinators
impl BitAnd for Box<dyn HaltCondition> { ... }  // All must fire
impl BitOr for Box<dyn HaltCondition> { ... }   // Any fires

// Built-in conditions
struct ManaBudgetExhausted { max_mana: u64 }
struct TurnLimit { max_turns: u32 }
struct ConflictDetected { threshold: f32 }
struct ExternalHalt { signal: Arc<AtomicBool> }
struct TextTrigger { pattern: String }
```

This maps directly to mana budgets (token-based), turn limits, and the existing conflict resolution system.

---

### Pattern 6: InterventionHandler -- Message Interception Layer

**What it does**: A protocol with `on_send`, `on_publish`, `on_response` hooks that can modify, log, or drop any message flowing through the runtime. Returns `DropMessage` sentinel to silently discard.

**Forge mapping**: Implement a **Dispatch Middleware** stack in the runtime:
```rust
trait DispatchMiddleware: Send + Sync {
    async fn on_dispatch(&self, msg: DispatchMessage) -> MiddlewareResult;
    async fn on_response(&self, msg: ResponseMessage) -> MiddlewareResult;
}

enum MiddlewareResult {
    Pass(Message),       // continue with (possibly modified) message
    Drop,                // silently discard
    Halt(HaltReason),    // stop the mission
}
```

Use cases: mana accounting (deduct on each LLM call), conflict detection (flag contradictory outputs), audit logging, persona guardrails.

---

### Pattern 7: Memory-as-Context-Injection

**What it does**: Memory stores implement `update_context()` which injects relevant memories as SystemMessage into the LLM context before each call. The agent yields `MemoryQueryEvent` for observability.

**Forge mapping**: Each persona gets a memory stack:
```rust
struct PersonaMemory {
    short_term: Vec<MemoryEntry>,           // current session
    long_term: SqliteVecStore,              // persistent with FTS5
    persona_kernel: KernelMemory,           // from kernel.md
}

impl PersonaMemory {
    async fn inject_context(&self, ctx: &mut ModelContext) {
        // Inject relevant memories as system message
        let relevant = self.long_term.query_similar(ctx.last_message()).await;
        ctx.prepend_system(format_memories(relevant));
    }
}
```

This aligns with the existing SQLite-native retrieval architecture (sqlite-vec + FTS5) from the retrieval architecture doc.

---

### Pattern 8: Workbench -- Dynamic Tool Collections

**What it does**: `Workbench` wraps multiple tools with shared resources, lifecycle management (start/stop/reset), state persistence, and *dynamic* tool lists that can change after execution.

**Forge mapping**: Each persona gets a `PersonaWorkbench` that manages their available tools:
```rust
trait PersonaWorkbench: Send + Sync {
    fn list_tools(&self) -> Vec<ToolSchema>;  // may be dynamic
    async fn call_tool(&self, name: &str, args: Value) -> ToolResult;
    async fn save_state(&self) -> Value;
    async fn load_state(&self, state: Value);
}
```

Tools can be persona-specific (Kehinde gets database tools, Riven gets design tokens) and dynamically expand as the mission progresses (tool discovery). The workbench shares resources like the worktree filesystem handle.

---

### Pattern 9: Structured Output with Reflection

**What it does**: `AssistantAgent` supports `output_content_type` (Pydantic model) for structured responses. When combined with tools, auto-enables `reflect_on_tool_use` -- an extra LLM call without tools to synthesize results into the target schema.

**Forge mapping**: Dispatch results should be typed:
```rust
struct DispatchResult<T: Serialize + DeserializeOwned> {
    persona: PersonaId,
    output: T,              // structured output
    inner_events: Vec<DispatchEvent>,
    mana_spent: u64,
    tool_calls: Vec<ToolCallRecord>,
}
```

The dispatch engine should support a reflection phase: after tool execution, call the LLM once more without tools to produce a clean structured result. This prevents raw tool output from leaking into mission state.

---

### Pattern 10: Multi-Turn Tool Iteration Loop

**What it does**: `AssistantAgent` supports `max_tool_iterations` -- the agent can make multiple sequential LLM calls, each potentially invoking tools, before producing a final text response.

**Forge mapping**: The persona dispatch loop should support configurable iteration depth:
```rust
struct DispatchConfig {
    max_tool_iterations: u32,  // default 1
    reflect_on_tool_use: bool,
    mana_per_iteration: u64,   // budget per iteration
}
```

Each iteration: LLM call -> tool execution -> check for handoff/completion -> if more tools needed, loop. The mana budget enforces a hard cap even if the LLM keeps requesting tools.

---

### Pattern 11: State Persistence Protocol

**What it does**: Every component (agents, teams, managers, tools, workbenches, memory, model context) implements `save_state() -> Mapping[str, Any]` and `load_state(state: Mapping[str, Any])`. Teams serialize all agent states by name into a `TeamState` mapping.

**Forge mapping**: Implement a universal state protocol for the dispatch engine:
```rust
trait Stateful {
    fn save_state(&self) -> Value;
    fn load_state(&mut self, state: Value) -> Result<()>;
}

struct MissionState {
    mission_id: MissionId,
    persona_states: HashMap<PersonaId, Value>,
    dispatch_state: DispatchEngineState,
    worktree_ref: String,
    mana_remaining: u64,
    timestamp: DateTime<Utc>,
}
```

This enables mission pause/resume across app restarts -- critical for a desktop app where users close and reopen.

---

### Pattern 12: Event-Driven Observability

**What it does**: The system emits fine-grained events throughout execution:
- `ToolCallRequestEvent` / `ToolCallExecutionEvent`
- `CodeGenerationEvent` / `CodeExecutionEvent`
- `MemoryQueryEvent`
- `ModelClientStreamingChunkEvent`
- `ThoughtEvent` (hidden reasoning from models)
- `SelectSpeakerEvent` / `SelectorEvent`
- `UserInputRequestedEvent`

All events extend `BaseAgentEvent` with source, timestamp, metadata.

**Forge mapping**: Implement a typed event bus for the UI layer:
```rust
enum ForgeEvent {
    PersonaActivated { persona: PersonaId, instruction: String },
    ToolInvoked { persona: PersonaId, tool: String, args: Value },
    ToolResult { persona: PersonaId, tool: String, result: Value },
    ManaSpent { persona: PersonaId, amount: u64, remaining: u64 },
    ConflictDetected { personas: Vec<PersonaId>, description: String },
    HandoffInitiated { from: PersonaId, to: PersonaId, context: String },
    StallDetected { mission: MissionId, stall_count: u32 },
    ReplanTriggered { mission: MissionId, new_plan: String },
    ThoughtEmitted { persona: PersonaId, thought: String },
}
```

Stream these to the Tauri frontend for real-time mission visualization.

---

### Pattern 13: Parallel Speaker Dispatch

**What it does**: `select_speaker()` can return a `List[str]` -- multiple agents activated simultaneously. The manager tracks `_active_speakers` and waits for all responses before advancing to the next turn.

**Forge mapping**: Support parallel persona dispatch within a mission turn:
```rust
struct DispatchTurn {
    active_personas: Vec<PersonaId>,
    responses: HashMap<PersonaId, DispatchResult>,
    turn_number: u32,
}

impl DispatchEngine {
    async fn dispatch_parallel(&mut self, personas: Vec<PersonaId>, instruction: &str) {
        let futures = personas.iter().map(|p| self.dispatch_one(p, instruction));
        let results = join_all(futures).await;
        // Collect all results before advancing to next turn
    }
}
```

Use case: dispatch Pierce (analysis) and Kehinde (architecture) in parallel on the same question, then have Nyx synthesize their outputs.

---

### Pattern 14: Component Serialization System

**What it does**: Every AutoGen component (agents, teams, tools, memory, conditions) implements a `Component[ConfigT]` pattern with `_to_config()` and `_from_config()` methods. Configs are Pydantic models that can be serialized to JSON for declarative team definitions.

**Forge mapping**: Implement a declarative mission definition format:
```toml
# mission.toml
[mission]
name = "implement-feature-x"
mana_budget = 50000

[[mission.personas]]
name = "pierce"
role = "analysis"
tools = ["read_file", "search_codebase"]

[[mission.personas]]
name = "kehinde"
role = "architecture"
tools = ["read_file", "write_file", "run_tests"]

[[mission.graph.edges]]
from = "pierce"
to = "kehinde"
condition = "analysis_complete"

[[mission.halt_conditions]]
type = "mana_exhausted"
threshold = 50000

[[mission.halt_conditions]]
type = "text_trigger"
pattern = "MISSION_COMPLETE"
```

This enables mission templates that can be saved, shared, and reused -- and maps cleanly to the GraphFlow pattern.

---

## Architecture Summary

```
autogen-core (runtime layer)
  AgentRuntime          -- message routing via topic pub/sub
  InterventionHandler   -- middleware for message interception
  Memory                -- abstract memory protocol
  ChatCompletionContext -- LLM message buffer with recall strategies
  BaseTool / Workbench  -- tool abstraction with schema generation
  CodeExecutor          -- sandboxed code execution

autogen-agentchat (orchestration layer)
  ChatAgent             -- agent protocol (on_messages, save/load state)
  AssistantAgent        -- LLM agent with tools, handoffs, memory, reflection
  UserProxyAgent        -- human-in-the-loop agent
  SocietyOfMindAgent    -- team-as-agent nesting
  CodeExecutorAgent     -- code extraction and execution agent
  MessageFilterAgent    -- selective message routing

  BaseGroupChat         -- team base with runtime management
  RoundRobinGroupChat   -- sequential turn-taking
  SelectorGroupChat     -- LLM-based speaker selection
  Swarm                 -- handoff-driven routing
  MagenticOneGroupChat  -- ledger-based orchestrator
  GraphFlow             -- directed graph execution

  TerminationCondition  -- composable halt criteria
```

**Key architectural principles**:
1. Everything is a component with declarative config serialization
2. State persistence is universal (save/load on every object)
3. Teams are recursive (SocietyOfMind enables nesting)
4. Speaker selection is pluggable (round-robin, LLM, handoff, graph, orchestrator)
5. Tools are dynamic (Workbench can change tool set between calls)
6. Memory is injectable (update_context pattern injects into model context)
7. Observation is first-class (typed events for every operation)
8. Termination is composable (AND/OR combinators over typed conditions)
