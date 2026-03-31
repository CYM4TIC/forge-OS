# Desktop App Patterns — Research Reference

> **Source:** OpenCode/Crush (Charmbracelet), OpenClaude, Claw Dev. Researched 2026-03-31.
> **Purpose:** Patterns to adopt when building the Tauri desktop app (Phase 3+). Not yet implemented — this is the reference doc agents read when the time comes.

---

## 1. SQLite Session State (Priority: HIGH)

**Source:** OpenCode — all sessions, conversations, and state persisted in local SQLite.

**Problem it solves:** BOOT.md has become monolithic. It started as a simple session tracker and now carries: YAML machine state, current position narrative, 30+ session log entries, standing orders, pre-build gate status, open risks (27 items), build state (50+ lines), vault file references, and prior handoff details. Reading it costs thousands of tokens. Writing it is error-prone. Searching it is linear scan.

**Pattern:**
- SQLite database with tables: `sessions`, `batches`, `findings`, `risks`, `handoffs`, `agent_dispatches`
- Each session creates a row, not a paragraph
- Findings are queryable (by persona, severity, status, batch)
- Risks are a living table with status transitions, not a growing list
- Build state is a single row updated in place, not a narrative rewritten each session
- BOOT.md becomes a **generated view** — a human-readable report produced FROM SQLite, not the source of truth itself

**What this replaces:**
| Current (flat file) | Future (SQLite) |
|---|---|
| BOOT.md YAML block | `build_state` table (single row) |
| Session log entries | `sessions` table (one row per session) |
| Open risks list | `risks` table (status: open/resolved/deferred) |
| Findings scattered across BOOT | `findings` table (persona, severity, batch, status) |
| Standing orders in prose | `config` table (key-value) |
| Prior handoff narrative | `handoffs` table (structured fields) |

**Migration path:** BOOT.md continues to work during Claude Code sessions (no SQLite access). The Tauri app introduces SQLite as the persistence layer. A `generate-boot` command produces BOOT.md from SQLite for compatibility with plain Claude Code sessions.

**Tauri implementation notes:**
- Use `tauri-plugin-sql` with SQLite backend
- Schema lives in `apps/desktop/src-tauri/migrations/`
- Rust commands expose read/write to the React frontend
- Agent dispatch history becomes queryable — "show me all Wraith findings from the last 5 batches"

---

## 2. Auto-Compact / Context Summarization (Priority: HIGH)

**Source:** OpenCode — automatically summarizes conversation at 95% context window, creates new session with the summary.

**Problem it solves:** The manual "stop at 70%, write BOOT.md handoff" rule works but is error-prone. Nyx sometimes hits 80%+ before noticing. The handoff quality depends on how much context remains for writing it. And the summarization is manual — Nyx decides what to include, which means FM-6 (report-reality divergence) applies.

