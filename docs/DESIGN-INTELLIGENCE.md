# Design Intelligence

> Curated from UI UX Pro Max. For Mara (UX Evaluation) and Riven (Design Systems).
> The mandatory pre-delivery checklist and design guidelines that every frontend surface must pass.

---

## Pre-Delivery Checklist (Build Triad Gate)

Every frontend surface must pass ALL items before completion:

```
[ ] No emojis as icons (use SVG: Heroicons, Lucide, or project icon library)
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

| Token | Value | Usage |
|-------|-------|-------|
| Primary background | `#0F172A` | Page background (navy void) |
| Card background | `#1B2336` | Cards, panels, elevated surfaces |
| Secondary surface | `#1E293B` | Sidebars, secondary areas |
| Tertiary surface | `#334155` | Hover states, active items |
| Text primary | `#F8FAFC` | Body text (near-white, not pure white) |
| Text secondary | `#94A3B8` | Labels, descriptions |
| Text muted | `#64748B` | Placeholders, disabled text |
| Accent success | `#22C55E` | Success states, positive indicators |
| Accent warning | `#F59E0B` | Warnings, attention required |
| Accent error | `#EF4444` | Errors, destructive actions |
| Border default | `#334155` | Borders, dividers |

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
