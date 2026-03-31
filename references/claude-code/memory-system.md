# Memory System — Persistent Knowledge

> How Claude Code persists knowledge across sessions. Validates our vault approach.

## Structure

```
~/.claude/projects/{slug}/memory/
├── MEMORY.md          # Index (max 200 lines, 25KB)
├── user_*.md          # User preferences, role, knowledge
├── feedback_*.md      # Corrections and confirmations
├── project_*.md       # Project-specific knowledge
└── reference_*.md     # External system pointers
```

## Index Constraints

```typescript
ENTRYPOINT_NAME = 'MEMORY.md'
MAX_ENTRYPOINT_LINES = 200
MAX_ENTRYPOINT_BYTES = 25_000
```

## Truncation Strategy

```typescript
function truncateEntrypointContent(raw) {
  // 1. Line-truncate first (natural boundary)
  // 2. Byte-truncate at last newline if over 25KB
  // 3. Append warning naming which cap fired
}
```

**Why dual truncation:** Long-line indexes (URLs, base64) slip past line cap. Byte cap catches these.

## Memory Types

| Type | When to Save | What to Save |
|------|-------------|--------------|
| user | Learn about user's role/prefs | Role, expertise, collaboration style |
| feedback | User corrects or confirms approach | Rule + Why + How to apply |
| project | Learn about ongoing work/goals | Fact + Why + How to apply |
| reference | Discover external system locations | Pointer + context for when to use |

## Loading

- MEMORY.md loaded at session start (system prompt section)
- Topic files loaded on demand (model reads them via FileRead)
- Content attached as user context block
- Async scanning (`logMemoryDirectoryUsage()`) — doesn't block startup

## Forge OS Comparison

| Claude Code memdir | Forge OS Vault |
|--------------------|----------------|
| `~/.claude/projects/{slug}/memory/` | Per-project vault directory |
| MEMORY.md (200 lines) | STARTUP.md + BOOT.md |
| Topic files | Persona files, build learnings, decisions |
| 4 memory types | User, feedback, project, reference (same!) |
| Auto-loaded on session start | Auto-loaded via CLAUDE.md |

**Key insight:** Our vault memory system is a superset of Claude Code's memdir. We have the same index + topic pattern, plus structured persona memory, build state tracking, and cross-persona knowledge graphs. The memdir validates our approach — we're not over-engineering, Anthropic converged on the same pattern independently.

What to adopt:
1. **Dual truncation** — Apply to our MEMORY.md / STARTUP.md
2. **Async scanning** — Don't block session start on memory loading
3. **Memory type discipline** — Our 4 types match exactly, keep them
4. **Warning on truncation** — Tell the model when memory was cut
