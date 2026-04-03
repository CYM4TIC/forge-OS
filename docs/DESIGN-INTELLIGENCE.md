# Design Intelligence

> Curated from UI UX Pro Max. For Mara (UX Evaluation) and Riven (Design Systems).
> The mandatory pre-delivery checklist and design guidelines that every frontend surface must pass.

---

## Visual Direction — The Soul of Forge OS

> **This is not a dashboard. This is not an IDE. This is a living machine you can see the energy moving through.**

### Reference Points
- A **stage during a rave** — dark void, saturated color, light moving with rhythm and intent
- A **colorful arcade dashboard** — bold, unapologetic, every indicator glowing and alive
- **Knight Rider's KITT** — a dark cockpit where the instruments ARE the personality
- **Meow Wolf** — an immersive art installation where every surface has something happening, but it's not chaos — it's orchestrated wonder

### What This Means in Practice

**The void is the canvas.** The dark navy background (`#0F172A`) is not a "dark theme" — it's the void that makes everything else radiate. Never fill it with gray cards. Let it breathe. The emptiness between glowing elements is part of the design.

**Everything alive has light.** Active pipeline nodes don't just change color — they glow, pulse, breathe. Idle nodes dim but never fully die — a faint ember, not a gray box. The difference between "running" and "idle" should be visible from across the room.

**Movement is information.** Particle streams between agents aren't decoration — they show data flowing through the system. But even at rest, the canvas has ambient life: subtle node drift, slow pulse cycles, dock pills with gentle luminance shifts. A static screen means the system is off, not idle.

**Color is bold and saturated.** Not muted enterprise pastels. The success green glows. The error red burns. Agent dispatch lights up like tracer fire. Severity colors (P-CRIT red, P-HIGH orange, P-MED amber, P-LOW cyan) should be immediately readable at a glance — they're signal lights, not labels.

**The dock bar is a light strip.** Not a Windows taskbar. A row of glowing jewels at the bottom edge — each pill pulses with the activity of its panel. Minimized panels dim. Active panels shine. A panel with unread findings throbs gently. The dock itself is a status display.

**Typography glows against the void.** White text on dark void is the baseline, but key numbers and labels can have subtle text-shadow glow effects — especially in canvas-rendered components where we control every pixel. Token gauges, stat cards, batch counters — these are readouts on a command console, not spreadsheet cells.

### Design Rules (Mara + Riven Enforcement)

| Rule | Severity | What It Means |
|------|----------|---------------|
| No static canvas | **R-HIGH** | The Canvas HUD must have ambient animation at all times. Stillness = broken. |
| Glow > flat fill | **R-MED** | Active/important elements should use glow effects (box-shadow, text-shadow, radial gradients), not just flat color fills. |
| Color saturation minimum | **R-MED** | Status colors must be vivid and saturated. No pastel/muted variants for primary indicators. Muted tones are reserved for disabled/inactive states only. |
| Void preservation | **R-MED** | Don't fill the dark background with cards/containers wall-to-wall. Let the void show between elements. Negative space is a design element. |
| Particle flow fidelity | **R-HIGH** | Agent dispatch and communication flows must render as animated particles on bezier paths. Static arrows or simple lines fail this gate. |
| Dock bar luminance | **R-MED** | Dock pills must reflect panel state through luminance/pulse, not just icon swaps. The dock is a light strip, not a toolbar. |
| Ambient idle state | **R-MED** | Every canvas component must define an idle animation (however subtle). The app should look alive even when no build is running. |
| Distance readability | **M-HIGH** | Key status indicators (pipeline state, gate pass/fail, active agent count) must be identifiable from 6+ feet away. Big, bright, unambiguous. |

### Color Direction (Extends Dark Theme Palette)

The base palette below remains the structural foundation. The visual direction adds an **energy layer** on top:

| Energy | Effect | Usage |
|--------|--------|-------|
| Node glow | `box-shadow: 0 0 20px {color}40` | Active pipeline nodes, agent cards |
| Text glow | `text-shadow: 0 0 8px {color}60` | Key readouts: token counts, batch progress, stat card numbers |
| Pulse animation | `opacity 0.7→1.0, 2s ease-in-out infinite` | Idle-but-alive nodes, dock pills |
| Breathe animation | `scale 0.98→1.02, 3s ease-in-out infinite` | Active agents, running pipeline stages |
| Particle trail | `opacity 1.0→0.0 over 500ms, along bezier path` | Agent dispatch, findings return, context transfer |
| Ember idle | `opacity 0.3→0.5, 4s ease-in-out infinite` | Inactive nodes — never fully dark |

