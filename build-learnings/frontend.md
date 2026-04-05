# Build Learnings — Frontend

> React hooks, DOM patterns, event handling, animation.
> Tags: `[frontend]`

---

### OS-BL-004: react-resizable-panels v4 renamed API
**Discovered:** 2026-03-31 | **Domain:** frontend | **Severity:** gotcha | **Tag:** [FORGE-OS]
**Context:** P1-B — react-resizable-panels v4 renamed API: PanelGroup->Group, PanelResizeHandle->Separator. Read dist exports, not docs.
**Prevention:** Always read dist exports for third-party component APIs, not documentation.

---

### OS-BL-008: isTauriRuntime Guard for Browser-Only Dev Mode
**Discovered:** 2026-04-01 | **Domain:** runtime | **Severity:** gotcha | **Tag:** [FORGE-OS]
**Context:** P5-F gate — Build Triad (Mara) found 100+ console errors flooding DevTools
**Problem:** Every Tauri `invoke()` call throws `TypeError: Cannot read properties of undefined (reading 'invoke')` when running the frontend in browser-only mode (no Tauri backend). LayoutPersistence fires on every panel move/resize, producing hundreds of errors per minute. Masks real errors during development.
**Solution:** Added `isTauriRuntime` flag to `tauri.ts`: `export const isTauriRuntime = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;`. Every bridge function that calls `invoke()` must guard with `if (!isTauriRuntime) return Promise.resolve(default)`. Applied to persistence.ts, usePermissions.ts, and all new P5-G+ bridge functions.
**Prevention:** Every new bridge function MUST include the `isTauriRuntime` guard. The pattern is now in the batch manifests as a standing requirement.

---

### OS-BL-011: Phantom TypeScript Fields at Runtime
**Discovered:** 2026-04-01 | **Domain:** runtime | **Severity:** gotcha | **Tag:** [FORGE-OS]
**Context:** P5-F gate — Pierce found `usage_percent` used across 3 files but the field doesn't exist on `ThresholdStatus`
**Problem:** `contextStatus?.usage_percent` compiles without error in TypeScript because optional chaining (`?.`) on a non-existent property returns `undefined`, not a type error. The `!= null` check then evaluates to `false`, silently falling to the default value. All context gauges rendered zeros — looked like "no data" rather than "wrong field name."
**Solution:** Changed to `usage_fraction` (the actual field). Added computed `tokens_remaining` from `context_window_size - current_tokens`.
**Prevention:** When consuming typed data from Tauri bridge: read the interface definition first, don't assume field names. TypeScript's optional chaining makes phantom field access silent. Consider `noUncheckedIndexedAccess` in tsconfig for stricter optional access.

---

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

### OS-BL-022: Real-Time Hook Pattern — Debounce + Fetch Guard + Entry Cap
**Discovered:** 2026-04-04 | **Domain:** frontend | **Severity:** pattern | **Tag:** `[frontend]`
**Context:** P7-K — useProposalFeed subscribes to rapid-fire Tauri events. Without guards: thundering herd (10 concurrent fetches), unbounded entries array, race between loadMore and real-time handler corrupting page order.
**Solution:** Three-part defense: (1) 500ms debounce timer on event handler (per useAgentRegistry K-01 pattern), (2) `fetchingRef` boolean to prevent concurrent loadMore + real-time fetches, (3) MAX_ENTRIES=500 cap with `.slice()` after merge. Real-time handler resets `pageRef.current = 0` to prevent page-skip gaps.
**Prevention:** Every hook that subscribes to Tauri events and paginates must apply all three guards. The debounce + fetchingRef + cap trio is now the canonical pattern.

---

