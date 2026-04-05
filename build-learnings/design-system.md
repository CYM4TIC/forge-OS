# Build Learnings — Design System

> Tokens, WCAG, typography, dark-mode rules, canvas rendering.
> Tags: `[design-system]`

---

### OS-BL-012: Font Token Blind Spot — Design Token Taxonomy Gap
**Discovered:** 2026-04-02 | **Domain:** design-system | **Severity:** drift | **Tag:** [FORGE-OS]
**Context:** P6-I gate (Riven CP-008) — `'monospace'` hardcoded in 4 panels, `-apple-system, BlinkMacSystemFont, sans-serif` hardcoded in 7 canvas-components.
**Problem:** canvas-tokens.ts had CANVAS, STATUS, RADIUS, TIMING, GLOW, TINT, DOCK, HIGHLIGHT, PIPELINE — 9 token groups, no FONT. Every component independently hardcoded the same font strings. If the font stack ever changes, 12+ files drift independently.
**Solution:** Added `FONT = { mono: 'monospace', system: '-apple-system, BlinkMacSystemFont, sans-serif' }` to canvas-tokens.ts. Propagated to all 12 consumer files. Added to barrel export.
**Prevention:** When adding a new token group to canvas-tokens.ts, grep the codebase for the raw value it replaces. The gap isn't the missing token — it's the existing hardcoded instances that won't be found until someone greps for them. New tokens should ship with a propagation sweep.

---

### OS-BL-014: WCAG Contrast in Badge Colors — Copy-Paste Divergence
**Discovered:** 2026-04-02 | **Domain:** design-system | **Severity:** gotcha | **Tags:** `[design-system]` `[frontend]`
**Context:** P6-J gate (Riven R-DS-01) — connectivityBadge used white text on amber, same file has findingsBadgeColors that already fixed this.
**Problem:** findingsBadgeColors had a comment noting white on #f59e0b is 2.1:1 contrast and used dark text. connectivityBadge, written 50 lines below in the same file, made the exact same mistake and used '#fff'. The fix was already in the same file but the copy-paste divergence wasn't caught during build.
**Solution:** Matched connectivityBadge warning text to CANVAS.bg (dark). Added comment cross-referencing the contrast requirement.
**Prevention:** When creating a new function that parallels an existing one in the same file, read the existing function's comments and edge case handling. The fix you need may already be documented in the sibling function.

---

### OS-BL-014: CANVAS.bg As Inverse Text Is Dark-Theme-Only
**Discovered:** 2026-04-03 | **Domain:** frontend | **Severity:** carried-risk | **Tag:** [FORGE-OS]
**Context:** P7-H — replacing raw `#fff` on accent-background buttons and user bubbles. Used `CANVAS.bg` (near-black) as text color on `STATUS.accent` and `STATUS.danger` backgrounds.
**Problem:** `CANVAS.bg` only works as "inverse text" because the Forge OS theme is dark-only. If a light theme ships, `CANVAS.bg` becomes near-white on bright background — invisible.
**Solution:** Acceptable for now. When light theme work begins, add a `CANVAS.textInverse` token. Grep `color: CANVAS.bg` to find all instances.
**Prevention:** Track in design-system token audit. Don't assume single-theme forever.

---

### OS-BL-015: Focus Ring Migration — Grep for Handlers AND outline:none
**Discovered:** 2026-04-03 | **Domain:** design-system, frontend | **Severity:** gotcha | **Tag:** [FORGE-OS] `[design-system]` `[frontend]`
**Context:** Removing JS focus ring handlers is half the migration — `outline: 'none'` inline styles in the same components silently defeat the CSS `:focus-visible` replacement. When migrating focus management to CSS, grep for BOTH the handler AND the suppression. P7-A: 11 instances across 7 files survived the initial removal pass.
**Prevention:** When migrating focus management from JS to CSS, always grep for both the event handler AND any `outline: 'none'` or `outline: 0` inline styles. The suppression survives independently of the handler removal.

---

### OS-BL-016: StatusBadge Glyph Size — Cap to Dot Boundary
**Discovered:** 2026-04-02 | **Domain:** design-system, canvas | **Severity:** gotcha | **Tag:** [FORGE-OS] `[design-system]` `[canvas]`
**Context:** StatusBadge glyph at 20x20px: dot radius is only 4px at 1x DPR. Glyph size formula must cap to dot boundary (`dotRadius * 1.4`), not grow independently. Small canvas components need size-aware rendering, not fixed minimums.
**Prevention:** For canvas components rendered at small sizes, always derive glyph/icon sizing from the container boundary, not from fixed minimums.

---

### OS-BL-035: Dark-Mode Design Rules (Consolidated from 9 Systems)
**Discovered:** 2026-04-05 | **Domain:** frontend, design-system | **Severity:** pattern | **Tag:** `[frontend]` `[design-system]`
**Context:** April 5 repo mining — awesome-design-md analyzed 55 DESIGN.md files from real companies. Dark-mode consensus from Linear, Supabase, VoltAgent, Raycast, Spotify, xAI, Framer, SpaceX, Warp:
- **Never** pure `#000000` background (use `#050507` to `#121212`)
- **Never** pure `#ffffff` text (use `#f2f2f2` to `#fafafa`)
- **Never** box-shadows on dark backgrounds (use rgba white overlays for depth)
- Elevation = border-weight progression or `rgba(255,255,255, 0.02/0.04/0.05)`
- Max headline weight 500-600 (never 700+)
- Accent color for interactive elements ONLY — never decorative fills
- Persona glow: `drop-shadow(0 0 2px {color})` → `drop-shadow(0 0 8px {color})`
**Key insight:** Luminance stacking (rgba white overlays at 0.02/0.04/0.05) creates persona-color-independent surface hierarchy. This is how 10 persona colors coexist on the same dark canvas.

---
