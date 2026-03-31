# Claude Code Source Deep Dive v2 — 2026-03-31

> **Second extraction.** Comprehensive analysis of new systems not in the P2-A extraction.
> **Purpose:** Patterns to adopt in Forge OS. Priority-ranked by impact on the persona/agent architecture.

---

## 1. KAIROS — Persistent Assistant Mode (Priority: CRITICAL)

**What it is:** Claude Code's daemon mode. Transforms from request-response CLI into an always-on autonomous assistant. Greek for "the right moment" — acts proactively when the moment is right, not just when prompted.

**Activation:** Feature flag `feature('KAIROS')` + `assistant: true` in settings + GrowthBook gate `tengu_kairos` + trusted directory.

**What changes when KAIROS is active:**
- Forces **brief mode** — `SendUserMessage` tool becomes primary output (structured messages, not raw text)
- Pre-seeds an **in-process team** so agents spawn without ceremony
- **Memory paradigm shift:** MEMORY.md live-index → **daily-log mode** — append-only date-named files (`logs/YYYY/MM/YYYY-MM-DD.md`). Nightly `/dream` consolidation distills logs into topic files + MEMORY.md
- **AutoDream disabled** — KAIROS uses its own disk-skill dream system
- Compaction writes **session transcript segments** for history
- Session history accessible via API (`/v1/sessions/{id}/events`)
- `claude assistant [sessionId]` runs as a pure **viewer client** — agent loop runs remotely, viewer streams events

**Forge OS adoption plan:**
- Each persona should run in KAIROS-like mode within the Tauri app
- **Daily-log memory model** is the killer pattern: each persona appends to date logs, dream consolidation runs nightly. Prevents merge conflicts in multi-persona environments.
- Brief/SendUserMessage as primary operator-facing output — operator sees proactive status updates, not raw tool output
- Pre-seeded team initialization — personas can spawn sub-agents without setup

---

## 2. SWARM / Teams — Multi-Agent Orchestration (Priority: CRITICAL)

**What it is:** Full multi-agent framework. A **team leader** spawns and coordinates **teammates** — each running as tmux pane, iTerm2 pane, or **in-process subagent**.

**Architecture:**
```
TeamFile (~/.claude/teams/{name}/config.json)
├── leadAgentId
├── teamAllowedPaths[]        ← paths all teammates can edit without asking
└── members[]
    ├── agentId, name, color
    ├── agentType, model, prompt
    ├── permissionMode, planModeRequired
    ├── worktreePath           ← git worktree for parallel edits
    ├── subscriptions[]        ← message topics to receive
    └── backendType            ← 'tmux' | 'iterm2' | 'in-process'
```

**Key subsystems:**
- **Mailbox** (`teammateMailbox.ts`) — file-based or in-memory message passing. Supports permission requests, idle notifications, shutdown, and direct messages.
- **Permission sync** (`permissionSync.ts`) — worker needs tool approval → sends `SwarmPermissionRequest` to leader → leader UI shows prompt → user approves/denies → response returns via mailbox. File locking prevents races.
- **In-process runner** (`inProcessRunner.ts`) — wraps `runAgent()` with `AsyncLocalStorage` context isolation, progress tracking, plan mode approval, and cleanup. Workers share the leader process but get isolated contexts.
- **Git worktrees** — each teammate gets its own worktree for parallel file edits without conflicts.
- **Color system** — round-robin color assignment from `AGENT_COLORS`. Colors appear in UI next to permission prompts and messages.
- **Reconnection** (`reconnection.ts`) — resumed sessions re-read team context from transcript and re-initialize.

**Forge OS adoption plan:**
- **TeamFile = persona manifest** — each persona gets agentId, name, color, permission mode
- **Mailbox = inter-persona communication** — replace TEAM-COMMS.md flat file with real message bus
- **Permission sync = operator approval flow** — when Nyx or Wraith needs destructive actions, Alex approves via leader UI
- **In-process runners = lightweight persona dispatch** — no separate process per persona
- **Git worktrees = parallel build batches** — `/parallel-build` uses worktrees
- **teamAllowedPaths = per-persona file access rules** — Tanaka reads only auth files, Mara reads only frontend, etc.
- **Color-coded UI** — each persona gets a distinct color in the Tauri panel

