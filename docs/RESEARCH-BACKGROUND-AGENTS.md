# Research: Background Agents (Open-Inspect) — Autonomous Agent Scheduling & Lifecycle

## Session Date: 2026-04-03
## Participants: Nyx (research session)
## Source: [ColeMurray/background-agents](https://github.com/ColeMurray/background-agents)

---

## Source Material

- **Author:** Cole Murray
- **Stack:** TypeScript (Cloudflare Workers + Durable Objects) + Python (Modal sandboxes) + Next.js web UI
- **Core thesis:** Split-cloud architecture for persistent background agent execution. Each session is a Durable Object with embedded SQLite. Agents run in sandboxed Modal containers with snapshot/restore for instant resume. Cron + event-driven trigger system for scheduled automations.
- **Scale:** 27 SQLite migrations, 8 monorepo packages, sophisticated lifecycle management.

---

## Architecture Overview

```
Control Plane (CF Workers + Durable Objects)
    ├── SchedulerDO (singleton) — cron tick + recovery sweep + event trigger matching
    ├── SessionDO (per-session) — SQLite state, WebSocket hub, prompt queue, sandbox lifecycle
    └── D1 (global) — automation definitions, session index, encrypted secrets

Data Plane (Modal, Python)
    ├── Sandbox Manager — create/restore/snapshot containers
    └── Agent Runtime — OpenCode agent + supervisor + bridge

Clients (CF Workers + Hono)
    ├── Web (Next.js), Slack bot, GitHub bot, Linear bot
    └── All route through SessionDO via WebSocket
```

---

## Pattern 1: Pure Decision Functions (Lifecycle Logic)

**What Open-Inspect Does:**
`decisions.ts` separates ALL lifecycle decisions from side effects. Every decision is a **pure function** taking state + config, returning a decision object:

- `evaluateCircuitBreaker(failures, windowMs, threshold)` → open/closed
- `evaluateInactivityTimeout(lastActivity, timeout)` → timeout/continue
- `evaluateHeartbeatHealth(lastHeartbeat, interval, tolerance)` → healthy/stale
- `evaluateWarmDecision(sandboxStatus, userTyping)` → warm/skip
- `evaluateExecutionTimeout(startTime, maxDuration)` → timeout/continue

No side effects. Fully unit-testable. The lifecycle manager calls these functions and then acts on the decisions.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1 (Ritual engine)
- **What we adopt:** ALL ritual scheduling logic as pure decision functions:
  - `should_fire_heartbeat(last_run, cron_expr, now)` → fire/skip
  - `should_fire_dreamtime(last_run, time_of_day, pending_echoes)` → fire/skip
  - `should_pause_ritual(consecutive_failures, threshold)` → pause/continue
  - `evaluate_circuit_breaker(recent_failures, window, max)` → open/closed
  - `evaluate_mana_budget(remaining, required)` → proceed/defer
- The ritual engine calls these, then dispatches. Decision logic is testable in isolation.

---

## Pattern 2: Circuit Breaker for Agent Dispatch

**What Open-Inspect Does:**
`evaluateCircuitBreaker()`: 3 failures within 5 minutes opens the circuit (blocks further spawns). After the window passes, circuit resets. Prevents rapid-fire retry loops that waste resources.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1 (Ritual engine) + Session 8.2 (dispatch pipeline)
- **What we adopt:** Circuit breaker on persona dispatch AND ritual execution:
  - Per-persona: 3 consecutive dispatch failures → circuit opens → persona marked "stale" in team panel → operator notified
  - Per-ritual: 3 consecutive failures → ritual auto-pauses → operator re-enables manually
  - Window-based reset: failures older than the window don't count
- **Enhancement:** Circuit breaker state persisted in SQLite. Visible in HUD as a warning glyph on the affected persona/ritual.

---

## Pattern 3: Auto-Pause with Consecutive Failure Tracking

**What Open-Inspect Does:**
`AUTO_PAUSE_THRESHOLD = 3` consecutive failures. Successful run resets counter. Resuming resets counter and recalculates next run time. Simple, robust.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1 (Ritual governance)
- **What we adopt:** Already specified in our ritual governance ("all disabled by default, operator enables explicitly"). This adds the auto-pause mechanism: rituals that fail 3 times in a row auto-disable with a logged reason. Operator re-enables via team panel or `/ritual enable heartbeat`. Counter resets on success or manual re-enable.

