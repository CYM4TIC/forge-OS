# oh-my-claudecode — Reference Extraction

> 18.6k stars. Multi-agent orchestration layer for Claude Code. 20 agents, 37 skills, 11 hook points, 50+ team infrastructure files. Source: github.com/Yeachan-Heo/oh-my-claudecode

---

## What It Is

A 4-layer orchestration system for Claude Code:
1. **Skills** — Execution modes (ralph, team, deep-interview, autopilot, ultrawork, ralplan)
2. **Agents** — 20 specialized agent types (architect, critic, executor, debugger, etc.)
3. **Team Coordination** — N-agent parallel execution with task dependencies, worker lifecycle, handoffs
4. **Runtime Hooks** — 11 lifecycle hook points for state management, keyword detection, deliverable verification

---

## 17 Patterns Extracted for Forge OS

### MUST HAVE (5)

**1. Deep Interview — Socratic Ambiguity Scoring**
- Mathematical ambiguity scoring: `ambiguity = 1 - (goal*0.4 + constraints*0.3 + criteria*0.3)`
- Brownfield variant adds Context dimension at 15% weight
- One question at a time, targeting WEAKEST dimension
- Ontology tracking: extract entities per round, measure stability ratio
- Renamed entities (same type, >50% field overlap) = convergence, not churn
- Stability 100% across 2+ rounds = domain model converged
- Challenge agents at thresholds: Contrarian (round 4), Simplifier (round 6), Ontologist (round 8)
- Gates execution at <=20% ambiguity
- Output: crystallized spec with clarity breakdown, ontology table, full transcript
- **Forge OS target:** `/init` and `/link` commands, new `docs/DEEP-INTERVIEW-PROTOCOL.md`

**2. Ralph — PRD-Driven Persistence Loop**
- Tasks crystallized into structured user stories with testable acceptance criteria
- NOT "retry until it works" — empirically verifies each criterion with fresh evidence
- State persists in JSON files, survives session crashes
- Story-by-story: pick next with `passes: false`, implement, verify ALL criteria, mark complete
- progress.txt records learnings and codebase patterns across iterations
- 3-iteration circuit breaker: same issue 3+ times = escalate to architect for reframe
- Mandatory deslop pass post-verification (unless --no-deslop)
- Post-deslop regression tests must pass
- **Forge OS target:** Enhance Nyx execution protocol, new `docs/PERSISTENCE-PROTOCOL.md`

**3. Ralplan-First Gate — Vague Request Detection**
- Before expensive execution, scan for "concrete signals":
  - File paths, issue/PR numbers, camelCase/PascalCase symbols
  - Numbered steps, acceptance criteria, test runner commands, error references
- If no concrete signals: auto-redirect to planning phase
- Force bypass: `force:` or `!` prefix
- Threshold: <=15 words AND no concrete anchors = underspecified
- **Forge OS target:** Scout pre-build validation, new gate in `docs/EXECUTION-GATES.md`

**4. Worker Hierarchy Protocol**
- Workers receive explicit preamble: "You are NOT the leader. No sub-agents."
- Workers: claim task → execute → report → loop. Nothing else.
- Lead handles ALL orchestration (task assignment, monitoring, shutdown)
- Pre-assign task owners before spawning (prevents race conditions)
- Watchdog: stuck >5min → status check, >10min → reassign
- Circuit breaker: 2+ failures → stop assigning to that worker
- Graceful shutdown: request → response → TeamDelete (BLOCKING)
- **Forge OS target:** Update `docs/SWARM-PROTOCOL.md`

**5. Stage Handoff Documents**
- Between execution phases, write handoff doc capturing:
  - Decisions made (and rationale)
  - Alternatives rejected (and why)
  - Risks identified (for next stage)
  - Remaining work
- Next stage reads handoff to recover context without re-discovery
- Convention: `.omc/handoffs/<stage-a>-to-<stage-b>.md`
- **Forge OS target:** New `docs/HANDOFF-PROTOCOL.md`

### HIGH (6)

**6. Deslop Pass (Post-Build Cleanup)**
- After all verification passes, mandatory cleanup sweep
- Targets AI-generated patterns: verbose comments, over-abstraction, unnecessary error handling, redundant type annotations
- Post-deslop regression tests must pass (cleanup can break things)
- Opt-out via `--no-deslop` flag
- **Forge OS target:** New Nyx build phase between "findings fixed" and "close"

