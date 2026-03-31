# Skill System — Bundled + Dynamic Loading

> How Claude Code handles slash commands and skills. Pattern for Forge OS commands.

## Skill Definition

```typescript
type BundledSkillDefinition = {
  name: string
  description: string
  aliases?: string[]
  allowedTools?: string[]
  model?: string                // Model override
  context?: 'inline' | 'fork'  // Execution isolation
  agent?: string                // Custom agent type
  files?: Record<string, string>  // Reference files (extracted to disk on demand)

  getPromptForCommand(args: string, context: ToolUseContext): Promise<ContentBlockParam[]>
}
```

## Three Skill Sources

1. **Bundled** — Compiled into binary. `bundledSkills.ts` registers at startup.
2. **Disk-based** — `~/.claude/skills/` directory. Loaded at runtime.
3. **MCP-based** — Via MCP server tool exposure.

## Execution Flow

```
User types "/commit" →
  1. Parse command name
  2. Find matching skill (bundled → disk → MCP)
  3. Call skill.getPromptForCommand(args, context)
  4. Returns ContentBlockParam[] (markdown, code, images)
  5. Inject as assistant prompt → model sees skill context + user goal
  6. Model executes using available tools
```

## Lazy Extraction Pattern

Skills with `files:` don't extract reference files until first invocation:

```typescript
// First call: extract files to temp dir (memoized promise)
// Concurrent calls: await the SAME promise (no race condition)
// Security: resolveSkillFilePath() validates no ".." escapes
// Permissions: O_NOFOLLOW | O_EXCL on extracted files
```

**Why lazy:** Startup cost of extracting 50+ skill file sets would be noticeable. Most skills are never invoked in a given session.

## Forge OS Application

Our slash commands (30 in `.claude/commands/`) follow a similar pattern:
- Each command has a markdown file with frontmatter + prompt
- Commands dispatch to agents (like skills dispatching to tools)

What to adopt from Claude Code:
1. **`getPromptForCommand()` interface** — Clean separation of command parsing and execution
2. **Three sources** — We should support bundled (shipped with Forge) + project-level + user-level
3. **Lazy loading** — Don't parse all 30 commands on startup, load on demand
4. **Reference file extraction** — Skills can ship with example files, templates, etc.
5. **Model override per skill** — Some skills need opus, others work fine with haiku
