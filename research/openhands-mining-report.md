# OpenHands Mining Report: Agent Orchestration & Intelligence Patterns

**Source**: github.com/All-Hands-AI/OpenHands (formerly OpenDevin)
**Mined**: 2026-04-04
**Focus**: Core orchestration layer (V0 legacy, still production)
**Note**: V0 is marked deprecated but still powers all production flows. V1 SDK exists at OpenHands/software-agent-sdk but V0 is the battle-tested implementation.

---

## 1. AGENT ORCHESTRATION

### 1.1 The Controller Loop

The `AgentController` (openhands/controller/agent_controller.py, ~58KB) is the central orchestrator. It owns:

- An `Agent` instance (the LLM-calling brain)
- A `State` object (persistent session state)
- An `EventStream` (pub/sub backbone)
- A `SecurityAnalyzer` (action gate)
- A `StuckDetector` (loop recovery)

**Core loop pattern**: The controller subscribes to the EventStream. On each event:
1. Check if agent should step (is RUNNING, no pending action, not delegating)
2. Call `agent.step(state)` which returns an `Action`
3. Route the action: security check -> confirmation gate -> execution
4. Wait for observation to come back via EventStream
5. Repeat

The loop is NOT a tight while-loop. It is event-driven: the controller subscribes to EventStream as `AGENT_CONTROLLER` and reacts to each event asynchronously.

### 1.2 Agent State Machine

```
AgentState enum (openhands/core/schema/agent.py):

  LOADING           -- initializing
  RUNNING           -- active execution
  PAUSED            -- user-paused
  STOPPED           -- terminated
  FINISHED          -- task complete
  REJECTED          -- agent refused task
  ERROR             -- fatal error
  AWAITING_USER_INPUT        -- needs human
  AWAITING_USER_CONFIRMATION -- security gate
  USER_CONFIRMED    -- confirmation received
  USER_REJECTED     -- user blocked action
  RATE_LIMITED      -- throttled
```

Key transitions:
- LOADING -> RUNNING (on initialization complete)
- RUNNING -> AWAITING_USER_CONFIRMATION (when security analyzer flags risk)
- AWAITING_USER_CONFIRMATION -> USER_CONFIRMED | USER_REJECTED
- RUNNING -> AWAITING_USER_INPUT (when agent asks user)
- RUNNING -> FINISHED | ERROR | REJECTED (terminal)
- Any -> PAUSED (user intervention)

Resumable states: RUNNING, PAUSED, AWAITING_USER_INPUT, FINISHED

### 1.3 Delegation (Multi-Agent)

The `AgentDelegateAction` is the mechanism for agent-to-agent dispatch:

```python
@dataclass
class AgentDelegateAction(Action):
    agent: str        # name of delegate agent (e.g., "BrowsingAgent")
    inputs: dict      # task description + parameters
    thought: str = ''
```

When the controller receives a DelegateAction:
1. It creates a NEW AgentController for the child agent
2. The child gets its own State with `delegate_level + 1`
3. The child operates on the SAME EventStream (nested events)
4. Parent blocks until child reaches terminal state
5. Child's output becomes a `AgentDelegateObservation` for the parent

**Delegation levels are tracked**: `state.delegate_level` starts at 0 for root. Each delegation increments by 1. This enables budget partitioning per depth.

### 1.4 Control Flags (Budget/Iteration Limits)

```python
@dataclass
class IterationControlFlag(ControlFlag[int]):
    limit_increase_amount: int  # how much to expand on limit hit
    current_value: int
    max_value: int

@dataclass
class BudgetControlFlag(ControlFlag[float]):
    # same structure, for dollar-cost tracking
```

Pattern: On each step, `flag.step()` is called. If limit is reached, it raises RuntimeError. In interactive mode, the limit can be expanded (`increase_limit()`). In headless mode, it's a hard stop.

**This is directly analogous to the Forge mana budget system.**

---

## 2. MULTI-AGENT COORDINATION

### 2.1 Agent Registry

Agents register themselves via class decorator pattern:

```python
class Agent:
    _registry: dict[str, type[Agent]] = {}

    @classmethod
    def register(cls, name, agent_cls):
        cls._registry[name] = agent_cls

    @classmethod
    def get_cls(cls, name):
        return cls._registry[name]
```

