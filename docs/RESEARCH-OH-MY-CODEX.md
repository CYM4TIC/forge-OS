# Research: oh-my-codex (OMX) — Multi-Agent Workflow Orchestration

## Session Date: 2026-04-03
## Participants: Nyx (research session)
## Source: [Yeachan-Heo/oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex)

---

## Source Material

- **Author:** Yeachan Heo
- **Stack:** TypeScript (orchestration, CLI, MCP servers) + Rust (5 native crates: explore, mux, runtime, sparkshell)
- **Core thesis:** A workflow orchestration layer wrapping Codex CLI. Enhances a coding agent with 30+ agent roles, 35+ skills, multi-agent team coordination via tmux/worktrees, structured memory via MCP servers, and keyword-to-skill routing with priority resolution and underspecification gating.
- **Scale:** 30+ agent definitions, 35+ skills, 5 MCP servers, ~450KB team coordination module.

---

## Architecture Overview

```
User Input → Keyword Detector (priority + intent + gating)
    → Skill Resolution (35+ skills, $name invocation)
    → Agent Role Router (keyword scoring + phase context)
    → Pipeline Orchestrator (sequential stages with checkpoint/resume)
        → Team Orchestrator (state machine: plan→prd→exec→verify→fix→complete)
            → Worker Allocation (role match + scope overlap + load balance)
            → Tmux/Worktree Isolation (parallel execution)

Infrastructure:
    5 MCP Servers (state, memory, code-intel, trace, team)
    AGENTS.md (orchestration brain — prompt-as-architecture)
    Mode State Machine (exclusive modes with lifecycle)
```

---

## Pattern 1: Agent Definition Registry with Declarative Capability Metadata

**What OMX Does:**
```typescript
interface AgentDefinition {
  name: string;
  reasoningEffort: 'low' | 'medium' | 'high';
  posture: 'frontier-orchestrator' | 'deep-worker' | 'fast-lane';
  modelClass: 'frontier' | 'standard' | 'fast';
  routingRole: 'leader' | 'specialist' | 'executor';
  tools: 'read-only' | 'analysis' | 'execution' | 'data';
  category: 'build' | 'review' | 'domain' | 'product' | 'coordination';
}
```

30+ agents carry operational metadata: reasoning effort, model tier, tool access level, routing role. Runtime decisions (model selection, capability gating, dispatch routing) derive from this metadata without per-agent hardcoding.

**Forge OS Integration:**
- **Landing zone:** Phase 7, P7-C patch (RegistryEntry enhancement)
- **What we adopt:** Add to `RegistryEntry`: `reasoning_effort: ReasoningEffort` (Low/Medium/High), `model_class: ModelClass` (Frontier/Standard/Fast), `routing_role: RoutingRole` (Leader/Specialist/Executor). These feed the mana budget system (reasoning_effort → thinking token allocation) and provider routing (model_class → provider selection).
- **Persona mapping:**
  - Pierce: High reasoning, Frontier model, Specialist routing
  - Scout: Low reasoning, Fast model, Executor routing
  - Kehinde: High reasoning, Frontier model, Specialist routing
  - Mara: Medium reasoning, Standard model, Specialist routing
  - Sable: Low reasoning, Fast model, Specialist routing
  - Nyx: High reasoning, Frontier model, Leader routing

---

## Pattern 2: Keyword Trigger Registry with Priority + Underspecification Gating

**What OMX Does:**
Multi-layer command routing:
1. **Priority-based resolution** (range 5-11) — higher priority wins, longest match breaks ties
2. **Intent verification** — ambiguous keywords require surrounding context ("use team" not bare "team")
3. **Underspecification gate** — prompts with <15 effective words AND no well-specified signals (file paths, code blocks, numbered steps) redirect to planning
4. **Task-size filtering** — suppresses heavy orchestrators for small tasks
5. **Force bypass** — `force:` prefix skips gating

**Forge OS Integration:**
- **Landing zone:** Phase 7, Session 7.2 (Action Palette dispatch routing)
- **What we adopt:** The underspecification gate. When operator types a vague `/review` or `/audit`, detect underspecification and prompt for scope before dispatching heavy orchestrators. The 15-word + signal-detection heuristic is a concrete, portable implementation.
- **Enhancement:** Two-layer gating: (1) `AvailabilityCheck` — is the command available? (2) `SpecificationCheck` — is the request specified enough to dispatch? Both must pass before Action Palette dispatches.
- **What we don't adopt:** The `force:` bypass (our governance model doesn't have bypass mechanisms — Rule 43, no exceptions).

---

## Pattern 3: Phase-Based Agent Composition

**What OMX Does:**
`getPhaseAgents()` returns recommended roles per pipeline phase:
- `team-plan` → planner, architect, analyst
- `team-exec` → executor, team-executor
- `team-verify` → verifier, quality-reviewer
- `team-fix` → build-fixer, debugger

Recommendations, not hardcoded assignments. Task content + phase context determine final routing.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.2 (dispatch pipeline)
- **What we adopt:** Phase-aware persona recommendations for our 6-phase build loop:
  - Phase 0 (Pre-Build): Scout + Kehinde (recon + architecture context)
  - Phase 1 (Build): Nyx (sole builder)
  - Phase 2 (Consequence Climb): Nyx (self-review, but guided by Phase 2 protocol)
  - Phase 3 (Gate): Pierce + Mara + Riven (Build Triad) + domain-specific (Tanaka for auth, Vane for financial)
  - Phase 4 (Regression): Sentinel + Meridian (at phase exits)
  - Phase 5 (Close): Nyx (adversarial check + handoff)
