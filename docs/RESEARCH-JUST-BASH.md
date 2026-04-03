# Research: just-bash — Sandboxed Bash Interpreter for AI Agents

## Session Date: 2026-04-03
## Participants: Nyx (research session)
## Source: [vercel-labs/just-bash](https://github.com/vercel-labs/just-bash)

---

## Source Material

- **Author:** Vercel Labs (Malte + Claude)
- **Stack:** TypeScript, full recursive-descent bash parser + interpreter, in-memory virtual filesystem, 60+ command implementations
- **Core thesis:** A complete bash interpreter in TypeScript with composable filesystems, defense-in-depth security, and configurable execution limits — purpose-built as a sandboxed execution environment for AI agents.

---

## Architecture Overview

```
Input Script → Parser (lexer + parser + expansion-parser + compound-parser)
    → AST
    → Interpreter (expansion + arithmetic + conditionals + control-flow + redirections + pipeline)
    → ExecResult

Filesystem Layer:
    InMemoryFs | OverlayFs (copy-on-write) | ReadWriteFs | MountableFs (composable mounts)

Security Layer:
    DefenseInDepthBox (global monkey-patching) + Network AllowList + Prototype Pollution Prevention

Command Layer:
    60+ commands, lazy-loaded registry, custom command API
```

---

## Pattern 1: Lazy-Loading Command Registry

**What just-bash Does:**
```typescript
// Commands registered as name + lazy loader
{ name: "grep", load: () => import("./grep/grep.js").then(m => m.grep) }
```
- Commands not imported until first execution
- Cached in `Map<string, Command>` after first load
- Explicit static `import()` calls for bundler tree-shaking compatibility
- Loaded inside `DefenseInDepthBox.runTrustedAsync()` for safe module loading
- Organized by category: core (always), network (opt-in), Python (opt-in), JavaScript (opt-in)

**Forge OS Integration:**
- **Landing zone:** Phase 7, P7-C patch (CommandRegistry enhancement)
- **What we adopt:** The lazy-load pattern for command implementations. Our `CommandDef` struct registers metadata eagerly (slug, name, description, category, capabilities). The actual dispatch handler loads lazily on first invocation. This keeps the registry scan fast while deferring heavy imports.
- **Rust equivalent:** `CommandDef.handler: Option<Box<dyn Fn(...) -> ...>>` populated on first dispatch via `once_cell::sync::OnceCell`.

---

## Pattern 2: Configurable Execution Limits

**What just-bash Does:**
18 limits with conservative defaults:
- Call depth, command count, loop iterations, string length, array elements
- Glob operations, output size, file descriptors, substitution depth, brace expansion
- Per-runtime limits for AWK, SED, jq, SQLite, Python, JavaScript
- Exit code 126 signals limit exceeded
- Error messages identify which specific limit was hit

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1/8.2 (Mana budget system)
- **What we adopt:** Per-persona execution limit profiles. The grimoire should define not just mana budgets but hard limits: max tool calls per dispatch, max file reads, max output size. Different personas get different profiles — Wraith (red-team) gets higher limits for adversarial testing, Sable (brand voice) gets lower limits since copy review doesn't need deep tool chains.
- **Enhancement:** Limits feed into mana tracking — hitting a limit is a signal that the persona needs more mana or the task needs decomposition.

---

## Pattern 3: Per-Exec Isolation with Shared Filesystem

**What just-bash Does:**
Each `exec()` gets clean shell state (env vars, functions, cwd reset) but the **filesystem persists across calls**. This is the isolation model:
- State is ephemeral (fresh per call)
- Workspace is persistent (shared across calls)

```typescript
await bash.exec("echo hello")   // env: clean, fs: shared
await bash.exec("cat file.txt") // env: clean, fs: same as above
```

**Forge OS Integration:**
- **Landing zone:** Validates existing dispatch model
- **What this validates:** Our persona dispatch already follows this pattern — each agent call starts with a fresh context (kernel + goal ancestry + relevant findings) but shares the project workspace (vault, codebase, SQLite state). just-bash proves this is the right isolation boundary for agent tool use.

---

