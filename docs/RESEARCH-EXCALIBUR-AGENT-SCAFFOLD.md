# Research: Excalibur — Agent Scaffold Patterns
## Session Date: 2026-04-02
## Participants: Full Team (All 10 Personas)
## Source: [viemccoy/excalibur](https://github.com/viemccoy/excalibur)

---

## Source Material

### Excalibur — Markdown-Only Agent Harness Scaffold
**Author:** Vie McCoy
**Published:** 2026-04-02 (2 commits — fresh scaffold)

**Core thesis:** A frontier LLM can build its own runtime from a well-structured specification. Ship the architecture, not the code. The entire repository is markdown — zero runtime, zero dependencies, zero framework. The `grimoire/engine/` directory is intentionally empty.

**System vocabulary:** Occult/mystical terminology is load-bearing, not decorative. Agents are *spirits*, capabilities are *spellbooks* containing *casts*, scheduled jobs are *rituals*, the human operator is the *summoner*, sub-agent calls are *emanations*, the agent's system prompt is the *cornerstone*. The vocabulary enforces a mental model where ceremony, boundaries, and autonomy are foregrounded.

**Architecture at a glance:**
- `spirits/lapis/` — primary agent identity (config + system prompt + memory + rituals)
- `grimoire/spellbooks/` — 11 capability modules, each with individual cast definitions
- `artifacts/` — durable output surface (shared with summoner)
- `questbook/` — obligation tracking (shared)
- `vessel/` — machine-local state (daily JSONL ledgers, backups, venvs)
- `chargebook.md` — central cost ledger (single tuning surface)
- `AGENTS.md` — operating contract (behavioral laws + taxonomy)
- `INVOCATION.md` — 5-circle bootstrapping ceremony

---

## Pattern 1: The Charge Economy

### What Excalibur Does

A visible token/cost budget that governs agent run expansion. Every run starts with a charge allocation. Operations cost charge. When charge depletes, the run must stop or reclaim.

**Configuration surface:** `spirits/lapis/identity.md`
```yaml
starting_charge: 120
charge_cap: 120
emanation_charge: 20
max_subagent_depth: 2
```

**Cost definitions:** `chargebook.md` — one table per spellbook. All 64+ casts priced in a single file.

| Category | Example Casts | Charge |
|----------|--------------|--------|
| Local management (read, list, search) | `list_artifacts`, `read_memory_file`, `list_workings` | 0 |
| Durable work product (create, edit) | `create_artifact`, `edit_artifact`, `write_memory_file` | 0 |
| Acquisition/generation | `web_search`, `download_pdf`, `website_to_pdf` | 2 |
| Heavy generation | `conjure_image` | 3 |
| Emanations (sub-agent spawn) | `codex_emanation`, `genius_emanation` | 0 (but draws from parent) |

**Key design principle:** Durable work product is free. The charge gates *expansion* — external lookups, generation, sub-agent spawning — not *productivity*. You're never penalized for writing artifacts or organizing memory. You're penalized for widening scope.

**Budget asymmetry across contexts:**

| Context | Starting Charge | Cap | Reclaim Per Event |
|---------|----------------|-----|-------------------|
| Foreground (interactive) | 120 | 120 | — |
| Heartbeat (hourly ritual) | 60 | 120 | 15 |
| Dreamtime (nightly ritual) | 40 | 80 | 10 |

Rituals are intentionally resource-constrained compared to interactive sessions. The hourly rite gets more reclaim capacity than the nightly rite — it's trusted with more recovery because it runs more frequently and produces more incremental work.

**Reclaim conditions are explicit and contextual:**
- Heartbeat: "reclaim on durable progress such as new artifact writes, meaningful memory organization, or clearly checkpointed frontier transitions"
- Dreamtime: "reclaim on durable nightly consolidation such as memory cleanup, a useful synthesis artifact, or a clearly checkpointed nightly transition"
- Reclaim is not automatic. The spirit must demonstrate it produced something worth the spend.

