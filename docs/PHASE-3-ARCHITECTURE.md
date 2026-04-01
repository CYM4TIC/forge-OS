# Phase 3+ Architecture Roadmap

> Synthesized from Claude Code source analysis (SOURCE-DEEP-DIVE-V2, SOURCE-DEEP-DIVE-V2-SYSTEMS)
> and desktop app ecosystem research (DESKTOP-APP-PATTERNS).
> This is the bridge between "we know these patterns exist" and "here's how we build them in Tauri."

---

## Priority Tiers

### CRITICAL — Phase 3 Core (Sessions 3.1-3.3)

#### 1. KAIROS Daily-Log Memory Model
**Source:** SOURCE-DEEP-DIVE-V2 Section 1

Replace monolithic BOOT.md with append-only date-named log files + nightly consolidation.

**Architecture:**
```
~/.forge-os/memory/
  MEMORY.md              # Index (max 200 lines / 25KB)
  user/                  # User preferences, role, knowledge
  feedback/              # Corrections AND confirmations
  project/               # Ongoing work, goals, incidents
  reference/             # Pointers to external systems
  logs/
    YYYY/MM/DD.md        # Timestamped daily bullets (append-only)
```

**Key behaviors:**
- Each persona appends to the daily log during work — no merge conflicts
- Nightly `/dream` consolidation distills logs into topic-organized files
- MEMORY.md index updated during dream cycle
- Daily logs are append-only — never edited, only consolidated
- Dream consolidation: 4 phases (Orient → Gather → Consolidate → Prune)

**Constants:**
```
MEMORY_MAX_LINES = 200
MEMORY_MAX_SIZE_KB = 25
MEMORY_TYPES = ['user', 'feedback', 'project', 'reference']
EXTRACTION_AGENT_MAX_TURNS = 5
```

**Tauri implementation:**
- SQLite table `memory_logs` for daily entries (persona_id, timestamp, content, type)
- SQLite table `memory_topics` for consolidated knowledge
- Background Rust task for dream consolidation scheduling
- MEMORY.md generated as a view from SQLite, not the source of truth

---

#### 2. Swarm TeamFile + Mailbox
**Source:** SOURCE-DEEP-DIVE-V2 Section 2

Real inter-persona message bus replacing flat TEAM-COMMS.md.

**TeamFile schema:**
```json
{
  "leadAgentId": "nyx",
  "teamAllowedPaths": ["forge/", "docs/"],
  "members": [
    {
      "agentId": "pierce",
      "name": "Dr. Pierce",
      "color": "#EF4444",
      "agentType": "persona",
      "model": "opus",
      "permissionMode": "read-only",
      "subscriptions": ["gate-results", "findings"],
      "backendType": "in-process"
    }
  ]
}
```

**Mailbox message types:**
- `SwarmPermissionRequest` — Worker needs destructive action approval
- `SwarmPermissionResponse` — Leader approves/denies
- `SwarmIdleNotification` — Worker finished or stalled
- `SwarmShutdownSignal` — Terminate worker
- `SwarmDirectMessage` — Agent-to-agent communication

**Tauri implementation:**
- SQLite table `mailbox` (from_agent, to_agent, msg_type, payload, timestamp, read)
- In-memory message bus for real-time (Tauri event system)
- File-based fallback for persistence across restarts
- Permission sync UI: modal shows who's asking + what they want to do

---

#### 3. Agent Dispatch with CacheSafeParams
**Source:** SOURCE-DEEP-DIVE-V2-SYSTEMS Section D

Shared prompt cache across forked agents for token efficiency.

**`runForkedAgent()` flow:**
```
1. Accept CacheSafeParams (system prompt, context, tools, messages)
   → MUST match parent for cache hits
2. Create isolated context:
   - readFileState: cloned from parent
   - abortController: new child linked to parent
   - All mutation callbacks: no-op by default
   - Fresh queryTracking with incremented depth
3. Run query loop with isolated context
4. Return: { agentId, content, totalToolUseCount, totalDurationMs, totalTokens }
```

**Key rule:** System prompt structure must be identical up to `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` marker for cache hits. Persona identity goes ABOVE the boundary (cached). Session-specific context goes BELOW (dynamic).

**Constants:**
```
AGENT_BACKGROUND_TIMEOUT_MS = 120_000  // auto-background after 2 min
```