### What This Is NOT

- **Not a rave for the sake of chaos.** Every animation carries meaning. Every glow indicates state. It's orchestrated, not random.
- **Not dark-mode-with-neon.** It's not a regular app with colored accents. The entire spatial design assumes darkness as the primary medium.
- **Not distracting during work.** Ambient animations are subtle (long durations, small ranges). Active animations fire on real events. The system is calm when idle, alive when working — like an engine at rest vs under load.
- **Not inaccessible.** `prefers-reduced-motion` still respected — reduce animations to state changes only, keep glow/color. Color is never the sole indicator. Contrast ratios still enforced.

### Aesthetic Directive — The Alchemical Forge (2026-04-02)

> **(32 and/or 64-bit) arcade mystical fantasy alchemical neon rave video game.**
> The operator is running an alchemical forge. The tool transmutes specs into production code.
> The personas are not software agents — they are practitioners at the workbench.

**What this adds to the existing rave/arcade foundation:**

| Layer | Source | Effect |
|-------|--------|--------|
| **Mystical vocabulary** | Excalibur research synthesis | UI labels use alchemical register: Mana (tokens), Vessel (context), Echoes (traces), Grimoire (registry), Ritual (scheduled), Scrying (monitoring), Ley Lines (relationships), Sigils (indexes), Dreamtime (consolidation), Alchemy (transformation) |
| **Two-register voice** | Sable directive | Mystical for operations (panel headers, status, empty states). Clinical for quality (gate verdicts, severity counts, error messages). Never mix. |
| **Containment field glow** | Riven directive | Panel shells get subtle inner glow (`inset 0 0 12px accent/0.06`). Panels are containment fields, not software windows. |
| **Engraved headers** | Riven directive | Panel header font-weight 700 (not 600). Heavier = carved, not printed. |
| **Arcade readout tracking** | Riven directive | Monospace data labels get `letter-spacing: 0.05em`. Reads as game HUD without pixel-font cosplay. |
| **Rune borders** | Phase 7+ | Animated subtle glyph/rune patterns on panel borders. Ambient, not distracting. Reduced-motion: static glow only. |
| **Tooltip translations** | Mara directive | Every mystical label has a tooltip with clinical translation. Fantasy is opt-in comprehension, never a barrier. Mana → "Token budget: 47,231 / 100,000 remaining" |

**Vocabulary mapping (canonical — Sable-approved):**

| Mystical Term | Literal Meaning | Where It Appears | Tooltip Pattern |
|---|---|---|---|
| Mana | Token budget | TokenGauge label | "Token budget: {used} / {total}" |
| Vessel | Context window | ContextMeter label | "Context window: {percent}% capacity" |
| Echoes | Findings / traces | FindingsPanel header | "Build findings: {count} total" |
| Grimoire | Agent registry | Graph tab (agents) | "Agent & persona registry" |
| Scrying | Health monitoring | ConnectivityPanel header | "Service health monitoring" |
| Ley Lines | Relationships / backlinks | Graph tab (relationships) | "Cross-references and relationships" |
| Sigils | Index entries | VaultBrowser context | "Vault index entries" |
| Dreamtime | Nightly consolidation | Scheduled task label | "Overnight consolidation job" |
| Ritual | Scheduled job | Scheduled task type | "Recurring scheduled task" |
| The Forge | Build system / app | Status messages | "Build system status" |
| Transmutation | Build transformation | Batch completion | "Build batch complete" |

**Panel Name Registry (canonical — shipped 2026-04-02):**