**7. 3-Failure Circuit Breaker**
- After 3 failed fix attempts on the same issue, STOP
- Escalate to architect/higher-tier agent for reframe
- Prevents infinite spin on a problem that needs a different approach
- Applies to: debugging, fix cycles, verification loops
- **Forge OS target:** Nyx execution protocol + all agent definitions

**8. Critic Self-Audit + Realist Check**
- Before reporting findings, critic must:
  1. Self-audit: confidence check on every finding
  2. Realist check: recalibrate severity against realistic worst-case (not theoretical)
- Prevents severity inflation (P-CRIT when P-MED is appropriate)
- Escalation to ADVERSARIAL mode only on confirmed CRITICAL or 3+ MAJOR
- **Forge OS target:** Pierce methodology enhancement

**9. Pre-Mortem (Before Build, Not After)**
- Before execution, generate 3 failure scenarios and plan mitigations
- Different from adversarial check (Rule 30) which runs AFTER building
- Activated by `--deliberate` flag or automatically on high-risk surfaces
- Includes expanded test plan
- **Forge OS target:** Scout or Nyx pre-build phase, `docs/EXECUTION-GATES.md`

**10. SubagentStop Deliverable Verification**
- When a sub-agent finishes, automatically verify it produced what was asked
- Hook fires on SubagentStop event
- Checks: did the agent return findings? Did it cover all assigned targets? Is output in expected format?
- Prevents silent failures (agent runs but produces nothing useful)
- **Forge OS target:** Swarm protocol worker completion checks

**11. PreCompact Learning Persistence**
- Before context compression, hook fires to persist all learnings to disk
- Ensures discoveries aren't lost when context window compresses
- Writes to project memory file (our BUILD-LEARNINGS.md equivalent)
- **Forge OS target:** Context management protocol

### MEDIUM (4)

**12. Multi-Perspective Review Lenses**
- Code review from 3 lenses: security / new-hire / ops
- Plan review from 3 lenses: executor / stakeholder / skeptic
- Each lens catches different issue classes
- Rotate lenses to prevent single-perspective blind spots
- **Forge OS target:** Pierce and Build Triad methodology

**13. Dispatch Queue Fairness**
- Task allocation considers worker load balance
- Prevents one worker from getting all hard tasks
- Fair round-robin with complexity weighting
- **Forge OS target:** Swarm protocol dispatch logic

**14. Idle Nudge / Watchdog**
- If worker idle >N seconds and tasks remain, nudge with new assignment
- Prevents workers from stalling silently
- Combined with stuck-task reassignment for comprehensive liveness monitoring
- **Forge OS target:** Swarm protocol worker management

**15. Sentinel Gate on Team Completion**
- Even if all tasks show "done," gate checks actual deliverables before allowing shutdown
- Prevents premature completion when tasks are marked done but output is incomplete
- **Forge OS target:** Sentinel integration with swarm completion

### LOW (2)

**16. Atomic Write + File Locking**
- Atomic writes: tmp file + rename (prevents corruption on crash)
- File locking: cross-session locks prevent concurrent modification
- Smart merge for project memory: keep non-conflicting changes from multiple sessions
- **Forge OS target:** Infrastructure / state management

**17. Progress.txt (Intra-Task Learning)**
- Within a single task execution, capture codebase patterns and learnings discovered
- Different from BUILD-LEARNINGS (cross-session) — this is within-task discovery
- Feeds into next iteration of the same task (ralph loop)
- **Forge OS target:** Nyx execution protocol

---

## OMC Agent Catalog (20 Types)