### Forge OS Integration

**Landing zone:** Phase 8.1 (Skills System) + Phase 8.2 (Dispatch Pipeline)

**What we adopt:**

1. **Charge allocation per dispatch run.** When the orchestration engine (8.2) dispatches an agent, the dispatch includes a charge budget. The agent's context includes its remaining charge. When charge depletes, the agent must checkpoint and return — no infinite expansion.

2. **Chargebook as single tuning surface.** We already have `chargebook`-like thinking in our ADL (rates via getter functions, Rule 8). The Excalibur pattern formalizes this: a single `CHARGEBOOK.md` or equivalent config that prices every tool call. Change a cost once, propagate everywhere. This maps to our skills system — each skill's tool calls have a charge weight.

3. **Budget asymmetry by context.** Interactive dispatch (operator-initiated) gets full charge. Automated dispatch (Sentinel regression, Beacon anomaly, scheduled tasks) gets constrained charge. This prevents automated chains from running away while giving the operator full freedom.

4. **Free productivity, gated expansion.** Reading files, writing findings, organizing memory — free. External API calls, web searches, sub-agent spawning, heavy generation — charged. This aligns with our existing model where local operations are cheap and external operations are the bottleneck.

**What we don't adopt:**
- The specific charge numbers (120/60/40) — our dispatch contexts are different.
- Charge as a hard stop — we use session/batch scoping instead. Charge becomes an advisory budget with HUD visualization, not a hard gate. The operator sees "Pierce is at 15% charge" on the Canvas HUD and can extend or let it wind down.

**Vocabulary note:** Excalibur uses "charge." We adopt **"mana"** instead — the universal resource in gaming that powers abilities, depletes with use, and regenerates. It maps perfectly to token budgets: agents spend mana to act, heavier actions cost more mana, mana regenerates under explicit conditions. Everyone immediately understands the mechanic. "Charge" is good. "Mana" is better.

---

## Pattern 2: Emanation Charge Semantics

### What Excalibur Does

Emanations (sub-agent spawns) are the expansion primitive. Four types:

| Emanation | Purpose | Model |
|-----------|---------|-------|
| `codex_emanation` | Coding-specialized subrun | Coding model |
| `genius_emanation` | Stronger model for deeper synthesis | Higher-tier model |
| `echo_emanation` | Same-model subrun | Same as parent |
| `kimi_emanation` | Alternate-model subrun | Different provider |

**The key insight:** Emanations cost 0 to *cast* but allocate charge *from the parent run*. The parent's budget shrinks by `emanation_charge` (default: 20). The child gets exactly that 20. Delegation costs the delegator.

This means:
- You can always *try* to delegate
- But delegation is visible — the parent's charge drops
- The child is bounded — it can't spend more than what was allocated
- Nesting is capped at `max_subagent_depth: 2` — no recursive chains

**After emanation returns:** The source run keeps responsibility for orchestration, review, and integration. The emanation does bounded work; the parent judges and integrates.

### Forge OS Integration

**Landing zone:** Phase 8.2 (Agent Dispatch Pipeline) — specifically the Swarm dispatch model

**What we adopt:**

1. **Parent-funded delegation.** When the dispatch pipeline spawns parallel Triad agents, each agent draws from the dispatch run's total charge budget. If the run starts at 120 and spawns 3 Triad agents at 20 each, the orchestrator has 60 remaining for integration and fix cycles. This makes expansion decisions visible on the Canvas HUD — the operator sees the charge flowing from parent to children in real time.

2. **Typed emanation tiers.** Our provider abstraction already supports capability tiers (high/medium/fast). Excalibur's emanation types map cleanly:
   - `codex_emanation` → our fast-tier coding dispatch
   - `genius_emanation` → our high-tier deep analysis dispatch
   - `echo_emanation` → our same-tier parallel dispatch (Triad agents)
   - We don't need `kimi_emanation` — our provider fallback (8.2) already handles cross-provider routing

