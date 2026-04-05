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

