# Swarm Dispatch Protocol

> Queen/Worker Bee pattern for parallel agent execution.
> Capability layer on existing agents and orchestrators — not new agent types.

---

## 1. The Pattern

```
QUEEN (parent agent)
  1. DECOMPOSE — Split work into N independent units
  2. DISPATCH — Spawn N Worker agents in parallel (single message, multiple Agent tool calls)
  3. AGGREGATE — Collect all worker results
  4. CONSOLIDATE — Merge findings, deduplicate, resolve conflicts, produce unified report

WORKER (ephemeral sub-agent)
  - Stateless — no memory of other workers
  - Independent — operates on its own subset of targets
  - Standard output — returns findings in the parent's severity format
  - Self-contained — includes all context needed in the dispatch prompt
```

### When to Swarm

Swarm dispatch is appropriate when ALL of these are true:
1. The task has **N independent targets** (files, routes, APIs, tables)
2. Each target can be checked with the **same methodology** (homogeneous workers)
3. Targets have **no inter-dependencies** (checking A doesn't affect checking B)
4. N >= 3 (below 3, sequential is fine — dispatch overhead exceeds time savings)

### When NOT to Swarm

- Task requires **holistic view** (Meridian cross-surface consistency, Chronicle build history)
- Task has **sequential dependencies** (build loop, timeline reconstruction)
- Task requires **synthesis across all inputs** (Arbiter verdict, Voss legal assessment)
- N < 3 targets (overhead exceeds benefit)
- Context window is already > 50% utilized (workers consume parent context)

---

## 2. Worker Conventions

### Dispatch Format
Every worker dispatch must include:
```
Worker {i} of {N} — {Agent Name} Swarm

TARGET: {specific file/route/API/table this worker checks}
METHODOLOGY: {the checklist/rules to apply — copied from parent agent}
CONTEXT: {any project-specific context needed — ADL rules, design tokens, etc.}
OUTPUT FORMAT: {the finding format expected — severity, file, line, description, fix}

Report findings or explicitly state "No findings" — silence is ambiguous.
```

### Result Format
Every worker returns:
```
## Worker {i} Results — {target name}

| Severity | ID | File:Line | Finding | Suggested Fix |
|----------|-----|-----------|---------|---------------|
| P-HIGH | W{i}-001 | path:42 | Description | Fix |

**Summary:** {count} findings ({breakdown by severity})
```

### Finding ID Convention
- Worker findings use `W{worker_number}-{sequence}` prefix (e.g., W3-001)
- Queen re-numbers during consolidation to parent's format (e.g., P-HIGH-001)
- Deduplication: if two workers flag the same file:line, keep the higher severity

---

## 3. Concurrency Limits

| Resource Type | Max Workers | Rationale |
|---------------|-------------|-----------|
| **Browser testing** (Mara, Riven, Sentinel, Wraith) | 3-5 | Browser/Preview MCP resource limits |
| **Database queries** (Kehinde, Tanaka, Vane, Kiln) | 5-8 | Connection pool limits |
| **File/grep scanning** (Pierce, Sable, Scribe, Compass) | 8-12 | CPU-bound, safe to parallelize aggressively |
| **Mixed** (orchestrators dispatching different agent types) | 5-8 | Balance across resource types |

### Hard Ceiling
- **Never exceed 10 concurrent workers** from a single Queen dispatch
- If N > max workers, batch: dispatch first wave, wait, dispatch second wave
- Each worker inherits iteration limits from its parent agent type

### Timeout Bounds
| Worker Type | Max Duration | Action on Timeout |
|-------------|-------------|-------------------|
| Sub-agent worker (focused check) | 2 min | Force-return partial findings |
| Persona worker (full review) | 4 min | Force-return partial findings |
| Orchestrator worker (triad) | 8 min | Force-return partial findings |

---

## 4. Context Window Management

### Budget
- Swarm dispatch consumes context in the Queen's window (dispatch prompts + result collection)
- Each worker gets its own context window (Agent tool creates isolated subprocess)
- **Rule:** Don't swarm if Queen's context is > 50% utilized — workers' results will push past 70%

### Vault-Based Streaming (for large swarms)
When N > 5 workers or results are expected to be large:
1. Workers write findings to a temp file: `{project}/vault/swarm-results/worker-{i}.md`
2. Queen reads result files after all workers complete
3. Queen consolidates from files, not from in-memory Agent results
4. Clean up temp files after consolidation

This keeps the Queen's context lean — it processes results sequentially from disk rather than holding all N workers' output in memory simultaneously.

---

## 5. Swarm Activation

### Automatic Triggers
Agents with swarm capability automatically swarm when:
- Target count >= swarm threshold (defined per agent, typically 3-5)
- Context window < 50% utilized
- No explicit `--sequential` flag from operator

### Manual Override
- Operator says "swarm this" — force parallel dispatch even below threshold
- Operator says "sequential" — force sequential even above threshold
- Operator says "swarm N workers" — override default worker count

### Swarm-Enabled Agents

**Personas (8):**
| Agent | Swarm Pattern | Threshold | Max Workers |
|-------|--------------|-----------|-------------|
| Nyx | Parallel fixes, parallel micro-batches, parallel context load | 3 findings / 2 components | 5 |
| Pierce | Multi-file spec conformance | 5 files | 10 |
| Mara | Multi-route UX testing | 3 routes | 5 |
| Kehinde | Multi-API failure mode analysis | 3 APIs | 8 |
| Tanaka | Multi-surface security audit | 3 surfaces | 8 |
| Riven | Multi-component token audit | 5 components | 8 |
| Vane | Multi-flow financial verification | 3 flows | 5 |
| Sable | Multi-surface voice consistency | 5 surfaces | 8 |

**Intelligences (6):**
| Agent | Swarm Pattern | Threshold | Max Workers |
|-------|--------------|-----------|-------------|
| Sentinel | Multi-route regression sweep | 3 routes | 5 |
| Wraith | Multi-surface adversarial testing | 3 surfaces | 5 |
| Compass | Multi-change impact analysis | 3 changes | 8 |
| Kiln | Multi-query/component profiling | 5 queries | 8 |
| Scribe | Multi-entity documentation | 5 entities | 10 |
| Beacon | Multi-service monitoring | 3 services | 5 |

**Orchestrators (8) — parallel internal dispatch:**
| Orchestrator | Parallel Dispatch | Max Concurrent |
|-------------|-------------------|----------------|
| Build Triad | Pierce + Mara + Kehinde simultaneously | 3 |
| Systems Triad | Kehinde + Tanaka + Vane simultaneously | 3 |
| Strategy Triad | Calloway + Voss + Sable simultaneously | 3 |
| Full Audit | All triads + Wraith + Sentinel + Meridian in waves | 8 |
| Launch Sequence | Strategy Triad + Customer Lens + Wraith + Readiness | 4 |
| Decision Council | 5 advisors in parallel, then 5 reviewers in parallel | 5 |
| Gate Runner | Multiple triads in parallel when batch requires them | 6 |
| Council | All 10 personas in parallel | 10 |

### Not Swarm-Enabled (8 agents)
| Agent | Reason |
|-------|--------|
| Voss | Legal analysis requires unified holistic perspective |
| Calloway | Growth strategy requires cross-tier understanding |
| Scout | Runs once pre-build, sequential is sufficient |
| Chronicle | Build history requires full temporal view |
| Meridian | Cross-surface consistency requires single cartographic view |
| Arbiter | Synthesis role — benefits from upstream parallelism, not direct swarm |
| Debate | Only 2 personas — no parallelism gain |
| Postmortem | Requires sequential timeline reconstruction before analysis |

---

## 6. Quality Enforcement

### Deduplication Rules
When multiple workers flag the same issue:
1. **Same file:line, same finding** — deduplicate, keep higher severity
2. **Same file:line, different findings** — keep both (different dimensions)
3. **Same pattern, different files** — keep all (each is a separate instance)
4. **Conflicting assessments** — escalate to Queen for judgment

### Completeness Check
After consolidation, Queen verifies:
- Every target was covered by exactly one worker (no gaps, no overlaps)
- Every worker returned results (no silent failures)
- Finding count is plausible (0 findings on 20 files = suspicious, re-check a sample)

### Escalation
If a worker finds a CRIT-level issue:
- Queen flags it immediately (don't wait for all workers)
- Other workers continue (their findings still matter)
- CRIT is reported to operator before consolidation completes

---

## 7. Worker Hierarchy (from oh-my-claudecode)

### Worker Preamble

Every spawned worker receives an explicit hierarchy statement in its dispatch prompt:

```
You are a WORKER in a swarm dispatched by {Queen agent name}.
You are NOT the orchestrator. You do NOT spawn sub-agents.

WORK PROTOCOL:
1. Execute your assigned targets using your tools (Read/Grep/Preview/SQL)
2. Report findings in the standard format
3. Report "No findings" explicitly if clean (silence is ambiguous)
4. Return results to the Queen. Do not take additional action.

You do NOT: spawn sub-agents, modify orchestration, skip targets, change methodology.
```

### Why This Matters

Without hierarchy enforcement, workers can:
- Spawn their own sub-agents (chaotic delegation chains)
- Decide to skip targets they consider "low priority"
- Modify their methodology mid-execution
- Attempt to coordinate with other workers directly

The preamble prevents all of these. Workers execute. Queens orchestrate. Clean separation.

---

## 8. Worker Lifecycle Management

### Deliverable Verification on Completion

When a worker finishes, the Queen verifies deliverables before accepting results:

```
FOR each completed worker:
  1. Did the worker return a result? (not silent/empty)
  2. Does the result cover ALL assigned targets? (no gaps)
  3. Is the result in the expected format? (finding table, not prose)
  4. If any check fails:
     - Log the failure
     - Re-dispatch a replacement worker for the missed targets
     - Do NOT count the failed worker's partial results without review
```

### Idle Nudge

If a worker has been running for longer than expected and tasks remain:

| Worker Type | Expected Duration | Nudge After |
|-------------|------------------|-------------|
| File scanner (Pierce, Sable) | 30-60s | 90s |
| Browser tester (Mara, Sentinel) | 60-120s | 180s |
| Database analyzer (Kehinde, Tanaka) | 45-90s | 120s |

Nudge = re-check if the worker is still alive and producing output. If no response, reassign targets.

### Stuck Worker Recovery

```
IF worker.duration > timeout:
  1. Check: did the worker produce partial results?
  2. IF yes: accept partial, reassign remaining targets to new worker
  3. IF no: mark worker as failed, dispatch replacement
  4. Log the failure pattern for future threshold tuning
```

---

## 9. Dispatch Queue Fairness

### The Problem

Without fairness, the first worker gets the easiest tasks and finishes quickly, while the last worker gets the hardest tasks and takes 3x longer. Total time = slowest worker.

### Fair Allocation

When decomposing N targets into worker assignments:

1. **Estimate complexity** per target (file size, route complexity, API parameter count)
2. **Sort targets** by estimated complexity (descending)
3. **Round-robin assign** in snake order: Worker 1 gets hardest, Worker 2 gets next, ..., then reverse: last worker gets next hardest
4. **Result:** Each worker gets roughly equal total complexity, not just equal count

### Snake Order Example (5 targets, 2 workers)

Targets sorted by complexity: A(high), B(high), C(med), D(med), E(low)
- Worker 1: A, C, E (high + med + low = balanced)
- Worker 2: B, D (high + med = balanced)

---

## 10. Sentinel Gate on Swarm Completion

### The Problem

All workers report "done." All findings are consolidated. But did the swarm actually verify everything? Workers might have silently skipped targets or produced shallow results.

### Completion Gate

Before the Queen reports "swarm complete":

```
1. Target coverage check:
   - List all assigned targets
   - List all targets in worker results
   - IF coverage < 100%: flag missing targets, re-dispatch

2. Finding plausibility check:
   - IF 0 findings across ALL workers on N targets where N > 10:
     re-check a random sample of 2-3 targets (suspiciously clean)
   - IF sample reveals issues: full re-scan

3. Severity distribution check:
   - IF every finding is LOW: review 2-3 for possible under-severity
   - Normal distribution: mix of severities across workers
```

This gate prevents "all green" reports that mask incomplete or shallow reviews.

---

## 11. Claude Code Integration Patterns

> Adapted from SOURCE-DEEP-DIVE-V2 Swarm/Teams analysis.

### TeamFile Manifest

In Phase 3+, the swarm dispatch system evolves into a full TeamFile manifest. Each persona gets a persistent agent entry:

```json
{
  "leadAgentId": "nyx",
  "teamAllowedPaths": ["forge/", "docs/", "projects/"],
  "members": [
    {
      "agentId": "pierce",
      "name": "Dr. Pierce",
      "color": "#EF4444",
      "model": "opus",
      "permissionMode": "read-only",
      "subscriptions": ["gate-results", "findings"],
      "backendType": "in-process"
    }
  ]
}
```

- `teamAllowedPaths` — Paths all team members can edit without permission prompt
- `subscriptions` — Message topics the agent receives (enables selective notification)
- `backendType` — `in-process` (lightweight, shared process) or `worktree` (git isolation)
- `color` — Visual identification in UI and permission prompts

### Mailbox Message Types

Replace TEAM-COMMS.md flat file with typed message bus:

| Type | Direction | Purpose |
|------|-----------|---------|
| `PermissionRequest` | Worker → Queen | Destructive action needs approval |
| `PermissionResponse` | Queen → Worker | Approve/deny with rationale |
| `IdleNotification` | Worker → Queen | Finished or stalled |
| `ShutdownSignal` | Queen → Worker | Terminate gracefully |
| `DirectMessage` | Agent → Agent | Cross-persona communication |

Messages are file-locked to prevent race conditions. In-memory bus for real-time, file-based fallback for persistence.

### Permission Sync Flow

When a worker needs to perform a destructive action:
1. Worker sends `PermissionRequest` to Queen (via mailbox)
2. Queen's UI shows approval prompt to operator
3. Operator approves/denies
4. Queen sends `PermissionResponse` back via mailbox
5. Worker continues or aborts based on response

### Failure Mode Catalog

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Worker timeout | Duration > timeout bound | Accept partial, reassign remaining targets |
| Worker crash | No result + no heartbeat | Re-dispatch replacement worker |
| Inconsistent findings | Workers flag same thing at different severities | Queen takes higher severity |
| Silent failure | Worker returns empty but target has issues | Re-check random sample (Section 10) |
| Queue starvation | Workers complete but new targets appear | Batch new targets, dispatch second wave |
| Context overflow | Queen can't hold all worker results | Vault-based streaming (Section 4) |