| Panel Type | Name | Icon | Old Name |
|---|---|---|---|
| chat | Crucible | ⚗️ | Chat |
| canvas_hud | Furnace | 🔥 | Canvas |
| team | Magi | 🧙 | Team |
| preview | Orb | 🔮 | Preview |
| connectivity | Scrying | 👁️ | Services |
| findings | Echoes | 🌀 | Findings |
| agent_board | Grimoire | 📜 | Agents |
| session_timeline | Chronicle | ⏳ | Timeline |
| vault_browser | Vault | 🗝️ | Vault |
| graph_viewer | Ley Lines | ✨ | Graph |
| context_meter | Vessel | 🏺 | Context |
| action_palette (P7-F) | Invocation | TBD | — |

Grammar: places are bare nouns (Crucible, Furnace, Magi, Orb, Vault). Phenomena are bare nouns (Echoes, Scrying, Ley Lines). No "The" prefix — sleeker.

**What NOT to rename:**
- Gate verdicts: "PASS" / "FAIL" stay literal
- Severity levels: CRIT/HIGH/MED/LOW/INFO stay literal
- File paths, function names, technical identifiers
- Error messages — clinical voice only

**Jarvis-UI inspiration (adapted):**
The Prompt-Surfer/obsidian-jarvis-ui Iron Man aesthetic validates the containment-field panel treatment and HUD overlay pattern. Adapted for Forge: less holographic-blue, more indigo-neon-alchemical. The JARVIS "glass panel" becomes the Forge "containment field." The JARVIS "AI assistant overlay" becomes persona glyph presence. Same spatial confidence, different mythology.

---

## Pre-Delivery Checklist (Build Triad Gate)

Every frontend surface must pass ALL items before completion:

```
[ ] No emojis as icons in panel content (use SVG: Heroicons, Lucide, or project icon library). Exception: dock pill icons use fantasy emoji per Panel Name Registry.
[ ] cursor-pointer on all clickable elements
[ ] Hover states with smooth transitions (150-300ms)
[ ] Text contrast 4.5:1 minimum (WCAG AA)
[ ] Focus states visible for keyboard navigation
[ ] prefers-reduced-motion respected
[ ] Responsive: 375px, 768px, 1024px, 1440px
[ ] No layout shift when images load (aspect-ratio or explicit dimensions)
[ ] Error messages near the problem field (not just top-of-form banners)
[ ] Loading states during async operations (spinner/skeleton for >300ms)
[ ] Touch targets >= 44x44px minimum on mobile
[ ] Forms have visible labels (not placeholder-only inputs)
[ ] Links are keyboard accessible (not just div onClick)
[ ] Color not sole indicator of meaning (add icons, text, or patterns)
[ ] Dark mode works (if project uses dark mode)
```

**This checklist is non-negotiable.** Mara's M-HIGH findings map directly to these items. Riven's token audit enforces the implementation details.

---

## UX Guidelines

### Navigation & Layout
1. **Smooth scroll** for anchor links — jarring jumps break flow
2. **Sticky nav** with padding compensation so content doesn't jump behind it
3. **Active state indication** — current page/section must be visually highlighted
4. **Z-index scale system** — use defined layers (10, 20, 30, 50), never arbitrary values
5. **Content max-width** 65-75 characters per line for readability
6. **Consistent spacing** — use the project's spacing scale, not arbitrary pixel values
7. **Visual hierarchy** — one primary action per view, secondary actions clearly subordinate

### Animation & Interaction
8. **Max 1-2 key animations** per view — don't animate everything
9. **150-300ms** for micro-interactions (button press, toggle, hover)
10. **300-500ms** for page transitions, modals, drawers
11. **Respect prefers-reduced-motion** — disable or reduce all animation
12. **Use transform + opacity only** for 60fps performance (not width/height/top/left)
13. **ease-out for entering**, ease-in for exiting, ease-in-out for continuous movement
14. **Stagger animations** for lists (50-100ms delay between items, max 5 items)

### Accessibility
15. **Color contrast 4.5:1** minimum for text (3:1 for large text 18px+ bold or 24px+)
16. **Never convey info by color alone** — add icons, text labels, or patterns
17. **Heading hierarchy** sequential: h1 → h2 → h3, no skipping levels
18. **ARIA labels** on icon-only buttons (`aria-label="Close"`)
19. **Tab order matches visual order** — don't use CSS to reorder without DOM reorder
20. **Semantic HTML** — use nav, main, article, section, aside, not div soup
21. **role="alert" or aria-live** for dynamic content updates (toasts, status changes, counters)
22. **Skip-to-content link** for keyboard navigation on pages with complex headers