Available agents in `agenthub/`:
- **CodeActAgent** -- primary agent, uses function calling
- **BrowsingAgent** -- specialized web interaction
- **VisualBrowsingAgent** -- screenshot-based browsing
- **ReadOnlyAgent** -- observation-only, no mutations
- **LocAgent** -- code localization
- **DummyAgent** -- testing

### 2.2 Microagents (Skill Injection)

Three types of microagent (openhands/microagent/microagent.py):

1. **RepoMicroagent** (`REPO_KNOWLEDGE`) -- always active, loaded from `.openhands/microagents/repo.md` or `.cursorrules`. Injected into every prompt.

2. **KnowledgeMicroagent** (`KNOWLEDGE`) -- trigger-based. Has keyword triggers that match against user messages. Only injected when triggered.

3. **TaskMicroagent** (`TASK`) -- triggered by `/{agent_name}` slash commands. Requires user input variables (`${variable_name}` pattern). Appends prompt asking user for missing variables.

Loading pattern:
```python
# Loaded from frontmatter-bearing markdown files
agent = BaseMicroagent.load(path, microagent_dir)
# Type inference:
#   has inputs -> TASK
#   has triggers -> KNOWLEDGE
#   neither -> REPO (always active)
```

**Memory.py** handles the runtime microagent lookup:
- On each `RecallAction` with type `KNOWLEDGE`, it searches all KnowledgeMicroagents for trigger matches against the query
- Returns `MicroagentKnowledge` objects bundled into a `RecallObservation`

### 2.3 How Agents Coordinate

The CodeActAgent is the primary orchestrator. It delegates to BrowsingAgent via function call:

```python
elif tool_call.function.name == 'delegate_to_browsing_agent':
    action = AgentDelegateAction(
        agent='BrowsingAgent',
        inputs=arguments,
    )
```

The parent-child relationship:
- Parent's iteration counter is snapshotted (`parent_iteration`)
- Parent's metrics are snapshotted (`parent_metrics_snapshot`)
- Child tracks local steps via `get_local_step()` = current - parent_iteration
- Child tracks local cost via `get_local_metrics()` = metrics.diff(parent_snapshot)

---

## 3. MEMORY / KNOWLEDGE SYSTEMS

### 3.1 Event History as Memory

All memory is event-based. The `State.history` is a list of `Event` objects. The `View` class provides a filtered, LLM-ready projection:

```python
class View(BaseModel):
    events: list[Event]
    unhandled_condensation_request: bool = False
    forgotten_event_ids: set[int] = set()
```

`View.from_events()` processes the raw history:
1. Collects all `CondensationAction` events to build `forgotten_event_ids`
2. Filters out forgotten events
3. Inserts summary text at the correct offset from the most recent condensation
4. Tracks whether there's an unhandled condensation request

### 3.2 Condenser System (Context Window Management)

This is the most architecturally rich subsystem. Abstract base:

```python
class Condenser(ABC):
    @abstractmethod
    def condense(self, view: View) -> View | Condensation
```

Returns either:
- `View` -- the (possibly trimmed) events, ready for LLM
- `Condensation` -- a signal to the controller to inject a CondensationAction into the event stream, then re-step

**Condenser implementations** (pipeline-composable):

| Condenser | Strategy |
|-----------|----------|
| `NoOpCondenser` | Pass-through, no condensation |
| `AmortizedForgettingCondenser` | When history > max_size, drop middle events, keep head + tail |
| `LLMSummarizingCondenser` | Same as above but generates LLM summary of dropped events |
| `StructuredSummaryCondenser` | LLM function-calling to produce structured state summary (user context, tasks, code state, tests, version control) |
| `ObservationMaskingCondenser` | Masks observation content (replaces with placeholder) |
| `BrowserOutputCondenser` | Specifically condenses browser output |
| `RecentEventsCondenser` | Keeps only N most recent events |
| `ConversationWindowCondenser` | Keeps events within a token window |
| `CondenserPipeline` | Chains multiple condensers in sequence |

### 3.3 The Rolling Condenser Pattern

```python
class RollingCondenser(Condenser, ABC):
    @abstractmethod
    def should_condense(self, view: View) -> bool

    @abstractmethod
    def get_condensation(self, view: View) -> Condensation

    def condense(self, view: View) -> View | Condensation:
        if self.should_condense(view):
            return self.get_condensation(view)
        return view
```

