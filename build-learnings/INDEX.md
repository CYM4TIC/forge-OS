# Build Learnings — Index

> **Nyx-maintained.** Gotchas, workarounds, and discovered patterns specific to the Forge OS build.
> Split by domain tag. Load only the file(s) matching your batch's domain at Pre-Batch Checklist step 5.

## Domain Files

| Domain | File | Entries | What's Here |
|--------|------|---------|-------------|
| `[tooling]` | `tooling.md` | 5 | Build toolchain, environment setup, MCP/git permissions |
| `[frontend]` | `frontend.md` | 12 | React hooks, DOM patterns, event handling, animation |
| `[rust]` | `rust.md` | 8 | SQLite, rusqlite, Tauri commands, trait patterns |
| `[design-system]` | `design-system.md` | 7 | Tokens, WCAG, typography, dark-mode rules, animation |
| `[runtime]` | `runtime.md` | 5 | Mana, dispatch, memory scoring, three-space, RRF |
| `[governance]` | `governance.md` | 10 | Process rules, ecosystem patterns, audit methodology |

> Entries with multiple tags live in their PRIMARY domain file. The Quick Index below shows all tags for cross-domain lookup.

## Portable DMS Learnings

Referenced by ID — not duplicated. See DMS `04-cross-refs/BUILD-LEARNINGS.md` for full entries:
- BL-001: edit_file $ backreference (MCP sessions only)
- BL-002: Large file rewrites are token-expensive
- BL-009: Next.js requires @types/node
- BL-014: Vite import.meta.env types need "types": ["vite/client"]
- BL-023: Tailwind v4 uses @tailwindcss/postcss
- BL-024: tsconfig paths AND Vite alias both required for @/* imports
- BL-033: Inline persona gates = self-review. Use agent dispatch.

## Quick Index

| Entry | Primary | All Tags | Severity | One-Line Summary |
|---|---|---|---|---|
| OS-BL-001 | tooling | `[tooling]` | blocker | GitHub MCP PAT scoped to forge-dms only — use git CLI |
| OS-BL-002 | tooling | `[tooling]` `[rust]` | blocker | MSVC C++ build tools required for Tauri on Windows |
| OS-BL-003 | tooling | `[tooling]` | gotcha | pnpm 10.x blocks esbuild postinstall |
| OS-BL-004 | frontend | `[frontend]` | gotcha | react-resizable-panels v4 renamed API |
| OS-BL-005 | tooling | `[tooling]` `[rust]` | gotcha | Tauri v2 build.rs requires icons/icon.ico |
| OS-BL-006 | tooling | `[tooling]` `[governance]` | gotcha | Background agents cannot inherit MCP/Bash permissions |
| OS-BL-007 | governance | `[governance]` | blocker | Build plan changes MUST propagate to batch manifests |
| OS-BL-008 | frontend | `[frontend]` `[runtime]` | gotcha | isTauriRuntime guard for browser-only dev mode |
| OS-BL-009 | rust | `[rust]` `[runtime]` | gotcha | rusqlite Rows borrows Statement — collect within each branch |
| OS-BL-010 | governance | `[governance]` | pattern | Batch manifests must use actual repo file paths |
| OS-BL-011 | frontend | `[frontend]` `[runtime]` | gotcha | ThresholdStatus field is usage_fraction not usage_percent |
| OS-BL-012 | design-system | `[design-system]` `[canvas]` | drift | Font strings hardcoded — added FONT token |
| OS-BL-013 | governance | `[governance]` | process-failure | "Pre-existing" is not an exemption. Rule 43 structural gate. |
| OS-BL-014 | design-system | `[design-system]` `[frontend]` | gotcha | WCAG contrast fix existed in sibling function |
| OS-BL-015 | design-system | `[design-system]` `[frontend]` | gotcha | Focus ring: grep for handlers AND outline:none suppression |
| OS-BL-016 | design-system | `[design-system]` `[canvas]` | gotcha | StatusBadge glyph must cap to dot boundary |
| OS-BL-017 | frontend | `[frontend]` `[design-system]` | pattern | WAI-ARIA Tabs roving tabindex — TeamPanel canonical template |
| OS-BL-018 | frontend | `[frontend]` `[design-system]` | drift | @keyframes must be injected per-component |
| OS-BL-019 | rust | `[rust]` `[governance]` | pattern | Dismissal ≠ rejection — distinct guards required |
| OS-BL-020 | rust | `[rust]` | pattern | chrono_now() duplicated — extract to shared util |
| OS-BL-021 | rust | `[rust]` | gotcha | SQLite LIKE wildcards must be escaped |
| OS-BL-022 | frontend | `[frontend]` | pattern | Real-time hook: debounce + fetch guard + entry cap |
| OS-BL-023 | frontend | `[frontend]` | gotcha | @keyframes must be self-provided per panel |
| OS-BL-024 | frontend | `[frontend]` `[runtime]` | pattern | Do NOT debounce parallel dispatch event handlers |
| OS-BL-025 | frontend | `[frontend]` | pattern | Sequence registry load before derived data |
| OS-BL-026 | frontend | `[frontend]` `[runtime]` | pattern | Event+poll hybrid: sequence counter prevents stale overwrites |
| OS-BL-027 | frontend | `[frontend]` `[design-system]` | gotcha | Workspace preset sizes must respect minWidth/minHeight |
| OS-BL-028 | frontend | `[frontend]` `[design-system]` | pattern | DockBar @keyframes self-provided per OS-BL-018 |
| OS-BL-029 | rust | `[rust]` `[runtime]` | pattern | Backward-compatible scrubbing via opt-in wrapper |
| OS-BL-030 | rust | `[rust]` `[runtime]` | pattern | Composable halt conditions via trait + BitOr/BitAnd |
| OS-BL-031 | runtime | `[rust]` `[runtime]` | pattern | Exponential decay > linear decay for memory scoring |
| OS-BL-032 | runtime | `[rust]` `[runtime]` | pattern | RRF fusion beats score normalization for hybrid search |
| OS-BL-033 | runtime | `[runtime]` `[governance]` | architecture | Three-space memory partition prevents 6 conflation failures |
| OS-BL-034 | runtime | `[rust]` `[runtime]` | constant | Similarity consolidation — 0.88 cosine threshold |
| OS-BL-035 | design-system | `[frontend]` `[design-system]` | pattern | Dark-mode design rules consolidated from 9 systems |
| OS-BL-036 | governance | `[governance]` | pattern | Agent count is a liability — 42→14 |
| OS-BL-037 | governance | `[governance]` | pattern | Profiles are resumes, not config — portability boundary |
| OS-BL-038 | governance | `[governance]` `[tooling]` | architecture | Split monoliths at the read boundary |
| OS-BL-039 | governance | `[governance]` | process-failure | Grep for stale references after restructuring |
| BL-OS-014 | governance | `[governance]` | process-efficiency | Parallel agent swarm for document mining |
| BL-OS-015 | governance | `[governance]` | design-insight | Dispatcher gap in persona maps |
| (unnamed) | rust | `[rust]` | gotcha | SQLite ?N params are global across UNION ALL |

## Entry Format

```markdown
### OS-BL-NNN: [Short title]
**Discovered:** [date] | **Domain:** [domain] | **Severity:** [blocker/gotcha/pattern/drift/architecture/constant] | **Tag:** `[tag1]` `[tag2]`
**Context:** [What you were doing]
**Problem/Pattern:** [What went wrong or was discovered]
**Solution:** [What fixed it]
**Prevention:** [How to avoid it next time]
```

---

*Migrated from monolithic BUILD-LEARNINGS.md on 2026-04-05 (P7.5-C.1 housekeeping).*