- **Enhancement:** Our diff-aware gate routing (Rust → Kehinde, TSX → Mara + Riven) is enriched by phase context — same file change triggers different personas depending on whether we're in Build vs Gate vs Regression phase.

---

## Pattern 4: Worker Allocation Policy (Three-Dimension Scoring)

**What OMX Does:**
Workers scored across three dimensions:
- **Role match** — does the worker's role align with the task?
- **Scope overlap** — does the worker's file scope overlap the task's affected files?
- **Load balancing** — is the worker underutilized?

Highest composite score gets the assignment.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.2 (dispatch pipeline routing)
- **What we adopt:** The three-dimension scoring model for multi-persona dispatch. When an orchestrator (Build Triad, Council) needs to assign sub-tasks to personas:
  - **Role match:** Pierce for conformance, Tanaka for security, Mara for UX — domain alignment score
  - **Scope overlap:** Persona has prior findings in this surface area — familiarity score
  - **Load:** Persona's remaining mana budget — availability score
- Highest composite score wins. Prevents over-dispatching to one persona while others idle.

---

## Pattern 5: Three-Tier Memory with Notepad Sections

**What OMX Does:**
| Tier | Storage | Semantics |
|------|---------|-----------|
| Mode State | `.omx/state/{mode}-state.json` | Session-scoped, atomic writes, write-lock queue |
| Project Memory | `.omx/project-memory.json` | Persistent structured data, merge-or-replace |
| Notepad | `.omx/notepad.md` | PRIORITY (replaced), WORKING (append-only), MANUAL (permanent) |

Working memory auto-prunes entries older than N days. Atomic writes via temp-file + rename.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1 (validates KAIROS + enriches context assembly)
- **What we adopt:** The notepad's three-section model maps to our context assembly tiers:
  - **PRIORITY** → kernel + current goal + dispatch grants (replaced per dispatch)
  - **WORKING** → echoes + recent findings + active traces (append-only, prunable by dreamtime)
  - **MANUAL** → vault articles + ADL + grimoire (permanent reference)
- The auto-pruning of working memory validates our dreamtime consolidation pattern — echoes older than N days get alchemized into vault articles, then the raw echoes are pruned.

---

## Pattern 6: Pipeline Stage Interface with Checkpoint/Resume

**What OMX Does:**
```typescript
interface PipelineStage {
  readonly name: string;
  run(ctx: StageContext): Promise<StageResult>;
  canSkip?(ctx: StageContext): boolean;
}
```
Artifacts pass forward via `StageContext.artifacts`. Failure halts. Resume from last checkpoint via persisted state.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.2 (dispatch pipeline)
- **What we adopt:** The `PipelineStage` trait for our Rust dispatch pipeline:
  ```rust
  trait PipelineStage {
      fn name(&self) -> &str;
      async fn run(&self, ctx: &mut StageContext) -> Result<StageResult>;
      fn can_skip(&self, ctx: &StageContext) -> bool { false }
  }
  ```
  Stages: Scout → Build → ConsequenceClimb → Gate → Regression → Close. Each stage persists artifacts (findings, echoes, traces) to SQLite. On session restart, resume from last completed stage. `can_skip` enables experienced builders to skip Scout when context is already loaded.

---

## Pattern 7: Formal State Machine with Fix Loop

**What OMX Does:**
Team orchestrator:
```
team-plan → team-prd → team-exec → team-verify → team-fix (loop, max 3) → complete/failed
```
Ralph loop:
```
starting → executing → verifying → fixing → complete/failed/cancelled
```
Strict transitions at the type level. Terminal states require `active=false`.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.2 (orchestration engine)
- **What we adopt:** Typed state machine for the build loop with enforced transitions:
  ```rust
  enum BuildPhase {
      PreBuild, Build, ConsequenceClimb, Gate, Regression, Close,
      // Terminal
      Complete, Failed, Cancelled
  }
  ```
  The Gate → Fix → Re-verify loop (max N attempts, configurable) maps directly to OMX's `team-fix` pattern. Terminal phases enforce `session.active = false` + BOOT.md handoff.

---

## Pattern 8: Runtime Overlay Injection (Marker-Bounded Context)

**What OMX Does:**
Dynamic AGENTS.md modification via marker-bounded sections:
```html
<!-- OMX:RUNTIME:START -->
[injected context specific to this dispatch]
<!-- OMX:RUNTIME:END -->
```
Non-destructive — preserves existing content. Worker-specific context injects per dispatch.

**Forge OS Integration:**
- **Landing zone:** Phase 7 Session 7.2 / Phase 8 Session 8.2 (context assembly)
- **What we adopt:** Marker-bounded injection for dispatch prompt assembly. The base dispatch template contains stable sections (kernel, rules, contracts). Per-dispatch context (goal ancestry, relevant findings, capability grants, phase-specific persona recommendations) injects at marked boundaries. Template stays stable; dispatch-specific content is ephemeral.
- **Convergence:** This is the adapter boundary pattern (AutoAgent) applied to prompt assembly — fixed template + injected runtime context.

---

## Patterns Not Adopted (with reasoning)

| Pattern | Why Not |
|---------|---------|
| Tmux/worktree parallel workers | We use Tauri IPC + Swarm mailbox, not tmux panes |
| Codex CLI wrapping | We are a standalone Tauri app, not a CLI wrapper |
| AGENTS.md as runtime brain | Our kernels serve this role with typed Rust enforcement |
| `force:` bypass prefix | Governance model has no bypass — Rule 43, no exceptions |
| Korean keyword support | Not applicable |

---

*12 patterns identified. 4 Tier 1 (direct adoption), 4 Tier 2 (adapt), 4 Tier 3 (reference). All fit existing sessions — 0 new sessions.*