The `should_condense` check is: `len(view) > self.max_size or view.unhandled_condensation_request`

The agent can ALSO request condensation proactively via `CondensationRequestAction` -- the condenser then processes it on the next step.

### 3.4 LLM Summarization Prompt

The summarizing condenser uses a structured prompt that tracks:
- USER_CONTEXT (goals, requirements)
- TASK_TRACKING (task IDs, statuses -- must preserve IDs)
- COMPLETED / PENDING
- CURRENT_STATE
- CODE_STATE (file paths, function signatures)
- TESTS (failing cases, error messages)
- CHANGES (code edits)
- DEPS (dependencies)
- VERSION_CONTROL_STATUS (branch, PR status)

### 3.5 Condenser Pipeline

```python
class CondenserPipeline(Condenser):
    def condense(self, view):
        result = view
        for condenser in self.condensers:
            match condenser.condense(result):
                case View() as v:
                    result = v
                case Condensation() as c:
                    return c  # early exit on condensation signal
        return result
```

This enables chaining: e.g., BrowserOutputCondenser -> ObservationMaskingCondenser -> LLMSummarizingCondenser

### 3.6 Condenser Metadata

Each condensation writes diagnostic metadata to `state.extra_data['condenser_meta']` as a list of batches. This enables post-hoc analysis of what was forgotten and when.

---

## 4. INTELLIGENCE PATTERNS

### 4.1 Stuck Detection (Loop Recovery)

`StuckDetector` (openhands/controller/stuck.py) identifies 5 loop patterns:

1. **Repeating Action-Observation** -- same pair 4 times
2. **Repeating Action-Error** -- same action produces errors 3+ times
3. **Monologue** -- agent talks to itself without observations
4. **Alternating Pattern** -- two action-obs pairs alternate 6+ times
5. **Context Window Error** -- repeated CondensationObservation without progress

Detection modes:
- **Headless**: analyzes full history
- **Interactive**: analyzes only post-last-user-message history

### 4.2 Loop Recovery Actions

```python
@dataclass
class LoopRecoveryAction(Action):
    option: int = 1
    # 1 = let user prompt again
    # 2 = auto-retry with latest user prompt
    # 3 = stop agent
```

### 4.3 Error Hierarchy & Recovery

Exception types define recovery strategy:

| Exception | Sent to LLM? | Retryable? |
|-----------|--------------|------------|
| `LLMMalformedActionError` | Yes | Yes (LLM can fix) |
| `LLMNoActionError` | Yes | Yes |
| `LLMResponseError` | Yes | Yes |
| `LLMNoResponseError` | No | Yes (retry with temperature) |
| `LLMContextWindowExceedError` | No | Yes (condense then retry) |
| `FunctionCallValidationError` | Yes | Yes (LLM can fix params) |
| `FunctionCallNotExistsError` | Yes | Yes (LLM picks different tool) |
| `AgentStuckInLoopError` | No | Via loop recovery options |

**Pattern**: Errors that are the LLM's "fault" (malformed output, wrong tool) are fed BACK to the LLM as error observations so it can self-correct. Infrastructure errors (timeout, context overflow) are handled by the controller.

### 4.4 Agent Self-Correction via Tool Call Metadata

Every action carries:
```python
@dataclass
class ToolCallMetadata:
    tool_call_id: str
    function_name: str
    model_response: ModelResponse
    total_calls_in_response: int
```

When an observation comes back as an error, the conversation memory pairs it with the original tool_call_id, allowing the LLM to see exactly which tool call failed and why.

### 4.5 Proactive Condensation Request

The agent has a `CondensationRequestTool` available as a regular tool. When the agent senses it needs more context room, it can call this tool, which triggers a condensation on the next step. This is "intelligence managing its own memory."

---

## 5. SANDBOX / ISOLATION

### 5.1 Runtime Architecture

Base class: `Runtime` (openhands/runtime/base.py, ~52KB)

The runtime is a separate process/container that executes actions. Communication is via HTTP:
- Controller sends Action to runtime's `/execute_action` endpoint
- Runtime executes and returns Observation
- Observation is added to EventStream

### 5.2 Runtime Implementations

