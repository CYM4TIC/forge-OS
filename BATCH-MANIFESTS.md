# Forge OS — Batch Manifests

> Phase-level batch sequences. Written before each phase starts. Nyx reads this on "next batch."

---

## Phase 1: Tauri Shell + Chat (12 batches)

**Session map:** 1.1 = P1-A through P1-C | 1.2 = P1-D through P1-F | 1.3 = P1-G through P1-L
**Prerequisite:** Rust toolchain installed via `rustup`. At least one API key (Claude or OpenAI).
**Repo:** CYM4TIC/forge-OS | **Local:** `.`

---

### P1-A: Monorepo Scaffold

**Goal:** pnpm monorepo with Turborepo. The skeleton everything hangs on.

**Files:**
- `package.json` (root — workspaces, scripts, devDeps: turbo)
- `pnpm-workspace.yaml` (apps/*, packages/*)
- `turbo.json` (pipeline: build, dev, lint, typecheck)
- `.npmrc` (shamefully-hoist=false, strict-peer-dependencies=true)
- Update `.gitignore` (node_modules, dist, .turbo, target/)

**Gate:** `pnpm install` succeeds. `pnpm turbo --version` returns.
**Depends on:** Nothing
**Push:** Yes

---

### P1-B: Tauri v2 Desktop App Init

**Goal:** Native window opens with "Forge" displayed. Tauri + React + Vite + Tailwind.

**Files:**
- `apps/desktop/package.json` (react 19, vite 6, @tauri-apps/api, @tauri-apps/plugin-*)
- `apps/desktop/vite.config.ts` (Tauri host/port config)
- `apps/desktop/index.html`
- `apps/desktop/tsconfig.json`
- `apps/desktop/src/main.tsx`
- `apps/desktop/src/App.tsx` (dark bg, "Forge" centered text)
- `apps/desktop/src/styles/globals.css` (Tailwind v4 with @theme dark tokens)
- `apps/desktop/src-tauri/Cargo.toml` (tauri 2.x, serde, tokio, reqwest)
- `apps/desktop/src-tauri/tauri.conf.json` (window config, identifier, permissions)
- `apps/desktop/src-tauri/src/main.rs` (tauri::Builder entry)
- `apps/desktop/src-tauri/src/lib.rs` (module declarations)
- `apps/desktop/src-tauri/build.rs`
- `apps/desktop/src-tauri/capabilities/default.json`

**Gate:** `pnpm tauri dev` opens a native dark window with "Forge" displayed. No errors in terminal.
**Depends on:** P1-A, Rust toolchain
**Push:** Yes
**Notes:** Heaviest batch. ~13 files. All scaffolding — interdependent, must ship together.

---

### P1-C: Shared Types Package

**Goal:** `@forge-os/shared` package with core TypeScript types importable from the desktop app.

**Files (actual):**
- `packages/shared/package.json` (name: @forge-os/shared, main, types, exports)
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts` (barrel re-exports: personas, types)
- `packages/shared/src/personas.ts` (PERSONA_COLORS, PERSONA_NAMES, PERSONA_SHORT, PERSONA_DOMAINS, PERSONA_LABELS, PERSONA_GLYPHS, PERSONA_SLUG_SET, isPersonaSlug, PersonaSlug type)

**Note (PIERCE-CRIT-1 audit):** Original manifest listed types/message.ts, types/session.ts, etc. Actual structure consolidated into flat files — types defined directly in tauri.ts bridge, personas in personas.ts. types/ subdirectory exists but is empty.

**Gate:** `import { isPersonaSlug, PERSONA_COLORS } from '@forge-os/shared'` resolves in apps/desktop.
**Depends on:** P1-A
**Push:** Yes

---

### P1-D: Multi-Panel Layout

**Goal:** Six resizable dark panels. The spatial foundation of the app.

**Files:**
- `apps/desktop/src/components/layout/PanelLayout.tsx` (react-resizable-panels, 6 panels)
- `apps/desktop/src/components/panels/ChatPanel.tsx` (dark placeholder + label)
- `apps/desktop/src/components/panels/CanvasPanel.tsx` (dark placeholder + label)
- `apps/desktop/src/components/panels/PreviewPanel.tsx` (dark placeholder + label)
- `apps/desktop/src/components/panels/ConnectivityPanel.tsx` (dark placeholder + label)
- `apps/desktop/src/components/panels/TeamPanel.tsx` (dark placeholder + label)
- Update `App.tsx` to render PanelLayout

**Install:** react-resizable-panels

**Gate:** App shows 6 labeled dark panels. Panels resize by dragging dividers. Layout persists proportions.
**Depends on:** P1-B
**Push:** Yes

---

### P1-E: Custom Titlebar + System Tray

**Goal:** Frameless window with custom drag-region titlebar and system tray icon.

**Files:**
- `apps/desktop/src/components/layout/TitleBar.tsx` (app name, drag region, min/max/close buttons)
- Update `apps/desktop/src-tauri/tauri.conf.json` (decorations: false, transparent: false)
- Update `apps/desktop/src-tauri/src/main.rs` (system tray setup)
- `apps/desktop/src-tauri/icons/` (app icon — placeholder 32x32 png initially)
- Update `App.tsx` to include TitleBar above PanelLayout

**Gate:** No native chrome. Custom titlebar with working min/max/close. Drag to move. Tray icon visible.
**Depends on:** P1-D
**Push:** Yes

---

### P1-F: SQLite Schema + Database Layer

**Goal:** Local SQLite database with all core tables. Data persists across app restarts.

**Files:**
- Update `apps/desktop/src-tauri/Cargo.toml` (add tauri-plugin-sql, rusqlite or sqlx)
- `apps/desktop/src-tauri/src/database/mod.rs` (module)
- `apps/desktop/src-tauri/src/database/schema.rs` (CREATE TABLE statements)
- `apps/desktop/src-tauri/src/database/migrations.rs` (version-tracked migrations)
- `apps/desktop/src-tauri/src/database/queries.rs` (CRUD operations)
- Update `main.rs` to init database on startup

**Tables:**
```sql
sessions       (id, title, agent_id, provider_id, created_at, updated_at, status)
messages       (id, session_id, role, content, model, provider, tokens_in, tokens_out, created_at)
settings       (key, value, updated_at)
panel_layout   (id, config_json, is_active, created_at)
agent_state    (id, agent_slug, status, last_active, model_tier, metadata_json)
findings       (id, session_id, agent_slug, severity, category, description, evidence, status, created_at)
```

**Gate:** App launches, tables exist, can insert/query from Rust side. Data survives app restart.
**Depends on:** P1-B
**Push:** Yes

---

### P1-G: Rust Provider Abstraction

**Goal:** Engine-agnostic provider trait system. The interface every AI engine implements.

**Files:**
- `apps/desktop/src-tauri/src/providers/mod.rs` (module + re-exports)
- `apps/desktop/src-tauri/src/providers/traits.rs` (ModelProvider trait: send_message, stream_message, name, supports_streaming, max_context, capability_tier)
- `apps/desktop/src-tauri/src/providers/registry.rs` (ProviderRegistry: add, remove, get, get_for_tier, list)
- `apps/desktop/src-tauri/src/providers/config.rs` (ProviderConfig: api_key, base_url, model_mappings, tier_mappings)
- `apps/desktop/src-tauri/src/providers/types.rs` (ChatMessage, ChatResponse, StreamChunk, CapabilityTier enum)
- Update `lib.rs` to declare providers module

**Gate:** Compiles. ProviderRegistry can be instantiated. Trait is implementable. Tier mapping works.
**Depends on:** P1-B
**Push:** Yes

---

### P1-H: Claude Provider

**Goal:** Claude API integration via reqwest. Streaming SSE responses.

**Files:**
- `apps/desktop/src-tauri/src/providers/claude.rs` (implements ModelProvider: reqwest HTTP to api.anthropic.com, SSE streaming parser, model mapping: high->opus, medium->sonnet, fast->haiku)
- `apps/desktop/src-tauri/src/providers/claude_code.rs` (ClaudeCodeProvider: shells to `claude` CLI, no API key needed, uses operator's Claude Max plan — PIERCE-HIGH-1)
- `apps/desktop/src-tauri/src/providers/keychain.rs` (OS keychain integration for secure API key storage — TANAKA-HIGH-1 fix, added post-audit)
- Update `providers/mod.rs` to include claude, claude_code, keychain modules

**Gate:** Send a message with Claude API key configured. Get streaming response back. Tokens counted.
**Depends on:** P1-G
**Push:** Yes
**Notes:** Default provider is ClaudeCodeProvider (no key needed). API-key providers override if configured.

---

### P1-I: OpenAI-Compatible Provider

**Goal:** OpenAI-compatible API integration. Covers GPT, Gemini, Mistral, any OpenAI-shaped API.

**Files:**
- `apps/desktop/src-tauri/src/providers/openai.rs` (implements ModelProvider: reqwest HTTP to configurable base_url, SSE streaming, model mapping configurable per instance)
- Update `providers/mod.rs` to include openai module

**Gate:** Send a message to OpenAI API. Get streaming response. Can reconfigure base_url for other APIs.
**Depends on:** P1-G
**Push:** Yes

---

### P1-J: Tauri Commands + Message Persistence

**Goal:** Frontend can invoke Rust functions. Messages persist to SQLite. The bridge.

**Files:**
- `apps/desktop/src-tauri/src/commands/mod.rs` (module)
- `apps/desktop/src-tauri/src/commands/chat.rs` (send_message — routes to provider, streams via events, persists to SQLite)
- `apps/desktop/src-tauri/src/commands/sessions.rs` (list_sessions, get_session, create_session, delete_session)
- `apps/desktop/src-tauri/src/commands/providers.rs` (list_providers, set_default_provider, configure_provider)
- `apps/desktop/src-tauri/src/commands/agents.rs` (list_agents — scans .claude/agents/ directory, parses frontmatter)
- Update `main.rs` to register all commands + manage state (AppState with db + provider registry)

**Gate:** Frontend `invoke('send_message', {...})` sends to Claude, streams back via Tauri event. `invoke('list_sessions')` returns saved sessions. Messages persist to SQLite.
**Depends on:** P1-F (SQLite), P1-H (Claude provider), P1-G (registry)
**Push:** Yes
**Notes:** Integration batch. Everything connects here.

---

### P1-K: Chat Panel — Core Messaging

**Goal:** Type a message, get a streaming AI response with markdown rendering.

**Files:**
- `apps/desktop/src/lib/tauri.ts` (typed invoke/listen wrappers)
- `apps/desktop/src/hooks/useChat.ts` (send message, listen for stream events, manage message state)
- `apps/desktop/src/components/chat/MessageList.tsx` (scrollable message container, auto-scroll)
- `apps/desktop/src/components/chat/MessageBubble.tsx` (user/assistant styling, markdown rendering)
- `apps/desktop/src/components/chat/MessageInput.tsx` (textarea, submit on Enter, Shift+Enter for newline)
- Update `ChatPanel.tsx` to compose these components

**Install:** react-markdown, remark-gfm

**Gate:** Type message -> streaming response word-by-word -> markdown renders -> auto-scrolls -> messages visible after restart.
**Depends on:** P1-D (ChatPanel placeholder), P1-J (Tauri commands)
**Push:** Yes

---

### P1-L: Chat Panel — Complete (Personas, Providers, Sessions)

**Goal:** Full chat experience. Select persona, pick provider, browse session history.

**Files:**
- `apps/desktop/src/hooks/useProviders.ts` (list providers, switch provider, persist selection)
- `apps/desktop/src/hooks/useSessions.ts` (list sessions, create/switch/delete session)
- `apps/desktop/src/hooks/useAgents.ts` (list agents from directory scan, agent metadata)
- `apps/desktop/src/components/chat/PersonaSelector.tsx` (dropdown — populated from agent directory)
- `apps/desktop/src/components/chat/ProviderSelector.tsx` (dropdown — configured providers)
- `apps/desktop/src/components/chat/SessionSidebar.tsx` (session list, create new, switch, delete)
- Update `ChatPanel.tsx` to include selectors and sidebar

**Gate — Full proof-of-life:**
1. Alex opens app -> sees 6 panels, custom titlebar, tray icon
2. Types a message in Chat panel
3. Selects "Nyx" from persona dropdown
4. Selects "Claude" from provider dropdown
5. Gets streaming markdown response
6. Switches to OpenAI provider -> still works
7. Creates new session -> old messages preserved
8. Restarts app -> sessions and messages persist

**Depends on:** P1-K
**Push:** Yes

---

## Phase 1 Summary

| Batch | Name | Files | Session | Key Dependency |
|-------|------|-------|---------|----------------|
| P1-A | Monorepo Scaffold | 4 | 1.1 | None |
| P1-B | Tauri v2 Init | ~13 | 1.1 | P1-A + Rust |
| P1-C | Shared Types | 8 | 1.1 | P1-A |
| P1-D | Multi-Panel Layout | 7 | 1.2 | P1-B |
| P1-E | Custom Titlebar + Tray | 4 | 1.2 | P1-D |
| P1-F | SQLite Schema | 5 | 1.2 | P1-B |
| P1-G | Provider Abstraction | 6 | 1.3 | P1-B |
| P1-H | Claude Provider | 1 | 1.3 | P1-G |
| P1-I | OpenAI Provider | 1 | 1.3 | P1-G |
| P1-J | Tauri Commands | 6 | 1.3 | P1-F + P1-H |
| P1-K | Chat Core | 6 | 1.3 | P1-D + P1-J |
| P1-L | Chat Complete | 7 | 1.3 | P1-K |
| **Total** | | **~68 files** | **3 sessions** | |

### Session Boundaries

- **Session 1.1 (P1-A -> P1-C):** Monorepo + Tauri + shared types. Gate: `pnpm tauri dev` opens window.
- **Session 1.2 (P1-D -> P1-F):** Panels + titlebar + SQLite. Gate: 6 panels visible, DB initialized.
- **Session 1.3 (P1-G -> P1-L):** Providers + commands + chat. Gate: Full proof-of-life.

### Parallel Opportunities

- P1-C (shared types) can run parallel with P1-B (Tauri init) — no dependency
- P1-F (SQLite) can run parallel with P1-D/P1-E (layout/titlebar) — both depend on P1-B only
- P1-H and P1-I (Claude + OpenAI providers) can run parallel — both depend on P1-G only

### Risk Notes

- **Tauri v2 on Windows:** Known issues with WebView2. If `pnpm tauri dev` fails, check WebView2 runtime.
- **SSE streaming in Rust:** reqwest + eventsource parsing is non-trivial. May need `reqwest-eventsource` or `eventsource-stream` crate.
- **Tailwind v4:** CSS-first config, no tailwind.config.js. `@theme` block in CSS.
- **React 19:** Stable but newer — check Tauri plugin compatibility.

---

## Phase 2: Content Layer (20 batches)

**Session map:** 2.1 = P2-A through P2-D | 2.2 = P2-E through P2-H | 2.3 = P2-I through P2-L | 2.4 = P2-M through P2-P | 2.5 = P2-Q through P2-T
**Prerequisite:** None (PARALLEL TRACK — zero app code dependencies)
**Repo:** CYM4TIC/forge-OS | **Local:** `.`
**Source material:** DMS vault agents at `.claude/agents/`, `.claude/commands/`, `02-team-logs/` personas. Claude Code source at `/tmp/src-explore/src/`.

**Goal:** 105 genericized agents, 13 external reference extractions, model tiering, persona enhancements, 30 commands, quality layer. The complete brain of the OS — project-agnostic, engine-agnostic.

**Genericization rules:**
- Strip ALL DMS-specific references (table names, RPCs, segments, bible paths, Supabase specifics)
- Replace with config-driven references (`{{project.schema}}`, `{{project.spec_dir}}`, etc.)
- Keep methodology, rules, checklists, personality, failure modes, relationships
- Keep tool declarations but make them conditional on project type
- Add `model:` frontmatter to every agent (high/medium/fast)

---

### P2-A: References Directory — Claude Code + Anthropic SDK

**Goal:** Extract architectural patterns from Claude Code source. The most important reference — we're building the same category of tool.

**Files:**
- `references/claude-code/NOTES.md` — Architecture summary, key patterns, design decisions
- `references/claude-code/tool-interface.md` — Tool definition contract (Zod schema + run generator + permission model)
- `references/claude-code/coordinator-pattern.md` — Multi-agent dispatch with isolated contexts
- `references/claude-code/skill-system.md` — Bundled + disk-based + MCP skill loading, `getPromptForCommand()` pattern
- `references/claude-code/state-management.md` — Zustand-like store, generator streaming, file state cache
- `references/claude-code/permission-model.md` — Three modes, hook-based auto-approve, tool-level validation
- `references/claude-code/memory-system.md` — memdir architecture, MEMORY.md index, topic files, truncation
- `references/claude-agent-sdk/NOTES.md` — API patterns, parallel execution, agent spawning

**Source:** `/tmp/src-explore/src/` (Claude Code source zip)
**Gate:** Each NOTES.md has actionable patterns, not just descriptions. Cross-referenced to Forge OS equivalents.
**Depends on:** Nothing
**Push:** Yes

---

### P2-B: References Directory — Security + Design Intelligence

**Goal:** Extract security and UX/design reference material from external repos.

**Files:**
- `references/trail-of-bits/NOTES.md` — Summary of 18 security SKILL.md patterns (static analysis, supply chain, OWASP)
- `references/trail-of-bits/skills/` — Key skill files extracted (top 5-8 most relevant)
- `references/ui-ux-pro-max/NOTES.md` — Summary of 161 reasoning rules, 99 UX guidelines, anti-patterns
- `references/ui-ux-pro-max/reasoning-rules.md` — Curated top 50 rules (most actionable for Forge)
- `references/ui-ux-pro-max/pre-delivery-checklist.md` — Full checklist adapted for Build Triad
- `references/ui-ux-pro-max/palettes.md` — Dark theme palettes relevant to Forge

**Source:** GitHub repos (trailofbits/skills, various UI/UX repos)
**Gate:** Tanaka can reference Trail of Bits. Mara can reference UX Pro Max. Both NOTES.md have "How to use in Forge" sections.
**Depends on:** Nothing
**Push:** Yes

---

### P2-C: References Directory — Skills + Ecosystem Patterns

**Goal:** Extract skill patterns and ecosystem intelligence.

**Files:**
- `references/antigravity/NOTES.md` — Summary of 5 skill directories (postgres, security, nextjs, stripe, tailwind)
- `references/antigravity/skills/` — Extracted skill content (adapted for Forge structure)
- `references/ruflo/NOTES.md` — Token optimization, anti-drift, self-learning loop, agent booster patterns
- `references/wshobson-agents/NOTES.md` — Model tiering rationale, progressive disclosure, plugin eval framework
- `references/rosehill/NOTES.md` — CLAUDE.md turnstile pattern, agent junction, workspace model

**Source:** GitHub repos
**Gate:** Each NOTES.md answers: "What does Forge OS take from this?" with specific integration points.
**Depends on:** Nothing
**Push:** Yes

---

### P2-D: References Directory — Integration + Platform Tools

**Goal:** Extract integration platform references and complete the references directory.

**Files:**
- `references/pretext/NOTES.md` — API patterns, measurement primitives, canvas rendering contract
- `references/lightrag/NOTES.md` — MCP tool docs (22 tools), RAG pipeline setup
- `references/n8n/NOTES.md` — Capabilities, MCP bridge, automation patterns
- `references/anthropic-plugins/NOTES.md` — Plugin catalog, connector mapping, SDK patterns
- `references/ecosystem/NOTES.md` — Top 100 triage, categorized by relevance to Forge
- `references/INDEX.md` — Master index of all 13 reference sources with one-line summaries

**Source:** GitHub repos, documentation sites
**Gate:** `references/INDEX.md` exists with all 13 entries. Every subdirectory has NOTES.md.
**Depends on:** P2-A, P2-B, P2-C (for complete index)
**Push:** Yes

---

### P2-E: Core Personas — Nyx + Pierce + Kehinde (3 agents)

**Goal:** Genericize the three build-critical personas. These are the hardest — most DMS-specific.

**Files (per persona):**
- `agents/nyx.md` — Build orchestrator, stripped of DMS tables/RPCs/segments. Config-driven spec refs.
- `agents/pierce.md` — QA/conformance, generic spec-adherence (not DMS bible). Config-driven ADL ref.
- `agents/kehinde.md` — Systems architecture, generic failure mode analysis. Config-driven schema ref.

**Genericization approach:**
- Replace `06-bible-segments/` → `{{project.spec_dir}}/`
- Replace `supabase:execute_sql` → `{{project.db_tool}}` (conditional on project type)
- Replace DMS table names → `{{project.schema}}` pattern references
- Replace `DISTILLED-ADL.md` → `{{project.adl_path}}`
- Keep ALL rules, failure modes, checklists, personality
- Add `model: high` frontmatter to all three

**Gate:** Each agent file compiles as valid Claude Code agent (frontmatter + prompt). No DMS-specific strings remain.
**Depends on:** Nothing
**Push:** Yes

---

### P2-F: Core Personas — Security + Legal + Finance (3 agents)

**Goal:** Genericize Tanaka, Voss, Vane.

**Files:**
- `agents/tanaka.md` — Security/compliance. Generic RLS/auth/PII/TCPA patterns. Wire Trail of Bits ref.
- `agents/voss.md` — Platform legal. Generic TOS/consent/compliance. Remove DMS-specific rulings.
- `agents/vane.md` — Financial architecture. Generic rate/pricing/payment patterns. Remove Forge DMS specifics.

**Genericization approach:**
- Tanaka: Replace DMS RPC names with pattern descriptions. Keep OWASP, RLS, PII scanning methodology.
- Voss: Remove all V-ASSESSMENT rulings. Keep legal review framework, consent patterns, TOS structure.
- Vane: Replace `get_effective_rate()` specifics with generic financial audit patterns. Keep Stripe ref.
- Add `model: high` (Tanaka, Vane), `model: medium` (Voss) frontmatter

**Gate:** No DMS-specific strings. Each agent's domain expertise preserved.
**Depends on:** P2-B (Trail of Bits ref for Tanaka)
**Push:** Yes

---

### P2-G: Core Personas — UX + Design + Brand + Growth (4 agents)

**Goal:** Genericize Mara, Riven, Sable, Calloway.

**Files:**
- `agents/mara.md` — UX evaluation. Generic 10-item checklist. Wire UI UX Pro Max ref.
- `agents/riven.md` — Design systems. Generic token/component/a11y audit. Wire Tailwind ref.
- `agents/sable.md` — Brand voice. Generic voice consistency, copy quality.
- `agents/calloway.md` — Growth strategy. Generic GTM, competitive analysis, pricing.

**Genericization approach:**
- Mara: Replace DMS component refs with generic patterns. Keep a11y, interaction, mobile checklists.
- Riven: Replace `--forge-*` tokens with `{{project.design_tokens}}`. Keep touch target rules, theme checks.
- Sable: Remove DMS voice specifics. Keep voice consistency methodology.
- Calloway: Remove DMS competitors. Keep competitive analysis framework.
- Add `model: medium` frontmatter to all four

**Gate:** No DMS-specific strings. Methodology preserved. References wired.
**Depends on:** P2-B (UI UX Pro Max ref for Mara)
**Push:** Yes

---

### P2-H: Intelligences — Scout + Sentinel + Wraith + Meridian + Chronicle (5 agents)

**Goal:** Genericize the 5 build-pipeline intelligences.

**Files:**
- `agents/scout.md` — Pre-build intelligence. Generic schema recon, open findings scan.
- `agents/sentinel.md` — Regression guardian. Generic route verification, post-push checks.
- `agents/wraith.md` — Red team. Generic input fuzzing, auth probing, concurrency attacks.
- `agents/meridian.md` — Cross-surface consistency. Generic pattern cataloging, drift detection.
- `agents/chronicle.md` — Build historian. Generic velocity, finding patterns, retrospectives.

**Genericization approach:**
- Replace DMS route paths with `{{project.routes}}` patterns
- Replace Supabase-specific tools with conditional tool blocks
- Keep all attack vectors (Wraith), scanning patterns (Sentinel), consistency rules (Meridian)
- Add `model: medium` (Scout, Wraith, Meridian, Chronicle), `model: fast` (Sentinel)

**Gate:** No DMS strings. Each intelligence's core methodology intact.
**Depends on:** Nothing
**Push:** Yes

---

### P2-I: Intelligences — Arbiter + Compass + Scribe + Kiln + Beacon (5 agents)

**Goal:** Genericize the 5 analysis/monitoring intelligences.

**Files:**
- `agents/arbiter.md` — Decision council chairman. Already mostly generic. Add `model: high`.
- `agents/compass.md` — Impact analysis. Generic dependency graph mapping. Config-driven schema.
- `agents/scribe.md` — Knowledge synthesis. Generic documentation generation.
- `agents/kiln.md` — Performance. Generic query profiling, bundle analysis, render bottlenecks.
- `agents/beacon.md` — Post-deploy watchdog. Generic error log monitoring, anomaly detection.

**Gate:** No DMS strings. Domain-agnostic analysis patterns.
**Depends on:** Nothing
**Push:** Yes

---

### P2-J: Orchestrators — All 10

**Goal:** Genericize all orchestrator agents that coordinate multi-agent workflows.

**Files:**
- `agents/triad.md` — Build Triad (Pierce+Mara+Riven). Generic frontend gate.
- `agents/systems-triad.md` — Systems Triad (Kehinde+Tanaka+Vane). Generic backend gate.
- `agents/strategy-triad.md` — Strategy Triad (Calloway+Voss+Sable). Generic business gate.
- `agents/gate-runner.md` — Full gate orchestrator. Config-driven gate mapping.
- `agents/council.md` — All 10 personas architectural review.
- `agents/decision-council.md` — 5 cognitive-lens advisors + Arbiter. Already mostly generic.
- `agents/debate.md` — 2-persona structured debate. Already generic.
- `agents/full-audit.md` — Nuclear quality pass. Generic all-triads dispatch.
- `agents/launch-sequence.md` — Pre-launch go/no-go. Generic launch checklist.
- `agents/postmortem.md` — Blameless incident analysis. Already mostly generic.

**Genericization approach:**
- Replace DMS-specific gate mappings with config-driven `{{project.gate_config}}`
- Replace specific route/surface references with generic patterns
- Keep dispatch patterns, finding aggregation, severity classification

**Gate:** All 10 orchestrators compile. No DMS strings. Dispatch patterns preserved.
**Depends on:** P2-E through P2-I (personas they orchestrate must exist)
**Push:** Yes

---

### P2-K: Customer Lens + Utilities — 11 agents

**Goal:** Genericize customer lens and all 10 utility agents.

**Files:**
- `agents/customer-lens.md` — Already domain-agnostic. Clean up any DMS examples.
- `agents/seed-generator.md` — Generic test data generation. Config-driven schema.
- `agents/test-generator.md` — Generic smoke test scripts.
- `agents/api-docs.md` — Generic RPC documentation.
- `agents/launch-readiness.md` — Generic blocker/risk cross-reference.
- `agents/onboarding.md` — Generic vault/codebase walkthrough.
- `agents/scaffold.md` — Generic boilerplate generation.
- `agents/changelog.md` — Generic release notes from git history.
- `agents/dep-audit.md` — Generic dependency audit.
- `agents/env-validator.md` — Generic env var checking.
- `agents/migration-planner.md` — Generic migration SQL generation.

**Gate:** All 11 agents compile. No DMS strings.
**Depends on:** Nothing
**Push:** Yes

---

### P2-L: Sub-Agents — All 34

**Goal:** Genericize all focused sub-agent checkers.

**Files (34 total, in `agents/sub-agents/`):**
- Pierce sub-agents (3): `pierce-adl-audit.md`, `pierce-field-presence.md`, `pierce-rpc-shape.md`
- Mara sub-agents (3): `mara-accessibility.md`, `mara-interaction.md`, `mara-mobile.md`
- Riven sub-agents (3): `riven-theme-check.md`, `riven-token-audit.md`, `riven-touch-targets.md`
- Kehinde sub-agents (4): `kehinde-failure-modes.md`, `kehinde-migration-validator.md`, `kehinde-race-conditions.md`, `kehinde-schema-drift.md`
- Tanaka sub-agents (3): `tanaka-pii-scan.md`, `tanaka-rls-audit.md`, `tanaka-tcpa-check.md`
- Sable sub-agents (1): `sable-voice-consistency.md`
- Compass sub-agents (2): `compass-change-impact.md`, `compass-dependency-map.md`
- Kiln sub-agents (2): `kiln-bundle-analyzer.md`, `kiln-query-profiler.md`
- Beacon sub-agents (2): `beacon-error-watch.md`, `beacon-performance-watch.md`
- Calloway sub-agents (1): `calloway-competitive-scan.md`
- Meridian sub-agents (1): `meridian-pattern-scan.md`
- Wraith sub-agents (3): `wraith-auth-probe.md`, `wraith-concurrency.md`, `wraith-input-fuzzer.md`
- Council advisors (5): `council-contrarian.md`, `council-executor.md`, `council-expansionist.md`, `council-first-principles.md`, `council-outsider.md`
- Instrumentation (1): `instrumentation-audit.md`

**Genericization:** Strip DMS table/RPC refs. Keep methodology. Add `model: fast` to all.
**Gate:** All 34 compile. No DMS strings.
**Depends on:** Nothing (sub-agents are self-contained)
**Push:** Yes (2 pushes — max 20 files each)

---

### P2-M: Model Tiering System

**Goal:** Formalize model tiering across all agents. Document rationale. Add enforcement.

**Files:**
- `forge/MODEL-TIERING.md` — Full tiering document:
  - Tier definitions: high (opus-class), medium (sonnet-class), fast (haiku-class)
  - Per-agent tier assignments with rationale
  - Cost estimation model (tokens × tier rate)
  - Override mechanism (user can promote/demote for specific tasks)
  - Validation: agents without `model:` frontmatter = error
- `forge/AGENT-MANIFEST.md` — Complete agent inventory (105 entities, tier, domain, parent)
- Verify ALL agent files have `model:` frontmatter (scan + fix)

**Gate:** `forge/AGENT-MANIFEST.md` lists all 105 entities. Every agent file has valid `model:` frontmatter.
**Depends on:** P2-E through P2-L (all agents must exist)
**Push:** Yes

---

### P2-N: Slash Commands — Build + Quality (15 commands)

**Goal:** Genericize the build and quality slash commands.

**Files (in `commands/`):**
- Build: `gate.md`, `next-batch.md`, `verify.md`, `adversarial.md`, `batch-status.md`, `scaffold.md`
- Quality: `regression.md`, `consistency.md`, `red-team.md`, `audit.md`, `perf.md`
- Analysis: `impact.md`, `deps.md`, `env-check.md`, `postmortem.md`

**Genericization:** Replace DMS-specific build loops with config-driven references. Keep command signatures and dispatch patterns.
**Gate:** All 15 commands have valid frontmatter. No DMS strings.
**Depends on:** P2-E through P2-J (commands dispatch agents)
**Push:** Yes

---

### P2-O: Slash Commands — Persona + Reporting + Operations (15 commands)

**Goal:** Genericize the remaining slash commands.

**Files (in `commands/`):**
- Persona: `wake.md`, `council.md`, `decide.md`, `customer-lens.md`, `findings.md`
- Reporting: `retro.md`, `launch-check.md`, `tech-debt.md`, `demo.md`, `changelog.md`
- Operations: `launch.md`, `onboard.md`, `seed.md`, `api-docs.md`, `parallel-build.md`

**Gate:** All 15 commands compile. No DMS strings. Full 30-command set complete.
**Depends on:** P2-E through P2-J
**Push:** Yes

---

### P2-P: Skills + Quality Layer

**Goal:** Install skills, wire references into agent boots, formalize quality enforcement.

**Files:**
- `.claude/skills/postgres-best-practices/SKILL.md` — Adapted from Antigravity
- `.claude/skills/security-auditor/SKILL.md` — Adapted from Antigravity + Trail of Bits
- `.claude/skills/nextjs-best-practices/SKILL.md` — Adapted from Antigravity
- `.claude/skills/stripe-integration/SKILL.md` — Adapted from Antigravity
- `.claude/skills/tailwind-design-system/SKILL.md` — Adapted from Antigravity
- `docs/DESIGN-INTELLIGENCE.md` — Curated from UI UX Pro Max (for Mara/Riven)
- `docs/ECOSYSTEM-PATTERNS.md` — Ruflo token optimization + anti-drift + self-learning loop
- `docs/ECOSYSTEM-INTEL.md` — Full triage of 13 external sources

**Gate:** Each skill can be invoked. Agent boot sequences reference relevant skills. Quality docs complete.
**Depends on:** P2-B, P2-C (reference sources), P2-E through P2-G (agent wiring)
**Push:** Yes

---

### P2-Q: Persona Identity Sets — Nyx + Pierce + Kehinde + Tanaka + Vane

**Goal:** Export the 5 high-tier persona identity sets from DMS vault.

**Files (per persona, in `personas/{name}/`):**
- `PERSONA.md` — Identity, rules, checklists (genericized)
- `PERSONALITY.md` — Voice, humor, backstory (kept as-is — personality is universal)
- `INTROSPECTION.md` — Self-awareness, failure modes (genericized)
- `RELATIONSHIPS.md` — Cross-persona dynamics (kept — names don't change)

**Genericization:** Strip DMS batch refs from PERSONA.md. Strip DMS table refs from INTROSPECTION.md. Personality and relationships are already universal.
**Gate:** 5 persona directories, 4 files each = 20 files. No DMS build state.
**Depends on:** Nothing (source is DMS vault, output is Forge OS)
**Push:** Yes

---

### P2-R: Persona Identity Sets — Mara + Riven + Sable + Calloway + Voss

**Goal:** Export the 5 medium-tier persona identity sets.

**Files:** Same structure as P2-Q, 5 personas × 4 files = 20 files.

**Gate:** 5 persona directories complete. No DMS build state.
**Depends on:** Nothing
**Push:** Yes

---

### P2-S: Templates + Protocols

**Goal:** Adapt templates and protocols for Forge OS structure.

**Files:**
- `templates/SESSION-HANDOFF-TEMPLATE.md`
- `templates/GATE-ENFORCEMENT-TEMPLATE.md`
- `templates/AGENT-BRIEF-TEMPLATE.md`
- `templates/BUILD-REPORT-TEMPLATE.md`
- `templates/RETROSPECTIVE-TEMPLATE.md`
- `templates/DECISION-RECORD-TEMPLATE.md`
- `templates/PROJECT-SCAFFOLD-TEMPLATE.md` (includes optional layout-engine when Pretext detected)
- `protocols/COLLABORATION-PROTOCOL.md`
- `protocols/PARTY-MODE.md`
- `protocols/RETROSPECTIVE-PROTOCOL.md`
- `protocols/PERSONALITY-MAINTENANCE.md`
- `examples/sample-adl.md`
- `examples/sample-manifest.md`
- `examples/sample-gate-report.md`
- `examples/sample-build-learnings.md`

**Genericization:** Replace DMS vault paths with Forge OS paths. Replace DMS-specific fields with config-driven placeholders.
**Gate:** All 15 files created. Templates are usable for any project type.
**Depends on:** Nothing
**Push:** Yes

---

### P2-T: CLAUDE.md + Integration Verification

**Goal:** Write the Forge OS CLAUDE.md (the bridge file) and verify all 105 entities work together.

**Files:**
- `CLAUDE.md` — Forge OS version. Auto-loaded by Claude Code. References all agents, commands, skills, protocols, templates. Config-driven project type detection.
- `forge/ACTIVATION-GUIDE.md` — How to activate Forge OS on a new project (`/init` flow)
- `forge/ENTITY-CATALOG.md` — Complete catalog of all 105 entities with descriptions, tiers, dependencies

**Verification:**
- Scan all agent files for residual DMS strings (grep for "forge-dms", "bible", "supabase", etc.)
- Verify all `model:` frontmatter present
- Verify all command → agent dispatch chains
- Verify all sub-agent → parent references
- Count: should be 105 entities (10 personas + 10 intelligences + 10 orchestrators + 1 customer-lens + 10 utilities + 34 sub-agents + 30 commands)

**Gate:** CLAUDE.md loads cleanly. Zero DMS residue. 105 entities cataloged.
**Depends on:** ALL prior P2 batches
**Push:** Yes

---

## Phase 2 Summary

| Batch | Name | Files | Session | Key Dependency |
|-------|------|-------|---------|----------------|
| P2-A | Refs: Claude Code + SDK | 8 | 2.1 | None |
| P2-B | Refs: Security + Design | 6 | 2.1 | None |
| P2-C | Refs: Skills + Ecosystem | 5 | 2.1 | None |
| P2-D | Refs: Integration + Index | 6 | 2.1 | P2-A/B/C |
| P2-E | Personas: Nyx+Pierce+Kehinde | 3 | 2.2 | None |
| P2-F | Personas: Tanaka+Voss+Vane | 3 | 2.2 | P2-B |
| P2-G | Personas: Mara+Riven+Sable+Calloway | 4 | 2.2 | P2-B |
| P2-H | Intelligences: Pipeline 5 | 5 | 2.2 | None |
| P2-I | Intelligences: Analysis 5 | 5 | 2.3 | None |
| P2-J | Orchestrators: All 10 | 10 | 2.3 | P2-E through P2-I |
| P2-K | Customer Lens + Utilities | 11 | 2.3 | None |
| P2-L | Sub-Agents: All 34 | 34 | 2.3 | None |
| P2-M | Model Tiering System | 2 | 2.4 | P2-E through P2-L |
| P2-N | Commands: Build+Quality 15 | 15 | 2.4 | P2-E through P2-J |
| P2-O | Commands: Persona+Ops 15 | 15 | 2.4 | P2-E through P2-J |
| P2-P | Skills + Quality Layer | 8 | 2.4 | P2-B/C, P2-E/G |
| P2-Q | Persona IDs: High-tier 5 | 20 | 2.5 | None |
| P2-R | Persona IDs: Medium-tier 5 | 20 | 2.5 | None |
| P2-S | Templates + Protocols | 15 | 2.5 | None |
| P2-T | CLAUDE.md + Verification | 3 | 2.5 | ALL |
| **Total** | | **~198 files** | **5 sessions** | |

### Session Boundaries

- **Session 2.1 (P2-A → P2-D):** References directory complete. 13 sources extracted. INDEX.md.
- **Session 2.2 (P2-E → P2-H):** 10 core personas + 5 pipeline intelligences genericized.
- **Session 2.3 (P2-I → P2-L):** 5 analysis intelligences + 10 orchestrators + 11 utilities + 34 sub-agents.
- **Session 2.4 (P2-M → P2-P):** Model tiering + 30 commands + 5 skills + quality layer.
- **Session 2.5 (P2-Q → P2-T):** 10 persona identity sets + templates + CLAUDE.md + final verification.

### Parallel Opportunities

- P2-A, P2-B, P2-C can all run in parallel (independent reference extractions)
- P2-E, P2-F, P2-G, P2-H can run in parallel (independent agent genericizations)
- P2-I, P2-K, P2-L can run in parallel (no cross-dependencies)
- P2-Q, P2-R, P2-S can run in parallel (independent content)
- P2-N and P2-O can run in parallel (independent command sets)

### Risk Notes

- **Genericization depth:** Some agents are deeply DMS-entangled (especially Nyx, Pierce). May need iterative passes.
- **Claude Code source:** Extracted to /tmp — ephemeral. P2-A must capture everything needed into references/.
- **105 entity count:** Final count may shift slightly if sub-agents are merged or split during genericization.
- **Config placeholders:** `{{project.*}}` syntax needs to be consistent across all agents. Define schema in P2-T.

---

## Phase 3: Agent Runtime (12 batches, 3 sessions)

> Original Phase 3 (Pretext Layout Engine) pushed to Phase 4.
> Runtime is more critical than rendering — the OS needs to think before it can draw.
> Architecture roadmap: `docs/PHASE-3-ARCHITECTURE.md`

### Session 3.1 — Foundation: SQLite + Agent Dispatch

#### P3-A: Tauri Dev Verification + SQLite v2 Migration

Goal: Verify `pnpm tauri dev` works (OS-BL-002 resolved), then extend SQLite for Phase 3.

Files:
- `database/schema.rs` — extend with v2 tables
- `database/migrations.rs` — add v2 migration path

New tables: memory_logs, memory_topics, mailbox, batches, risks, session_summaries
Verification: `pnpm tauri dev` compiles and launches. Screenshot proof.
Gate: App runs. SQLite v2 migration applies cleanly.
Push: Yes

#### P3-B: Agent Dispatch Core (Rust Backend)

Goal: Build the forked agent system — the core runtime primitive.

Files:
- `src-tauri/src/dispatch/mod.rs` — AgentDispatcher struct, public API
- `src-tauri/src/dispatch/cache.rs` — Prompt cache (HashMap by content hash)
- `src-tauri/src/dispatch/context.rs` — Isolated ToolUseContext per agent
- `src-tauri/src/dispatch/lifecycle.rs` — spawn → track → complete/timeout/cancel
- `src-tauri/src/dispatch/types.rs` — AgentRequest, AgentResult, DispatchConfig

Tauri commands: dispatch_agent, get_agent_status, list_active_agents, cancel_agent
Constants: AGENT_BACKGROUND_TIMEOUT_MS=120_000, MAX_CONCURRENT_AGENTS=10
Gate: Agent dispatch command works, lifecycle tracked in SQLite.
Depends on: P3-A
Push: Yes

#### P3-C: Agent Dispatch UI (React)

Goal: Agent activity visible in TeamPanel.

Files:
- `apps/desktop/src/components/team/AgentStatusPanel.tsx` — color-coded status indicators
- `apps/desktop/src/components/team/AgentCard.tsx` — name, status, duration timer
- `apps/desktop/src/components/team/AgentResultViewer.tsx` — completed agent results
- `apps/desktop/src/components/team/DispatchLog.tsx` — scrollable dispatch log
- `apps/desktop/src/hooks/useAgentDispatch.ts` — listen for dispatch events
- **Note (PIERCE-MED-2):** useAgentResults consolidated into useAgentBoard.ts (hooks/useAgentBoard.ts) — no separate useAgentResults file

Wire into: TeamPanel (replace stub)
Gate: TeamPanel shows live agent status. Events stream correctly.
Depends on: P3-B
Push: Yes

#### P3-D: Build State Manager (Rust)

Goal: SQLite-backed build state, BOOT.md as generated view.

Files:
- `src-tauri/src/build_state/mod.rs` — BuildStateManager struct
- `src-tauri/src/build_state/batches.rs` — Batch CRUD
- `src-tauri/src/build_state/findings.rs` — Finding CRUD
- `src-tauri/src/build_state/risks.rs` — Risk CRUD
- `src-tauri/src/build_state/generator.rs` — generate_boot_md()

Tauri commands: get_build_state, create_batch, complete_batch, add_finding, resolve_finding, generate_boot_md
Gate: Build state queryable. BOOT.md generation produces valid markdown.
Depends on: P3-A
Push: Yes

---

### Session 3.2 — Memory + Communication

#### P3-E: KAIROS Daily-Log Memory (Rust)

Goal: Append-only memory system with 4-type taxonomy.

Files:
- `src-tauri/src/memory/mod.rs` — MemoryManager struct
- `src-tauri/src/memory/logs.rs` — daily log operations
- `src-tauri/src/memory/topics.rs` — topic file CRUD
- `src-tauri/src/memory/index.rs` — MEMORY.md index generation
- `src-tauri/src/memory/types.rs` — MemoryType, MemoryEntry

Tauri commands: append_memory, query_memory, get_memory_index, get_daily_log
Constants: MEMORY_MAX_LINES=200, MEMORY_MAX_SIZE_KB=25
Gate: Memory appends persist. Index generates correctly. Query returns results.
Depends on: P3-A
Push: Yes

#### P3-F: Dream Consolidation Engine (Rust Background Task)

Goal: Nightly 4-phase consolidation — Orient → Gather → Consolidate → Prune.

Files:
- `src-tauri/src/memory/dream.rs` — DreamEngine + 4-phase pipeline
- Update `lib.rs` — register background task via tokio::spawn

Trigger conditions: 24h+ since last, 5+ sessions, no concurrent dream
SQLite advisory lock prevents races
Tauri commands: trigger_dream, get_dream_status
Gate: Dream runs manually. Consolidation produces topic files. MEMORY.md regenerated.
Depends on: P3-E
Push: Yes

#### P3-G: Swarm Mailbox (Rust)

Goal: Inter-agent message bus with typed messages.

Files:
- `src-tauri/src/swarm/mod.rs` — SwarmManager struct
- `src-tauri/src/swarm/mailbox.rs` — send/receive/query
- `src-tauri/src/swarm/types.rs` — 5 message types
- `src-tauri/src/swarm/permissions.rs` — permission request/response flow

Tauri commands: swarm_send, swarm_get_messages, swarm_mark_read, swarm_respond_permission
Tauri events: `swarm-message` emitted on new message
Gate: Messages persist. Events emit. Permission flow completes.
Depends on: P3-A
Push: Yes

#### P3-H: Communication UI (React)

Goal: Agent communication visible + permission approval.

Files:
- `components/team/PermissionModal.tsx` — approve/deny with context
- `components/team/MessageFeed.tsx` — real-time agent message stream
- `components/team/MailboxBadge.tsx` — unread count
- `components/team/AgentPresence.tsx` — online/active/idle
- `hooks/useSwarmMessages.ts` — subscribe to swarm-message events
- `hooks/usePermissions.ts` — pending permission queue

Wire into: TeamPanel
Gate: Permission modal appears on request. Messages stream in real-time.
Depends on: P3-G, P3-C
Push: Yes

---

### Session 3.3 — Compaction + Integration

#### P3-I: Auto-Compact Engine (Rust)

Goal: Automatic context management at 85% threshold.

Files:
- `src-tauri/src/compact/mod.rs` — CompactionEngine struct
- `src-tauri/src/compact/counter.rs` — token approximation
- `src-tauri/src/compact/threshold.rs` — 85% detection + trigger
- `src-tauri/src/compact/summary.rs` — 9-section summary generation
- `src-tauri/src/compact/restore.rs` — post-compact file restoration

Constants: POST_COMPACT_TOKEN_BUDGET=50_000, MAX_FILES_TO_RESTORE=5, MAX_TOKENS_PER_FILE=5_000
Tauri commands: get_context_usage, trigger_compact, get_last_summary
Gate: Token counter accurate. Auto-compact triggers at threshold. Summary stored.
Depends on: P3-A, P3-B (dispatches compaction agent)
Push: Yes

#### P3-J: Context Management UI (React)

Goal: Visual context window management.

Files:
- `components/status/ContextMeter.tsx` — token usage bar (green/yellow/red)
- `components/status/CompactionIndicator.tsx` — compacting animation
- `components/status/SummaryViewer.tsx` — read compaction summaries
- `components/status/SessionContinuity.tsx` — continuation indicator
- `hooks/useContextUsage.ts` — poll context usage

Wire into: Status bar area (near titlebar or ChatPanel bottom)
Gate: Context meter updates live. Compaction visible to operator.
Depends on: P3-I
Push: Yes

#### P3-K: TeamFile Manager + Persistent Sessions

Goal: Per-persona configuration + crash recovery.

Files:
- `apps/desktop/src-tauri/src/swarm/team_file.rs` — TeamFile JSON management
- `apps/desktop/src-tauri/src/database/checkpoints.rs` — session checkpoint save/get/resume/clear (PIERCE-MED-3)
- `apps/desktop/src-tauri/src/commands/team.rs` — Tauri command wrappers

Tauri commands: get_team_config, update_team_member, save_checkpoint, get_checkpoint, get_resume_candidate, clear_checkpoint
Persistent sessions: SQLite checkpoint after each message, resume dialog on startup
Gate: Team config loads/saves. Interrupted session detected and resumable.
Depends on: P3-G
Push: Yes

#### P3-L: Integration Testing + Verification

Goal: End-to-end verification of all Phase 3 systems.

Tests:
1. Dispatch agent → result in SQLite → UI updates
2. Memory append → dream consolidation → MEMORY.md regenerated
3. Swarm message → mailbox → UI notification
4. Token threshold → auto-compact → summary stored
5. Batch created → finding logged → BOOT.md generated

Verification: pnpm tauri dev clean. All panels render with real content. All commands respond.
Gate: Screenshot proof of running app with agent dispatch + memory + mailbox + context meter.
Push: Yes (final Phase 3 push)

---

### Phase 3 Risks
- **Rust async complexity:** tokio + Tauri async model may have surprises with background tasks
- **SQLite concurrency:** Multiple async tasks writing to same database — need connection pooling or mutex
- **Token counting accuracy:** Character-based approximation may drift from actual token count
- **Tauri v2 event system:** Real-time events for swarm messages need testing under load

---

## Phase 4: Runtime Upgrades + Window Manager + Pretext + Document Generation (20 batches, 5 sessions)

> Harden Phase 3 runtime with repo mining patterns, then build the spatial foundation (floating window manager),
> the canvas rendering primitive (Pretext), and the dual-output document engine.
> Every visual component in Phases 5-9 depends on this phase being right.
> Build plan: `docs/TAURI-BUILD-PLAN.md` Phase 4 section.

**Session map:** 4.0 = P4-A through P4-E | 4.1 = P4-F through P4-I | 4.2 = P4-J through P4-L | 4.3 = P4-M through P4-P | 4.4 = P4-Q through P4-T
**Prerequisite:** Phase 3 COMPLETE + AUDITED. `tauri build` green. Commit `0c95cc8`.
**Repo:** CYM4TIC/forge-OS | **Local:** `.repo/`

---

### Session 4.0 — Runtime Upgrades (Post-Phase-3 Hardening)

Retroactive enhancements to Phase 3 systems based on repo mining (Hermes Agent, OpenClaw, Paperclip). Rust backend only — no UI changes.

---

#### P4-A: ContextEngine Trait Extraction

**Goal:** Extract formal `ContextEngine` trait from KAIROS, making memory management pluggable. KAIROS becomes `KairosEngine: ContextEngine`. Future memory strategies implement the same trait. Dispatch pipeline calls `ContextEngine` methods — never KAIROS directly.

**Files:**
- `src-tauri/src/memory/engine.rs` — ContextEngine trait definition (bootstrap, maintain, ingest, after_turn, assemble, compact, prepare_subagent_spawn, on_subagent_ended, dispose)
- `src-tauri/src/memory/kairos.rs` — KairosEngine struct implementing ContextEngine (wraps existing logs/topics/dream/index logic)
- `src-tauri/src/memory/mod.rs` — EDIT: add engine + kairos modules, re-export ContextEngine trait

**Gate:** `cargo check` clean. Existing memory commands still work (append_memory, query_memory, trigger_dream). KairosEngine passes all methods through to existing implementations.
**Depends on:** Phase 3 complete
**Push:** Yes

---

#### P4-B: Cache-TTL Context Pruning

**Goal:** Add TTL metadata to stored tool results. Different tool types get different lifetimes. Two-phase compaction: TTL prune (free, no LLM call) then LLM summarize (only if still over threshold).

**Files:**
- `src-tauri/src/compact/ttl.rs` — TTL configuration per tool type (schema_query=10m, file_read=5m, browser_snapshot=2m, adl=session, build_learnings=session, agent_result=30m), TTL prune function, placeholder insertion
- `src-tauri/src/compact/mod.rs` — EDIT: integrate TTL prune as first pass before LLM compaction in compact() method
- `src-tauri/src/database/schema.rs` — EDIT: V6 migration — add `tool_type TEXT` and `expires_at TEXT` columns to session_summaries or new `tool_results` table

**Gate:** `cargo check` clean. TTL prune removes expired entries. LLM compaction only fires when TTL prune alone isn't enough.
**Depends on:** P4-A
**Push:** Yes

---

#### P4-C: Iterative Compression with Structured Handoff

**Goal:** Upgrade compact engine's summary system. Store `previous_summary` in SQLite. On re-compaction, pass previous summary as context with PRESERVE/ADD/REMOVE instructions. Add orphaned tool pair sanitization.

**Files:**
- `src-tauri/src/compact/summary.rs` — EDIT: add iterative summary prompt (previous_summary + PRESERVE/ADD/REMOVE instructions), upgrade 9-section template to merge with Hermes structured handoff format
- `src-tauri/src/compact/sanitize.rs` — Orphaned tool pair detection and repair (detect tool_call without tool_result and vice versa after compression, insert stubs or remove orphans)
- `src-tauri/src/compact/mod.rs` — EDIT: call sanitize after compaction, pass previous_summary to compact()

**Gate:** `cargo check` clean. Re-compaction preserves information from previous summary. Orphaned pairs cleaned.
**Depends on:** P4-B
**Push:** Yes

---

#### P4-D: FTS5 Full-Text Search on Sessions

**Goal:** SQLite FTS5 virtual table on session messages. Enables cross-session recall. New Tauri command: `search_sessions(query, limit)`.

**Files:**
- `src-tauri/src/database/schema.rs` — EDIT: V7 migration — CREATE VIRTUAL TABLE messages_fts USING fts5(content, role, session_id, content='messages', content_rowid='id'). Add FTS5 triggers for INSERT/UPDATE/DELETE sync.
- `src-tauri/src/database/search.rs` — search_sessions function (FTS5 MATCH query, returns matching messages with session context, highlights)
- `src-tauri/src/commands/search.rs` — search_sessions Tauri command
- `src-tauri/src/commands/mod.rs` — EDIT: register search command
- `src-tauri/src/lib.rs` — EDIT: register search_sessions in Tauri builder

**Gate:** `cargo check` clean. `search_sessions("Pierce flagged", 10)` returns matching messages across sessions. FTS5 index stays in sync with message inserts.
**Depends on:** P4-C
**Push:** Yes

---

#### P4-E: Atomic Task Checkout + Bridge Updates

**Goal:** Add checkout semantics to findings table (prevents two agents from working on same finding during parallel Triad gates). Update TypeScript bridge with new commands.

**Files:**
- `src-tauri/src/database/schema.rs` — EDIT: V8 migration — ALTER TABLE findings ADD COLUMN checked_out_by TEXT, checked_out_at TEXT. CREATE UNIQUE INDEX idx_findings_checkout ON findings(id) WHERE checked_out_by IS NOT NULL AND resolved_at IS NULL.
- `src-tauri/src/build_state/findings.rs` — EDIT: add checkout_finding(id, agent_slug) and release_finding(id) functions
- `src-tauri/src/commands/build_state.rs` — EDIT: add checkout_finding and release_finding commands
- `apps/desktop/src/lib/tauri.ts` — EDIT: add searchSessions, checkoutFinding, releaseFinding bridge functions + types

**Gate:** `cargo check` clean. Vite build clean. Two concurrent checkout attempts on same finding — second one rejected by DB unique index.
**Depends on:** P4-D
**Push:** Yes
**Session 4.0 verification:** `cargo check` 0 errors. All 8 migrations apply cleanly. Existing Phase 3 tests still pass.

---

### Session 4.1 — Window Manager + Dock Bar

Architecture pivot: drop `react-resizable-panels` (linked split panes). Replace with floating window manager where every panel is independently sizable, movable, and detachable.

---

#### P4-F: Window Manager Core (Types + State + Persistence)

**Goal:** Panel instance registry, z-order stack, position/size state, dock/float transitions. SQLite persistence for layout state.

**Files:**
- `apps/desktop/src/window-manager/types.ts` — PanelId, PanelState (docked/floating/minimized/popped_out), PanelPosition, PanelSize, WorkspacePreset, DockItem, TabGroup, PanelInstance, PanelTypeRegistry
- `apps/desktop/src/window-manager/manager.ts` — ForgeWindowManager class: panel instance registry, z-order stack, state transitions (dock↔float↔minimize↔pop-out), position/size management, click-to-raise
- `apps/desktop/src/window-manager/persistence.ts` — Save/restore full layout state to SQLite via Tauri commands. Debounced saves on every change.
- `src-tauri/src/database/schema.rs` — EDIT: V9 migration — upgrade panel_layout table (panel_id PK, panel_type, state, x, y, width, height, z_order, monitor, tab_group_id, tab_order, workspace_preset)
- `src-tauri/src/commands/layout.rs` — save_panel_layout, load_panel_layout, save_workspace_preset, load_workspace_preset Tauri commands
- `src-tauri/src/commands/mod.rs` — EDIT: register layout commands
- `src-tauri/src/lib.rs` — EDIT: register layout commands in Tauri builder

**Gate:** `cargo check` + `vite build` clean. Panel state persists across app restart.
**Depends on:** P4-E
**Push:** Yes

---

#### P4-G: PanelContainer + Drag/Resize

**Goal:** Individual panel component with drag handle, 8-edge resize, minimize/pop-out/close buttons, size-aware content slot.

**Files:**
- `apps/desktop/src/window-manager/panel.tsx` — PanelContainer component: titlebar drag region, 8-point resize handles (N/S/E/W/NE/NW/SE/SW), minimize/pop-out/close buttons, children slot that receives dynamic width/height
- `apps/desktop/src/window-manager/snapping.ts` — Edge-snap engine: 8px magnetic snap to app frame edges and other panel edges. Toggle-able.
- `apps/desktop/src/hooks/useWindowManager.ts` — React hook wrapping ForgeWindowManager: panel CRUD, drag/resize handlers, z-order management, preset switching

**Gate:** Panels can be dragged freely. Resize from any edge/corner. Click-to-raise z-order works. Snap-to-edge functional.
**Depends on:** P4-F
**Push:** Yes

---

#### P4-H: Dock Bar + Tab Groups

**Goal:** Dock bar at bottom of app. One pill per registered panel type. Active = lit, minimized = dim with restore click. Tab groups: drag one panel onto another to create tabbed group.

**Files:**
- `apps/desktop/src/window-manager/dock.tsx` — DockBar component: horizontal bar at app bottom, one pill per panel type, active/minimized/closed states, unread badges, activity pulse animations, scales to 20+ panel types
- `apps/desktop/src/window-manager/manager.ts` — ForgeWindowManager class: panel registry, z-order stack, state transitions, tab groups, 3 built-in presets (Build/Review/Focus). **Note (PIERCE-CRIT-2/3):** groups.ts and presets.ts were absorbed into manager.ts during build — separate files do not exist.

**Gate:** Dock bar renders all panel types. Minimize sends to dock. Restore from dock. Tab groups work. Preset switching rearranges layout.
**Depends on:** P4-G
**Push:** Yes

---

#### P4-I: Layout Migration + Pop-Out Windows

**Goal:** Replace react-resizable-panels with window manager. Wire all existing panel content components into PanelContainers. Implement pop-out to native OS windows via Tauri multi-window API.

**Files:**
- `apps/desktop/src/components/layout/PanelLayout.tsx` — EDIT: replace entire react-resizable-panels grid with ForgeWindowManager + PanelContainers hosting existing ChatPanel, TeamPanel, CanvasPanel, PreviewPanel, ConnectivityPanel
- `src-tauri/src/commands/windows.rs` — create_panel_window(panel_id, position, size), close_panel_window(panel_id), sync_panel_state IPC bridge for popped-out panels
- `src-tauri/src/commands/mod.rs` — EDIT: register window commands
- `src-tauri/src/lib.rs` — EDIT: register window commands in Tauri builder
- `apps/desktop/package.json` — EDIT: remove react-resizable-panels dependency

**Gate:** App launches with default docked layout matching previous appearance. All panels float, minimize, pop-out. Pop-out panels communicate back via IPC. `react-resizable-panels` fully removed.
**Depends on:** P4-H
**Push:** Yes
**Session 4.1 verification:** `pnpm tauri dev` launches with floating window manager. All 5 panels functional. Dock bar visible. Layout persists across restart.

---

### Session 4.2 — Core Pretext Engine

The canvas-rendered text measurement + layout primitive. Every text-heavy canvas component in Phases 5-9 depends on this.

---

#### P4-J: Pretext Measure + Layout

**Goal:** Install @chenglou/pretext. Build measurement and layout functions for canvas text rendering.

**Files:**
- `packages/layout-engine/package.json` — @forge-os/layout-engine, depends on @chenglou/pretext
- `packages/layout-engine/tsconfig.json`
- `packages/layout-engine/src/index.ts` — re-exports
- `packages/layout-engine/src/prepare.ts` — batch prepare for text block arrays, font caching, memoization
- `packages/layout-engine/src/measure.ts` — single + multi-breakpoint measurement (375/768/1280), height-for-width

**Gate:** `pnpm build` clean. `prepare("Hello World", { font: "Inter", size: 14 })` returns PreparedText. `measure(prepared, 320)` returns accurate height.
**Depends on:** P4-I
**Push:** Yes

---

#### P4-K: Pretext Fit + Canvas Render

**Goal:** Fit-to-container solver and canvas text renderer with styled spans.

**Files:**
- `packages/layout-engine/src/fit.ts` — fit-to-container solver: given text + width + min/max font size, binary search over layout() to find optimal size (<1ms)
- `packages/layout-engine/src/canvas.ts` — canvas text renderer: draw prepared text with line breaks, colors, alignment, styled spans (bold, color, badges)
- `packages/layout-engine/src/types.ts` — PreparedText, LayoutResult, MeasureOptions, FitResult, CanvasRenderOptions, StyledSpan

**Gate:** `fit(text, 200, { minFont: 10, maxFont: 24 })` returns optimal font size in <1ms. Canvas render produces readable text with styled spans.
**Depends on:** P4-J
**Push:** Yes

---

#### P4-L: Virtual List Heights + Integration Test

**Goal:** Pre-computed heights for virtualized lists. Integration test with react-window compatibility.

**Files:**
- `packages/layout-engine/src/virtual.ts` — pre-compute heights for virtualized lists (react-window/react-virtuoso compatible). VirtualHeightMap from text content array + container width.
- `packages/layout-engine/src/index.ts` — EDIT: export all public APIs

**Gate:** VirtualHeightMap produces accurate row heights for 1000-item list. react-window integration renders variable-height rows using Pretext measurements. Package importable from apps/desktop.
**Depends on:** P4-K
**Push:** Yes
**Session 4.2 verification:** `@forge-os/layout-engine` builds clean. All measurement/layout/render functions work. Importable from desktop app.

---

### Session 4.3 — Canvas Components Library

Reusable canvas-rendered UI primitives. Every component accepts `width` + `height` props — no assumptions about container size.

---

#### P4-M: Core Gauges (StatCard, ProgressArc, StatusBadge)

**Goal:** First 3 canvas components: number display, circular gauge, status indicator.

**Files:**
- `packages/canvas-components/package.json` — @forge-os/canvas-components, depends on @forge-os/layout-engine
- `packages/canvas-components/tsconfig.json`
- `packages/canvas-components/src/index.ts` — re-exports
- `packages/canvas-components/src/stat-card.tsx` — StatCard: number + label + trend indicator, Pretext-measured text, canvas-rendered
- `packages/canvas-components/src/progress-arc.tsx` — ProgressArc: circular gauge, animated fill, batch progress display
- `packages/canvas-components/src/status-badge.tsx` — StatusBadge: green/amber/red with pulse animation

**Gate:** All 3 components render at arbitrary sizes. StatCard text stays centered. ProgressArc animates smoothly.
**Depends on:** P4-L
**Push:** Yes

---

#### P4-N: Flow Components (FlowParticle, ConnectionLine, NodeCard)

**Goal:** Pipeline visualization primitives: animated particles, bezier connections, labeled nodes.

**Files:**
- `packages/canvas-components/src/flow-particle.tsx` — FlowParticle: animated dot traveling along bezier path, configurable speed/color/trail
- `packages/canvas-components/src/connection-line.tsx` — ConnectionLine: animated bezier between two points, dash animation, directional arrows
- `packages/canvas-components/src/node-card.tsx` — NodeCard: rounded rect with text, icon, status indicator, dynamic font sizing via Pretext fit()

**Gate:** FlowParticle animates along path. ConnectionLine draws bezier with dash animation. NodeCard text auto-sizes to fit container.
**Depends on:** P4-M
**Push:** Yes

---

#### P4-O: Token Display Components (TokenGauge, ContextMeter)

**Goal:** Pre-measured number displays that never shift layout when values change. Context window fill gauge.

**Files:**
- `packages/canvas-components/src/token-gauge.tsx` — TokenGauge: pre-measured number display ("$4.23" → "$4.24" without element shifting), widest-possible-value space reservation via Pretext
- `packages/canvas-components/src/context-meter.tsx` — ContextMeter (canvas version): per-session context window fill gauge, animated fill, zone colors (green/yellow/red)

**Gate:** TokenGauge never shifts layout when value changes (verify with $9.99 → $10.00 transition). ContextMeter animates fill smoothly.
**Depends on:** P4-N
**Push:** Yes

---

#### P4-P: DockPill + Test Page

**Goal:** Canvas-rendered dock bar item. Test page inside Tauri app showing all components.

**Files:**
- `packages/canvas-components/src/dock-pill.tsx` — DockPill: icon + label + badge + activity pulse, canvas-rendered for dock bar
- `apps/desktop/src/pages/ComponentTestPage.tsx` — Test page: renders every canvas component at multiple sizes, acts as visual regression reference
- `packages/canvas-components/src/index.ts` — EDIT: export all components

**Gate:** DockPill renders with badge and pulse. Test page shows all 9 components at 3 sizes each. Package importable from desktop app.
**Depends on:** P4-O
**Push:** Yes
**Session 4.3 verification:** `@forge-os/canvas-components` builds clean. 9 components all render correctly. Test page visible in app.

---

### Session 4.4 — Document Generation Engine

Dual-output from single content: markdown for Claude, Pretext-rendered PDF for humans.

---

#### P4-Q: PDF Page Layout Engine

**Goal:** Page-break calculator and canvas-to-PDF export pipeline.

**Files:**
- `packages/document-gen/package.json` — @forge-os/document-gen, depends on @forge-os/layout-engine
- `packages/document-gen/tsconfig.json`
- `packages/document-gen/src/index.ts` — re-exports
- `packages/document-gen/src/pdf.ts` — page-break calculator: given content blocks + page dimensions, compute per-page layout. Render to canvas, export as PDF blob via jspdf or canvas-to-blob.
- `packages/document-gen/src/types.ts` — ContentBlock, PageLayout, PageBreak, DocumentTemplate, RenderOptions

**Gate:** `layoutPages(blocks, { width: 612, height: 792 })` returns correct page breaks. PDF blob exports successfully.
**Depends on:** P4-P
**Push:** Yes

---

#### P4-R: Gate Report Template

**Goal:** Gate report PDF template: title, findings table (severity/persona/description/evidence/fix), summary stats.

**Files:**
- `packages/document-gen/src/templates/gate-report.ts` — Gate report template: header with batch ID + date, findings table with severity coloring, summary stats (counts by severity, by persona), resolution status
- `packages/document-gen/src/markdown.ts` — Markdown output generator (same content blocks → markdown string for Claude consumption)

**Gate:** Gate report renders with sample findings data. PDF has proper page breaks. Markdown output is clean and parseable.
**Depends on:** P4-Q
**Push:** Yes

---

#### P4-S: Project Brief + Build Report Templates

**Goal:** Two more document templates for common outputs.

**Files:**
- `packages/document-gen/src/templates/project-brief.ts` — Project brief template: project name, architecture decisions, batch plan, persona assignments, stack summary
- `packages/document-gen/src/templates/build-report.ts` — Build report template: batch progress, findings resolved, risks, token usage, session metrics

**Gate:** Both templates render with sample data. Dual output (PDF + markdown) works for both.
**Depends on:** P4-R
**Push:** Yes

---

#### P4-T: Retrospective Template + Integration Test

**Goal:** Retrospective template. Full integration test of document generation pipeline.

**Files:**
- `packages/document-gen/src/templates/retrospective.ts` — Retrospective template: timeline, learnings, failure modes, recommendations, action items
- `packages/document-gen/src/index.ts` — EDIT: export all templates and generators

**Gate:** All 4 templates render. PDF export works end-to-end. Markdown export works end-to-end. Package importable from desktop app.
**Depends on:** P4-S
**Push:** Yes
**Session 4.4 verification:** `@forge-os/document-gen` builds clean. 4 templates all render PDF + markdown. Full `pnpm build` green.

---

### Phase 4 Summary

| Session | Batches | Domain | Key Deliverable |
|---------|---------|--------|-----------------|
| 4.0 | P4-A → P4-E | Rust backend | ContextEngine trait, TTL pruning, iterative compression, FTS5 search, atomic checkout |
| 4.1 | P4-F → P4-I | Frontend + Rust | Floating window manager, dock bar, tab groups, pop-out windows |
| 4.2 | P4-J → P4-L | Package | @forge-os/layout-engine (Pretext wrapper) |
| 4.3 | P4-M → P4-P | Package | @forge-os/canvas-components (9 components) |
| 4.4 | P4-Q → P4-T | Package | @forge-os/document-gen (4 templates, dual PDF+MD output) |

### Phase 4 Risks
- **Pretext API stability:** @chenglou/pretext is relatively new — API surface may shift
- **Canvas performance:** 9+ canvas components rendering simultaneously needs GPU attention
- **Tauri multi-window IPC:** Pop-out panels communicating back to main process is complex
- **FTS5 + WAL interaction:** FTS5 virtual tables with WAL mode need careful trigger management
- **PDF blob size:** Canvas-to-PDF export may produce large blobs — may need compression

### Phase 4 ADL (New)
- **OS-ADL-016** (updated): Floating window manager — panels are independent, not linked
- **OS-ADL-020**: Dual-output document generation — same content → markdown + PDF
- **OS-ADL-021**: Dock bar as panel registry UI — scales to 20+ panel types

---

## Phase 5: Living Canvas HUD (16 batches, 3 sessions)

**Session map:** 5.1 = P5-A through P5-F (DONE) | 5.2 = P5-G through P5-K | 5.3 = P5-L through P5-P
**Prerequisite:** Phase 4 complete. Window manager, layout engine, canvas components, persona glyphs all on main.
**Depends on:** `@forge-os/layout-engine` (Pretext pipeline), `@forge-os/canvas-components` (10 components + glyphs), window manager panel registry, Tauri event system (OS-ADL-009).
**Repo:** CYM4TIC/forge-OS | **Local:** `.repo/`

**Path prefix (all files):**
- Rust backend: `apps/desktop/src-tauri/src/`
- TypeScript frontend: `apps/desktop/src/`
- Panels: `apps/desktop/src/components/panels/`
- HUD sub-components: `apps/desktop/src/components/panels/hud/`
- Hooks: `apps/desktop/src/hooks/`
- Bridge: `apps/desktop/src/lib/tauri.ts`

**Key ADL constraints:**
- OS-ADL-001: All text measurement via Pretext. No DOM measurement.
- OS-ADL-002: Canvas for presentation, DOM for interaction. Every component classified.
- OS-ADL-009: State changes via Tauri events (`app.emit` / `listen`). No polling.

**Infrastructure available from 5.1:**
- `isTauriRuntime` guard in `tauri.ts` — all new Tauri bridge functions must use this for browser-only graceful degradation
- `setupCanvasForHiDPI` + `renderStyledSpans` + `measureText` pattern established in ContextMeterViz
- `hexToRgba()` utility in ContextMeterViz (move to canvas-tokens if reused)
- ResizeObserver pattern in every panel for responsive sizing
- 12 panel types registered in `window-manager/types.ts`
- 49 Tauri commands, 10 React hooks, 348 Vite modules

---

### Session 5.1 — Build State Topology + Core Gauges (P5-A through P5-F) ✅ COMPLETE

**Goal:** The Canvas HUD panel becomes a live visualization of build state. Pipeline nodes, batch progress, token gauge, context meter — all canvas-rendered, all size-aware, all driven by real state from the Rust backend.
**Status:** All 6 batches done. Build Triad gate passed (26 findings, all CRITs + HIGHs resolved). Commits `4658f64`, `57263c7`.

---

### P5-A: BOOT.md Parser + Build State Events

**Goal:** Rust backend parses BOOT.md YAML frontmatter and session log into structured state. Emits Tauri events on change.

**Files:**
- `src-tauri/src/hud/mod.rs` (module declaration)
- `src-tauri/src/hud/boot_parser.rs` (parse BOOT.md YAML header → BuildStateSnapshot struct: phase, batch, batches_done, phases_total, sessions_total, last_commit, last_updated)
- `src-tauri/src/hud/events.rs` (HudEvent enum: BuildStateChanged, PipelineStageChanged, AgentStatusChanged, FindingAdded, FindingResolved. Emit via app.emit())
- Update `src-tauri/src/lib.rs` (register hud module)

**Types (Rust):**
```
BuildStateSnapshot { phase, current_batch, batches_done, phases_total, sessions_total, last_commit, last_updated }
PipelineStage { id: String, status: StageStatus, agent: Option<String>, started_at, completed_at }
StageStatus { Idle, Active, Complete, Error }
HudEvent { BuildStateChanged(BuildStateSnapshot), PipelineStageChanged(PipelineStage), ... }
```

**Gate:** `cargo check` 0 errors. HudEvent variants compile. boot_parser extracts YAML from a test BOOT.md string.
**Depends on:** Nothing new — reads files, emits events.
**Push:** Yes

---

### P5-B: HUD Tauri Commands + Bridge

**Goal:** Expose build state and pipeline to the frontend. Commands to get current state and subscribe to events.

**Files:**
- `src-tauri/src/commands/hud.rs` (get_build_state_snapshot, get_pipeline_stages, refresh_build_state — re-reads BOOT.md and emits events)
- Update `src-tauri/src/commands/mod.rs` (add hud module)
- Update `src-tauri/src/lib.rs` (register hud commands in invoke_handler)
- `src/lib/tauri.ts` (add getBuildStateSnapshot, getPipelineStages, refreshBuildState + onBuildStateChanged, onPipelineStageChanged event listeners)

**Gate:** Commands callable from frontend. Event listeners fire on state change.
**Depends on:** P5-A (parser + events)
**Push:** Yes

---

### P5-C: Panel Registration + HUD Shell

**Goal:** Register all Phase 5 panel types in the window manager. Create the Canvas HUD panel shell that will host pipeline + gauges.

**Files:**
- Update `src/window-manager/manager.ts` (register 6 new panel types in PANEL_TYPE_REGISTRY: canvas_hud already registered — add findings, agent_board, vault_browser, graph_viewer, session_timeline, context_meter. Each with min/default dimensions and instance rules)
- `src/panels/CanvasHudPanel.tsx` (the shell — receives width/height from PanelContainer, renders canvas element, passes dimensions to child visualizations. Imports useWindowManager for size reactivity. Layout: vertical stack — PipelineCanvas top, gauges row bottom)
- `src/hooks/useBuildState.ts` (hook — calls getBuildStateSnapshot on mount, subscribes to onBuildStateChanged events, returns reactive BuildStateSnapshot)

**Gate:** 6 new panel types appear in dock bar. CanvasHudPanel renders an empty canvas at correct dimensions. useBuildState returns snapshot data.
**Depends on:** P5-B (commands + bridge), window manager (Phase 4.1)
**Push:** Yes

---

### P5-D: PipelineCanvas — Nodes + Layout

**Goal:** Canvas-rendered pipeline with 4 stage nodes (Scout → Build → Triad → Sentinel). Nodes positioned via Pretext-measured labels. Persona glyphs inside active nodes.

**Files:**
- `src/panels/hud/PipelineCanvas.tsx` (canvas component — draws 4 pipeline nodes as rounded rects connected by arrows. Each node: label (Pretext-measured, centered), status glow (idle=dim, active=pulse, complete=glow), persona glyph rendered inside when agent is active. Uses `flowAroundObstacles()` for stat labels that reflow around nodes. Responds to container resize — nodes reflow to fill available width)
- `src/panels/hud/pipeline-layout.ts` (pure layout math — given container width/height + node count, computes node positions/sizes. Horizontal flow with wrapping on narrow panels. No DOM)

**Imports from existing packages:**
- `@forge-os/layout-engine`: `measureText`, `fitToContainer`, `flowAroundObstacles`
- `@forge-os/canvas-components`: `NodeCard`, `PersonaGlyph`, `ConnectionLine`, `StatusBadge`

**Gate:** Pipeline renders 4 nodes at any panel size. Labels don't clip. Persona glyphs animate inside active nodes. Resize reflows nodes.
**Depends on:** P5-C (HUD shell + build state hook)
**Push:** Yes

---

### P5-E: BatchProgress + TokenGauge

**Goal:** Batch progress arc and token gauge — the numeric heartbeat of the build.

**Files:**
- `src/panels/hud/BatchProgressGauge.tsx` (wraps ProgressArc from canvas-components. Shows batches_done/batches_total. Animated counter via Pretext pre-measured number widths — zero-shift on digit change. Layer label below. Responds to BuildStateChanged events)
- `src/panels/hud/TokenGaugeDisplay.tsx` (wraps TokenGauge from canvas-components. Shows context window usage. Connects to useContextUsage hook. Pre-measured number display. Warning state at 70%, critical at 85%)

**Imports from existing:**
- `@forge-os/canvas-components`: `ProgressArc`, `TokenGauge`, `StatCard`
- `src/hooks/useContextUsage.ts` (already exists)

**Gate:** BatchProgress shows correct fraction from build state. TokenGauge reflects real context usage. Both animate on value change. Both resize cleanly.
**Depends on:** P5-C (build state hook), existing useContextUsage hook
**Push:** Yes

---

### P5-F: ContextMeter — Text Density Visualization

**Goal:** The context meter shows context window fill as progressively denser typography. Early context = spacious text. At 85% = compressed, tight. Compaction = text dissolves and re-emerges sparser.

**Files:**
- `src/panels/hud/ContextMeterViz.tsx` (extends ContextMeterCanvas from canvas-components. Renders actual text samples at variable density — lineHeight transitions from 1.8 → 1.0, maxWidth compresses, font weight shifts. Uses Pretext `measure()` to compute exact layouts at each density level. Animated transitions when context usage changes. On compaction event: text dissolves (opacity fade) and re-emerges at lower density)
- Update `src/panels/CanvasHudPanel.tsx` (wire in PipelineCanvas, BatchProgressGauge, TokenGaugeDisplay, ContextMeterViz into the panel layout. Responsive — pipeline takes top 60%, gauges row takes bottom 40%. Adjust ratios on narrow panels)

**Imports:**
- `@forge-os/layout-engine`: `measure`, `fitToBox`, `renderStyledSpans`
- `@forge-os/canvas-components`: `ContextMeterCanvas`

**Gate:** ContextMeter visualizes density. Panel layout is complete — all 4 sub-components render. Resize works at all sizes. Ambient idle animation runs (subtle node pulse, glyph embers).
**Depends on:** P5-D (pipeline), P5-E (gauges)
**Push:** Yes

---

### Session 5.2 — Agent Board + Findings Feed (P5-G through P5-K)

**Goal:** Agent Board and Findings Feed as independent panel types. Canvas-rendered agent cards with dynamic layouts. Virtualized findings list with severity-as-typography. Session timeline as text river. All three register with the window manager and can float/tab/pop-out independently.

**Existing placeholders to replace:** `AgentBoardPanel.tsx` (13 lines), `FindingsPanel.tsx` (13 lines), `SessionTimelinePanel.tsx` (13 lines) — all created in P5-C.
**Existing hooks to compose:** `useAgents` (agent list), `useAgentDispatch` (active dispatch tracking) — don't duplicate, extend.

---

### P5-G: Findings SQLite Schema + Commands

**Goal:** Persistent findings storage with real-time events. The data layer for the findings feed. Protocol Enforcement Point #2 — every gate finding gets an ID, severity, and status in SQLite. A batch cannot close with `status = 'open'` rows.

**Files:**
- `apps/desktop/src-tauri/src/database/schema.rs` (add SCHEMA_V10: CREATE TABLE hud_findings — id TEXT PRIMARY KEY, session_id TEXT, batch_id TEXT, severity TEXT, persona TEXT, title TEXT, description TEXT, status TEXT DEFAULT 'open', file_path TEXT, line_number INTEGER, created_at TEXT, resolved_at TEXT. Indexes on session_id, severity, persona, status)
- `apps/desktop/src-tauri/src/database/migrations.rs` (add V10 migration step)
- `apps/desktop/src-tauri/src/hud/findings.rs` (CRUD: insert_finding, resolve_finding, list_findings with filters — by session, severity, persona, status. Count by severity. Emits HudEvent::FindingAdded / FindingResolved via app.emit)
- Update `apps/desktop/src-tauri/src/commands/hud.rs` (add: list_hud_findings, add_hud_finding, resolve_hud_finding, get_finding_counts commands)
- Update `apps/desktop/src/lib/tauri.ts` (add listHudFindings, addHudFinding, resolveHudFinding, getFindingCounts. Guard all with `isTauriRuntime`. Add onFindingAdded, onFindingResolved event listeners)

**Gate:** V10 migration applies. CRUD commands work. Events fire on insert/resolve. Finding counts by severity return correct data.
**Depends on:** P5-A (events module)
**Push:** Yes

---

### P5-H: Agent Board Panel

**Goal:** Canvas-rendered agent cards showing status, model tier, domain. Responsive grid layout. Click to expand.

**Files:**
- Update `apps/desktop/src/components/panels/AgentBoardPanel.tsx` (REPLACE placeholder. Canvas-rendered grid of agent cards. Each card: persona glyph, name via Pretext `fitToContainer`, status badge (idle/running/complete/error), model tier badge. Grid reflows: 1-col at <400px, 2-col at <700px, 3-col at 700px+. Click card → DOM overlay expands with last finding + domain health. Uses ResizeObserver for responsive sizing)
- `apps/desktop/src/hooks/useAgentBoard.ts` (composes existing `useAgents` + `useAgentDispatch` + `onAgentStatusChanged` event. Returns agent list with real-time status. Does NOT duplicate data fetching — wraps existing hooks)

**Imports:**
- `@forge-os/canvas-components`: `PersonaGlyph`, `NodeCard`, `StatusBadge`
- `@forge-os/layout-engine`: `fitToContainer`, `measureText`, `shrinkwrapText`

**Gate:** Agent board renders all agents. Status updates in real-time. Grid reflows on resize. Click expands card. Pop-out works.
**Depends on:** P5-C (panel registration), existing `useAgents` + `useAgentDispatch` hooks
**Push:** Yes

---

### P5-I: Findings Feed — Virtualized List

**Goal:** Virtualized scrolling findings list. Severity-as-typography: P-CRIT = max weight + glow, P-LOW = small + dim. Persona glyph attribution. Shrinkwrap card widths.

**Files:**
- Update `apps/desktop/src/components/panels/FindingsPanel.tsx` (REPLACE placeholder. Uses `createVirtualHeightMap` from layout-engine for pre-computed row heights — zero-jank scroll with hundreds of findings. Each finding card: severity-driven typography (P-CRIT: 20px bold + red glow, P-HIGH: 16px semi-bold + orange, P-MED: 14px medium + yellow, P-LOW: 12px regular + muted). Persona glyph of who found it, shrinkwrap width. Filter bar (DOM): by persona, severity, status. Card list (Canvas): virtual scroll. No external virtual scroll library — uses layout-engine's `createVirtualHeightMap` which outputs react-window-compatible `itemSize` functions)
- `apps/desktop/src/components/panels/hud/finding-card-renderer.ts` (pure canvas render function for a single finding card. Severity → font size/weight/color mapping from canvas-tokens. Returns rendered height)

**Imports:**
- `@forge-os/layout-engine`: `createVirtualHeightMap`, `shrinkwrapText`, `measureText`, `renderStyledSpans`
- `@forge-os/canvas-components`: `PersonaGlyph`, `getZoneColor` (reuse zone color pattern for severity)

**Gate:** Findings feed renders with virtual scroll. Severity hierarchy is visually obvious. Filters work. Persona glyphs attribute correctly. Pop-out works.
**Depends on:** P5-G (findings data layer), P5-C (panel registration)
**Push:** Yes

---

### P5-J: Session Timeline — Text River

**Goal:** A flowing text stream of commits, findings, gate verdicts. Text density = activity density. Pretext-measured, flowing left-to-right with time.

**Files:**
- Update `apps/desktop/src/components/panels/SessionTimelinePanel.tsx` (REPLACE placeholder. Horizontal canvas scroll — time flows left to right. Events rendered as text at variable density: dense clusters = busy sessions, sparse = quiet. Each event: commit message / finding summary / gate verdict. Text measured via Pretext, positioned proportional to timestamp. Color-coded: commits=STATUS.accent, findings=severity color, gates=STATUS.success/STATUS.danger. Persona glyphs inline. Uses ResizeObserver)
- `apps/desktop/src/hooks/useSessionTimeline.ts` (aggregates session events: commits from build state, findings from hud_findings, gate verdicts. Returns time-ordered event list. Subscribes to real-time events via onFindingAdded + onBuildStateChanged)

**Imports:**
- `@forge-os/layout-engine`: `measureText`, `renderStyledSpans`, `batchPrepare`
- `@forge-os/canvas-components`: `PersonaGlyph`, `STATUS` (color tokens)

**Gate:** Timeline renders events proportional to time. Dense activity visually clusters. Horizontal scroll works. New events appear in real-time. Pop-out works.
**Depends on:** P5-G (findings data), P5-B (build state events)
**Push:** Yes

---

### P5-K: Session 5.2 Integration + Polish

**Goal:** Wire Agent Board, Findings Feed, and Session Timeline into the dock bar. Ensure all three panels coexist, tab together, and persist layout to SQLite. Add `gate_review` workspace preset.

**Files:**
- Update `apps/desktop/src/window-manager/dock.tsx` (findings pill shows count badge by severity via `getFindingCounts` bridge. Badge uses STATUS.danger color for open CRITs)
- Update `apps/desktop/src/components/panels/CanvasPanel.tsx` (pipeline node click handlers — clicking active stage opens relevant panel if not visible: build stage → Canvas HUD, triad stage → Agent Board + Findings)
- Update `apps/desktop/src/window-manager/manager.ts` (add built-in presets to `getBuiltInPresets()`: `gate_review` = Canvas HUD left + Findings Feed right + Agent Board bottom-right. `observatory` = Canvas HUD + Graph Viewer + Vault Browser. Seed to SQLite on first run if not present)

**Gate:** All 3 new panels appear in dock, can be opened/floated/tabbed/popped. `gate_review` preset tiles them correctly. Layout persists across restart. Badge counts update in real-time. Presets seed correctly on clean install.
**Depends on:** P5-H, P5-I, P5-J (all three panels built)
**Push:** Yes

---

### Session 5.3 — Flow Visualization + Graph (P5-L through P5-P)

**Goal:** Persona glyph particle trails on agent dispatch. Bezier curves showing information flow. VaultBrowser for file navigation. GraphViewer for knowledge graph. The canvas comes alive.

---

### P5-L: Dispatch Event Bus + Trail Types

**Goal:** Backend emits structured dispatch events that the flow visualization can animate. Types for particle trails.

**Files:**
- `apps/desktop/src-tauri/src/hud/dispatch_events.rs` (DispatchFlow struct: source_agent, target_agents Vec, flow_type (dispatch/findings_return/context_transfer), severity Option, timestamp. Emits HudEvent::DispatchFlowStarted when dispatch pipeline fires. Hooks into existing dispatch command)
- Update `apps/desktop/src/lib/tauri.ts` (add onDispatchFlow event listener + DispatchFlow TypeScript type. Guard with `isTauriRuntime`)
- `apps/desktop/src/components/panels/hud/trail-types.ts` (ParticleTrail: source_glyph PersonaSlug, target_glyphs PersonaSlug[], path BezierPath[], color string, progress 0-1, flow_type. TrailConfig: speed, decay, glow_intensity)

**Gate:** Dispatch events fire when agents are dispatched. TypeScript types match Rust structs. Trail types compile.
**Depends on:** P5-A (events module), existing dispatch commands
**Push:** Yes

---

### P5-M: Flow Overlay — Particle Trails

**Goal:** Semi-transparent canvas overlay on the Canvas HUD. When agents dispatch, persona glyphs streak across bezier paths between pipeline nodes.

**Files:**
- `apps/desktop/src/components/panels/hud/FlowOverlay.tsx` (transparent canvas layer overlaid on PipelineCanvas. Listens to onDispatchFlow events. On dispatch: source persona glyph animates along bezier curve to target node(s). Build Triad dispatch = 3 glyphs (crosshair + eye + grid) streaking in formation. Findings return = severity-colored trail back. Uses requestAnimationFrame for 60fps. Particle trails decay over ~2s. Toggleable visibility)
- `apps/desktop/src/components/panels/hud/bezier-paths.ts` (compute bezier control points between pipeline node positions. Paths curve to avoid overlapping nodes. Multiple simultaneous trails offset to prevent z-fighting)
- Update `apps/desktop/src/components/panels/CanvasPanel.tsx` (layer FlowOverlay on top of PipelineCanvas. Z-order: pipeline → flow overlay → gauges)

**Imports:**
- `@forge-os/canvas-components`: `PersonaGlyph`, `FlowParticle`

**Gate:** Dispatching an agent produces visible glyph trail on canvas. Triad dispatch shows 3 glyphs in formation. Trails decay smoothly. Toggle on/off works. No performance regression (60fps maintained).
**Depends on:** P5-L (dispatch events + trail types), P5-D (pipeline canvas with node positions)
**Push:** Yes

---

### P5-N: Vault Browser Panel

**Goal:** Tree view for vault navigation. DOM for interaction (tree nodes are clickable), canvas for content preview (consistent typography).

**Files:**
- Update `apps/desktop/src/components/panels/VaultBrowserPanel.tsx` (REPLACE placeholder. Split layout: left = DOM tree view (collapsible folders, file icons, search filter), right = canvas content preview (renders file content with Pretext typography). Tree reads from filesystem via Tauri. Content preview uses `createVirtualHeightMap` for zero-jank scroll. Uses ResizeObserver for responsive split ratio)
- `apps/desktop/src-tauri/src/commands/vault.rs` (list_vault_tree: reads directory recursively, returns tree structure. read_vault_file: returns file content as string. Both operate on the active project's vault directory)
- Update `apps/desktop/src-tauri/src/commands/mod.rs` + `apps/desktop/src-tauri/src/lib.rs` (register vault commands)
- Update `apps/desktop/src/lib/tauri.ts` (add listVaultTree, readVaultFile. Guard with `isTauriRuntime`)

**Gate:** Vault browser shows file tree. Clicking a file renders content in canvas preview. Virtual scroll handles large files. Search filters the tree. Panel floats/pops out.
**Depends on:** P5-C (panel registration), layout engine (virtual heights)
**Push:** Yes

---

### P5-O: Graph Viewer Panel

**Goal:** Knowledge graph visualization. Canvas pan/zoom. Pretext-measured labels on every node and edge.

**Files:**
- Update `apps/desktop/src/components/panels/GraphViewerPanel.tsx` (REPLACE placeholder. Canvas-rendered force-directed graph. Nodes = entities (persona glyphs for personas, generic nodes for concepts). Edges = relationships. Labels via Pretext `fitToContainer`. Mouse: drag to pan, wheel to zoom, click node to highlight + DOM detail overlay. Zoom-dependent label visibility. Uses ResizeObserver)
- `apps/desktop/src/components/panels/hud/graph-layout.ts` (simple force-directed layout: repulsion between nodes, attraction along edges, gravity toward center. Iterates on requestAnimationFrame. Stabilizes after ~100 iterations. Pure math, no external dependency)
- `apps/desktop/src/hooks/useGraphData.ts` (placeholder data source — returns hardcoded node/edge data for Phase 5. Wire to LightRAG in Phase 8. Provides: nodes with id/label/type/persona, edges with source/target/label/weight)

**Imports:**
- `@forge-os/layout-engine`: `fitToContainer`, `measureText`, `renderStyledSpans`
- `@forge-os/canvas-components`: `PersonaGlyph`, `ConnectionLine`

**Gate:** Graph renders nodes and edges. Pan/zoom works smoothly. Labels are readable at all zoom levels. Node click shows detail. Persona nodes show glyphs. Panel floats/pops out.
**Depends on:** P5-C (panel registration), layout engine
**Push:** Yes

---

### P5-P: Phase 5 Integration + Ambient Animation

**Goal:** Final polish pass. All 6 new panel types working together. Ambient idle animation. Replay from session history. Workspace presets updated.

**Files:**
- Update `apps/desktop/src/components/panels/hud/PipelineCanvas.tsx` (add ambient idle animation: subtle node drift via sine wave, pulse intensity varies, persona glyph ember states — glyphs glow softly when idle, brighten on activity)
- Update `apps/desktop/src/components/panels/hud/FlowOverlay.tsx` (add replay mode: stores dispatch events in session, can replay flow visualization from history. Toggle button in panel titlebar)
- Update `apps/desktop/src/window-manager/manager.ts` (ensure presets seed: `build` = Canvas HUD with flow overlay. `gate_review` = Agent Board + Findings + Timeline. `observatory` = Canvas HUD + Graph Viewer + Vault Browser)
- Update `apps/desktop/src/components/panels/CanvasPanel.tsx` (final layout polish — empty/error/loading edge cases for all sub-components)

**Gate:** All 6 new panel types registered and functional. Ambient animation runs without performance regression. Flow replay works. 3 workspace presets (build, gate_review, observatory) tile panels correctly. Empty/error/loading states all handled.
**Depends on:** P5-L through P5-O (all 5.3 panels and flow viz)
**Push:** Yes

---

### Phase 5 Batch Summary

| Batch | Name | Session | Depends On |
|-------|------|---------|------------|
| P5-A | BOOT.md Parser + Events | 5.1 | — |
| P5-B | HUD Commands + Bridge | 5.1 | P5-A |
| P5-C | Panel Registration + HUD Shell | 5.1 | P5-B |
| P5-D | PipelineCanvas Nodes + Layout | 5.1 | P5-C |
| P5-E | BatchProgress + TokenGauge | 5.1 | P5-C |
| P5-F | ContextMeter Text Density | 5.1 | P5-D, P5-E |
| P5-G | Findings SQLite + Commands | 5.2 | P5-A |
| P5-H | Agent Board Panel | 5.2 | P5-C |
| P5-I | Findings Feed Virtualized | 5.2 | P5-G, P5-C |
| P5-J | Session Timeline Text River | 5.2 | P5-G, P5-B |
| P5-K | Session 5.2 Integration | 5.2 | P5-H, P5-I, P5-J |
| P5-L | Dispatch Event Bus + Trails | 5.3 | P5-A |
| P5-M | Flow Overlay Particles | 5.3 | P5-L, P5-D |
| P5-N | Vault Browser Panel | 5.3 | P5-C |
| P5-O | Graph Viewer Panel | 5.3 | P5-C |
| P5-P | Phase 5 Integration + Ambient | 5.3 | P5-L through P5-O |

### Phase 5 Persona + Intelligence Gates

| Batch | Gates | Rationale |
|-------|-------|-----------|
| P5-A | Kehinde | Backend module — systems architecture review (trait design, event patterns) |
| P5-B | Kehinde | Tauri command surface — bridge shape, error handling |
| P5-C | Mara + Riven | First visual surface — panel shell, layout registration |
| P5-D | Mara + Riven | Canvas-rendered pipeline — visual hierarchy, resize behavior, animation |
| P5-E | Mara + Riven | Gauges — data visualization clarity, value display |
| P5-F | Build Triad (Pierce + Mara + Riven) | Session 5.1 exit gate — full visual integration, all HUD sub-components |
| P5-G | Kehinde + Tanaka | SQLite schema — data model review + security (no PII in findings) |
| P5-H | Build Triad | Agent board — complex canvas rendering, grid layout, interaction |
| P5-I | Build Triad | Findings feed — severity hierarchy, virtual scroll performance |
| P5-J | Mara + Riven | Timeline — text density visualization, temporal accuracy |
| P5-K | Build Triad + Sentinel | Session 5.2 exit gate — integration + regression check on 5.1 surfaces |
| P5-L | Kehinde | Backend event bus — dispatch event shape, type safety |
| P5-M | Mara + Riven | Flow overlay — animation performance, visual clarity |
| P5-N | Build Triad | Vault browser — file I/O + canvas preview + tree interaction |
| P5-O | Build Triad | Graph viewer — force layout correctness, pan/zoom, label legibility |
| P5-P | Build Triad + Sentinel + Meridian | Phase 5 exit gate — full integration, regression, cross-surface consistency |

**New ADL decisions expected:**
- **OS-ADL-013**: HUD event taxonomy — all backend→frontend state updates use typed HudEvent enum through Tauri events
- **OS-ADL-014**: Findings persistence — HUD findings are the canonical store, not BOOT.md text parsing

**Phase 5 infrastructure totals (after all 3 sessions):**
- Session 5.1 delivered: 1 new Rust module (hud/ with 3 files), 3 Tauri commands, 1 hook (useBuildState), 5 bridge functions, 2 event listeners, isTauriRuntime guard, 5 HUD sub-components, 348 Vite modules
- Session 5.2 will add: 1 SQLite migration (V10), 1 Rust file (hud/findings.rs), 4 Tauri commands, 3 hooks (useAgentBoard, useSessionTimeline, useFindingsFilter), ~8 bridge functions, 3 panel implementations replacing placeholders
- Session 5.3 will add: 1 Rust file (hud/dispatch_events.rs), 1 Rust command module (commands/vault.rs), 2 Tauri commands, 1 hook (useGraphData), ~4 bridge functions, 3 panel implementations replacing placeholders, flow overlay, graph layout engine
- 3 workspace presets: build (updated), gate_review (new), observatory (new)

**Deferred to Phase 8:**
- IntelligenceGlyph component (10 new draw functions) — needs Phase 8 event bus data
- IntelligenceNetwork panel — visualization of intelligence chains, deferred until chains exist

---

## Phase 6: Dev Server Preview + Connectivity (10 batches)

**Session map:** 6.1 = P6-A through P6-F | 6.2 = P6-G through P6-J
**Prerequisite:** Phase 5 complete (window manager, canvas components, panel registration pattern). Tauri v2 shell plugin for process management.
**Repo:** CYM4TIC/forge-OS | **Local:** `.`

---

### Session 6.1 — Dev Server Preview Panel (P6-A through P6-F)

**Goal:** Embedded live application preview. Multiple instances allowed (one per dev server or viewport). Tauri shell API for process lifecycle, `<webview>` for rendering, viewport controls, agent-accessible DOM reading.

---

### P6-A: Shell Plugin + Process Manager Backend

**Goal:** Rust-side dev server process management. Start/stop/restart processes, capture stdout/stderr, detect ports, health polling.

**Files:**
- Update `apps/desktop/src-tauri/Cargo.toml` (add `tauri-plugin-shell = "2"`)
- Update `apps/desktop/src-tauri/tauri.conf.json` (add shell plugin permissions — scoped to localhost process spawning)
- Update `apps/desktop/src-tauri/capabilities/default.json` (shell:allow-spawn, shell:allow-kill)
- Create `apps/desktop/src-tauri/src/commands/devserver.rs` (DevServerManager struct in Tauri managed state):
  - `start_dev_server(command: String, args: Vec<String>, cwd: String) -> DevServerInfo` — spawns child process via shell plugin, captures PID, begins stdout/stderr streaming
  - `stop_dev_server(server_id: String)` — kills process by PID
  - `restart_dev_server(server_id: String)` — stop + start
  - `list_dev_servers() -> Vec<DevServerInfo>` — all tracked processes with status
  - `get_server_logs(server_id: String, tail: usize) -> Vec<LogLine>` — last N lines of stdout/stderr from ring buffer
  - DevServerInfo struct: id, command, args, cwd, pid, port (Option), status (starting/running/stopped/error), started_at
  - LogLine struct: timestamp, stream (stdout/stderr), content
  - Ring buffer (1000 lines per server) for log retention
- Update `apps/desktop/src-tauri/src/commands/mod.rs` (add devserver module)
- Update `apps/desktop/src-tauri/src/lib.rs` (register devserver commands + DevServerManager managed state)

**Gate:** `start_dev_server` spawns a process. `list_dev_servers` returns it. `stop_dev_server` kills it. `get_server_logs` returns captured output. No orphan processes on app close.
**Depends on:** Phase 1 (Tauri shell)
**Push:** Yes

---

### P6-B: Port Detection + Health Polling

**Goal:** Auto-detect which port a dev server is listening on. Periodic health polling to confirm the server is serving.

**Files:**
- Update `apps/desktop/src-tauri/src/commands/devserver.rs`:
  - `detect_server_port(server_id: String) -> Option<u16>` — parses stdout for common port patterns (`Listening on :3000`, `localhost:5173`, `Port: 8080`). Regex-based extraction covering Vite, Next.js, CRA, Express, Flask, Rails patterns.
  - Port scanner fallback: if stdout parsing fails, TCP-probe localhost ports 3000-9000 looking for the one that just opened.
  - Health poller: background tokio task per server. HTTP GET `http://localhost:{port}/` every 5s. Updates DevServerInfo.status (running → healthy, timeout → degraded, connection refused → error).
  - Emits Tauri event `devserver:status-changed` on health transitions.
- Create `apps/desktop/src-tauri/src/commands/devserver_patterns.rs` (port detection regex patterns — separated for testability):
  - `STDOUT_PORT_PATTERNS: &[Regex]` — 10+ patterns covering major frameworks
  - `extract_port(line: &str) -> Option<u16>` — first matching pattern wins

**Gate:** Start a Vite dev server → port auto-detected from stdout within 5s. Health poller reports `healthy` within 10s. Kill the process → health poller reports `stopped` within 5s.
**Depends on:** P6-A
**Push:** Yes

---

### P6-C: Bridge + Hook

**Goal:** Frontend bridge functions and React hook for dev server management.

**Files:**
- Update `apps/desktop/src/lib/tauri.ts`:
  - `startDevServer(command, args, cwd): Promise<DevServerInfo>`
  - `stopDevServer(serverId): Promise<void>`
  - `restartDevServer(serverId): Promise<void>`
  - `listDevServers(): Promise<DevServerInfo[]>`
  - `getServerLogs(serverId, tail): Promise<LogLine[]>`
  - `onDevServerStatusChanged(callback): Promise<UnlistenFn>` — Tauri event listener
  - Types: `DevServerInfo`, `LogLine`, `DevServerStatus`
  - All functions guarded by `isTauriRuntime` (OS-BL-008)
- Create `apps/desktop/src/hooks/useDevServer.ts`:
  - `useDevServer(serverId: string | null)` → `{ server, logs, start, stop, restart, loading, error }`
  - Subscribes to `devserver:status-changed` events
  - Polls logs on interval (2s) when server is active
  - Cleanup on unmount (unsubscribe events, clear intervals)

**Gate:** `useDevServer` returns live server state. Start/stop/restart work from React. Status transitions update in real-time.
**Depends on:** P6-A, P6-B
**Push:** Yes

---

### P6-D: Preview Panel Shell + Webview

**Goal:** The preview panel component. Replaces the placeholder. Webview-based preview of the running dev server.

**Files:**
- Rewrite `apps/desktop/src/components/panels/PreviewPanel.tsx`:
  - Props: `{ serverId?: string }` — which dev server to preview
  - States: no-server (server picker), loading (server starting), healthy (webview), error (server crashed), stopped (server killed)
  - Server picker: dropdown of running servers from `listDevServers()`, or "Start New" button
  - Start New flow: command input + working directory picker (uses Tauri dialog API)
  - Webview: `<iframe>` pointing to `http://localhost:{port}` (Tauri v2 doesn't have a native webview component for embedding — iframe is the standard pattern for localhost preview)
  - Refresh button, URL bar (shows current path within the iframe)
  - Loading skeleton while server is starting
  - Error state with server logs tail (last 20 lines)
  - Uses CANVAS/STATUS/RADIUS tokens (inline styles, no Tailwind)
  - Keyboard accessible: all controls focusable, Enter to refresh
  - Screen reader: aria-label on iframe, live region for status changes

**Gate:** Select a running server → iframe loads the app. No server → picker shown. Server crashes → error with logs. Keyboard navigable.
**Depends on:** P6-C
**Push:** Yes

---

### P6-E: Viewport Controls + URL Bar

**Goal:** Responsive viewport presets and URL navigation within the preview.

**Files:**
- Update `apps/desktop/src/components/panels/PreviewPanel.tsx`:
  - Viewport presets toolbar: Desktop (1280×800), Tablet (768×1024), Mobile (375×812), Custom
  - Custom dimensions: width/height number inputs
  - Viewport container: inner div with constrained dimensions, centered in panel, overflow hidden
  - The iframe resizes to match viewport dimensions (CSS transform scale if needed to fit panel)
  - URL bar: text input showing current iframe path. On Enter → navigates iframe. On external navigation → updates URL bar via iframe `load` event listener.
  - Viewport preset saves to localStorage keyed by serverId
  - Focus ring on all controls (`:focus-visible` pattern)

**Gate:** Switch between Desktop/Tablet/Mobile → iframe dimensions change. Custom dimensions work. URL bar reflects navigation. All controls keyboard accessible.
**Depends on:** P6-D
**Push:** Yes

---

### P6-F: Agent DOM Access + Session 6.1 Integration

**Goal:** Agents can read preview DOM state via Tauri commands. No screenshot round-trips. Final integration pass for Session 6.1.

**Files:**
- Update `apps/desktop/src-tauri/src/commands/devserver.rs`:
  - `read_preview_dom(server_id: String) -> Option<String>` — sends a message to the frontend requesting serialized DOM snapshot from the preview iframe
  - This uses Tauri's frontend→backend→frontend message pattern: backend emits `preview:request-dom` event, frontend handler reads iframe and responds via `preview:dom-response`
- Update `apps/desktop/src/components/panels/PreviewPanel.tsx`:
  - Listen for `preview:request-dom` event
  - On request: read iframe `contentDocument` (same-origin only — localhost), serialize to HTML string
  - Respond via `invoke('preview_dom_response', { html })`
  - Cross-origin guard: if iframe is cross-origin, return error message instead of DOM
- Update `apps/desktop/src/lib/tauri.ts`:
  - `readPreviewDom(serverId): Promise<string | null>`
  - `onPreviewDomRequest(callback): Promise<UnlistenFn>`
  - `respondPreviewDom(html): Promise<void>`
- Update window manager `PANEL_TYPE_REGISTRY` in `manager.ts` (confirm preview entry has `allowMultiple: true` — it already does, but verify defaultSize is appropriate for preview use case, update if needed)

**Gate:** Agent can call `read_preview_dom` and get back the rendered HTML of the preview. Works for localhost preview. Returns null/error for cross-origin. All 6.1 features work together: start server, see preview, change viewport, read DOM.
**Depends on:** P6-D, P6-E
**Push:** Yes
**ADL:** OS-ADL-017 (dev server management via Tauri shell plugin — scoped permissions, ring buffer logs, health polling, agent DOM access)

---

### Session 6.2 — Connectivity Panel (P6-G through P6-J)

**Goal:** Service health monitoring dashboard. Async health checks for external services, rendered as status cards with expand-to-detail. Compact dock pill mode.

---

### P6-G: Health Check Backend

**Goal:** Rust-side async health checks for external services. Periodic polling with configurable interval.

**Files:**
- Create `apps/desktop/src-tauri/src/commands/connectivity.rs`:
  - ServiceHealth struct: service_name, service_type (github/supabase/cloudflare/stripe/typesense/custom), status (healthy/degraded/unreachable/unconfigured), last_checked, latency_ms, details (HashMap<String, String>)
  - HealthCheckManager in Tauri managed state:
    - `check_service(service_type: String) -> ServiceHealth` — single service check
    - `check_all_services() -> Vec<ServiceHealth>` — all configured services
    - `get_service_status() -> Vec<ServiceHealth>` — cached status (no network call)
    - `set_check_interval(seconds: u32)` — update polling interval (default 60s)
  - Health check implementations:
    - **GitHub:** HTTP GET `https://api.github.com/repos/{owner}/{repo}` with token from keyring. Returns repo name, last push, open issues count.
    - **Supabase:** HTTP GET project URL `/rest/v1/` with anon key. Returns table count from schema introspection.
    - **Cloudflare:** HTTP GET Workers API (if configured). Returns worker count, last deploy.
    - **Stripe:** Validate API key format + HTTP GET `/v1/balance` (lightweight auth check). Returns mode (test/live).
    - **Typesense:** HTTP GET `/health`. Returns healthy/unhealthy.
    - **Custom:** User-defined URL + expected status code.
  - Background tokio task: polls all services on interval, emits `connectivity:status-changed` event on transitions.
  - Service configuration stored in SQLite (new migration V11: `service_configs` table — service_type, config_json, enabled, created_at, updated_at).
- Create SQLite migration `apps/desktop/src-tauri/migrations/V11__service_configs.sql`
- Update `apps/desktop/src-tauri/src/commands/mod.rs` (add connectivity module)
- Update `apps/desktop/src-tauri/src/lib.rs` (register connectivity commands + HealthCheckManager managed state)

**Gate:** `check_all_services` returns health for each configured service. Background poller emits events on status change. SQLite migration applies cleanly.
**Depends on:** Phase 1 (keyring for API keys), Phase 3 (SQLite)
**Push:** Yes

---

### P6-H: Connectivity Bridge + Hook

**Goal:** Frontend bridge functions and React hook for service health monitoring.

**Files:**
- Update `apps/desktop/src/lib/tauri.ts`:
  - `checkService(serviceType): Promise<ServiceHealth>`
  - `checkAllServices(): Promise<ServiceHealth[]>`
  - `getServiceStatus(): Promise<ServiceHealth[]>` — cached, no network
  - `setCheckInterval(seconds): Promise<void>`
  - `onConnectivityChanged(callback): Promise<UnlistenFn>`
  - Types: `ServiceHealth`, `ServiceType`, `ServiceStatus`
  - All functions guarded by `isTauriRuntime`
- Create `apps/desktop/src/hooks/useConnectivity.ts`:
  - `useConnectivity()` → `{ services, loading, error, refresh, setInterval }`
  - Subscribes to `connectivity:status-changed` events
  - Initial load via `getServiceStatus()` (cached) then `checkAllServices()` (fresh)
  - `refresh()` forces immediate check of all services
  - Cleanup on unmount

**Gate:** `useConnectivity` returns live service health array. Status transitions update in real-time via events. Refresh triggers immediate check.
**Depends on:** P6-G
**Push:** Yes

---

### P6-I: Connectivity Panel

**Goal:** Replace the placeholder ConnectivityPanel. Service health cards with expand-to-detail. Status summary header.

**Files:**
- Rewrite `apps/desktop/src/components/panels/ConnectivityPanel.tsx`:
  - Summary header: aggregate status indicator (all green → "All Systems Operational", any amber → "Degraded", any red → "Service Disruption") + last checked timestamp + refresh button
  - Service cards grid (responsive — 1 col narrow, 2 col wide):
    - Each card: service icon (emoji), service name, StatusBadge (from canvas components), latency display
    - Click to expand → detail section: key-value pairs from `details` map, last checked time, manual re-check button
    - Unconfigured services: muted card with "Configure" prompt
  - Loading skeleton while initial check runs
  - Error state with retry
  - Uses CANVAS/STATUS/RADIUS tokens (inline styles)
  - Keyboard: all cards focusable, Enter/Space to expand, Escape to collapse
  - Screen reader: aria-expanded on cards, live region for status summary
  - StatusBadge with animated pulse on heartbeat (existing component)

**Gate:** All configured services shown as cards. Expand reveals details. Unconfigured shows prompt. StatusBadge colors match health. Keyboard + screen reader accessible.
**Depends on:** P6-H
**Push:** Yes

---

### P6-J: Dock Pill Compact Mode + Session 6.2 Integration

**Goal:** Connectivity dock pill shows aggregate status. Phase 6 integration pass.

**Files:**
- Update `apps/desktop/src/components/layout/DockBar.tsx` (or equivalent dock pill renderer):
  - Connectivity dock pill: when ConnectivityPanel is minimized, the dock pill itself shows aggregate status color (green dot = all healthy, amber dot = degraded, red dot = down)
  - Badge count on dock pill = number of unhealthy services
  - Pill tooltip: "3/5 services healthy" or "All systems operational"
- Update window manager `PANEL_TYPE_REGISTRY` in `manager.ts`:
  - Verify connectivity entry constraints are appropriate
  - Update defaultSize if needed for the card-based layout
- Create workspace preset update: add `dev` preset to `BUILT_IN_PRESETS`:
  - `dev`: Chat + Preview + Connectivity (compact) — for active development with live preview + service health

**Gate:** Minimize connectivity panel → dock pill shows aggregate status. Unhealthy count as badge. `dev` workspace preset tiles Preview + Chat + Connectivity correctly. All Phase 6 features work end-to-end: start dev server, preview in iframe, monitor service health, dock pill aggregates.
**Depends on:** P6-I, P6-D
**Push:** Yes
**ADL:** OS-ADL-018 (service health monitoring — async polling, configurable interval, aggregate status in dock pill, expandable cards)

---

### Phase 6 Batch Summary

| Batch | Name | Session | Depends On |
|-------|------|---------|------------|
| P6-A | Shell Plugin + Process Manager | 6.1 | — |
| P6-B | Port Detection + Health Polling | 6.1 | P6-A |
| P6-C | Bridge + Hook | 6.1 | P6-A, P6-B |
| P6-D | Preview Panel Shell + Webview | 6.1 | P6-C |
| P6-E | Viewport Controls + URL Bar | 6.1 | P6-D |
| P6-F | Agent DOM Access + 6.1 Integration | 6.1 | P6-D, P6-E |
| P6-G | Health Check Backend | 6.2 | — |
| P6-H | Connectivity Bridge + Hook | 6.2 | P6-G |
| P6-I | Connectivity Panel | 6.2 | P6-H |
| P6-J | Dock Pill Compact + 6.2 Integration | 6.2 | P6-I, P6-D |

### Phase 6 Persona + Intelligence Gates

| Batch | Gates | Rationale |
|-------|-------|-----------|
| P6-A | Kehinde + Tanaka | Process spawning — systems architecture + security (scoped shell permissions) |
| P6-B | Kehinde | Async patterns — health polling, port detection robustness |
| P6-C | Kehinde | Bridge shape — command signatures, type consistency |
| P6-D | Mara + Riven | First visual preview surface — layout, empty/error/loading states |
| P6-E | Mara + Riven | Viewport controls — responsive behavior, touch targets, interaction |
| P6-F | Build Triad + Sentinel | Session 6.1 exit — full integration, regression, DOM access security |
| P6-G | Kehinde + Tanaka | External API calls — credential handling (keyring), error boundaries, no PII leaks |
| P6-H | Kehinde | Bridge shape — event patterns, hook cleanup |
| P6-I | Mara + Riven | Panel UI — card grid, expand/collapse, accessibility |
| P6-J | Build Triad + Sentinel + Meridian | Phase 6 exit — full integration, regression, cross-surface consistency |

**New ADL decisions expected:**
- **OS-ADL-017**: Dev server management via Tauri shell plugin — scoped permissions, ring buffer logs, health polling, agent DOM access
- **OS-ADL-018**: Service health monitoring — async polling, configurable interval, aggregate dock status, expandable detail cards

**Phase 6 infrastructure totals (after both sessions):**
- Session 6.1 will add: `tauri-plugin-shell` dependency, 1 Rust module (commands/devserver.rs + devserver_patterns.rs), ~6 Tauri commands, 1 hook (useDevServer), ~6 bridge functions, 1 panel replacement (PreviewPanel), viewport controls, agent DOM access
- Session 6.2 will add: 1 SQLite migration (V11), 1 Rust module (commands/connectivity.rs), ~4 Tauri commands, 1 hook (useConnectivity), ~5 bridge functions, 1 panel replacement (ConnectivityPanel), dock pill enhancement, 1 new workspace preset (dev)
- New Tauri commands: ~10 total
- New React hooks: 2 (useDevServer, useConnectivity)
- Panel type count: still ~11 (preview + connectivity already registered, replacing placeholders)
- Workspace presets: 6 (build, review, focus, gate_review, observatory, dev)

**Deferred to Phase 8:**
- IntelligenceGlyph component (10 new draw functions) — needs Phase 8 event bus data
- IntelligenceNetwork panel — visualization of intelligence chains, deferred until chains exist

---

## Phase 7-9: To Be Written

Phase 7: Team Panel + Agent Presence + Action Palette + Proposals (3 sessions)
Phase 8: Orchestration + LightRAG + Predictive Intelligence + Evolution (8 sessions)
Phase 9: Integration Test + Launch Readiness (2-3 sessions)