3. **Depth cap.** `max_subagent_depth: 2` is conservative and correct. Our Swarm protocol already caps depth. Excalibur validates our choice.

4. **Post-emanation integration responsibility.** The parent run must review and integrate emanation results — not blindly merge them. This is exactly our Triad model: agents produce findings, Nyx integrates. Excalibur codifies what we do by convention.

**Vocabulary note:** "Emanation" is evocative — a bounded projection of the parent's will and budget. Consider using it for the Swarm dispatch visualization on the Canvas HUD. When Pierce, Mara, and Riven spin up as Triad agents, the HUD could show them as *emanations* flowing out from the orchestrator node, with mana flowing along the connection lines.

---

## Pattern 3: Read-Only Rituals

### What Excalibur Does

Rituals (scheduled jobs) are defined in markdown with YAML frontmatter:

```yaml
name: dreamtime
enabled: false
schedule: 0 2 * * *
open_spellbooks: [memory, artifact, working]
starting_charge: 40
charge_cap: 80
timeout_minutes: 90
retry_attempts: 1
```

**The hard rule:** Rituals are **read-only during execution.** A spirit must never modify its own ritual files. Stated in `AGENTS.md`, reinforced in `cornerstone.md`, checked during invocation.

This prevents:
- Self-modification drift (a ritual gradually rewriting its own schedule or budget)
- Escalation attacks (a compromised ritual widening its own permissions)
- Silent behavioral change (ritual 47 looks the same as ritual 1 but has been self-patching for months)

**Rituals ship disabled by default.** Both heartbeat and dreamtime have `enabled: false`. The summoner explicitly activates them. No accidental autonomous behavior.

### Forge OS Integration

**Landing zone:** Phase 8.1 (State Engine) + Scheduled Tasks

**What we adopt:**

1. **Immutable job specs.** Our scheduled tasks (and future automated dispatch rules) should be read-only during execution. The task can read its own spec for parameters, but cannot modify it. If a task discovers its spec is wrong, it files a finding or proposal — it doesn't self-patch.

2. **Disabled by default.** Automated dispatch rules, scheduled consolidation jobs, and policy evolution proposals all ship inactive. The operator explicitly enables each one. No system bootstraps into autonomous behavior without consent.

3. **Timeout + retry as first-class config.** Excalibur puts `timeout_minutes`, `retry_attempts`, and `retry_backoff_seconds` in the ritual frontmatter. We should do the same for dispatch runs — every automated dispatch has a timeout and retry policy in its spec, not hardcoded in the engine.

**What we already have:** Our FM-11 (manifest amnesia) defends against the same class of error — building from a drifted mental model instead of the literal spec. Read-only rituals are the structural version of FM-11 applied to automated jobs.

---

## Pattern 4: The Warden (Mandatory Security Audit Spirit)

### What Excalibur Does

The fourth circle of the Invocation ceremony mandates creating a **Warden spirit** — a second agent whose sole purpose is security auditing:

- Must be "a real cybersecurity specialist, not a generic assistant with a security label"
- Given a strong model
- Runs a weekly hardening ritual
- Inspects: exposure, secret handling, authentication posture, network assumptions, risky defaults, hardening gaps
- Purpose is narrow and serious — the Warden doesn't do anything else

**Key insight:** The Warden is a *separate spirit*, not a mode of the primary spirit. It has its own identity, its own model allocation, its own ritual schedule. It cannot be overridden by the primary spirit's priorities. The primary spirit cannot dismiss Warden findings.

### Forge OS Integration

**Landing zone:** Validates existing architecture (Tanaka + Wraith)

