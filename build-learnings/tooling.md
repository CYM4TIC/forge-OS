# Build Learnings — Tooling

> Build toolchain, environment setup, MCP/git permissions.
> Tags: `[tooling]`

---

### OS-BL-001: GitHub MCP PAT scoped to forge-dms only
**Discovered:** 2026-03-31 | **Domain:** tooling | **Severity:** blocker | **Tag:** [FORGE-OS]
**Context:** P1-A — first push to CYM4TIC/forge-OS via GitHub MCP push_files and create_or_update_file
**Problem:** Both MCP push methods return "Permission Denied: Resource not accessible by personal access token." The PAT configured in the MCP is scoped only to the forge-dms repo, not forge-OS.
**Solution:** Clone forge-OS locally to `.`. Write files via filesystem tools. Commit and push via git CLI. git credentials (Windows Credential Manager) work fine for CYM4TIC account.
**Prevention:** Always use git CLI for forge-OS pushes. Local repo path: `.`. Do not attempt GitHub MCP push_files on this repo.

---

### OS-BL-002: MSVC C++ Build Tools Required for Tauri on Windows
**Discovered:** 2026-03-31 | **Domain:** tooling | **Severity:** blocker | **Tag:** [FORGE-OS]
**Context:** P1-B — first `cargo check` for Tauri v2 desktop app
**Problem:** Linking fails with `link: extra operand` errors. Root cause: Git for Windows installs `/usr/bin/link.exe` (GNU link — creates hard links). Rust finds this instead of the MSVC `link.exe`. Additionally, VS 2022 Community is installed but missing the "Desktop development with C++" workload, so the MSVC linker doesn't exist on the system at all.
**Solution:** Install "Desktop development with C++" workload via Visual Studio Installer. This provides the MSVC compiler (`cl.exe`), linker (`link.exe`), and Windows SDK headers that Tauri and its dependencies need.
**Prevention:** Before starting any Rust/Tauri project on Windows, verify: `rustup show` shows `x86_64-pc-windows-msvc` AND `cl.exe` is findable in a VS Developer Command Prompt. The `rustc --version` check alone is insufficient — it doesn't verify the linker.

---

### OS-BL-003: pnpm 10.x Blocks esbuild Postinstall by Default
**Discovered:** 2026-03-31 | **Domain:** tooling | **Severity:** gotcha | **Tag:** [FORGE-OS]
**Context:** P1-B — `pnpm install` after adding Vite 6 (which depends on esbuild)
**Problem:** pnpm 10.x introduced `pnpm.onlyBuiltDependencies` security feature that blocks postinstall scripts by default. esbuild's postinstall downloads the platform-specific binary. Without it, `vite build` would fail with missing binary.
**Solution:** Add `"pnpm": { "onlyBuiltDependencies": ["esbuild"] }` to root `package.json`. The interactive `pnpm approve-builds` command doesn't work in non-interactive terminals.
**Prevention:** Always add esbuild to `onlyBuiltDependencies` in any pnpm 10.x monorepo using Vite.

---

### OS-BL-005: Tauri v2 build.rs requires icons/icon.ico on Windows
**Discovered:** 2026-03-31 | **Domain:** tooling | **Severity:** gotcha | **Tag:** [FORGE-OS]
**Context:** P1-B — first `cargo check` for Tauri v2 desktop app
**Problem:** Tauri v2 build.rs requires icons/icon.ico on Windows — generate a placeholder if no real icon exists yet.
**Prevention:** Always generate a placeholder icon.ico before first cargo check in a new Tauri project.

---

### OS-BL-006: Background agents cannot inherit MCP/Bash permissions
**Discovered:** 2026-04-01 | **Domain:** tooling | **Severity:** gotcha | **Tag:** [CROSS-CUTTING]
**Context:** Session 4.1 — attempted to parallelize 4 GitHub pushes via background Agent tool
**Problem:** Background agents (subagent_type=general-purpose, run_in_background=true) do not inherit push_files or Bash permissions from the parent session. All 4 background push agents failed with permission denied. The main session had to push directly via git CLI.
**Solution:** Always push from the main session using git CLI (git add + git commit + git push). Do not delegate push operations to background agents.
**Prevention:** Use background agents for read-only research/exploration only. All write operations to GitHub must happen in the main session context.

---
