# Research: Block Goose — AI Agent Framework Architecture

## Session Date: 2026-04-03
## Participants: Nyx (research session)
## Source: [block/goose](https://github.com/block/goose)

---

## Source Material

- **Author:** Block (formerly Square)
- **Stack:** Rust (9 workspace crates) + Tokio + Axum + Electron desktop UI
- **Core thesis:** Single-agent framework with MCP-native extension system, ephemeral subagent delegation, and provider-agnostic LLM routing. One of the most complete MCP client implementations.

---

## Architecture Overview

```
User Interfaces (CLI / Electron / ACP client)
         |
    goose-server (REST/SSE) or goose-acp (JSON-RPC/stdio)
         |
    goose (core library)
    ├── agents/        -- Agent loop, extension manager, subagents
    ├── providers/     -- Provider trait + 20+ implementations
    ├── config/        -- Config system, permissions, declarative providers
    ├── context_mgmt/  -- Context window compaction
    ├── conversation/  -- Message types, history
    ├── session/       -- SQLite persistence, session manager
    ├── recipe/        -- YAML workflow definitions
    ├── prompts/       -- Jinja2 prompt templates
    ├── permission/    -- Tool permission system
    └── security/      -- Extension malware checks, env var filtering
```

9 crates: `goose` (core lib), `goose-cli`, `goose-server`, `goose-mcp` (built-in extensions), `goose-acp` (Agent Client Protocol), `goose-acp-macros`, `goose-sdk`, `goose-test`, `goose-test-support`.

---

## Pattern 1: Extension Type Registry with Tool Whitelist

**What Goose Does:**
Seven transport types for capabilities:

| Type | Transport | Description |
|---|---|---|
| `Stdio` | Child process stdin/stdout | External MCP server via command |
| `StreamableHttp` | HTTP/SSE | Remote MCP server |
| `Builtin` | In-process DuplexStream | Bundled MCP servers |
| `Platform` | Direct Rust | In-process tools with agent access |
| `Frontend` | Via UI proxy | Tools executed by Electron |
| `InlinePython` | uvx execution | Python as MCP server |
| `Sse` | Deprecated | Legacy SSE (config compat) |

Each `ExtensionConfig` has `available_tools: Vec<String>`. If empty, all tools exposed. If populated, only listed tools visible to LLM.

**Forge OS Integration:**
- **Landing zone:** Phase 7, P7-C patch (CommandRegistry enhancement)
- **What we adopt:** The `available_tools` whitelist pattern per extension. Our `CapabilityFamily` enum already scopes at the family level; this adds per-tool granularity within a family.
- **What we don't adopt:** The 7 transport types (we use Tauri commands + MCP bridge, not 7 distinct transports).

---

## Pattern 2: Built-in Extension Macro (DuplexStream)

**What Goose Does:**
```rust
macro_rules! builtin {
    ($name:ident, $server_ty:ty) => {{
        fn spawn(r: DuplexStream, w: DuplexStream) {
            spawn_and_serve(stringify!($name), <$server_ty>::new(), (r, w));
        }
        (stringify!($name), spawn as SpawnServerFn)
    }};
}

pub static BUILTIN_EXTENSIONS: Lazy<HashMap<&'static str, SpawnServerFn>> = Lazy::new(|| {
    HashMap::from([
        builtin!(autovisualiser, AutoVisualiserRouter),
        builtin!(memory, MemoryServer),
        builtin!(tutorial, TutorialServer),
    ])
});
```

Built-in servers communicate over in-process `DuplexStream` — no subprocess overhead. Each implements `rmcp::ServerHandler`.

**Forge OS Integration:**
- **Landing zone:** Phase 7, P7-C patch
- **What we adopt:** The macro-based registration pattern for in-process capabilities. Our persona-specific tools (vault read, echo query, sigil scan) should be registered this way — no MCP server spawn needed for built-in operations.
- **What we don't adopt:** The `rmcp` MCP server trait (we use Tauri commands directly).

---

## Pattern 3: ToolConfirmationRouter (Oneshot Channels)

**What Goose Does:**
Async permission gating via oneshot channels:
- `HashMap<String, oneshot::Sender<PermissionConfirmation>>` with automatic stale-entry cleanup
- When a dangerous tool is about to execute, the router sends a confirmation request and awaits the oneshot response
- Frontend (Electron) sends the user's decision back through the channel