| Agent | Tier | Domain | Key Trait |
|-------|------|--------|-----------|
| architect | Opus | Code analysis, debugging | 4-phase root cause, circuit breaker after 3 failures |
| critic | Opus | Quality gate | Self-audit + realist check, multi-perspective |
| code-reviewer | Opus | Code quality | 4 review modes (spec, quality, performance, style) |
| security-reviewer | Opus | Vulnerabilities | OWASP Top 10 + secrets + deps, severity x exploitability x blast |
| analyst | Opus | Requirements | PRD extraction |
| planner | Opus | Planning | Scoping, estimation |
| debugger | Sonnet | Root cause | 3-failure circuit breaker, minimal diff (<5%) |
| test-engineer | Sonnet | Testing | TDD Iron Law (test FIRST), 70/20/10 coverage |
| executor | Sonnet/Opus | Implementation | Standard or complex routing |
| verifier | Sonnet | Verification | Implementation correctness |
| designer | Sonnet | UI/UX | Visual design |
| explorer | Haiku | Codebase | Cheap exploration |
| code-simplifier | Sonnet | Refactoring | Complexity reduction |
| document-specialist | Sonnet | Docs | Research + writing |
| git-master | Sonnet | Git ops | Branch, merge, rebase |
| tracer | Sonnet | Execution tracing | Runtime analysis |
| qa-tester | Sonnet | QA | Manual testing |
| scientist | Opus | Research | Data analysis |
| writer | Sonnet | Content | Copy + documentation |

---

## OMC Skill Catalog (Key 10 of 37)

| Skill | Purpose | Composition |
|-------|---------|-------------|
| ralph | Persistence loop | Wraps ultrawork + state + PRD verification |
| team | N-agent coordination | Staged pipeline + worker lifecycle + handoffs |
| deep-interview | Socratic requirements | Ambiguity scoring + ontology tracking |
| autopilot | Full autonomous | deep-interview → ralplan → ralph → verify |
| ultrawork | Parallel execution | Model routing + background ops |
| ralplan | Consensus planning | Planner → Architect → Critic loop |
| ai-slop-cleaner | Post-build cleanup | Deslop pass |
| ccg | Multi-model synthesis | Codex + Claude + Gemini advisor triangle |
| ultraqa | Thorough QA | Extended test coverage |
| visual-verdict | Frontend validation | Visual/UI verification |

---

## OMC Hook System (11 Points)

| Hook | When | Key Action |
|------|------|------------|
| UserPromptSubmit | Every message | Keyword detection + skill injection |
| SessionStart | Session opens | Load project memory, check MCP |
| PreToolUse | Before tool | Pre-flight validation |
| PermissionRequest | Permission needed | Custom permission policies |
| PostToolUse | After tool success | State update, project memory |
| PostToolUseFailure | After tool failure | Error logging, remediation |
| SubagentStart | Agent spawned | Track agent lifecycle |
| SubagentStop | Agent finished | Verify deliverables |
| PreCompact | Before compression | Persist learnings to disk |
| Stop | Ctrl+C | Save persistent state |
| SessionEnd | Session closes | Final cleanup |

---

## How OMC Maps to Forge OS

| OMC Concept | Forge OS Equivalent | Gap |
|-------------|--------------------|----|
| 20 agent types | 10 personas + 10 intelligences | We have deeper personas, they have more agent variety |
| 37 skills | 30 slash commands + 5 skills | We have commands, they have execution modes |
| Ralph persistence | BOOT.md handoffs | They verify empirically, we report verbally |
| Team coordination | Swarm protocol | They have mature worker lifecycle, we just added swarm |
| Deep interview | No equivalent | Major gap — our `/init` doesn't gate on clarity |
| Ralplan gate | No equivalent | We trust operator specificity |
| Deslop pass | No equivalent | We go straight from "fixed" to "done" |
| 11 hook points | 4 hooks in settings.json | We have fewer lifecycle hooks |
| State persistence | BOOT.md (text) | They have structured JSON state |
| Handoff documents | BOOT.md (partial) | We don't handoff between agent stages |
| Critic self-audit | No equivalent | Pierce doesn't self-check severity calibration |
| Circuit breaker | No equivalent | Nyx can spin indefinitely on a fix |

---

## Key Architectural Decisions from OMC

1. **Composition over competition** — Ralph wraps Ultrawork. Autopilot wraps Ralph. Modes compose, they don't compete.
2. **Evidence-first** — Every claim cites file:line. No armchair analysis.
3. **Mathematical gating** — Ambiguity score, not vibes, determines execution readiness.
4. **Explicit hierarchy** — Workers don't orchestrate. Leaders don't execute. Clean separation.
5. **Staged pipeline with handoffs** — Each stage produces artifacts for the next. Context doesn't rely on memory.
6. **Mandatory cleanup** — Deslop pass acknowledges that AI-generated code needs post-hoc quality sweep.
7. **Circuit breakers everywhere** — 3-failure limit on debugging, 3-iteration limit on ralph, max 5 iterations on ralplan critic loop.
