# Claude Code Source Deep Dive v2 — Core Systems

> **Second extraction, part 2.** Internal systems: prompt construction, compaction, memory, agent dispatch, permissions, hooks, query engine, skills.
> **Purpose:** Implementation reference for Forge OS Tauri app. These are the internals that make Claude Code work.

---

## A. System Prompt Construction

The system prompt is a multi-layered, **cache-aware** assembly. A hard boundary marker splits globally-cacheable content from per-session dynamic content.

### Assembly Order

**Static sections (cached globally):**
1. Identity + output style framing
2. System behaviors (tool results, hooks, compression, context limits)
3. Software engineering task guidance
4. Reversibility/blast-radius decision framework
5. Tool preferences (dedicated tools over Bash)
6. Formatting rules (markdown, monospace)
7. Output efficiency rules
8. `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` marker

**Dynamic sections (per-session, registry-managed):**
- `session_guidance` — Agent tool, skill discovery, verification agent
- `memory` — auto-memory prompt (loaded from memory directory)
- `env_info_simple` — CWD, git status, platform, date, model name
- `language` — language preference
- `output_style` — custom output style
- `mcp_instructions` — MCP server instructions (or delta mode)
- `scratchpad` — scratchpad directory instructions
- `brief` — KAIROS briefing section (only in assistant mode)

### Cache Architecture
- `systemPromptSection()` — memoized, computed once, cached until /clear or /compact
- `DANGEROUS_uncachedSystemPromptSection()` — recomputes every turn, breaks cache when value changes
- Everything before `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` gets `cacheScope: 'global'`

### Prompt Priority (buildEffectiveSystemPrompt)
1. `overrideSystemPrompt` (loop mode) — **replaces everything**
2. Coordinator mode — coordinator-specific prompt
3. Agent system prompt — replaces default (or appends in KAIROS mode)
4. Custom system prompt (`--system-prompt`)
5. Default assembled prompt

### Key Constants
- `FRONTIER_MODEL_NAME = 'Claude Opus 4.6'`
- Model IDs: `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`
- Conversation "has unlimited context through automatic summarization"

### Forge OS Adoption
- Section-based caching with dynamic boundary marker — replicate for persona prompts
- The `systemPromptSection()` memoization pattern prevents redundant recomputation
- Dynamic section registry allows runtime injection of persona-specific context

---

## B. Compaction Engine

Forked-agent-based context window management. Summarizes older messages while preserving recent context.

### Two-Phase Approach
1. **Analysis phase** in `<analysis>` tags (scratchpad, stripped from final output)
2. **Summary phase** in `<summary>` tags with **9 structured sections**

### The 9 Summary Sections
1. Primary Request and Intent
2. Key Technical Concepts
3. Files and Code Sections (with full code snippets)
4. Errors and Fixes
5. Problem Solving
6. **All user messages** (listed verbatim — critical for continuity)
7. Pending Tasks
8. Current Work (precise description with file names and snippets)
9. Optional Next Step (with direct quotes to prevent task drift)

### Three Compaction Variants
- `BASE_COMPACT_PROMPT` — summarizes entire conversation
- `PARTIAL_COMPACT_PROMPT` — summarizes only recent messages (earlier retained)
- `PARTIAL_COMPACT_UP_TO_PROMPT` — summarizes prefix for continuing session

### Key Constants
```
POST_COMPACT_MAX_FILES_TO_RESTORE = 5
POST_COMPACT_TOKEN_BUDGET = 50,000 tokens
POST_COMPACT_MAX_TOKENS_PER_FILE = 5,000
POST_COMPACT_MAX_TOKENS_PER_SKILL = 5,000
POST_COMPACT_SKILLS_TOKEN_BUDGET = 25,000
Max 2 streaming retries on compaction failure
```

### Post-Compaction Message
"This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion."

With `suppressFollowUpQuestions`: "Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap."

### Forge OS Adoption
- The 9-section summary format maps to our SESSION-HANDOFF-TEMPLATE
- Analysis-then-summary two-phase approach improves summary quality
- File restoration budget pattern for post-compact context recovery
- The "all user messages verbatim" rule prevents losing operator intent during compaction

---

## C. Memory Extraction System

Background forked agent that auto-extracts durable memories from conversation after each query loop.

### Memory Taxonomy (4 Types)
1. **user** — role, goals, preferences, knowledge
2. **feedback** — corrections AND confirmations (both negative and positive signals)
3. **project** — ongoing work, goals, incidents not derivable from code/git
4. **reference** — pointers to external systems

### What NOT to Save
- Code patterns derivable from grep/git
- Architecture discoverable from file structure
- Git history facts
- Current file contents
- Ephemeral task details

### Memory File Format
```markdown
---
name: descriptive-name
description: one-line description
type: user|feedback|project|reference
---
Content body here
```

### MEMORY.md Structure
Index file. One-line entries. Max 200 lines / 25KB.
`- [Title](file.md) — one-line hook`

### Extraction Agent Constraints
- 5 turns max
- Tools: Read, Grep, Glob, read-only Bash, Edit/Write **within memory dir only**
- Pre-injected with existing memory manifest (saves a turn)
- Efficient strategy: turn 1 = parallel reads, turn 2 = parallel writes

### KAIROS Daily Log Mode
In assistant mode: memories go to `<autoMemPath>/logs/YYYY/MM/YYYY-MM-DD.md` as timestamped bullets. Nightly `/dream` distills into topic files + MEMORY.md.

### Forge OS Adoption
- The 4-type taxonomy is already our memory model
- Daily-log mode for multi-persona environments prevents conflicts
- The 5-turn limit and pre-injection of existing manifest are efficiency patterns we should adopt

---

## D. Agent Dispatch — Forked Agent System

