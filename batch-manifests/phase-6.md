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

