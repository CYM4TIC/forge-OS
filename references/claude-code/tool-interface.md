# Tool Interface Contract

> How Claude Code defines, validates, and executes tools. The pattern Forge OS agents should follow.

## Core Type

```typescript
Tool<Input, Output, Progress> = {
  // Schema & Validation
  inputSchema: ZodSchema<Input>
  outputSchema: ZodSchema<Output>

  // Execution
  call(args, context, canUseTool, parentMessage, onProgress?): Promise<ToolResult<Output>>
  run?(input, context): AsyncGenerator<ToolOutput>  // Generator-based for streaming

  // Safety
  checkPermissions(input, context): Promise<PermissionResult>
  isConcurrencySafe(input): boolean   // Can this run in parallel with other tools?
  isReadOnly(input): boolean          // Does this modify state?
  isDestructive?(input): boolean      // Is this hard to reverse?

  // Rendering
  description(input, options): Promise<string>  // Human-readable description
  renderToolResultMessage?(output, progressMessages, options): ReactNode

  // Identity
  name: string
  userFacingName(input): string
  prompt: string  // How the tool is described to the model
}
```

## Context Object

Every tool receives `ToolUseContext` — a mega-object containing all infrastructure:

```typescript
ToolUseContext = {
  options: { commands, tools, debug, verbose, mainLoopModel }
  abortController: AbortController
  getAppState(): AppState
  setAppState(updater): void
  appendSystemMessage?(msg): void
  canUseTool: CanUseToolFn
  // ... hooks, memory triggers, content replacement state
}
```

**Why mega-object:** Tools need state, notifications, hooks, and infrastructure. Passing 50 parameters per tool is worse than one structured context.

## Tool Orchestration

Tools are partitioned into batches based on safety:

```
Model requests: [Read A, Read B, Read C, Write D, Read E]
                 ├── Batch 1: [A, B, C] → concurrent (all read-only)
                 ├── Batch 2: [D] → serial (write)
                 └── Batch 3: [E] → concurrent (read-only)
```

- Max 10 concurrent tools
- Write tools return `contextModifier` callbacks, applied AFTER batch completes
- Prevents interleaved state mutation

## Forge OS Application

Our Tauri commands already follow a similar pattern:
- Input validated by Rust types (equivalent to Zod schemas)
- Execution returns via Tauri events (equivalent to generators)
- Permission checks happen in Rust before execution

What to adopt:
1. **Concurrency partitioning** — When agents dispatch multiple tools, partition by read/write
2. **Context injection** — Single AppState passed to all agent operations
3. **Generator streaming** — Already using Tauri events, but formalize the event schema
4. **Permission results** — `allow | deny | ask` trichotomy with audit trail