### OS-BL-023: `@keyframes` Must Be Self-Provided Per Panel
**Discovered:** 2026-04-04 | **Domain:** frontend | **Severity:** gotcha | **Tag:** `[frontend]`
**Context:** P7-K — SkeletonCard referenced `animation: 'shimmer ...'` but no global CSS exists and no `<style>` tag injected the keyframe. PreviewPanel self-provides `preview-shimmer`, ConnectivityPanel self-provides `pulse`. Each panel is an island.
**Solution:** Inject `<style>{SHIMMER_KEYFRAME}</style>` adjacent to the skeleton usage. Name keyframes uniquely per panel to avoid collisions.
**Prevention:** No shared CSS file for animations. Every panel must self-provide its keyframes via inline `<style>` tags. Grep for `animation:` and verify the referenced keyframe exists in the same file.

---

### OS-BL-024: Do NOT Debounce Parallel Dispatch Event Handlers
**Discovered:** 2026-04-04 | **Domain:** frontend, runtime | **Severity:** pattern | **Tag:** `[frontend]` `[runtime]`
**Context:** P7-L — useDispatchQueue used a shared 500ms debounce timer (cargo-culted from useProposalFeed) on the `agent:working-state-changed` handler. With parallel dispatch (the system's core design), multiple agents fire state changes within the 500ms window. The shared timer discards all but the last event, causing stale status display.
**Solution:** Remove debounce. React 18+ batches `setState` calls within the same microtask automatically. The 500ms debounce pattern from useProposalFeed (OS-BL-022) applies to a SINGLE event channel with burst coalescing — not to N parallel event sources where each event is semantically distinct.
**Prevention:** When subscribing to events that arrive from parallel sources (multiple agents, multiple dispatches), process each event immediately. Reserve debounce for single-source burst coalescing only (e.g., rapid typing, repeated status-changed from one entity).

---

### OS-BL-025: Sequence Registry Load Before Data That Depends On It
**Discovered:** 2026-04-04 | **Domain:** frontend | **Severity:** pattern | **Tag:** `[frontend]`
**Context:** P7-L — useDispatchQueue had two parallel useEffects: one loading the agent registry (for category->priority mapping), one loading active agents. Because both fired concurrently, the initial agent list rendered with all priorities as 'low' (empty categoryMap). The operator saw incorrect dispatch urgency on first paint.
**Solution:** Chain the loads in a single useEffect: registry first, then data that derives from it. The extra round-trip is negligible vs. the data correctness gain.
**Prevention:** When a hook computes derived state from two async sources where one informs the other, sequence them explicitly. Don't rely on React effect ordering — effects with `[]` deps fire simultaneously.

---

### OS-BL-026: Event-Driven + Poll Hybrid Sequence Counter
**Discovered:** 2026-04-04 | **Domain:** frontend, runtime | **Severity:** pattern | **Tag:** `[frontend]` `[runtime]`
**Context:** P7-L — Event-driven + poll hybrid: use sequence counter to prevent stale poll results from overwriting fresh event-driven results.
**Prevention:** When mixing event-driven and polling updates, use a monotonically increasing sequence counter. Only apply poll results if the sequence matches what was current when the poll started.

---

### OS-BL-027: Workspace Preset Panel Size Constraints
**Discovered:** 2026-04-04 | **Domain:** frontend, design-system | **Severity:** gotcha | **Tag:** `[frontend]` `[design-system]`
**Context:** P7-L — Workspace preset panel sizes must respect registered minWidth/minHeight constraints. applyPreset does not clamp — the preset definition is the enforcement point.
**Prevention:** When defining workspace presets, verify all panel sizes against their registered minimum constraints. The preset is the enforcement point, not the layout engine.

---

### OS-BL-028: DockBar @keyframes Must Be Self-Provided
**Discovered:** 2026-04-04 | **Domain:** frontend, design-system | **Severity:** pattern | **Tag:** `[frontend]` `[design-system]`
**Context:** P7-L — DockBar @keyframes must be self-provided (inline <style>) since globals.css has no shared keyframes. Same pattern as ConnectivityPanel, TeamPanel, ActionPalette per OS-BL-018.
**Prevention:** Every component that uses CSS animations must inject its own `<style>` tag with keyframe definitions. This is a standing requirement until keyframes are centralized in globals.css.

---