**What this confirms:**
- Our separation of Tanaka (defensive security) and Wraith (offensive red-team) is the right pattern. Excalibur arrives at the same conclusion: security must be a separate entity, not a mode.
- Our dispatch model where Tanaka and Wraith are READ-ONLY (they find, Nyx fixes) matches Excalibur's Warden model.
- Our Rule 29 (never simulate gates inline — always dispatch the agent) prevents the primary builder from self-auditing, which is exactly what the Warden pattern enforces structurally.

**What we could strengthen:**
- Excalibur mandates the Warden during bootstrapping. Our `/init` flow could explicitly include a "security audit configuration" step where the operator sets Tanaka and Wraith's automated dispatch schedule. Currently this is implicit — making it an explicit invocation step (borrowing the ceremony language) would ensure no project ships without security audit coverage.

**Vocabulary note:** "Warden" is strong. We don't need to adopt it — Tanaka and Wraith have their own identities. But the *concept* of a mandatory security circle in the bootstrapping ceremony is worth borrowing for `/init`.

---

## Pattern 5: Single Tuning Surface (Chargebook)

### What Excalibur Does

`chargebook.md` is the **one file** that governs all costs across all spellbooks. It contains one table per spellbook, with every cast and its charge cost. The author's intent: "Change a cost once here instead of rewriting rituals."

**The structural principle:** Configuration that affects multiple consumers lives in exactly one place. Every consumer reads from that place. No duplication, no scatter, no drift.

This is the file-based equivalent of our Rule 8 (rates via getter functions, never hardcoded) — but applied to the agent system's own operational costs rather than business logic.

### Forge OS Integration

**Landing zone:** Phase 8.1 (Skills System) + Phase 8.2 (Dispatch Pipeline)

**What we adopt:**

1. **A `CHARGEBOOK.md` (or equivalent) for dispatch costs.** One file defining: base charge per agent tier, charge per tool call category, emanation charge allocation, automated dispatch budgets. Every dispatch consumer reads from this single source. The operator tunes agent economics in one place.

2. **Extend to skill costs.** When the skills system (8.1) injects skills into agent context, each skill has a charge weight (how much context it consumes). The chargebook prices skills alongside tool calls — one economic view of the whole system.

3. **HUD visualization.** The chargebook data feeds a "System Economics" view on the Canvas HUD: which agents are most expensive, which tools consume the most charge, where the budget goes over a session. The operator sees the cost structure, not just the output.

**What we already have:** BUILD-LEARNINGS.md and ADL serve as single tuning surfaces for build patterns and architectural decisions. The chargebook extends this principle to operational economics.

---

## Pattern 6: Capability Widening (Spellbook Model)

### What Excalibur Does

Only `adept` (the core spellbook) is always available. All other 10 spellbooks must be explicitly opened:

- **Identity-level declaration:** `available_spellbooks` in `identity.md` lists what the spirit *can* access
- **Ritual-level preloading:** `open_spellbooks` in ritual frontmatter pre-opens specific books for that job
- **Runtime opening:** `open_spellbook` cast in adept allows dynamic widening during a run
- **Design principle:** "Design spellbooks by capability family, not by convenience"

**Why this matters:** At any point during execution, you can audit exactly which capabilities were available. The capability surface is explicit, not ambient. A spirit doing a memory consolidation ritual has `memory`, `artifact`, and `working` — not `web`, not `media`, not `network`. The attack surface is bounded by the declared capability set.

**The 11 spellbooks:**

| Spellbook | Always Open | Cast Count | Domain |
|-----------|------------|------------|--------|
| `adept` | Yes | 11 | Core orchestration, emanations, messaging, halt |
| `artifact` | No | 8 | Durable output CRUD |
| `working` | No | 5 | Background work orchestration |
| `web` | No | 8 | Web navigation, search, capture |
| `memory` | No | 6 | Memory file management |
| `portal` | No | 5 | Always-on surface management |
| `questbook` | No | 8 | Obligation tracking |
| `corpus` | No | 3 | Reference material search |
| `media` | No | 4 | Image generation, graphics |
| `network` | No | 4 | Static site management |
| `ritual` | No | 2 | Ritual introspection (read-only) |