### Forms & Input
23. **Distinct input styling** — borders, not ambiguous flat text fields
24. **Correct input types** — email, tel, number, url (triggers correct mobile keyboard)
25. **Validate on blur**, not just on submit (immediate feedback)
26. **Disable + spinner** during async submit (prevent double-submit)
27. **Show/hide password toggle** on password fields
28. **Autocomplete attributes** where applicable (name, email, address fields)
29. **Error messages below the field**, not just a banner at the top

### Feedback & UX
30. **Show spinner/skeleton** for operations taking >300ms
31. **Empty states** with helpful message + primary action ("No items yet. Create your first.")
32. **Error recovery** with clear next steps ("Something went wrong. Try again or contact support.")
33. **Confirm before destructive actions** — delete, discard changes, remove access
34. **Toast auto-dismiss** after 3-5 seconds (longer for actions with undo)
35. **Success feedback** after action completion (toast, inline message, or visual state change)
36. **Optimistic updates** for low-risk actions (toggle, favorite) — revert on failure

### Desktop-Specific
37. **Hover effects** — desktop users expect visual feedback on hover
38. **Keyboard shortcuts** documented and discoverable (? to show shortcuts)
39. **Right-click context menus** where appropriate (tables, file lists)
40. **Multi-select patterns** for batch operations (checkbox + shift-click)

---

## Severity Mapping

### Mara (UX Evaluation)
| Severity | Criteria | Example |
|----------|----------|---------|
| **M-CRIT** | Completely broken interaction, data loss risk | Form submits but doesn't save, destructive action without confirmation |
| **M-HIGH** | Major usability issue affecting most users | Missing loading state, no error recovery, broken mobile layout |
| **M-MED** | Minor usability issue or accessibility gap | Missing ARIA label, inconsistent hover state, suboptimal touch target |
| **M-LOW** | Polish item, nice-to-have | Animation timing, spacing fine-tuning, copy improvement |

### Riven (Design Systems)
| Severity | Criteria | Example |
|----------|----------|---------|
| **R-CRIT** | Token violation affecting entire theme | Hardcoded hex colors in shared component, broken dark mode |
| **R-HIGH** | Component pattern violation | Missing focus ring, touch target <44px, non-semantic HTML |
| **R-MED** | Inconsistency with established patterns | Different spacing than similar surfaces, variant mismatch |
| **R-LOW** | Minor polish | Animation easing, shadow intensity, border radius |

---

## Dark Theme Reference Palette (Developer Tools)

For projects building developer-focused tools:

### Structural Layer (surfaces, text, borders)

| Token | Value | Usage |
|-------|-------|-------|
| Primary background | `#0F172A` | The void — page background |
| Card background | `#1B2336` | Panels, elevated surfaces |
| Secondary surface | `#1E293B` | Sidebars, secondary areas |
| Tertiary surface | `#334155` | Hover states, active items |
| Text primary | `#F8FAFC` | Body text (near-white, not pure white) |
| Text secondary | `#94A3B8` | Labels, descriptions |
| Text muted | `#64748B` | Placeholders, disabled text |
| Border default | `#334155` | Borders, dividers |

### Energy Layer (status, agents, pipeline)

| Token | Value | Usage |
|-------|-------|-------|
| Accent success | `#22C55E` | Gates passed, healthy services, build complete |
| Accent warning | `#F59E0B` | Warnings, attention required, P-MED findings |
| Accent error | `#EF4444` | Errors, P-CRIT findings, destructive states |
| Accent dispatch | `#3B82F6` | Agent dispatch, context transfer, active pipeline |
| Accent findings | `#F97316` | Findings returning, P-HIGH severity |
| Accent intelligence | `#8B5CF6` | Intelligence agents (Scout, Sentinel, Wraith), orchestrators |
| Accent low | `#06B6D4` | P-LOW findings, informational, cool accent |
| Accent persona | `#EC4899` | Persona activation, team presence highlights |
| Glow success | `#22C55E40` | box-shadow for success states (25% opacity) |
| Glow dispatch | `#3B82F640` | box-shadow for dispatch/active states |
| Glow error | `#EF444440` | box-shadow for error/critical states |
| Glow intelligence | `#8B5CF640` | box-shadow for intelligence agent activity |
| Ember idle | `#94A3B820` | Faint glow for idle-but-alive elements |