**Tauri implementation:**
- Rust `AgentDispatcher` manages forked agent lifecycle
- Prompt cache stored in memory, keyed by hash of static sections
- Each agent gets isolated `ToolUseContext` (cloned file state, fresh abort controller)
- Auto-background after 120s — UI shows "running in background" indicator

---

#### 4. SQLite Session State
**Source:** DESKTOP-APP-PATTERNS Pattern 1

Replace monolithic BOOT.md with queryable SQLite database.

**Schema (already partially built in P1-F):**
```sql
-- Extend existing sessions/messages with:
CREATE TABLE batches (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id),
  batch_id TEXT NOT NULL,        -- e.g., "L4-J.2c"
  status TEXT NOT NULL,          -- pending/in_progress/complete/blocked
  started_at TEXT,
  completed_at TEXT,
  findings_count INTEGER DEFAULT 0,
  files_modified TEXT,           -- JSON array
  handoff TEXT                   -- session handoff content
);

CREATE TABLE findings (
  id TEXT PRIMARY KEY,
  batch_id TEXT REFERENCES batches(id),
  persona TEXT NOT NULL,         -- who found it
  severity TEXT NOT NULL,        -- CRIT/HIGH/MED/LOW
  file_path TEXT,
  line_number INTEGER,
  description TEXT NOT NULL,
  status TEXT NOT NULL,          -- open/fixed/deferred/wontfix
  fixed_at TEXT
);

CREATE TABLE risks (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  batch_id TEXT                  -- which batch created it
);
```

**BOOT.md becomes a generated view** — not the source of truth. Query SQLite for position, generate BOOT.md for display/handoff.

**Tauri implementation:**
- Extend `tauri-plugin-sql` schema with batch/finding/risk tables
- Rust command: `get_build_state()` → queries SQLite → returns structured JSON
- Rust command: `generate_boot_md()` → renders BOOT.md from SQLite for handoff
- Migration: existing BOOT.md content imported on first run

---

#### 5. Auto-Compact at 85% Threshold
**Source:** DESKTOP-APP-PATTERNS Pattern 2, SOURCE-DEEP-DIVE-V2-SYSTEMS Section B

Automatic context window management replacing manual "stop at 70%" rule.

**Compaction engine (9 sections):**
```
1. Primary Request and Intent
2. Key Technical Concepts
3. Files and Code Sections (actual snippets, not descriptions)
4. Errors and Fixes
5. Problem Solving (approaches tried, decisions made)
6. All User Messages (VERBATIM — prevents drift)
7. Pending Tasks
8. Current Work (precise state with file names)
9. Optional Next Step (with direct quotes)
```

**Constants:**
```
POST_COMPACT_TOKEN_BUDGET = 50_000
POST_COMPACT_MAX_FILES_TO_RESTORE = 5
POST_COMPACT_MAX_TOKENS_PER_FILE = 5_000
POST_COMPACT_SKILLS_TOKEN_BUDGET = 25_000
MAX_COMPACTION_RETRIES = 2
```

**Variants:**
- `BASE_COMPACT` — Summarize entire conversation
- `PARTIAL_COMPACT` — Summarize only recent messages (earlier retained)
- `PARTIAL_COMPACT_UP_TO` — Summarize prefix for continuing session

**Tauri implementation:**
- Token counter in Rust (tiktoken or approximation)
- At 85% threshold: trigger compaction agent automatically
- Store compaction summary in SQLite `session_summaries` table
- On new session: pre-load summary as context
- Post-compact: restore top 5 files at 5K tokens each

---

### HIGH — Phase 3-4 (Sessions 3.4-4.2)

#### 6. Coordinator Mode
**Source:** SOURCE-DEEP-DIVE-V2 Section 3

Nyx operates as pure orchestrator — no direct tool access except Agent, SendMessage, TaskStop.

**Critical anti-pattern rule:**
> "Based on your findings, fix it" is an ANTI-PATTERN.
> Instead: "In `/src/auth.ts` lines 45-62, the validateToken function lacks null checks on jwt.sub. Add a guard."

Coordinator MUST synthesize worker findings into specific prompts with file paths and line numbers. This validates the existing Hyperdrive build loop — Nyx delegates, agents execute.

**Tauri implementation:**
- Coordinator mode toggle in settings
- When active: Nyx's tool access restricted to dispatch + communicate
- All file/DB operations go through dispatched agents
- UI shows delegation tree in real-time

---

#### 7. Dream/AutoDream — Background Memory Consolidation
**Source:** SOURCE-DEEP-DIVE-V2 Section 4

Per-persona background memory consolidation.