Creates isolated clones sharing the parent's prompt cache. Used for memory extraction, compaction, and all subagent work.

### `runForkedAgent()` Flow
1. Takes `CacheSafeParams` (system prompt, context, tools, messages) — MUST match parent for cache hits
2. Creates isolated `ToolUseContext` via `createSubagentContext()`:
   - `readFileState`: cloned from parent
   - `abortController`: new child linked to parent
   - All mutation callbacks: no-op by default
   - Fresh collections for memory triggers, tool decisions
   - New `queryTracking` chain with incremented depth
3. Runs query loop with isolated context
4. Tracks usage metrics including cache hit rate

### AgentTool Key Details
- Schema: description (3-5 words), prompt, subagent_type, model override, run_in_background, isolation (worktree)
- Auto-background after 120 seconds
- MCP tools always allowed for agents
- Agent result includes: agentId, agentType, content, totalToolUseCount, totalDurationMs, totalTokens

### Forge OS Adoption
- `CacheSafeParams` pattern for cache-sharing forks is critical for multi-persona efficiency
- `createSubagentContext()` isolation with explicit opt-in sharing is the right design
- Auto-background after timeout prevents blocked dispatches

---

## E. Skills/Plugin System

Markdown-based skills with frontmatter metadata, loaded from multiple directories with priority.

### Skill Sources (priority order)
1. Policy settings (managed `.claude/skills/`)
2. User settings (`~/.claude/skills/`)
3. Project settings (`.claude/skills/`)
4. Plugins
5. Bundled
6. MCP-registered

### Skill File Format
```yaml
---
name: skill-name
description: what it does
whenToUse: trigger conditions
tools: [allowed, tools]
agent: agent-type
model: model-override
---
Prompt content with $ARGUMENTS substitution
```

### Skill Execution
1. Get skill content with `$ARGUMENTS` replaced
2. Parse allowed tools from frontmatter
3. Create modified `getAppState` with extra tool permissions
4. Resolve agent type (defaults to `general-purpose`)
5. Create prompt messages and run via forked agent

### Forge OS Adoption
Our `.claude/commands/` and `.claude/agents/` already follow this exact pattern. The multi-source loading with priority and the `$ARGUMENTS` substitution are directly how our system works.

---

## F. Permission System

### Permission Rules
Format: `"ToolName"` or `"ToolName(content)"` with escaped parentheses.

### Auto-Mode Safe Tools (bypass classifier)
Read, Grep, Glob, LSP, ToolSearch, ListMcpResources, TodoWrite, all Task* tools, plan mode tools, SendMessage, Sleep, TeamCreate/Delete, Workflow

### Dangerous Files/Directories
- **Files:** `.gitconfig`, `.bashrc`, `.zshrc`, `.mcp.json`, `.claude.json`
- **Directories:** `.git`, `.vscode`, `.idea`, `.claude`
- Path traversal detection, null byte rejection, case normalization on case-insensitive filesystems

### Forge OS Adoption
- The dangerous files/directories lists inform our security model
- Auto-mode safe tool classification maps to our agent permission tiers
- Skill-scoped permission narrowing is relevant for per-persona tool access

---

## G. Hook System Events

Full lifecycle event list:
- `PreToolUse`, `PostToolUse`, `PostToolUseFailure`
- `PermissionDenied`, `PermissionRequest`
- `PreCompact`, `PostCompact`
- `SessionStart`, `SessionEnd`
- `Stop`, `StopFailure`
- `SubagentStart`, `SubagentStop`
- `TeammateIdle`
- `TaskCreated`, `TaskCompleted`
- `ConfigChange`, `CwdChanged`, `FileChanged`
- `InstructionsLoaded`, `UserPromptSubmit`
- `Notification`, `Elicitation`, `ElicitationResult`
- `StatusLine`, `FileSuggestion`
- `Setup`

Hook timeout: 10 minutes. Session end hook timeout: 1.5 seconds.

---

## H. Background Housekeeping

### Startup Tasks
- `initMagicDocs()`
- `initSkillImprovement()`
- `initExtractMemories()`
- `initAutoDream()`
- Auto-update marketplace plugins

### Deferred (10 min after start, only when idle)
- Old message file cleanup
- Old version cleanup

### Forge OS Adoption
Deferred-when-idle pattern prevents interfering with active work. The 10-minute delay and idle-check before running slow operations is good UX.

---

## I. Fast Mode

**Not a different model.** Fast mode routes to Opus 4.6 with priority service level. Internally called "penguin mode."

- Cooldown states: `active` or `cooldown` (with `resetAt` timestamp)
- Cooldown reasons: `rate_limit` or `overloaded`
- Automatic recovery after cooldown expires
- Rate limit triggers automatic cooldown

---

## J. Compaction Summary Format — For Our Handoff System

The 9-section compaction summary is the most directly adoptable pattern:

```
1. Primary Request and Intent
   - What the user originally asked for
   - The overall goal

2. Key Technical Concepts
   - Architecture, patterns, constraints discovered

3. Files and Code Sections
   - Actual code snippets, not descriptions
   - File paths with line numbers

4. Errors and Fixes
   - What went wrong and what fixed it

5. Problem Solving
   - Approaches tried, decisions made

6. All User Messages
   - Verbatim user intent (prevents drift)

7. Pending Tasks
   - What's still TODO

8. Current Work
   - Precise state with file names and snippets

9. Optional Next Step
   - With direct quotes to prevent task drift
```

This should inform our SESSION-HANDOFF-TEMPLATE and the auto-generated BOOT.md system.

---

*SOURCE-DEEP-DIVE-V2-SYSTEMS.md — Created 2026-03-31*
*Source: Claude Code src.zip extraction (2026-03-31)*