### Forge OS Integration

**Landing zone:** Phase 7.1 (Agent Registry — Tool Availability Gating) + Phase 8.2 (Dispatch Pipeline)

**What we adopt:**

1. **Explicit capability scoping per dispatch.** When the dispatch pipeline (8.2) sends an agent on a run, the dispatch includes a declared capability set — which tools are available for this specific run. A Triad gate review gets read-only tools. A build dispatch gets write tools. A red-team dispatch gets destructive tools. The capability surface is never ambient.

2. **This strengthens our existing availability gating.** Phase 7.1 already has Tool Availability Gating (the Hermes `check_fn` pattern) — tools appear/disappear based on MCP connectivity. Excalibur's spellbook model adds a second dimension: even when a tool is *technically available* (MCP connected), the dispatch may not *grant* it for this run. Connectivity gating + dispatch scoping = two-layer capability control.

3. **Audit trail of capability grants.** Every dispatch records which capabilities were granted. When reviewing a gate failure, you can see exactly what tools the agent had access to. "Why didn't Tanaka check RLS?" → "RLS tools weren't in the dispatch's capability set because Supabase MCP was disconnected at dispatch time."

**Vocabulary note:** "Spellbook" as a grouping metaphor is charming. Our equivalent is capability *families* or tool *domains*. The key insight isn't the name — it's the explicit open/close semantics. Capabilities are not ambient. They're granted.

---

## Pattern 7: Dreamtime Consolidation (Scheduled Memory Distillation)

### What Excalibur Does

The `dreamtime` ritual runs nightly at 02:00 UTC. Its job:

1. Review the previous day's full conversation (from the daily JSONL ledger)
2. Decide what belongs in long-term memory
3. Write/reorganize markdown in `memories/`
4. Keep only durable, useful, queryable information
5. If a synthesis artifact would help, write it under `artifacts/`
6. Checkpoint progress with `record_checkpoint`

**The 4-tier memory model it serves:**

| Tier | Location | Prompt-Attached | Purpose |
|------|----------|-----------------|---------|
| Daily thread | `vessel/state/lapis/conversations/<date>.jsonl` | No | Live working ledger — all turns + ritual checkpoints |
| Long-term | `memories/long-term.md` | **Yes** (always loaded) | Compact top-of-head memory, must stay short and dense |
| Window | `memories/window/` | **Yes** (rolling) | Recent-memory window for near-term context |
| Archive | `memories/archive/` | No | Low-signal durable memory, searchable but not prompt-attached |

**The heartbeat ritual** (hourly) complements dreamtime: it makes small durable advances in memories or artifacts every hour, keeping the frontier moving. Dreamtime does the overnight synthesis pass.

**Novel pattern:** The daily JSONL thread is the **canonical ledger** shared across foreground conversation, background workings, and ritual checkpoints. Everything flows through one timeline. Dreamtime reads this timeline and distills it into the tiered memory system.

**Another novel pattern:** The cornerstone (system prompt) explicitly tells the spirit to propose changes to its own personality based on discovered summoner preferences. Memory consolidation isn't just about facts — it's about identity evolution.

### Forge OS Integration

**Landing zone:** Phase 8.1 (Auto-Memory Extraction) + Phase 8.5 (Persona Evolution Engine) + KAIROS

**What we adopt:**

1. **Scheduled consolidation as a first-class job.** Our auto-memory extraction (8.1) currently runs after every BOOT.md write — event-triggered, not time-triggered. Excalibur's dreamtime adds a complementary pattern: a nightly sweep that reviews the *entire day's context* and distills it. This catches things the event-triggered pass misses — slow-accumulating patterns, cross-session themes, relationship shifts that only become visible in aggregate.

