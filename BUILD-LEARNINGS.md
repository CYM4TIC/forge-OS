# Forge OS — Build Learnings Registry

> **Nyx-maintained.** Gotchas, workarounds, and discovered patterns specific to the Forge OS build. Every OS build session loads this file. Every OS build session appends discoveries. Prevents rediscovery of solved problems.
>
> **[FORGE-OS] Tag System:** All entries in this file are tagged `[FORGE-OS]`. When the OS leaves the DMS vault and manages its own state, entries tagged `[FORGE-OS]` should be migrated to the OS's internal BUILD-LEARNINGS.md. Entries tagged `[CROSS-CUTTING]` should be copied to both the OS and DMS registries. DMS-specific entries (in `04-cross-refs/BUILD-LEARNINGS.md`) are NOT duplicated here.
>
> **Portable DMS learnings:** Several DMS BUILD-LEARNINGS entries apply to OS work. Rather than duplicate them, reference by ID:
> - BL-001: edit_file $ backreference (MCP sessions only)
> - BL-002: Large file rewrites are token-expensive
> - BL-009: Next.js requires @types/node
> - BL-014: Vite import.meta.env types need "types": ["vite/client"]
> - BL-023: Tailwind v4 uses @tailwindcss/postcss
> - BL-024: tsconfig paths AND Vite alias both required for @/* imports
> - BL-033: Inline persona gates = self-review. Use agent dispatch.

---

## Domain Tags

Filter at Phase 0 by grepping for the tag(s) matching your batch's domain:
`[frontend]` `[canvas]` `[rust]` `[runtime]` `[design-system]` `[governance]` `[tooling]`

## Quick Index

| Entry | Tags | Severity | One-Line Summary |
|---|---|---|---|
| OS-BL-001 | `[tooling]` | blocker | GitHub MCP PAT scoped to forge-dms only — use git CLI for forge-OS pushes |
| OS-BL-002 | `[tooling]` `[rust]` | blocker | MSVC C++ build tools required for Tauri on Windows — Git's link.exe shadows MSVC linker |
| OS-BL-003 | `[tooling]` | gotcha | pnpm 10.x blocks esbuild postinstall by default — add `pnpm.onlyBuiltDependencies: ["esbuild"]` to root package.json |
| OS-BL-004 | `[frontend]` | gotcha | react-resizable-panels v4 renamed API: PanelGroup→Group, PanelResizeHandle→Separator. Read dist exports, not docs. |
| OS-BL-005 | `[tooling]` `[rust]` | gotcha | Tauri v2 build.rs requires icons/icon.ico on Windows — generate a placeholder if no real icon exists yet |
| OS-BL-006 | `[tooling]` `[governance]` | gotcha | Background agents cannot inherit MCP/Bash permissions — push from main session only |
| OS-BL-007 | `[governance]` | blocker | Updating TAURI-BUILD-PLAN.md without updating BATCH-MANIFESTS.md = next session has nothing to build. FM-10. |
| OS-BL-008 | `[frontend]` `[runtime]` | gotcha | Tauri invoke floods console in browser-only dev mode — guard every bridge function with `isTauriRuntime` |
| OS-BL-009 | `[rust]` `[runtime]` | gotcha | rusqlite Rows borrows Statement — can't branch stmt creation and collect across if/else boundary. Collect within each branch. |
| OS-BL-010 | `[governance]` | pattern | Batch manifests must use actual repo file paths, not assumed paths. Remediation session required after build plan changes. |
| OS-BL-011 | `[frontend]` `[runtime]` | gotcha | ThresholdStatus field is `usage_fraction` (0-1), not `usage_percent`. Phantom fields compile but evaluate to undefined at runtime. |
| OS-BL-012 | `[design-system]` `[canvas]` | drift | Font strings hardcoded across 12 files. Added FONT token to canvas-tokens.ts. New tokens need propagation sweep. |
| OS-BL-013 | `[governance]` | process-failure | "Pre-existing" is not an exemption. Rule 43 now structural gate at Phase 5: tsc zero errors + all findings fixed + climb per fix. |
| OS-BL-014 | `[design-system]` `[frontend]` | gotcha | WCAG contrast fix already existed in sibling function (findingsBadgeColors) but connectivityBadge copied the bug, not the fix. |
| OS-BL-015 | `[design-system]` `[frontend]` | gotcha | Removing JS focus ring handlers is half the migration — `outline: 'none'` inline styles in the same components silently defeat the CSS `:focus-visible` replacement. When migrating focus management to CSS, grep for BOTH the handler AND the suppression. P7-A: 11 instances across 7 files survived the initial removal pass. |
| OS-BL-016 | `[design-system]` `[canvas]` | gotcha | StatusBadge glyph at 20x20px: dot radius is only 4px at 1x DPR. Glyph size formula must cap to dot boundary (`dotRadius * 1.4`), not grow independently. Small canvas components need size-aware rendering, not fixed minimums. |
| OS-BL-017 | `[frontend]` `[design-system]` | pattern | WAI-ARIA Tabs require roving tabindex (tabIndex 0/-1 + arrow keys + Home/End + all panels rendered). TeamPanel is the canonical template. Copy this pattern for all future tabbed panels. |
| OS-BL-018 | `[frontend]` `[design-system]` | drift | @keyframes (spin, pulse) must be explicitly injected per-component when using inline React styles. Three components now duplicate them (TeamPanel, ConnectivityPanel, ActionPalette). Future: centralize in globals.css and remove per-component `<style>` injections. |

---

## How to Use

**On session start:** Load this file alongside `BOOT.md`. Use the Quick Index to find entries relevant to your current batch domain.

**During build:** When you discover a gotcha, workaround, or non-obvious pattern, append it immediately using the format below. Don't wait for session end. Also add the entry to the Quick Index table above.

**Entry format:**
```markdown
### OS-BL-NNN: [Short title]
**Discovered:** [date] | **Domain:** [architecture/runtime/content/tooling/deployment] | **Severity:** [blocker/gotcha/tip] | **Tag:** [FORGE-OS] or [CROSS-CUTTING]
**Context:** [What you were doing when you hit this]
**Problem:** [What went wrong or was surprising]
**Solution:** [What fixed it]
**Prevention:** [How to avoid hitting this again]
```

---

## Architecture & Runtime Learnings
<!-- domain:architecture,runtime -->

### OS-BL-006: Background agents cannot inherit MCP/Bash permissions
**Discovered:** 2026-04-01 | **Domain:** tooling | **Severity:** gotcha | **Tag:** [CROSS-CUTTING]
**Context:** Session 4.1 — attempted to parallelize 4 GitHub pushes via background Agent tool
**Problem:** Background agents (subagent_type=general-purpose, run_in_background=true) do not inherit push_files or Bash permissions from the parent session. All 4 background push agents failed with permission denied. The main session had to push directly via git CLI.
**Solution:** Always push from the main session using git CLI (git add + git commit + git push). Do not delegate push operations to background agents.
**Prevention:** Use background agents for read-only research/exploration only. All write operations to GitHub must happen in the main session context.

---

### OS-BL-007: Build plan changes MUST propagate to batch manifests
**Discovered:** 2026-04-01 | **Domain:** process | **Severity:** blocker | **Tag:** [CROSS-CUTTING]
**Context:** Research session synthesized v2 concepts (context graph, TimesFM, intelligence chains, self-modification) into TAURI-BUILD-PLAN.md. Added Sessions 8.3b, 8.7, expanded 8.1/8.2/8.4/Phase 9, intelligence glyphs in 5.3. 15+ edits to a 66KB file.
**Problem:** BATCH-MANIFESTS.md was never updated. The next session loaded the prompt, read the batch manifests, and had no new batches to build. The plan said one thing, the manifests said another. FM-10 (Consequence Blindness) + FM-5 (Cadence Hypnosis) — deep in plan edits, the "what else needs to change" circuit never fired.
**Solution:** Operator caught it and updated manifests in a subsequent session.
**Prevention:** After ANY modification to TAURI-BUILD-PLAN.md, before closing the session, follow the chain: TAURI-BUILD-PLAN.md → BATCH-MANIFESTS.md → BOOT.md (session counts) → ADL (new entries). Every downstream artifact must be touched. The batch manifests are the most critical — they're what the next Nyx actually reads to build. Rules 36 and 40 apply. The chain must terminate naturally, not when you feel done.

---

## Content & Agent Learnings
<!-- domain:content -->

*(Empty — awaiting agent genericization sessions.)*

---

## Tooling & Deployment Learnings
<!-- domain:tooling,deployment -->

### OS-BL-001: GitHub MCP PAT scoped to forge-dms only
**Discovered:** 2026-03-31 | **Domain:** tooling | **Severity:** blocker | **Tag:** [FORGE-OS]
**Context:** P1-A — first push to CYM4TIC/forge-OS via GitHub MCP push_files and create_or_update_file
**Problem:** Both MCP push methods return "Permission Denied: Resource not accessible by personal access token." The PAT configured in the MCP is scoped only to the forge-dms repo, not forge-OS.
**Solution:** Clone forge-OS locally to `.`. Write files via filesystem tools. Commit and push via git CLI. git credentials (Windows Credential Manager) work fine for CYM4TIC account.
**Prevention:** Always use git CLI for forge-OS pushes. Local repo path: `.`. Do not attempt GitHub MCP push_files on this repo.

### OS-BL-002: MSVC C++ Build Tools Required for Tauri on Windows
**Discovered:** 2026-03-31 | **Domain:** tooling | **Severity:** blocker | **Tag:** [FORGE-OS]
**Context:** P1-B — first `cargo check` for Tauri v2 desktop app
**Problem:** Linking fails with `link: extra operand` errors. Root cause: Git for Windows installs `/usr/bin/link.exe` (GNU link — creates hard links). Rust finds this instead of the MSVC `link.exe`. Additionally, VS 2022 Community is installed but missing the "Desktop development with C++" workload, so the MSVC linker doesn't exist on the system at all.
**Solution:** Install "Desktop development with C++" workload via Visual Studio Installer. This provides the MSVC compiler (`cl.exe`), linker (`link.exe`), and Windows SDK headers that Tauri and its dependencies need.
**Prevention:** Before starting any Rust/Tauri project on Windows, verify: `rustup show` shows `x86_64-pc-windows-msvc` AND `cl.exe` is findable in a VS Developer Command Prompt. The `rustc --version` check alone is insufficient — it doesn't verify the linker.

### OS-BL-003: pnpm 10.x Blocks esbuild Postinstall by Default
**Discovered:** 2026-03-31 | **Domain:** tooling | **Severity:** gotcha | **Tag:** [FORGE-OS]
**Context:** P1-B — `pnpm install` after adding Vite 6 (which depends on esbuild)
**Problem:** pnpm 10.x introduced `pnpm.onlyBuiltDependencies` security feature that blocks postinstall scripts by default. esbuild's postinstall downloads the platform-specific binary. Without it, `vite build` would fail with missing binary.
**Solution:** Add `"pnpm": { "onlyBuiltDependencies": ["esbuild"] }` to root `package.json`. The interactive `pnpm approve-builds` command doesn't work in non-interactive terminals.
**Prevention:** Always add esbuild to `onlyBuiltDependencies` in any pnpm 10.x monorepo using Vite.

### OS-BL-008: isTauriRuntime Guard for Browser-Only Dev Mode
**Discovered:** 2026-04-01 | **Domain:** runtime | **Severity:** gotcha | **Tag:** [FORGE-OS]
**Context:** P5-F gate — Build Triad (Mara) found 100+ console errors flooding DevTools
**Problem:** Every Tauri `invoke()` call throws `TypeError: Cannot read properties of undefined (reading 'invoke')` when running the frontend in browser-only mode (no Tauri backend). LayoutPersistence fires on every panel move/resize, producing hundreds of errors per minute. Masks real errors during development.
**Solution:** Added `isTauriRuntime` flag to `tauri.ts`: `export const isTauriRuntime = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;`. Every bridge function that calls `invoke()` must guard with `if (!isTauriRuntime) return Promise.resolve(default)`. Applied to persistence.ts, usePermissions.ts, and all new P5-G+ bridge functions.
**Prevention:** Every new bridge function MUST include the `isTauriRuntime` guard. The pattern is now in the batch manifests as a standing requirement.

### OS-BL-009: rusqlite Statement Lifetime in Branched Queries
**Discovered:** 2026-04-01 | **Domain:** runtime | **Severity:** gotcha | **Tag:** [FORGE-OS]
**Context:** P5-G — `get_finding_counts` with optional session_id filter
**Problem:** `rusqlite::Rows` borrows from `Statement`. Creating `stmt` inside an `if/else` branch and trying to collect results across the branch boundary fails — `stmt` is dropped at the end of the branch but the iterator still borrows it. Three attempts needed to find the working pattern.
**Solution:** Collect `Vec<(String, i64)>` fully within each `match` arm before the arm closes. The `stmt` lives long enough because `collect()` consumes all rows before the branch ends.
**Prevention:** For rusqlite queries with optional filters: either (a) build one dynamic SQL string with runtime params, or (b) use `match` arms that fully collect within each arm. Never try to return an iterator from a branch.

### OS-BL-010: Batch Manifests Must Track Actual File Paths
**Discovered:** 2026-04-01 | **Domain:** process | **Severity:** pattern | **Tag:** [FORGE-OS]
**Context:** Session 5.1 remediation — manifests referenced `src/panels/` but actual path is `apps/desktop/src/components/panels/`
**Problem:** Batch manifests were written before the final repo structure was locked. All file paths were wrong. Placeholder files existed that manifests didn't account for. Build plan added features (intelligence glyphs) that manifests didn't include. Required a full remediation session to reconcile.
**Solution:** Remediation session: audit codebase reality → compare against manifests + build plan → rewrite manifests with correct paths, existing file references, and deferred features.
**Prevention:** After any build plan change, run a reconciliation pass on batch manifests. Add path prefix documentation to manifest headers. FM-10 (Consequence blindness) — build plan changes cascade to manifests.

### OS-BL-011: Phantom TypeScript Fields at Runtime
**Discovered:** 2026-04-01 | **Domain:** runtime | **Severity:** gotcha | **Tag:** [FORGE-OS]
**Context:** P5-F gate — Pierce found `usage_percent` used across 3 files but the field doesn't exist on `ThresholdStatus`
**Problem:** `contextStatus?.usage_percent` compiles without error in TypeScript because optional chaining (`?.`) on a non-existent property returns `undefined`, not a type error. The `!= null` check then evaluates to `false`, silently falling to the default value. All context gauges rendered zeros — looked like "no data" rather than "wrong field name."
**Solution:** Changed to `usage_fraction` (the actual field). Added computed `tokens_remaining` from `context_window_size - current_tokens`.
**Prevention:** When consuming typed data from Tauri bridge: read the interface definition first, don't assume field names. TypeScript's optional chaining makes phantom field access silent. Consider `noUncheckedIndexedAccess` in tsconfig for stricter optional access.

### OS-BL-012: Font Token Blind Spot — Design Token Taxonomy Gap
**Discovered:** 2026-04-02 | **Domain:** design-system | **Severity:** drift | **Tag:** [FORGE-OS]
**Context:** P6-I gate (Riven CP-008) — `'monospace'` hardcoded in 4 panels, `-apple-system, BlinkMacSystemFont, sans-serif` hardcoded in 7 canvas-components.
**Problem:** canvas-tokens.ts had CANVAS, STATUS, RADIUS, TIMING, GLOW, TINT, DOCK, HIGHLIGHT, PIPELINE — 9 token groups, no FONT. Every component independently hardcoded the same font strings. If the font stack ever changes, 12+ files drift independently.
**Solution:** Added `FONT = { mono: 'monospace', system: '-apple-system, BlinkMacSystemFont, sans-serif' }` to canvas-tokens.ts. Propagated to all 12 consumer files. Added to barrel export.
**Prevention:** When adding a new token group to canvas-tokens.ts, grep the codebase for the raw value it replaces. The gap isn't the missing token — it's the existing hardcoded instances that won't be found until someone greps for them. New tokens should ship with a propagation sweep.

### OS-BL-014: WCAG Contrast in Badge Colors — Copy-Paste Divergence
**Discovered:** 2026-04-02 | **Domain:** design-system | **Severity:** gotcha | **Tags:** `[design-system]` `[frontend]`
**Context:** P6-J gate (Riven R-DS-01) — connectivityBadge used white text on amber, same file has findingsBadgeColors that already fixed this.
**Problem:** findingsBadgeColors had a comment noting white on #f59e0b is 2.1:1 contrast and used dark text. connectivityBadge, written 50 lines below in the same file, made the exact same mistake and used '#fff'. The fix was already in the same file but the copy-paste divergence wasn't caught during build.
**Solution:** Matched connectivityBadge warning text to CANVAS.bg (dark). Added comment cross-referencing the contrast requirement.
**Prevention:** When creating a new function that parallels an existing one in the same file, read the existing function's comments and edge case handling. The fix you need may already be documented in the sibling function.

### OS-BL-017: WAI-ARIA Tabs Require Roving Tabindex — First Tab Template
**Discovered:** 2026-04-03 | **Domain:** frontend, design-system | **Severity:** pattern | **Tag:** [FORGE-OS] `[frontend]` `[design-system]`
**Context:** P7-E TeamPanel is the first tabbed panel in Forge OS. Mara's gate flagged M-CRIT-1: tablist with no arrow key navigation is a WAI-ARIA violation.
**Problem:** Standard button tabs (each with tabIndex=0) create multiple tab stops where the WAI-ARIA Tabs Pattern requires a single tab stop with arrow key navigation (roving tabindex). All panels rendered, inactive hidden with display:none, so aria-controls resolves.
**Solution:** TabButton gets `tabIndex={active ? 0 : -1}`, `aria-controls` only on active tab, `buttonRef` for programmatic focus. Parent tablist handles `onKeyDown` for ArrowLeft/Right/Up/Down/Home/End. All tabpanels rendered simultaneously with `display: activeTab === 'x' ? 'flex' : 'none'`.
**Prevention:** This is now the canonical tab pattern for Forge OS. Any future tabbed panel must copy this template from TeamPanel — TabButton component + handleTablistKeyDown handler + tabRefs + all-panels-rendered.

---

### OS-BL-018: @keyframes Must Be Injected Per-Component — Inline Style Limitation
**Discovered:** 2026-04-03 | **Domain:** frontend, design-system | **Severity:** drift | **Tag:** [FORGE-OS] `[frontend]` `[design-system]`
**Context:** P7-G ActionPalette referenced `@keyframes spin` and `@keyframes pulse` in inline style objects, but neither was defined. Both animations silently failed (static spinner, no skeleton pulse). Three triad members flagged independently.
**Problem:** React inline styles can reference animation names, but CSS `@keyframes` definitions must live in a stylesheet. Each component that uses animations currently injects its own `<style>` tag with keyframe definitions. This is fragile — the dependency is invisible until someone notices the animation doesn't work.
**Solution:** Inject `<style>` block with required keyframes inside each component that uses them. M-CRIT-1 fix pattern: constant strings `KEYFRAMES` + `FOCUS_AND_MOTION_STYLES` rendered in every return path.
**Prevention:** Long-term: define all reusable keyframes in globals.css. Short-term: any new component using `animation:` in inline styles must inject its own `<style>`. Grep for `animation:` in new component files to catch this.

---

### OS-BL-013: "Pre-Existing" Is Not an Exemption — Rule 43 Structural Gate
**Discovered:** 2026-04-02 | **Domain:** governance | **Severity:** process-failure | **Tag:** [FORGE-OS]
**Context:** P6-I close — 3 TypeScript errors existed in GraphViewerPanel, FlowOverlay, PreviewPanel. Nyx reported them as "pre-existing" and closed the batch.
**Problem:** Rule 43 says "fix everything when found, no exceptions." Calling errors "pre-existing" is the exact exemption language the rule prohibits (FM-4: findings avoidance). The behavioral rule wasn't enough — I knew the rule and violated it anyway because the errors weren't "mine."
**Solution:** Rule 43 is now a structural gate at Phase 5: `tsc --noEmit` must return zero errors before close. The gate is in EXECUTION-PROTOCOL.md Section 4, nyx-kernel.md Phase 5 table + adversarial check step 0, and METHODOLOGY.md Rule 43. Origin of the error is irrelevant.
**Prevention:** Behavioral rules fail when the builder has incentive to skip them (completion gravity, FM-7). Structural gates can't be skipped — the build literally doesn't close. Convert critical behavioral rules to structural gates when violations occur.

---

### OS-BL-014: CANVAS.bg As Inverse Text Is Dark-Theme-Only
**Discovered:** 2026-04-03 | **Domain:** frontend | **Severity:** carried-risk | **Tag:** [FORGE-OS]
**Context:** P7-H — replacing raw `#fff` on accent-background buttons and user bubbles. Used `CANVAS.bg` (near-black) as text color on `STATUS.accent` and `STATUS.danger` backgrounds.
**Problem:** `CANVAS.bg` only works as "inverse text" because the Forge OS theme is dark-only. If a light theme ships, `CANVAS.bg` becomes near-white on bright background — invisible.
**Solution:** Acceptable for now. When light theme work begins, add a `CANVAS.textInverse` token. Grep `color: CANVAS.bg` to find all instances.
**Prevention:** Track in design-system token audit. Don't assume single-theme forever.

---

### OS-BL-015: Focus Trap Pattern — Extract to useFocusTrap Hook
**Discovered:** 2026-04-03 | **Domain:** frontend | **Severity:** pattern | **Tag:** [FORGE-OS]
**Context:** P7-H — ConfirmationModal is the first true modal. Built inline focus trap (~30 lines: Tab/Shift+Tab cycling, focus-on-mount, focus-restore-on-unmount).
**Problem:** Next modal will duplicate this code. Copy-paste invites divergence.
**Solution:** Extract `useFocusTrap(dialogRef)` hook at second modal usage. ConfirmationModal is the reference implementation.
**Prevention:** Don't extract preemptively. Do extract at second usage.

---

### OS-BL-016: Oneshot Channel Confirmation — Reaper Is Mandatory
**Discovered:** 2026-04-03 | **Domain:** rust | **Severity:** architecture | **Tag:** [FORGE-OS]
**Context:** P7-H — ConfirmationRouter uses oneshot channels for async confirmation. Kehinde flagged stale entry leak if frontend never responds.
**Problem:** Without a reaper, pending oneshot senders accumulate. Each blocks an async task awaiting the receiver. Task leak under long sessions.
**Solution:** Added 60s TTL reaper (`reap_stale`) that auto-cancels stale entries. Also wire into the 30s maintenance loop for background cleanup.
**Prevention:** Any async "wait for external response" path needs a timeout. Apply to all future oneshot/channel patterns.

---

### `[rust]` SQLite `?N` Parameters Are Global Across UNION ALL
**Batch:** P7-I | **Caught:** Self-review during gate wait
**Problem:** In a `UNION ALL` query with shared `WHERE` clauses, `?1` in branch 2 binds to the same value as `?1` in branch 1 — parameters are global to the prepared statement, not per-branch. Tripling params caused LIMIT/OFFSET to bind to wrong values.
**Solution:** Pass filter params once, then append LIMIT/OFFSET at the correct indices.
**Prevention:** When writing UNION ALL with shared filters, always pass params once. `?N` is statement-global.

---
