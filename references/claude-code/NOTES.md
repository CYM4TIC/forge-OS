# Claude Code — Architecture Reference

> Extracted from Claude Code source (src.zip, 1,902 files). The reference implementation for AI-assisted development tools.

## Why This Matters for Forge OS

Claude Code and Forge OS solve the same category of problem: an AI agent that reads, writes, and orchestrates code. Claude Code does it in a terminal. Forge does it in a spatial desktop app. The underlying patterns are the same — tool dispatch, agent isolation, permission enforcement, state management, memory persistence.

## Architecture Overview

- **Entry:** `src/entrypoints/cli.tsx` — Minimalist bootstrap, dynamic imports, feature gates for DCE
- **Main loop:** `src/screens/REPL.tsx` (~5,000 lines) — React/Ink terminal UI, message rendering, tool execution
- **Query engine:** `src/query.ts` — Message flow: prompt → API → tool execution → loop. Handles token limits, compaction, streaming
- **Tools:** `src/tools/` — 20+ built-in tools, each a directory with implementation + prompt + UI + permissions
- **Agents:** `src/tools/AgentTool/` — Subagent spawning with 5 execution modes (sync/async/fork/teammate/remote)
- **Coordinator:** `src/coordinator/` — Multi-agent dispatch: research (parallel) → synthesis → implementation → verification
- **Skills:** `src/skills/` — Bundled + disk-based + MCP. Lazy extraction. `getPromptForCommand()` interface.
- **State:** `src/state/` — External Zustand-like store + `useSyncExternalStore` bridge to React
- **Memory:** `src/memdir/` — MEMORY.md index (200 lines, 25KB cap) + topic files
- **Permissions:** `src/utils/permissions/` — Mode + rules + hooks + classifier + denial tracking
- **Bridge:** `src/bridge/` — Remote session management (poll-based, JWT auth, multi-session)

## Key Design Decisions

| Decision | Rationale | Forge OS Equivalent |
|----------|-----------|---------------------|
| Generator-based streaming (`AsyncGenerator<Event>`) | Memory-efficient, progressive output, state mutations on yield boundaries | Tauri event streaming (already using) |
| External store (non-React state) | CLI/SDK/background agents can update without React re-renders | Rust AppState emitted via Tauri events |
| Tool concurrency partitioning | Read-only tools run parallel (up to 10), writes serial | Agent dispatch pipeline already partitions |
| Context injection via mega-object (`ToolUseContext`) | Avoids parameter explosion, all infrastructure accessible | Tauri command context pattern |
| Lazy skill extraction with memoized promises | No startup cost, concurrent-safe | Load agents from disk on demand |
| Dual truncation (lines + bytes) for memory | Prevents index bloat while allowing detail files | Vault MEMORY.md pattern (already similar) |
| Feature gates for compile-time DCE | Single source tree for multiple builds | Engine-agnostic provider system |

## Forge OS Integration Points

1. **Tool interface** → See `tool-interface.md`
2. **Coordinator pattern** → See `coordinator-pattern.md`
3. **Skill system** → See `skill-system.md`
4. **State management** → See `state-management.md`
5. **Permission model** → See `permission-model.md`
6. **Memory system** → See `memory-system.md`

## File Count by Directory

| Directory | Files | Domain |
|-----------|-------|--------|
| components/ | 200+ | Terminal UI (Ink/React) |
| tools/ | 150+ | Tool implementations |
| services/ | 100+ | Core services (compact, tools, MCP) |
| bridge/ | 30+ | Remote session management |
| state/ | 20+ | State management |
| skills/ | 40+ | Skill system |
| commands/ | 30+ | Slash commands |
| memdir/ | 10+ | Memory directory |
| coordinator/ | 5+ | Multi-agent coordination |