2. **The daily thread as canonical ledger.** Our KAIROS memory system could benefit from Excalibur's `conversations/<date>.jsonl` pattern — a daily append-only log that captures every dispatch, every finding, every checkpoint. This becomes the raw material for both the event-triggered extraction and the nightly dreamtime pass. Currently our build state lives in BOOT.md handoffs (prose summaries). A structured daily ledger would give the consolidation job richer raw material.

3. **Heartbeat + Dreamtime as complementary rhythms.** Two consolidation cadences:
   - **Heartbeat (hourly):** Quick incremental advances — checkpoint progress, update working memory, surface any findings that need attention. Low charge, high frequency. This is the "keep the frontier moving" job.
   - **Dreamtime (nightly):** Deep synthesis — review the full day, consolidate to long-term memory, prune stale entries, write synthesis artifacts. Higher charge, lower frequency. This is the "overnight reflection" job.

4. **Feed into Persona Evolution (8.5).** The nightly dreamtime pass is the natural trigger for persona evolution processing. After the day's experiences are consolidated, the evolution engine scans for drift signals, relationship changes, and expertise deepening. The Dream Consolidation Engine (already specced in 8.5) maps directly to this pattern.

**Vocabulary note:** "Dreamtime" is evocative — the Aboriginal Australian concept of a timeless creative epoch where the world is continuously remade. It fits the nightly consolidation metaphor perfectly: the system enters a dream state where experiences are processed, memories are consolidated, and identity evolves. Consider adopting this term for the nightly consolidation job in Phase 8.5.

---

## Cross-Pattern Analysis: What Excalibur Gets Right

### The Separation of Concerns (3-File Identity)

Excalibur splits every spirit into three concerns:
1. **`identity.md`** — Configuration (model, charge, transport, capabilities)
2. **`cornerstone.md`** — Personality (behavioral instructions, voice, interaction protocol)
3. **`spellbooks/`** — Capabilities (what it can do, organized by family)

We arrived at the same pattern independently:
1. **Kernel** (`forge/kernels/{name}-kernel.md`) — Execution mind (phases, FMs, contracts)
2. **Personality** (`personas/{name}/PERSONALITY.md` + `INTROSPECTION.md`) — Identity
3. **Agent definition** (`.claude/agents/{name}.md`) — Tools, output format, dispatch interface

**Convergent evolution.** Two systems built for different purposes — one a personal AI orchestrator, the other a multi-persona build team — arrived at the same identity architecture. This validates the pattern.

### The Behavioral Contract (AGENTS.md vs EXECUTION-PROTOCOL.md)

Excalibur's `AGENTS.md` has 11 behavioral laws. Our `EXECUTION-PROTOCOL.md` has 46 rules, 8 contracts, and 14 failure modes. Same function, different scale. Both serve as the "operating contract" that agents are bound by.

Excalibur's laws are more philosophical ("answer the summoner before deeper work begins"). Ours are more mechanical ("never use Write on existing files — Edit only"). Both are necessary at their respective scales.

### The Zero-Code Philosophy

Excalibur ships no runtime. The thesis: a well-structured spec is sufficient for a frontier model to build the system.

We took the opposite approach: we ship compiled artifacts. Every batch produces real, running code verified by external agents.

**Both are valid for their context.** Excalibur is a scaffold for power users who want to understand every boundary. Forge OS is a production build tool where the runtime IS the product. But the insight that markdown-as-spec is powerful enough to bootstrap an entire agent system is worth remembering — our kernel architecture (24 markdown files that define 24 agent execution minds) is closer to Excalibur's philosophy than we might think.

---

## Integration Summary