**Forge OS Integration:**
- **Landing zone:** Phase 7, Session 7.2 (Action Palette)
- **What we adopt:** The oneshot channel pattern for Tauri IPC. Action Palette dispatches that require operator approval will use this exact mechanism — Rust backend sends confirmation request, frontend renders approval UI, user response flows back through the channel.
- **Enhancement:** We add `CapabilityFamily` to the confirmation request so the frontend can show which capability tier is being requested, not just the tool name.

---

## Pattern 4: SharedProvider Double-Arc

**What Goose Does:**
```rust
pub type SharedProvider = Arc<Mutex<Option<Arc<dyn Provider>>>>;
```
Outer `Arc<Mutex<>>` for concurrent access. Inner `Option<Arc<dyn Provider>>` for hot-swapping providers without restarting the agent.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1
- **What we adopt:** The double-Arc pattern for multi-model routing. Different personas can be routed to different providers, and the provider can be swapped mid-session (e.g., rate limit on Claude → fall back to GPT-4) without restarting the dispatch pipeline.

---

## Pattern 5: Provider Factory Registry

**What Goose Does:**
Type-erased registry using `Arc<dyn Fn(ModelConfig, Vec<ExtensionConfig>) -> BoxFuture<Result<Arc<dyn Provider>>>>`. Supports both compiled-in (`register::<F>()`) and declarative JSON providers loaded from `~/.config/goose/custom_providers/`.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1 (Skills Marketplace)
- **What we adopt:** Dual registration — hardcoded core providers + user-defined JSON providers. The skills marketplace can use the same pattern for capability registration.

---

## Pattern 6: Subagent Context Isolation

**What Goose Does:**
Each subagent gets a fresh `Agent` with its own provider, extensions, conversation, and max_turns. No shared context pollution. Parent receives a summary, not the full conversation.

`SubagentRunParams` includes: `AgentConfig`, `Recipe`, `TaskConfig` (provider, extensions, max_turns), cancellation token.

**Forge OS Integration:**
- **Landing zone:** Validates existing dispatch model (Phase 8, Session 8.2)
- **What we adopt:** The isolation principle — persona dispatches are fully isolated. The summary-return pattern (subagent returns concise result, not full history) matches our existing approach.
- **What we don't adopt:** Ephemeral subagents (Goose's subagents are fire-and-forget task runners). Our personas are persistent entities with journals, introspection, and relationships.

---

## Pattern 7: Recipe System (YAML Workflows)

**What Goose Does:**
YAML-based workflow definitions with:
- Typed parameters (string, number, boolean, date, file, select) with Jinja2 substitution
- Sub-recipes (reusable invocable components)
- Per-recipe extension scoping
- Retry config with shell-based success checks
- Response schemas via `final_output_tool`

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1 (Ritual definitions)
- **What we adopt:** The recipe parameter typing system (our ritual specs currently use YAML frontmatter without typed parameters). Adding typed inputs (especially `select` for enum choices) to ritual specs.
- **What we don't adopt:** Jinja2 templating (we use markdown with YAML frontmatter, not template engines).

---

## Pattern 8: Large Response Handler

**What Goose Does:**
Auto-detects when tool responses exceed context budget and summarizes them before injection into the conversation.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.2 (ContextEngine enhancement)
- **What we adopt:** Overflow guard on tool results. When a Tauri command returns data exceeding a configurable threshold (e.g., a full file read or large grep result), auto-summarize before injecting into agent context. Mana cost: 0 for the guard itself, but the summarization call costs mana.

---

## Pattern 9: Fast Model Fallback

**What Goose Does:**
`Provider::complete_fast()` tries a faster/cheaper model first (e.g., for session naming), falls back to the primary model on failure.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1/8.2 (Mana budget optimization)
- **What we adopt:** Lightweight tasks (echo filing, sigil regeneration, session naming) route to fast models by default. Falls back to primary if fast model fails. This is a mana optimization — free operations shouldn't consume full-model tokens.

---

## Key Differences from Forge OS

| Aspect | Goose | Forge OS |
|--------|-------|----------|
| Agent model | Single agent + ephemeral subagents | 10 persistent personas + 24 kernels |
| Personality | Recipe system prompt (ephemeral) | Kernel + introspection + journal (persistent) |
| Cross-agent comms | None (fire-and-forget) | Swarm mailbox + event bus |
| UI | Electron | Tauri v2 |
| Extension model | MCP-native (7 transports) | Tauri commands + MCP bridge |
| Memory | Separate MCP server | KAIROS (integrated) |
| Governance | None | 46 rules + 14 FMs + Build Triad |

---

*9 patterns mined. 4 Tier 1 (direct adoption), 5 Tier 2 (adapt). All fit existing sessions.*