---

## 3. Coordinator Mode (Priority: HIGH)

**What it is:** A specialized mode where Claude acts purely as an **orchestrator** — delegates all file operations and research to worker agents, synthesizing results and communicating with the user. Has no direct tool access except Agent, SendMessage, and TaskStop.

**Activation:** `CLAUDE_CODE_COORDINATOR_MODE=1` env var.

**Key pattern — prompt synthesis rule:** The coordinator MUST synthesize worker findings into **specific prompts with file paths and line numbers**. "Based on your findings, fix it" is explicitly called an **anti-pattern**.

**Workflow:** Research → Synthesis → Implementation → Verification.

**Forge OS adoption:**
- **This IS Dr. Nyx's role, verbatim.** The coordinator prompt maps directly to our build loop.
- The anti-pattern rule matches our Rule 26 (read every component source before importing it).
- The Research → Synthesis → Implementation → Verification flow = Scout → Build → Triad → Sentinel.

---

## 4. Dream / AutoDream — Background Memory Consolidation (Priority: HIGH)

**What it is:** Forked subagent that runs background memory consolidation when: (1) enough time has passed (default 24h), AND (2) enough sessions have accumulated (default 5), AND (3) no other process is mid-consolidation (file lock).

**4-phase consolidation prompt:**
1. **Orient** — `ls` memory directory, read MEMORY.md, skim existing topic files
2. **Gather** — scan daily logs, grep transcripts narrowly (never read whole transcripts)
3. **Consolidate** — write/update memory files, merge new signal, convert relative dates to absolute, delete contradicted facts
4. **Prune** — keep MEMORY.md under 200 lines / 25KB, remove stale pointers, shorten verbose entries

**Tool constraints for dream:** Bash restricted to **read-only** commands (`ls`, `find`, `grep`, `cat`, `stat`, `wc`, `head`, `tail`). No writes except via Edit/Write tools to memory files.

**Forge OS adoption:**
- Each persona should have its own dream cycle with persona-specific consolidation prompts
- Nyx: consolidates build patterns and learnings
- Pierce: consolidates conformance findings patterns
- The 4-phase prompt structure maps to our INTROSPECTION.md update pattern

---

## 5. Magic Docs — Auto-Maintained Documentation (Priority: HIGH)

**What it is:** Files with `# MAGIC DOC: [title]` header are registered for background updates. After each model turn with tool calls, a forked subagent checks all tracked magic docs and updates them.

**Philosophy:** "HIGH SIGNAL ONLY. No filler words. Architecture and entry points, not code walkthroughs." Update as "current state, not changelog."

**Forge OS adoption:**
- BOOT.md and BUILD-LEARNINGS.md should be auto-maintained magic docs
- After each build turn, a background agent updates BOOT.md with current state
- Eliminates manual handoff writing — the single biggest source of FM-6 (report-reality divergence)

---

## 6. Session Memory — Auto-Extracted Session Notes (Priority: HIGH)

**What it is:** Automatic session notes maintained by a background subagent. Periodically extracts 8 sections from the conversation: title, current state, task spec, files, workflow, errors, learnings, key results.

**Key detail:** Max 12000 tokens. Runs on configurable intervals. Stored at `~/.claude/projects/<path>/session_memory/`.

**Forge OS adoption:**
- Per-persona session tracking with auto-extraction
- SESSION-HANDOFF-TEMPLATE becomes auto-generated rather than manually written
- Session memory persists to SQLite (pattern from DESKTOP-APP-PATTERNS.md)

---

## 7. Agent Summary — 30-Second Status Lines (Priority: MEDIUM)

**What it is:** Periodic 3-5 word progress summaries for sub-agents. Forked agent every 30 seconds generates: "Reading runAgent.ts" or "Fixing null check in validate.ts".