**4-phase consolidation:**
1. **Orient** — List memory directory, read MEMORY.md, skim existing topic files
2. **Gather** — Scan daily logs, grep transcripts narrowly (never full transcripts)
3. **Consolidate** — Write/update memory files, merge new signal, convert relative→absolute dates
4. **Prune** — Keep MEMORY.md under 200 lines / 25KB, remove stale pointers

**Trigger conditions (all must be true):**
- 24+ hours since last consolidation
- 5+ sessions accumulated
- No other process is mid-consolidation (file lock)

**Dream agent tool constraints:**
- Read-only Bash: `ls`, `find`, `grep`, `cat`, `stat`, `wc`, `head`, `tail`
- Write only via Edit/Write to memory files

**Tauri implementation:**
- Background Rust task checks conditions every hour
- Each persona gets its own dream schedule
- File lock via SQLite advisory lock (prevents concurrent dreams)
- Dream results stored in SQLite with diff tracking

---

#### 8. Magic Docs — Auto-Maintained Documentation
**Source:** SOURCE-DEEP-DIVE-V2 Section 5

Files with `# MAGIC DOC: [title]` header auto-update after each model turn with tool calls.

**Philosophy:** "HIGH SIGNAL ONLY. No filler. Architecture and entry points, not code walkthroughs."

**Tauri implementation:**
- Register magic doc files in SQLite `magic_docs` table
- After each tool-using turn: dispatch lightweight agent to check registered docs
- Agent reads current state, updates doc if stale
- BOOT.md as the primary magic doc — auto-updated after every build turn

---

#### 9. Session Memory — Auto-Extracted Handoffs
**Source:** SOURCE-DEEP-DIVE-V2 Section 6

Background agent periodically extracts 8 sections from conversation:
1. Title, 2. Current state, 3. Task spec, 4. Files, 5. Workflow, 6. Errors, 7. Learnings, 8. Key results

**Constraints:** Max 12,000 tokens per session note. Configurable intervals.

**Tauri implementation:**
- SQLite `session_notes` table with 8-section JSON
- Auto-extract on session end (mandatory) + configurable intervals during session
- SESSION-HANDOFF-TEMPLATE becomes auto-generated
- View in UI: session history with searchable notes

---

#### 10. Persistent Sessions — Survive Restart
**Source:** DESKTOP-APP-PATTERNS Pattern 3

Sessions survive app restart, machine sleep, crashes.

**Tauri implementation:**
- Session state in SQLite (already built in P1-F)
- On crash: restart → read SQLite → offer "Resume last session?"
- Tauri backend as persistent process, React frontend as view layer
- Agent dispatch state recoverable from SQLite + last known position

---

### MEDIUM — Phase 4+ (Sessions 4.3-5.x)

#### 11. Agent Summary — 30-Second Status Lines
**Source:** SOURCE-DEEP-DIVE-V2 Section 7

3-5 word progress summaries per active agent, every 30 seconds.

**Rule:** Name the file or function being worked on. Previous summary injected to force novelty.

**Tauri implementation:**
- Status panel in UI showing all active agents
- Background polling every 30s
- Color-coded per persona (from TeamFile colors)
- Example: "Nyx: Writing useStaffList hook" / "Pierce: Checking auth RPCs"

---

#### 12. LSP Integration — Code Intelligence
**Source:** SOURCE-DEEP-DIVE-V2 Section 8, DESKTOP-APP-PATTERNS Pattern 5

9 operations: goToDefinition, findReferences, hover, documentSymbol, workspaceSymbol, goToImplementation, prepareCallHierarchy, incomingCalls, outgoingCalls.

**Agent mapping:**
- Scout: LSP for schema recon instead of grepping
- Pierce: findReferences to verify all call sites updated
- Compass: call hierarchy for blast radius mapping

**Tauri implementation:**
- Rust LSP client (tower-lsp or lsp-types crate)
- Expose LSP operations as Tauri commands
- Agents access via tool interface

---

#### 13. Team Memory Sync — Cross-Persona Learning
**Source:** SOURCE-DEEP-DIVE-V2 Section 10

Server-synchronized shared memory. Files sync to API, scoped per-repo.

**Key features:**
- Pull: server wins per-key
- Push: delta upload via content hash comparison
- File watcher with 2-second debounce
- Secret scanning before upload (prevents API key leaks)
- Max 250KB per file

**Tauri implementation:**
- SQLite `shared_memory` table with content hashes
- Sync engine in Rust (background task)
- Secret scanner regex: API keys, tokens, passwords
- Per-project scoping via project ID

