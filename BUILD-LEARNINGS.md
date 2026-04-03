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

### OS-BL-013: "Pre-Existing" Is Not an Exemption — Rule 43 Structural Gate
**Discovered:** 2026-04-02 | **Domain:** governance | **Severity:** process-failure | **Tag:** [FORGE-OS]
**Context:** P6-I close — 3 TypeScript errors existed in GraphViewerPanel, FlowOverlay, PreviewPanel. Nyx reported them as "pre-existing" and closed the batch.
**Problem:** Rule 43 says "fix everything when found, no exceptions." Calling errors "pre-existing" is the exact exemption language the rule prohibits (FM-4: findings avoidance). The behavioral rule wasn't enough — I knew the rule and violated it anyway because the errors weren't "mine."
**Solution:** Rule 43 is now a structural gate at Phase 5: `tsc --noEmit` must return zero errors before close. The gate is in EXECUTION-PROTOCOL.md Section 4, nyx-kernel.md Phase 5 table + adversarial check step 0, and METHODOLOGY.md Rule 43. Origin of the error is irrelevant.
**Prevention:** Behavioral rules fail when the builder has incentive to skip them (completion gravity, FM-7). Structural gates can't be skipped — the build literally doesn't close. Convert critical behavioral rules to structural gates when violations occur.

---