| Runtime | Isolation | Use Case |
|---------|-----------|----------|
| **DockerRuntime** | Container | Default, full isolation |
| **LocalRuntime** | None | Development, no isolation |
| **RemoteRuntime** | Cloud VM | Distributed execution, SWE-Bench |
| **ModalRuntime** | Modal API | Serverless |
| **RunloopRuntime** | Runloop API | Specialized |

### 5.3 Action Execution Server

Inside the container, an `ActionExecutionServer` (openhands/runtime/action_execution_server.py, ~43KB) runs as a FastAPI app. It:
- Receives actions via HTTP POST
- Routes to appropriate executor (bash, ipython, file ops, browser)
- Returns observations
- Manages process lifecycle within the sandbox

### 5.4 Plugin System

Runtimes support plugins:
```python
class PluginRequirement:
    # AgentSkillsRequirement -- loads Python utility functions
    # JupyterRequirement -- starts IPython kernel
```

The CodeActAgent declares: AgentSkillsRequirement (first, provides utility functions) then JupyterRequirement (uses those functions).

---

## 6. TOOL DISPATCH

### 6.1 Action Space (ActionType enum)

```
MESSAGE, SYSTEM, START, READ, WRITE, EDIT, RUN, RUN_IPYTHON,
BROWSE, BROWSE_INTERACTIVE, MCP, DELEGATE, THINK, FINISH,
REJECT, NULL, PAUSE, RESUME, STOP, CHANGE_AGENT_STATE,
PUSH, SEND_PR, RECALL, CONDENSATION, CONDENSATION_REQUEST,
TASK_TRACKING, LOOP_RECOVERY
```

### 6.2 Observation Space (ObservationType enum)

```
READ, WRITE, EDIT, BROWSE, RUN, RUN_IPYTHON, CHAT, DELEGATE,
MESSAGE, ERROR, SUCCESS, NULL, THINK, AGENT_STATE_CHANGED,
USER_REJECTED, CONDENSE, RECALL, MCP, DOWNLOAD, TASK_TRACKING,
LOOP_DETECTION
```

### 6.3 Function Call Dispatch

The CodeActAgent uses native LLM function calling. `response_to_actions()` in function_calling.py is the dispatcher:

```python
def response_to_actions(response: ModelResponse, mcp_tool_names=None) -> list[Action]:
    for tool_call in assistant_msg.tool_calls:
        arguments = json.loads(tool_call.function.arguments)
        if tool_call.function.name == 'execute_bash':
            action = CmdRunAction(command=arguments['command'])
        elif tool_call.function.name == 'execute_ipython_cell':
            action = IPythonRunCellAction(code=arguments['code'])
        elif tool_call.function.name == 'delegate_to_browsing_agent':
            action = AgentDelegateAction(agent='BrowsingAgent', inputs=arguments)
        elif tool_call.function.name == 'finish':
            action = AgentFinishAction(...)
        # ... etc for each tool
        elif name in mcp_tool_names:
            action = MCPAction(name=name, arguments=arguments)
        else:
            raise FunctionCallNotExistsError(...)
```

Key pattern: The dispatcher is a flat match on function name. No routing table, no middleware chain. Each branch constructs the appropriate Action dataclass.

### 6.4 Security Risk Tagging

Actions can carry security risk levels:
```python
def set_security_risk(action: Action, arguments: dict) -> None:
    if 'security_risk' in arguments:
        action.security_risk = ActionSecurityRisk[arguments['security_risk']]
```

### 6.5 Pending Action Queue

The agent maintains a `deque` of pending actions:
```python
self.pending_actions: deque[Action] = deque()
```

When LLM returns multiple tool calls in one response, they're all parsed and queued. `step()` pops one at a time. This handles multi-tool-call responses gracefully.

---

## 7. HUMAN-IN-THE-LOOP

### 7.1 Confirmation Mode

When `state.confirmation_mode = True`:
- Every action goes through `SecurityAnalyzer.security_risk(action)`
- If risk > threshold, state transitions to `AWAITING_USER_CONFIRMATION`
- UI presents the action to user
- User confirms (-> `USER_CONFIRMED`) or rejects (-> `USER_REJECTED`)

### 7.2 Security Analyzers

Three implementations:
1. **LLM Risk Analyzer** -- uses the agent's own LLM to assess risk
2. **Invariant Analyzer** -- rule-based detection of secrets, malicious commands, vulnerabilities
3. **Gray Swan (Cygnal)** -- external API safety monitoring