---

#### 14. Model Tiering Runtime
**Source:** DESKTOP-APP-PATTERNS Pattern 4, forge/MODEL-TIERING.md

Three tiers with runtime routing:
- **Frontier** (Opus): Nyx, Pierce, Tanaka — architecture, judgment, security
- **Capable** (Sonnet): Kehinde, Mara, Riven, Calloway, Voss, Vane, Sable
- **Lightweight** (Haiku): Sub-agents, utility commands, formatting

**Constants:**
```
MODEL_IDS = {
  opus: 'claude-opus-4-6',
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001'
}
```

**Tauri implementation:**
- Agent manifest includes model tier
- Provider routes to correct model based on agent type
- Cost tracking per tier in SQLite
- Override: operator can force any agent to frontier tier

---

#### 15. Permission System — Tool Classifier
**Source:** SOURCE-DEEP-DIVE-V2-SYSTEMS Section F

**Auto-safe tools (bypass classifier):**
Read, Grep, Glob, LSP, TodoWrite, Task tools, Plan mode tools, SendMessage, Sleep

**Dangerous files:** `.gitconfig`, `.bashrc`, `.zshrc`, `.mcp.json`, `.claude.json`
**Dangerous dirs:** `.git`, `.vscode`, `.idea`, `.claude`

**Security checks:** Path traversal detection, null byte rejection, case normalization.

**Tauri implementation:**
- Tool permission matrix in SQLite: agent_id × tool_name → allowed/denied/ask
- Auto-safe whitelist hardcoded in Rust
- Dangerous file/dir blacklist checked before file operations
- UI prompt for non-whitelisted operations

---

### LOW — Phase 5+ (Future)

#### 16. UltraPlan/Teleport — Remote Heavy Compute
**Source:** SOURCE-DEEP-DIVE-V2 Section 9

Teleport planning sessions to cloud runner. Git bundle + context upload. 30-min poll timeout.

**Git bundle creation:** Try `--all`, fallback to `HEAD`, then squashed snapshot. Max 100MB.

#### 17. Local Anthropic-Compatible Proxy
**Source:** DESKTOP-APP-PATTERNS Pattern 6

Local HTTP proxy translates Anthropic API → Gemini/Groq/Ollama. Already handled by OpenAI-compatible provider in P1-I.

#### 18. Buddy/Companion Sprites
**Source:** SOURCE-DEEP-DIVE-V2 Section 11

Virtual pet per persona. Deterministic from `hash(personaId + SALT)`. Rarity system. ASCII sprites with idle animation. RPG stats.

---

## Hook System Events (Reference)
**Source:** SOURCE-DEEP-DIVE-V2-SYSTEMS Section G

Full lifecycle events available for Phase 3 hook system:
```
PreToolUse, PostToolUse, PostToolUseFailure
PermissionDenied, PermissionRequest
PreCompact, PostCompact
SessionStart, SessionEnd
Stop, StopFailure
SubagentStart, SubagentStop
TeammateIdle
TaskCreated, TaskCompleted
ConfigChange, CwdChanged, FileChanged
InstructionsLoaded, UserPromptSubmit
Notification, StatusLine
```

Standard timeout: 10 minutes. Session-end timeout: 1.5 seconds.

---

## Background Housekeeping (Reference)
**Source:** SOURCE-DEEP-DIVE-V2-SYSTEMS Section H

**On startup:** initMagicDocs, initSkillImprovement, initExtractMemories, initAutoDream, auto-update plugins.
**Deferred (10 min after start, only when idle):** Old message cleanup, old version cleanup.

---

## System Prompt Construction (Reference)
**Source:** SOURCE-DEEP-DIVE-V2-SYSTEMS Section A

**Static sections (cached globally):**
1. Identity + output style
2. System behaviors
3. Software engineering guidance
4. Reversibility/blast-radius framework
5. Tool preferences
6. Formatting rules
7. Output efficiency

**`__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__`**

**Dynamic sections (per-session, re-computed):**
- session_guidance, memory, env_info, language, output_style, mcp_instructions, scratchpad, brief

**Prompt priority:** overrideSystemPrompt > coordinator mode > agent system prompt > custom system prompt > default assembled.

---

*Phase 3+ Architecture Roadmap — synthesized from Claude Code source + ecosystem research.*
*Written 2026-03-31 by Nyx. Referenced by CLAUDE.md and TAURI-BUILD-PLAN.md.*
