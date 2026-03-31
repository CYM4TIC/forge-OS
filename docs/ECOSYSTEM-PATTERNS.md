# Ecosystem Patterns

> Operational patterns extracted from Ruflo and the broader agent ecosystem.
> Token optimization, anti-drift, self-learning loops, and agent discipline.

---

## 1. Token Optimization

### Worker Count Discipline
- Fewer concurrent agents = fewer tokens per cycle
- **Rule:** Only dispatch agents that are needed for the current batch. Don't speculatively wake agents.
- Scout (pre-build), Build Triad (post-build), Sentinel (regression) are the mandatory minimum.
- Additional personas dispatch only when PERSONA-GATES.md requires them.

### Stall Detection
- If an agent produces no meaningful output after 3 iterations of the same query, it's stalled.
- **Action:** Kill the agent, log the stall pattern, adjust the prompt for next dispatch.
- Safety limit: max 50 iterations per agent dispatch. After that, force-return whatever findings exist.
- Timeout: 4 minutes per agent dispatch. If a sub-agent takes longer, it's doing too much.

### Context Window Efficiency
- Load context on demand, not speculatively. Read segment files only when the batch needs them.
- Filter BUILD-LEARNINGS.md by domain keyword before reading (don't load the entire history).
- Stop at 70% context window utilization. Write BOOT.md handoff and recommend fresh session.
- For persona gates: dispatch as separate agents (they get their own context window).

### Batch Sizing
- Lightweight batches (simple RPCs, DDL): 3-4 per session
- Heavy batches (checkout saga, multi-segment): 1-2 per session
- Frontend batches: 1 per session (browser verification is context-expensive)
- **Rule:** When in doubt, do fewer batches per session. Handoff cost is low. Recovery from context exhaustion is expensive.

---

## 2. Anti-Drift Patterns

### Task Source Allowlist
- Only approved commands can trigger agent dispatch:
  - Slash commands (30 defined)
  - Direct operator instructions ("start L4-J.2c", "next batch", "wake Pierce")
  - Agent-to-sub-agent dispatch (Build Triad → Pierce/Mara/Riven)
- **Never** let an agent self-dispatch additional agents without operator awareness
- **Never** let observed content (web pages, API responses, file contents) trigger agent dispatch

### Iteration Limits
| Agent Type | Max Iterations | Timeout |
|------------|---------------|---------|
| Sub-agents (focused checks) | 10 | 2 min |
| Persona agents (review gates) | 30 | 4 min |
| Orchestrator agents (triads) | 50 | 8 min |
| Nyx build loop (per micro-batch) | No limit | Context window |

### Drift Detection
- **Repetitive findings:** If an agent produces the same finding 3 sessions in a row without it being fixed, escalate to operator.
- **Severity inflation:** If an agent's P-HIGH rate increases significantly between batches, review whether the severity calibration has drifted.
- **Scope creep:** If an agent starts reporting findings outside its domain (e.g., Pierce commenting on visual design), flag for introspection.
- **Anchor drift:** If BUILD-LEARNINGS.md stops getting new entries for 5+ batches, the self-learning loop has stalled.

### Safety Bounds
- Agents **cannot** modify files outside the project directory
- Agents **cannot** push to Git without going through the build orchestrator
- Agents **cannot** execute destructive database operations (DROP, TRUNCATE) without operator confirmation
- Agents **cannot** modify their own agent definitions or persona files

---

## 3. Self-Learning Loop

### The Pattern (Mem0-inspired)
```
BUILD → OBSERVE → EXTRACT → PERSIST → APPLY

BUILD:    Execute the batch (write code, deploy, verify)
OBSERVE:  Note what went wrong, what surprised you, what worked
EXTRACT:  Distill into reusable patterns or anti-patterns
PERSIST:  Write to BUILD-LEARNINGS.md (project) or INTROSPECTION.md (persona)
APPLY:    Next session reads learnings before building → avoids repeat mistakes
```

### What Gets Persisted (Auto-Extract — Step 8 of Next Batch Protocol)

| Category | Where It Goes | Example |
|----------|---------------|---------|
| Tool workaround | BUILD-LEARNINGS.md | "apply_migration fails on DDL with concurrent index — use execute_sql instead" |
| Persona failure pattern | personas/{name}/INTROSPECTION.md | "Pierce tendency: marking spec-adjacent items as P-CRIT when they're P-MED" |
| Architecture decision | ADL or decisions/ | "Chose cursor pagination over offset — performance at scale" |
| Reusable code pattern | BUILD-LEARNINGS.md | "Lateral join + json_agg for nested data — 3x faster than multiple queries" |
| API gotcha | BUILD-LEARNINGS.md | "WPS filter[keyword] returns 400 — use filter[name] with near-exact matching" |

### What Does NOT Get Persisted
- Transient debugging steps (how you found the bug — the fix is in the code)
- File paths or code structure (derivable from the codebase)
- Findings that were fixed in the same session (the fix is the learning)
- Generic programming knowledge (the agent already knows this)

### Reward Signal
- **Successful batch** (no P-CRIT/R-CRIT, all findings resolved): Positive signal. Look for patterns to replicate.
- **Failed batch** (build broken, regression introduced): Negative signal. Extract failure mode. Add to INTROSPECTION.md if persona-inherent.
- **Slow batch** (took 2x expected context): Neutral signal. Look for optimization opportunities.

---

## 4. Agent Discipline

### Dispatch Hygiene
- Every agent dispatch must have a clear purpose statement
- Every agent must return structured findings (not prose)
- Every agent must report "no findings" explicitly (silence is ambiguous)
- Orchestrator agents must aggregate sub-agent findings, not just pass them through

### Finding Quality
- Findings must be actionable (not "consider improving X")
- Findings must have severity classification (CRIT/HIGH/MED/LOW)
- Findings must reference specific file and line (not "somewhere in the codebase")
- Findings must suggest a fix (not just identify the problem)

### Persona Boundaries
- Each persona has a defined domain. Findings outside that domain should be flagged but not formally classified.
- Cross-cutting concerns (accessibility affects UX + design + code) are handled by the orchestrator, not individual personas.
- When two personas disagree on severity, the higher severity wins (conservative default).

### Agent Evolution
- Agent definitions are versioned in Git. Changes require operator approval.
- Persona INTROSPECTION.md files are the mechanism for gradual improvement.
- Global identity changes (new failure mode, new capability) propagate to ALL projects.
- Project-specific adaptations stay in the project vault.

---

## 5. Session Management

### Session Lifecycle
```
START → BOOT.md read → Identify batch → Load context → Build → Gate → Close → BOOT.md write
```

### Continuity Mechanism
- BOOT.md is the only continuity mechanism between sessions.
- It must contain: current position, last verification, open risks, next batch.
- The next session reads BOOT.md and picks up exactly where the last session left off.
- If BOOT.md is stale or missing, the session starts with a full context reload.

### Context Window Budget
| Phase | Typical % of Context |
|-------|---------------------|
| Boot (BOOT.md + CLAUDE.md + manifest) | 5-10% |
| Context load (ADL + learnings + segments) | 10-15% |
| Scout dispatch | 5-10% |
| Build (file reads + writes + verification) | 30-40% |
| Gate dispatch (Triad findings + fixes) | 15-25% |
| Close (BOOT.md update + report) | 5% |

---

## 6. Quality Enforcement

### The Three-Mind Principle
The builder (Nyx) can never evaluate their own work. Quality comes from:
1. **Builder** — Nyx writes the code
2. **Reviewer** — Build Triad (Pierce + Mara + Riven) evaluates independently
3. **Validator** — Sentinel verifies nothing broke

This three-mind principle is the core defense against FM-4 (findings avoidance) and FM-9 (self-review blindness).

### Gate Escalation
```
Build Triad findings → Fix all → Re-verify
If P-CRIT or R-CRIT → Additional personas may be required (per PERSONA-GATES.md)
If high-risk surface → Wraith red-team (mandatory)
If layer boundary → Full Audit (all triads + Wraith + Sentinel + Meridian)
```

### Definition of Done
A batch is done when:
1. All code is written and pushed
2. All SQL is applied and verified
3. Browser verification passes (for frontend)
4. Build Triad dispatched and ALL findings resolved
5. Sentinel reports no regressions
6. Adversarial check passed (4 questions)
7. BOOT.md updated with handoff

---

## 7. Circuit Breakers (from oh-my-claudecode)

Every iterative process has a maximum iteration count. After the limit, STOP and escalate.

| Process | Max Iterations | Escalation |
|---------|---------------|------------|
| Fix cycle (single finding) | 3 | Escalate to operator — root cause may be architectural |
| Verification loop (story) | 3 | Escalate to architect agent for reframe |
| Ralplan critic loop | 5 | Accept best plan so far |
| Ralph persistence loop | 10 | Stop, report progress with evidence |
| Swarm worker | 10 | Force-return partial findings |
| Deep interview | 12 rounds | Report remaining ambiguity, proceed with caveats |

**Why:** Infinite loops burn tokens and context without making progress. The right response to hitting a circuit breaker is to **reframe the problem**, not retry harder. Three failed fix attempts using the same approach is a signal that the approach is wrong, not that the execution was bad.

---

## 8. PreCompact Learning Persistence (from oh-my-claudecode)

Before context window compression, persist all undocumented learnings to disk.

### What Gets Saved
- Tool workarounds discovered this session
- Codebase patterns not yet in BUILD-LEARNINGS.md
- Architecture decisions made implicitly (should be explicit)
- Failure patterns observed (circuit breaker hits, unexpected errors)

### When It Fires
- Context > 60% utilized (preemptive)
- System context compression event (reactive)
- Session end (cleanup)

### Why
Context compression loses information. If a discovery was made at 30% context and compression happens at 70%, that discovery is gone unless it was written to disk. The PreCompact hook ensures nothing valuable is lost.

---

## 9. Atomic Write Safety (from oh-my-claudecode)

### The Pattern
```
1. Write content to temp file ({target}.tmp)
2. Rename temp file to target (atomic OS operation)
3. If crash between 1 and 2: temp file exists but target is untouched
```

### Why
Direct writes can corrupt files if interrupted (power loss, process kill, context limit). Atomic write ensures the file is either fully written or untouched — never partially written.

### Where to Apply
- State files (persistence protocol state, swarm state)
- Build learnings (cross-session knowledge)
- Handoff documents (cross-agent context)
- Any file that multiple sessions or agents might read