---

## Pattern 4: Recovery Sweep on Every Tick

**What Open-Inspect Does:**
Every scheduler tick begins with a recovery sweep:
1. Detect orphaned runs stuck in "starting" > 5 minutes → mark failed
2. Detect timed-out runs in "running" > 90 minutes → mark timed-out
3. Clean up before processing new triggers

Self-healing. No manual intervention for stuck states.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1 (Ritual engine)
- **What we adopt:** Heartbeat ritual (hourly) includes a recovery sweep as its first action:
  - Detect dispatches stuck in "running" > configured timeout → mark failed, file echo
  - Detect rituals stuck in "executing" > timeout → force cancel, increment failure counter
  - Detect stale sigil indexes > 24 hours without regeneration → flag for dreamtime
- The heartbeat IS the recovery mechanism. If heartbeat itself fails, the circuit breaker catches it.

---

## Pattern 5: Event Condition Registry (Typed Trigger System)

**What Open-Inspect Does:**
Typed condition system for event-driven automations:

Event sources: `github` (PR, push, check), `linear` (issue), `sentry` (error), `webhook` (generic JSON).

Each condition type has: `validate()` (creation time), `evaluate()` (runtime matching), and declared applicable event sources.

`matchesConditions()` evaluates all conditions (AND logic) against an incoming event.

Condition types: `branch` (glob), `label` (any_of/none_of), `path_glob` (changed files), `actor` (include/exclude), `check_conclusion`, `linear_status`, `sentry_level`, `jsonpath` (arbitrary JSON path).

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.2 (Intelligence interaction chains)
- **What we adopt:** The typed condition registry for reactive triggers. Our event bus already has event types (`action.completed`, `gate.completed`, `signal.threshold`). This pattern adds a formal condition evaluation layer:
  - Sentinel subscribes to `action.completed` with condition: `{ path_glob: "src-tauri/**/*.rs" }` → only triggers on Rust file changes
  - Beacon subscribes to `signal.threshold` with condition: `{ metric: "finding_density", operator: "gt", value: 0.5 }` → only triggers when density exceeds threshold
  - Conditions stored as typed JSON in SQLite, evaluated by a registry of condition handlers

---

## Pattern 6: Proactive Warming on Intent

**What Open-Inspect Does:**
`evaluateWarmDecision()`: When a user starts typing, the control plane speculatively begins spawning a sandbox. By the time they submit, it may already be ready.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1 (Ritual engine timing)
- **What we adopt:** Pre-warm ritual context when the ritual window approaches:
  - 5 minutes before dreamtime (2am): begin loading vault state, sigil indexes, recent echoes into a pre-assembled context
  - 5 minutes before heartbeat: begin loading BOOT.md state, recent dispatches
  - When operator opens Action Palette: pre-warm the most likely dispatch context based on current phase + recent activity
- This reduces ritual cold-start latency from "load everything" to "context already assembled."

---

## Pattern 7: Prompt Queue with Serial Execution

**What Open-Inspect Does:**
`SessionMessageQueue`: FIFO queue in SQLite. Messages: `pending → processing → completed/failed`. Only one processes at a time. If sandbox not ready, prompt deferred and spawn triggered.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.2 (dispatch pipeline)
- **What we adopt:** Dispatch queue for ritual and operator dispatches. One dispatch executes at a time per persona. If a ritual fires while a dispatch is running, it queues. Queue persisted in SQLite for crash recovery. Status lifecycle: `queued → dispatching → running → completed/failed/cancelled`.

---

## Patterns Not Adopted

| Pattern | Why Not |
|---------|---------|
| Durable Objects as session actors | We use Tauri managed state + SQLite, not Cloudflare DOs |
| Modal container snapshots | We don't run agents in containers — they're in-process |
| Child session spawning | Our multi-agent is Swarm + mailbox, not parent-child sessions |
| Multiplayer WebSocket | Single-operator desktop app |

---

*7 patterns mined. 4 Tier 1 (direct adoption), 3 Tier 2 (adapt). All fit Phase 8 Sessions 8.1/8.2.*
