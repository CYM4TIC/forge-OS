# Claude Agent SDK — Reference

> API patterns and parallel execution for building custom agents.

## Core Concepts

The Agent SDK enables building custom AI agents that use Claude as the reasoning engine. Key patterns:

### Message Flow
```
User prompt → System prompt assembly → Claude API call → Tool use response → Tool execution → Loop
```

### Parallel Execution
- Multiple tool calls in a single response
- Read-only tools batched for concurrent execution
- Write tools serialized to prevent state conflicts
- Agent spawning for background work

### Agent Spawning
```typescript
// Spawn a subagent with isolated context
{
  description: "Research authentication patterns",
  prompt: "Find all auth-related files and summarize the patterns...",
  subagent_type: "Explore",    // Specialized agent type
  model: "sonnet",             // Model override
  run_in_background: true      // Non-blocking
}
```

### System Prompt Assembly
System prompts are built from multiple sources:
1. Base system prompt (identity, capabilities)
2. Tool descriptions (one per available tool)
3. Memory context (MEMORY.md + relevant topic files)
4. Project context (CLAUDE.md, .cursorrules)
5. Agent-specific context (persona files, skill refs)

### Streaming Pattern
All responses stream via events:
- `text_delta` — Incremental text
- `tool_use` — Tool invocation request
- `tool_result` — Tool execution result
- `message_stop` — Turn complete

## Forge OS Application

The SDK patterns map to our Tauri IPC layer:
- System prompt assembly → Agent boot sequence (PERSONA.md + BOOT.md + context)
- Tool use → Tauri commands (invoke from frontend, execute in Rust)
- Streaming → Tauri event emission (`emit_all("chat:stream", chunk)`)
- Agent spawning → Background Tauri commands with separate state

Key difference: Claude Code runs in a terminal process. Forge OS runs in a native desktop app. The SDK patterns are the same, but the transport layer (IPC vs stdout) differs.
