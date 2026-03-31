---
name: tailwind-design-system
description: "Use when building UI with Tailwind CSS — design tokens, component architecture, dark mode, responsive design. Enhances Riven (Design Systems)."
risk: safe
source: adapted from Antigravity tailwind-design-system skill
date_added: 2026-03-31
persona: riven
---

# Tailwind Design System

> Token hierarchy. Component architecture. Dark mode. Responsive patterns.
> Activated automatically when Riven boots on Tailwind projects.

---

## 1. Design Token Hierarchy

### Three Layers
```
Brand Tokens (raw values)
  → Semantic Tokens (purpose-driven aliases)
    → Component Tokens (component-specific overrides)
```

### Brand Tokens (CSS Variables)
```css
:root {
  /* Colors — HSL for easy manipulation */
  --color-primary-50: 210 100% 97%;
  --color-primary-500: 210 100% 50%;
  --color-primary-900: 210 100% 15%;

  /* Spacing scale */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Radii */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

### Semantic Tokens
```css
:root {
  /* Surface */
  --bg-primary: var(--color-primary-50);
  --bg-secondary: var(--color-neutral-100);
  --bg-elevated: white;
  --bg-overlay: rgb(0 0 0 / 0.5);

  /* Text */
  --text-primary: var(--color-neutral-900);
  --text-secondary: var(--color-neutral-600);
  --text-muted: var(--color-neutral-400);
  --text-inverse: white;

  /* Border */
  --border-default: var(--color-neutral-200);
  --border-strong: var(--color-neutral-300);
  --border-focus: var(--color-primary-500);

  /* Status */
  --status-success: var(--color-green-500);
  --status-warning: var(--color-amber-500);
  --status-error: var(--color-red-500);
  --status-info: var(--color-blue-500);
}

.dark {
  --bg-primary: var(--color-neutral-900);
  --bg-secondary: var(--color-neutral-800);
  --bg-elevated: var(--color-neutral-850);
  --text-primary: var(--color-neutral-50);
  --text-secondary: var(--color-neutral-400);
  --border-default: var(--color-neutral-700);
}
```

### Rules
- **Never** use raw hex colors in components. Always reference semantic tokens.
- **Never** use Tailwind's default palette directly (`bg-blue-500`). Map to semantic tokens.
- Grep for hardcoded hex values in code reviews — every one is a token violation.
- When adding a new color, add it at the brand layer first, then create semantic aliases.

---

## 2. Component Architecture

### 5-Layer Pattern
```
Base       → Default styles (layout, spacing, typography)
Variants   → Visual variants (primary, secondary, ghost, danger)
Sizes      → Size variants (sm, md, lg)
States     → Interactive states (hover, focus, active, disabled)
Overrides  → Escape hatch via className prop (use sparingly)
```

### Example: Button Component
```tsx
const variants = {
  primary: 'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)]',
  secondary: 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--border-default)]',
  ghost: 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
  danger: 'bg-[var(--status-error)] text-white hover:bg-red-600',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2 text-base min-h-[40px]',
  lg: 'px-6 py-3 text-lg min-h-[48px]',
};
```

### Rules
- Components should accept `variant`, `size`, and `className` props
- Use `clsx` or `tailwind-merge` for className composition
- Define variants as objects, not nested ternaries
- Touch targets: minimum 44x44px on mobile, 36x36px on desktop
- **Never** create a component that only works in one theme. Both light and dark from the start.

---

## 3. Dark Mode

### Implementation
```css
/* Tailwind v4: CSS-first config */
@custom-variant dark (&:where(.dark, .dark *));

/* Tailwind v3: class-based */
/* tailwind.config.js: darkMode: 'class' */
```

### Rules
- Toggle dark mode via `class` on `<html>` (not `prefers-color-scheme` alone — users need manual override)
- Store preference in localStorage + respect `prefers-color-scheme` as default
- **Every** component must work in both themes. No exceptions.
- Test dark mode explicitly — it's not "free" from semantic tokens. Check:
  - Text contrast (4.5:1 minimum)
  - Border visibility
  - Shadow visibility (shadows often disappear on dark backgrounds)
  - Image/icon contrast
  - Focus ring visibility

### Common Dark Mode Failures
| Issue | Fix |
|-------|-----|
| White text on light background | Use semantic tokens, not raw colors |
| Invisible borders | Use `border-[var(--border-default)]` not `border-gray-200` |
| Shadows invisible | Increase shadow opacity or use ring instead |
| Images too bright | Apply `brightness-90` or use dark-mode image variants |
| Focus rings invisible | Use `ring-[var(--border-focus)]` with sufficient contrast |

---

## 4. Responsive Design

### Breakpoint Strategy
```
Mobile-first: Start with mobile styles, add complexity at larger breakpoints.

sm: 640px   — Large phones / small tablets
md: 768px   — Tablets
lg: 1024px  — Small desktops
xl: 1280px  — Standard desktops
2xl: 1536px — Large desktops
```

### Patterns
- **Stack → Side-by-side**: `flex flex-col md:flex-row`
- **Hide/Show**: `hidden md:block` or `md:hidden`
- **Grid adaptation**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Typography scaling**: `text-sm md:text-base lg:text-lg`
- **Spacing scaling**: `p-4 md:p-6 lg:p-8`

### Rules
- **Always** test at 375px (iPhone SE — smallest common viewport)
- **Never** use `overflow-hidden` on containers without verifying mobile content fits
- Touch targets: 44x44px minimum on mobile (not just the text, the whole tap area)
- No horizontal scroll on mobile — if content overflows, use `overflow-x-auto` on the table/container, not the page
- Test with actual text content, not Lorem Ipsum (real text wraps differently)

---

## 5. Accessibility

### Focus Management
- **Every** interactive element must have a visible focus indicator
- Use `focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]` (not `focus:`)
- Tab order must match visual order (don't use CSS to reorder without updating DOM order)
- Skip-to-content link for keyboard users

### Color & Contrast
- Text contrast: 4.5:1 minimum (WCAG AA)
- Large text (18px+ bold or 24px+): 3:1 minimum
- UI components (borders, icons): 3:1 minimum against background
- **Never** use color as the sole indicator of meaning (add icons, text, or patterns)

### Semantic HTML
- Use `<button>` for actions, `<a>` for navigation. Never `<div onClick>`.
- Use `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` landmarks
- Headings in order (`h1` → `h2` → `h3`, no skipping)
- `aria-label` on icon-only buttons
- `aria-live="polite"` for dynamic content updates (toasts, status changes)

---

## 6. Animation

### Principles
- Max 1-2 key animations per view (don't animate everything)
- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for entering, `ease-in` for exiting, `ease-in-out` for movement
- **Only** animate `transform` and `opacity` for 60fps performance
- **Always** respect `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

### Common Animations
```css
/* Fade in */
.animate-fade-in {
  animation: fadeIn 200ms ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
.animate-slide-up {
  animation: slideUp 200ms ease-out;
}
@keyframes slideUp {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

---

## When This Skill Activates

- Riven boots on a project with Tailwind in the stack
- Any agent creates or modifies UI components
- Token audit sub-agent runs (grep for hardcoded hex values)
- Theme check sub-agent runs (dark mode verification)
- Touch targets sub-agent runs (minimum size verification)
