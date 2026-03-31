# Ruflo — Agent Orchestration Patterns

> Token optimization, anti-drift, self-learning loop, agent booster. From ruvnet/ruflo.

## Repo: github.com/ruvnet/ruflo

Enterprise-grade multi-agent orchestration framework. 6,000+ commits. 108 agent definitions across 31 modules. 313 MCP tools. 27 hook event types.

## Token Optimization Patterns

- **Autopilot persistent completion** (ADR-072): Re-engagement detection with stall thresholds
- **Worker count reduction** (10→3): Fewer workers = fewer tokens per cycle
- **Schedule relaxation**: Less frequent polling saves API calls
- **Atomic file writes** (tmp + rename): Prevents partial writes that trigger retries
- **Daemon auto-start = false**: Opt-in only prevents background token drain

## Anti-Drift Patterns

- **Task source allowlist** (VALID_TASK_SOURCES): Only approved origins can create tasks
- **Stall detection + auto-disable**: 10-iteration threshold before killing stuck tasks
- **Safety limits**: Max 50 iterations, 4-hour timeout per task
- **HNSW ghost entry invalidation**: Prevents orphan vector references
- **Orphan process timeout** (5min→16min): Prevents premature cleanup of slow tasks

## Self-Learning Loop

- **Reward calculation** per completion episode (did the task succeed?)
- **3-source task discovery**: team-tasks, swarm-tasks, file-checklist
- **Graceful degradation**: Falls back when AgentDB unavailable
- **Re-engagement prompt builder**: Tracks stall patterns to improve future prompts

## Agent Booster

- **Autopilot CLI**: 10 subcommands (status, enable, disable, config, reset, log, learn, history, predict, check)
- **Autopilot MCP tools**: 10 parallel tools for non-blocking dispatch
- **Stop-hook checkpoint**: Introspects unfinished work before session exit
- **Prototype pollution prevention**: NaN/Infinity bypass protection in state validation

## How to Use in Forge OS

**Token optimization:** Apply worker count discipline and stall detection to agent dispatch. Our Scout/Sentinel/Wraith agents should have iteration limits and timeout bounds.

**Anti-drift:** Task source allowlist pattern applies to our slash commands — only approved commands can trigger agent dispatch.

**Self-learning:** BUILD-LEARNINGS.md is our version of the reward loop. Formalize: every session auto-extracts patterns (Step 22 in Next Batch Protocol already does this).