### 7.3 Intervention Points

- `AWAITING_USER_INPUT` -- agent explicitly asks for human input
- `AWAITING_USER_CONFIRMATION` -- security gate
- `PAUSED` -- user-initiated pause
- Loop recovery option 1 -- "let user prompt again"
- The `/exit` command -- user can terminate at any time

### 7.4 User Rejection Observation

```python
@dataclass
class UserRejectObservation(Observation):
    observation: str = ObservationType.USER_REJECTED
```

When user rejects an action, this observation is fed back to the agent so it can adjust its approach.

---

## 8. EVENT SYSTEM

### 8.1 Event Stream Architecture

```python
class EventStream(EventStore):
    # Pub/Sub with typed subscribers
    _subscribers: dict[str, dict[str, Callable]]

    def subscribe(self, subscriber_id, callback, callback_id): ...
    def add_event(self, event, source): ...
```

Subscriber IDs (enum):
- `AGENT_CONTROLLER`
- `RESOLVER`
- `SERVER`
- `RUNTIME`
- `MEMORY`
- `MAIN`
- `TEST`

### 8.2 Event Lifecycle

1. `add_event(event, source)` assigns ID, timestamp, source
2. Event is serialized, secrets are scrubbed
3. Event is written to FileStore (persistent)
4. Event is queued for subscriber notification
5. Background thread processes queue, dispatches to all subscribers
6. Each subscriber gets its own ThreadPoolExecutor (isolation)

### 8.3 Secret Scrubbing

```python
def _replace_secrets(self, data, is_top_level=True):
    TOP_LEVEL_PROTECTED_FIELDS = {'timestamp', 'id', 'source', 'cause', 'action', 'observation', 'message'}
    for key in data:
        if is_top_level and key in TOP_LEVEL_PROTECTED_FIELDS:
            continue
        elif isinstance(data[key], str):
            for secret in self.secrets.values():
                data[key] = data[key].replace(secret, '<secret_hidden>')
```

### 8.4 Event Base Class

```python
@dataclass
class Event:
    INVALID_ID = -1
    # Properties: id, timestamp, source, cause, timeout, llm_metrics, tool_call_metadata, response_id
```

Events are the universal unit. Actions and Observations both inherit from Event. EventSource is: AGENT, USER, ENVIRONMENT.

### 8.5 Nested Event Store

For delegation: the child controller operates on a `NestedEventStore` that views a slice of the parent's EventStream. This enables:
- Child sees only its own events
- Parent sees everything
- Events are stored in one stream (single source of truth)

### 8.6 Replay System

`openhands/controller/replay.py` can replay recorded event sequences for testing/debugging.

---

## STEAL LIST: Patterns for Forge-OS Agent Pipeline

### S1. Event-Sourced State Machine
**What**: All state is derived from an append-only event stream. State is a materialized view. Actions and Observations are typed events with source attribution (AGENT, USER, ENVIRONMENT).
**Apply to Forge**: The mana-budgeted dispatch pipeline should use event sourcing. Each persona action and observation is an event. State is derived, never mutated directly. This gives you replay, audit trail, and undo for free.

### S2. View Projection Pattern
**What**: `View.from_events()` builds an LLM-ready filtered projection from raw history. Condensation events mark which events to forget. Summaries are injected at offsets.
**Apply to Forge**: Each persona's context window should be a View projection. Forgotten events stay in the log (for audit) but are excluded from the LLM prompt. This is how you implement "mana-aware memory" -- condensation costs mana, but prevents context overflow.

### S3. Rolling Condenser with Pipeline Composition
**What**: `should_condense()` / `get_condensation()` split. Pipeline chains condensers. Agent can request condensation proactively via tool call.
**Apply to Forge**: Build a condenser pipeline: BrowserOutputCondenser -> ObservationMaskingCondenser -> LLMSummarizingCondenser. Let personas request condensation when they sense context pressure. The structured summary (USER_CONTEXT, TASK_TRACKING, CODE_STATE) maps directly to persona state.

### S4. Delegation with Budget Partitioning
**What**: Parent snapshots metrics before delegating. Child tracks local cost via `metrics.diff(parent_snapshot)`. Delegation level is explicit.
**Apply to Forge**: When Pierce delegates to Kehinde, snapshot the mana pool. Kehinde's subtask gets a mana budget = parent's remaining mana or a configured fraction. Track delegation depth to prevent infinite delegation chains.