| # | Pattern | Landing Zone | Integration Type | Vocabulary Adoption |
|---|---------|-------------|-----------------|-------------------|
| 1 | Mana Economy | 8.1, 8.2 | New system — dispatch mana budgets | **"Mana"** for token/cost budgets |
| 2 | Emanation Mana Semantics | 8.2 | Enhancement — parent-funded delegation model | **"Emanation"** for HUD sub-agent visualization |
| 3 | Read-Only Rituals | 8.1, scheduled tasks | Enhancement — immutable job specs | **"Ritual"** for scheduled/automated jobs |
| 4 | Warden Pattern | `/init` flow | Enhancement — mandatory security circle in bootstrapping | "Circle" for `/init` ceremony phases |
| 5 | Single Tuning Surface | 8.1, 8.2 | New artifact — mana ledger | **"Grimoire"** for the cost/config tome |
| 6 | Capability Widening | 7.1, 8.2 | Enhancement — dispatch-scoped capability grants | Keep "capability families" |
| 7 | Dreamtime Consolidation | 8.1, 8.5 | Enhancement — nightly synthesis job + daily ledger | **"Dreamtime"** for nightly consolidation |

**Total build plan impact:** No new sessions needed. All 7 patterns fit into existing seams — Phases 7.1, 8.1, 8.2, and 8.5. Two new artifacts (mana ledger, daily ledger format). Five vocabulary adoptions: **mana** (token budgets), **emanation** (sub-agent projection), **ritual** (scheduled jobs), **dreamtime** (nightly consolidation), **grimoire** (operational cost/config tome).

---

## Team Sign-Off

| Persona | Assessment |
|---------|-----------|
| **Nyx** | Seven clean patterns, zero bloat. The mana economy and emanation semantics are the standouts — they formalize what we do by convention. The vocabulary adoptions feel right: mana, emanation, ritual, and dreamtime all carry meaning our existing terms don't. |
| **Pierce** | The single tuning surface principle (Pattern 5) is structurally sound — one file, no scatter, no drift. Read-only rituals (Pattern 3) are a structural defense against FM-11. Both patterns increase conformance verifiability. |
| **Kehinde** | Emanation charge semantics (Pattern 2) solve the sub-agent budget accountability problem cleanly. Parent-funded delegation with depth caps prevents recursive explosion. The daily JSONL ledger (Pattern 7) gives the consolidation engine structured raw material instead of prose summaries. |
| **Tanaka** | Capability widening (Pattern 6) adds dispatch-scoped tool control on top of our connectivity gating — two-layer defense. The Warden pattern (Pattern 4) validates our Tanaka + Wraith separation. Mandatory security circle in `/init` is a concrete improvement. |
| **Mara** | The charge HUD visualization (Pattern 1) gives the operator real-time visibility into agent economics. Emanation flows on the Canvas (Pattern 2) make sub-agent spawning spatial and legible. Good UX primitives. |
| **Riven** | Charge as a visual element — flowing between nodes on the Canvas HUD — is a design system primitive worth speccing. The emanation visualization (parent → children with charge flowing along connection lines) extends the pipeline canvas naturally. |
| **Vane** | The mana economy (Pattern 1) is a cost governance layer. Budget asymmetry by context (interactive vs automated) is the right fiscal structure. The grimoire as single tuning surface (Pattern 5) mirrors financial rate governance. |
| **Voss** | Capability widening (Pattern 6) creates an auditable capability grant trail. Read-only rituals (Pattern 3) prevent self-modification, which has compliance implications. Every dispatch's tool access is recorded — audit-friendly. |
| **Calloway** | Excalibur's zero-code positioning is bold but niche. Our compiled-artifact approach serves a broader market. The vocabulary adoptions (mana, emanation, ritual, dreamtime) add character without sacrificing precision — good for differentiation. |
| **Sable** | Five vocabulary adoptions: *mana* (the resource that powers all abilities — universally understood), *emanation* (bounded projection of will), *ritual* (ceremony with purpose, not "cron job"), *dreamtime* (creative epoch of consolidation), *grimoire* (the ledger of costs). The mystical register works when it illuminates, not when it obscures. These five illuminate. |

---

*Excalibur Research — Compiled 2026-04-02.*
*Source: viemccoy/excalibur (markdown-only agent scaffold).*
*7 patterns mined, 0 new sessions required, all fit existing build plan seams.*