**Pattern:**
- Monitor token usage continuously (not just at batch boundaries)
- At configurable threshold (default 85%), trigger automatic summarization
- Summarization extracts: current batch state, open findings, files modified, next steps, risks
- New session starts with the summary pre-loaded as context
- The summary is also persisted to SQLite (pattern #1) for queryability

**What this replaces:**
| Current (manual) | Future (auto-compact) |
|---|---|
| "Context > 70% → stop" rule | Automatic detection + graceful handoff |
| Manual BOOT.md narrative | Structured summary auto-generated |
| Risk of forgetting to handoff | Impossible to forget — it's automatic |
| Quality depends on remaining context | Summarization runs while context is still healthy |

**Tauri implementation notes:**
- Token counter in the UI (already planned — Tauri Phase 1 has status bar)
- Threshold configurable per project in PROJECT.json
- Summary template follows SESSION-HANDOFF-TEMPLATE.md structure
- Auto-compact produces both a SQLite record and a markdown artifact

---

## 3. Persistent Server / Session Survival (Priority: HIGH)

**Source:** OpenCode — background server architecture. Sessions survive terminal disconnects, SSH drops, machine sleep. Reconnect and pick up.

**Problem it solves:** Claude Code sessions die with the terminal. If the window closes mid-build, the session is lost. BOOT.md handoff is the only continuity mechanism, and it only works if the handoff was written before the crash.

**Pattern:**
- Long-running background process manages agent sessions
- Frontend (TUI or GUI) connects/disconnects without killing the session
- Session state is in SQLite (pattern #1), not in-memory
- Crash recovery: on restart, read last session state from SQLite, offer to resume

**Tauri implementation notes:**
- Tauri's Rust backend is already a persistent process
- Agent sessions managed in Rust, React frontend is the view layer
- `tauri-plugin-process` for lifecycle management
- Sidecar process for agent execution if needed

---

## 4. Agent Model Tiering (Priority: MEDIUM)

**Source:** OpenClaude quality matrix + Claw Dev proxy pattern.

**Problem it solves:** All Forge OS agents currently assume Claude Opus. Some agents (Scout gathering schema info, Sentinel checking routes, Beacon monitoring logs) don't need frontier-model capability. Running them on cheaper/faster models would reduce cost and increase speed.

**Pattern:**
- Each agent specifies a `model_tier` in its definition:
  - `frontier` — Claude Opus only. For: Nyx (build), Pierce (conformance), Wraith (adversarial)
  - `capable` — Any strong model (Sonnet, GPT-4o, Gemini Pro). For: Scout, Sentinel, Meridian, most sub-agents
  - `lightweight` — Local or cheap model OK. For: Beacon (log monitoring), Scribe (documentation), Changelog
- The dispatch system routes agents to the appropriate model based on tier
- Model selection is configurable per project (some projects may want all-Opus)

**What this enables:**
- 3-5x cost reduction on routine agent dispatches
- Parallel agent execution on different models (Scout on Sonnet while Nyx builds on Opus)
- Local inference for privacy-sensitive projects (via Ollama proxy)

**Tauri implementation notes:**
- Provider abstraction already exists (P1-G/H/I)
- Add `model_tier` field to agent YAML frontmatter
- Dispatch router reads tier and selects provider accordingly
- UI shows which model each agent is using

---

## 5. LSP Integration (Priority: MEDIUM)

**Source:** OpenCode — Language Server Protocol diagnostics exposed as an AI tool.

**Problem it solves:** Agents currently grep for errors and read files to understand code. An LSP connection provides real-time diagnostics, type checking, go-to-definition, and code intelligence without manual file reading.

**Pattern:**
- LSP client runs alongside the agent session
- Diagnostics (errors, warnings) are available as a tool: `get_diagnostics(file)`
- Type information available: `get_type_at(file, line, col)`
- Go-to-definition: `go_to_definition(file, line, col)`
- Agents can ask "are there any type errors in the files I just modified?" instead of running the build

**What this enables:**
- Pierce can check type conformance without running `tsc`
- Nyx gets immediate feedback on syntax/type errors after writing
- Mara can verify that component props match their TypeScript interfaces
- Faster feedback loops — no need to wait for a full build

**Tauri implementation notes:**
- `tower-lsp` crate for Rust LSP client
- Connect to project's language server (TypeScript via `typescript-language-server`, Rust via `rust-analyzer`)
- Expose diagnostics as a Tauri command
- Add as a tool in agent definitions: `lsp_diagnostics`, `lsp_type_at`, `lsp_definition`

---

## 6. Local Anthropic-Compatible Proxy (Priority: LOW)

**Source:** Claw Dev — local HTTP proxy that accepts Anthropic API format and translates to Gemini/Groq/Ollama.

**Problem it solves:** Some users want local inference for privacy, cost, or offline use. Writing agents against multiple API formats is wasteful.

**Pattern:**
- Local proxy server speaks Anthropic `/v1/messages` format
- Translates to target provider's native API (OpenAI, Gemini, Ollama)
- Full tool call lifecycle translation (tool_use → function_call → tool_result)
- Streaming SSE translation
- Agents are written once for the Anthropic format — proxy handles the rest

**Tauri implementation notes:**
- Optional sidecar process (not needed for Claude-native users)
- Could be a Rust-native proxy inside the Tauri backend
- Configured per-project or globally
- Model spoofing: agents always see Claude model IDs

---

## Summary: Implementation Priority

| Pattern | Priority | Phase | Replaces |
|---|---|---|---|
| SQLite session state | HIGH | 3 (Tauri core) | Monolithic BOOT.md |
| Auto-compact | HIGH | 3 (Tauri core) | Manual 70% rule |
| Persistent sessions | HIGH | 3 (Tauri core) | Session-dies-with-terminal |
| Agent model tiering | MEDIUM | 4+ (provider layer) | All-Opus assumption |
| LSP integration | MEDIUM | 4+ (tool layer) | Manual grep/build for errors |
| Local proxy | LOW | 5+ (optional) | Claude-only requirement |

---

*DESKTOP-APP-PATTERNS.md — Created 2026-03-31*
*Source: OpenCode/Crush, OpenClaude, Claw Dev research.*
*Load this doc when starting Tauri Phase 3+ planning.*