## Pattern 4: Command Allow-List

**What just-bash Does:**
```typescript
new Bash({ commands: ["echo", "cat", "grep"] })  // only these available
```
Constructor-level command restriction. Commands not in the list simply don't exist — no error, no "permission denied", just absent from the runtime.

**Forge OS Integration:**
- **Landing zone:** Phase 7, P7-C patch (tool availability gating)
- **What we adopt:** Per-persona command allow-lists derived from `CapabilityFamily` grants. When a persona is dispatched with `[ReadOnly]`, only read commands appear. With `[ReadOnly, WriteCode]`, write commands also appear. Commands outside the grant don't error — they don't exist for that dispatch.

---

## Pattern 5: Network Allow-List with Header Injection

**What just-bash Does:**
- Network disabled by default (curl doesn't exist without config)
- URL prefix matching with origin + path enforcement
- HTTP method restrictions (GET/HEAD only by default)
- **Header transforms injected at fetch boundary** — secrets never enter the sandbox
- Redirect protection: blocks redirects to non-allowed URLs
- Headers re-evaluated on redirect to prevent credential leakage

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1 (External capability family)
- **What we adopt:** When personas make external API calls (web search, service checks), the external capability family should enforce URL allow-lists and inject auth headers at the boundary. Secrets stay in the Rust backend — never exposed to agent context. Redirect protection prevents credential leakage via open redirects.

---

## Pattern 6: AST Transform Plugin Pipeline

**What just-bash Does:**
```typescript
const pipeline = new BashTransformPipeline()
    .use(new TeePlugin())           // capture per-command output
    .use(new CommandCollectorPlugin()) // extract command list

const result = pipeline.transform(script)
// result.ast, result.metadata (accumulated across plugins)
```

Parse → transform → serialize. Plugins chain with fluent `.use()` API. Metadata accumulates via null-prototype merge.

**Forge OS Integration:**
- **Landing zone:** Phase 7, Session 7.2 (Action Palette) / Phase 8, Session 8.2 (dispatch pipeline)
- **What we adopt:** The transform pipeline concept for action audit/intercept. Every dispatch goes through a pipeline: `validate_capabilities → inject_goal_ancestry → apply_mana_budget → log_echo → execute → capture_result`. Each stage is a plugin with a standard interface. The pipeline is the dispatch audit trail.

---

## Pattern 7: Composable Filesystem (MountableFs)

**What just-bash Does:**
4 filesystem implementations composable via mount points:
- `InMemoryFs` — pure in-memory
- `OverlayFs` — copy-on-write over real directories (reads from disk, writes stay in memory)
- `ReadWriteFs` — passthrough to real disk
- `MountableFs` — multiple FS types at different mount paths

Symlink defense: zero-extra-I/O detection (compare path segments after resolution). TOCTOU protection: `O_NOFOLLOW` flags, post-mkdir re-validation.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.3 (LightRAG / vault access)
- **What we adopt:** The composable mount concept for persona-scoped vault access. Different personas get different mount configurations: Tanaka sees `vault/security/` read-write + `vault/specs/` read-only. Mara sees `vault/ux/` read-write + `vault/design-system/` read-only. The vault IS the filesystem — mounts determine visibility.

---

## Pattern 8: Three-Tier Agent Instruction Files

**What just-bash Does:**
Three documentation tiers for three audiences:
1. `CLAUDE.md` (11.6KB) — project-level context for Claude Code developing the project
2. `AGENTS.md` (5KB) — rules for agents contributing to the codebase
3. `AGENTS.npm.md` (9.3KB) — published instructions for agents consuming the library

**Forge OS Integration:**
- **Landing zone:** Validates kernel tier architecture
- **What this validates:** Our three tiers (kernel = execution mind, persona = identity, dispatch prompt = per-task instructions) map to the same pattern. The insight: different consumers of the same system need different instruction documents. A persona dispatched for gate review needs different instructions than the same persona dispatched for a build task. The dispatch prompt is the consumer-facing tier.

---

*8 patterns mined. 4 Tier 1 (direct adoption), 4 Tier 2 (adapt). All fit existing sessions.*