**Constraint:** Name the file or function, not the branch. Previous summary injected to force novelty.

**Forge OS adoption:**
- Tauri UI persona status panel shows 3-5 word status per active persona
- Updates every 30 seconds during builds
- Maps to our batch-status command output

---

## 8. LSP Tool — Language Server Integration (Priority: MEDIUM)

**What it is:** Direct LSP integration exposing 9 operations: `goToDefinition`, `findReferences`, `hover`, `documentSymbol`, `workspaceSymbol`, `goToImplementation`, `prepareCallHierarchy`, `incomingCalls`, `outgoingCalls`.

**Forge OS adoption:**
- Scout uses LSP for schema recon instead of grepping
- Pierce uses `findReferences` to verify all call sites of an RPC
- Compass (impact analysis) uses call hierarchy operations for blast radius mapping
- Validates the OpenCode research finding — LSP is the right approach

---

## 9. UltraPlan / Teleport — Remote Planning (Priority: MEDIUM)

**What it is:** Teleports a planning session to Anthropic's Cloud Code Runner (CCR). Uploads git bundle + session context. User reviews/iterates on plan in browser. Plan returns to local CLI for execution.

**Key details:**
- Git bundle creation: tries `--all`, falls back to `HEAD`, then squashed snapshot. Max 100MB.
- 30-minute poll timeout with 3-second intervals
- Supports plan rejection + iteration in browser before approval
- "Teleport back to terminal" option — plan approved in cloud, execution in local

**Forge OS adoption:**
- Remote execution mode for heavy compute (full 10-persona audit)
- Git bundle pattern reusable for any "send codebase to cloud" workflow

---

## 10. Team Memory Sync — Shared Memory (Priority: MEDIUM)

**What it is:** Server-synchronized shared memory across team members. Files sync to API, scoped per-repo (via git remote).

**Key details:**
- Pull: server wins per-key. Push: delta upload via content hash comparison.
- File watcher with 2-second debounce triggers push on local changes.
- **Secret scanning** before upload — prevents leaking API keys/tokens.
- Max 250KB per file.

**Forge OS adoption:**
- BUILD-LEARNINGS.md and findings sync across persona sessions
- Secret scanner critical for credential safety
- The per-repo scoping maps to our per-project vault structure

---

## 11. Buddy/Companion System (Priority: LOW — Fun)

**What it is:** Virtual pet system. Deterministic companion (duck, goose, cat, dragon) from `hash(userId + SALT)`. Rarity system (common→legendary), ASCII sprites with idle fidget animation, RPG stats (DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK).

**Forge OS adoption:** Each persona could have a visual avatar/sprite in the Tauri UI. The deterministic-from-seed pattern is elegant for reproducible appearance.

---

## Summary: Adoption Priority Matrix

| Pattern | Priority | Phase | Impact |
|---|---|---|---|
| KAIROS daily-log memory | CRITICAL | 3 | Prevents multi-persona memory conflicts |
| Swarm TeamFile + Mailbox | CRITICAL | 3 | Real inter-persona communication |
| Coordinator mode pattern | HIGH | Now (CLAUDE.md) | Validates Nyx's build loop |
| Dream consolidation | HIGH | 3 | Auto-maintained persona knowledge |
| Magic Docs | HIGH | 3 | Auto-maintained BOOT.md |
| Session Memory | HIGH | 3 | Auto-generated handoffs |
| Agent Summary | MEDIUM | 4 | 3-5 word persona status in UI |
| LSP Tool | MEDIUM | 4 | Code intelligence for agents |
| UltraPlan/Teleport | MEDIUM | 5+ | Remote heavy compute |
| Team Memory Sync | MEDIUM | 4 | Cross-persona memory sync |
| Buddy sprites | LOW | 6+ | Persona avatars in UI |

---

*SOURCE-DEEP-DIVE-V2.md — Created 2026-03-31*
*Source: Claude Code src.zip extraction (2026-03-31)*
*Load when starting Tauri Phase 3+ planning.*
