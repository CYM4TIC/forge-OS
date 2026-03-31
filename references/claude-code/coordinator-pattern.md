# Coordinator Pattern — Multi-Agent Dispatch

> How Claude Code orchestrates parallel agent work. The blueprint for Forge OS Hyperdrive.

## Architecture

```
Coordinator (main process)
  ├── Spawns Worker A (research — read-only, parallel)
  ├── Spawns Worker B (research — read-only, parallel)
  ├── Spawns Worker C (research — read-only, parallel)
  │
  ├── [Waits for all workers to complete]
  │
  ├── Synthesizes findings (coordinator's job, not delegated)
  │
  ├── Spawns Worker D (implementation — write, serial)
  │
  └── Spawns Worker E (verification — read-only)
```

## Key Rules

1. **Workers can't see coordinator's conversation.** Each prompt must be self-contained.
2. **Worker results arrive as `<task-notification>` XML** in user-role messages.
3. **Coordinator must synthesize, not parrot.** "Based on your findings" is banned — include file paths, line numbers, specifics.
4. **Read-only tasks run in parallel.** Write tasks run serially.
5. **Workers have scoped tools** — they can't always access everything the coordinator can.

## Agent Spawning Modes

```typescript
AgentTool.call() →
  ├── Sync:      runAgent() — inline, blocks coordinator
  ├── Async:     registerAsyncAgent() — background, returns task_id
  ├── Fork:      createAgentWorktree() — isolated git worktree
  ├── Teammate:  spawnTeammate() — team-scoped, tmux pane
  └── Remote:    registerRemoteAgentTask() — CCR session
```

**Most relevant for Forge OS: Async mode.** Worker runs in background, coordinator gets notified via task events.

## Agent Input Schema

```typescript
{
  description: string       // 3-5 word summary
  prompt: string            // Full task instructions
  subagent_type?: string    // Agent specialization
  model?: 'sonnet' | 'opus' | 'haiku'  // Model override
  run_in_background?: boolean
  isolation?: 'worktree'   // Git isolation
}
```

## Agent Output Schema

```typescript
// Sync result
{ status: 'completed', prompt: string, messages, usage, summary }

// Async result
{ status: 'async_launched', agentId, description, outputFile }
```

## Forge OS Mapping

| Claude Code | Forge OS Equivalent |
|-------------|---------------------|
| Coordinator mode | Nyx build orchestrator |
| Worker agents (research) | Scout, Sentinel, Chronicle |
| Worker agents (quality) | Pierce, Mara, Riven (Build Triad) |
| Worker agents (security) | Tanaka, Wraith |
| Task notifications | Tauri events from background agents |
| Agent isolation (worktree) | Agent-scoped SQLite state |
| Model override per agent | Capability tier system (high/medium/fast) |

## Design Decision: Why External Dispatch

Claude Code's coordinator spawns **separate processes** for workers. This is critical:
- Workers have their own context window (no contamination)
- Workers can't see each other's work (isolation)
- Coordinator is the synthesis point (single source of truth)

This is exactly our Hyperdrive pipeline: Scout runs independently, Build Triad runs independently, findings flow back to Nyx for synthesis and fixes.