### S5. Stuck Detection as a First-Class Component
**What**: 5 distinct loop patterns detected. Different recovery options (user re-prompt, auto-retry, stop). Interactive vs headless modes.
**Apply to Forge**: Build a `LoopDetector` that watches the event stream for: repeating action-observation pairs, alternating patterns, monologue, and condensation spirals. Map recovery options to persona-specific strategies (e.g., Nyx might suggest a different approach, while a builder persona just retries).

### S6. Error Classification for Self-Correction
**What**: LLM-caused errors (malformed output, wrong tool) are fed BACK to the LLM. Infrastructure errors (timeout, context overflow) are handled by the controller. Clear exception hierarchy.
**Apply to Forge**: Classify errors into "persona can fix" vs "orchestrator must handle." FunctionCallValidationError -> send error text back to persona as observation. ContextOverflow -> trigger condenser. Timeout -> abort action, record in event stream.

### S7. Microagent / Skill Injection via Trigger Matching
**What**: Markdown files with frontmatter. Three types: always-active (repo), keyword-triggered (knowledge), slash-command-triggered (task). Loaded from `.openhands/microagents/`.
**Apply to Forge**: This is your persona kernel system. RepoMicroagent = always-loaded kernel context. KnowledgeMicroagent = context injected when certain keywords appear in the task. TaskMicroagent = slash-command invokable skills with input variables.

### S8. Control Flags (Iteration + Budget)
**What**: Generic `ControlFlag[T]` with `step()`, `reached_limit()`, `increase_limit()`. Separate iteration and budget flags. Interactive mode can expand limits.
**Apply to Forge**: Mana budget is a `BudgetControlFlag[float]`. Iteration limit is `IterationControlFlag[int]`. Each persona gets both. The UI can offer "spend more mana?" when limit is hit (interactive mode). Headless mode is hard-cap.

### S9. Pending Action Queue for Multi-Tool Responses
**What**: LLM can return multiple tool calls in one response. They're queued in a `deque`. `step()` pops one at a time.
**Apply to Forge**: When a persona returns multiple actions (e.g., "edit file then run tests"), queue them. Process one per step. This enables partial execution -- if the second action fails, the first is already committed.

### S10. Security Analyzer as Event Stream Listener
**What**: SecurityAnalyzer subscribes to EventStream. Evaluates each action for risk before execution. Pluggable analyzers (LLM-based, rule-based, external API).
**Apply to Forge**: Build an `ActionGate` that evaluates every action before execution. For Forge: Tanaka persona could be the security analyzer -- literally a persona that reviews other personas' actions.

### S11. Secret Scrubbing in Event Serialization
**What**: Before writing events to storage, all string fields are scanned for known secrets and replaced with `<secret_hidden>`. System metadata fields are protected from scrubbing.
**Apply to Forge**: Critical for a desktop app. Scrub API keys, tokens, and credentials from the event log before persistence.

### S12. Nested Event Store for Delegation
**What**: Child agent sees a slice of the parent's event stream. One stream, multiple views. Child's events are real events in the parent's stream.
**Apply to Forge**: When Pierce delegates to Kehinde, Kehinde's view is a nested slice of the main event stream. This means the parent can always see what the child did, and the event log is a single ordered sequence.

### S13. Replay System for Testing
**What**: Recorded event sequences can be replayed. Controller has a `replay.py` module.
**Apply to Forge**: Record full event streams. Replay them with different personas, different mana budgets, different condensers. Use for regression testing of persona behavior.

### S14. Confirmation Mode as Toggle
**What**: `state.confirmation_mode = True` activates the security gate. Can be toggled per-session.
**Apply to Forge**: Per-persona confirmation mode. High-trust personas (Nyx reviewing) skip confirmation. Low-trust or new personas require human confirmation on mutating actions.

### S15. Conversation Memory as Event Processor
**What**: `ConversationMemory` takes events + initial user message + forgotten IDs and produces LLM-ready messages. Handles SystemMessageAction insertion, tool call tracking, role alternation, prompt caching.
**Apply to Forge**: Build a `PersonaMemory` that transforms the event View into persona-specific LLM messages. Each persona has different system prompts, different tool sets, different caching strategies.