### Pipeline Node Colors (per stage)

| Stage | Active Color | Glow | Idle |
|-------|-------------|------|------|
| Scout | `#8B5CF6` (purple) | `0 0 24px #8B5CF640` | `opacity: 0.35` |
| Build | `#3B82F6` (blue) | `0 0 24px #3B82F640` | `opacity: 0.35` |
| Triad | `#F59E0B` (amber) | `0 0 24px #F59E0B40` | `opacity: 0.35` |
| Sentinel | `#22C55E` (green) | `0 0 24px #22C55E40` | `opacity: 0.35` |
| Wraith | `#EF4444` (red) | `0 0 24px #EF444440` | `opacity: 0.35` |

### Particle Stream Colors

| Flow Type | Color | Example |
|-----------|-------|---------|
| Dispatch | `#3B82F6` → fades to transparent | Nyx dispatching Scout, Triad, Sentinel |
| Findings return | `#F97316` | Triad returning findings to Nyx |
| Critical findings | `#EF4444` | P-CRIT findings — brighter, faster particles |
| Context transfer | `#22C55E` | Scout brief delivery, handoff data |
| Red team probe | `#EF4444` with trail | Wraith probing system surfaces |
| Communication | `#8B5CF6` | Inter-agent swarm messages |

---

## Font Pairing Recommendations

| Pairing | Best For | Characteristics |
|---------|----------|-----------------|
| **Inter + Roboto** | Dashboards, admin tools | Clean, minimal, high readability at small sizes |
| **Poppins + Open Sans** | SaaS products, marketing | Modern, professional, friendly |
| **JetBrains Mono + Inter** | Developer tools | Monospace for code, Inter for UI text |
| **DM Sans + DM Mono** | Design tools | Geometric, consistent weight |
| **Geist + Geist Mono** | Next.js / Vercel ecosystem | Modern, excellent variable font support |

---

## Design System Generation Pattern

When setting up a new project's design system:

1. **Identify product type** — What industry? What user sophistication level?
2. **Select style priority** — Minimal? Bold? Professional? Playful?
3. **Choose color mood** — Based on industry norms and brand identity
4. **Select typography** — Pair based on product type (see table above)
5. **Define token hierarchy** — Brand → Semantic → Component
6. **Establish component patterns** — Base → Variants → Sizes → States
7. **Document anti-patterns** — What NOT to do, with severity

The tailwind-design-system skill handles implementation. This document handles the reasoning.

---

## Component Token Anatomy

> From Claude Code source analysis. Token hierarchy for design system enforcement.

### Three-Layer Token Architecture

```
Brand Tokens (project-level)
  └─ color-brand-primary: #2563EB
  └─ color-brand-secondary: #7C3AED
  └─ font-family-heading: 'Inter'

    Semantic Tokens (meaning-level)
      └─ color-text-primary: var(--color-brand-primary)
      └─ color-bg-elevated: var(--color-neutral-800)
      └─ color-status-success: var(--color-green-500)

        Component Tokens (component-level)
          └─ button-bg-primary: var(--color-text-primary)
          └─ card-bg: var(--color-bg-elevated)
          └─ badge-bg-success: var(--color-status-success)
```

### Riven Enforcement

Riven checks tokens from the BOTTOM UP:
1. Component uses component token? Pass.
2. Component uses semantic token directly? Flag R-MED (should use component token).
3. Component uses brand token directly? Flag R-HIGH (skip two layers).
4. Component uses raw hex/rgb value? Flag R-CRIT (no token at all).

### Dark Mode Testing Pattern

From DESKTOP-APP-PATTERNS — verify dark mode systematically:

```
FOR each surface:
  1. Toggle to dark mode (preview_resize with colorScheme: 'dark')
  2. Check: no invisible text (text color = bg color)
  3. Check: no unreadable text (contrast < 4.5:1)
  4. Check: no missing borders (elements that rely on shadow for separation)
  5. Check: no hardcoded white/black (should use semantic tokens)
  6. Toggle back to light mode — verify nothing broke
```

Riven's `riven-theme-check` sub-agent automates this check.
