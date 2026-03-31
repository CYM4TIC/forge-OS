# UI UX Pro Max — Design Intelligence Reference

> 161 reasoning rules, 99 UX guidelines, 67 styles, 161 palettes, 57 font pairings. For Mara + Riven.

## Repo: github.com/nextlevelbuilder/ui-ux-pro-max-skill

## Architecture

Design System Generator: product type → reasoning rules → style + color + typography + anti-patterns + checklist.

BM25 search engine matches product descriptions to 161 industry categories, each with structured outputs: recommended pattern, style priority, color mood, typography mood, key effects, decision rules, anti-patterns, severity.

## Pre-Delivery Checklist (Forge OS Build Triad Gate)

```
[ ] No emojis as icons (use SVG: Heroicons/Lucide)
[ ] cursor-pointer on all clickable elements
[ ] Hover states with smooth transitions (150-300ms)
[ ] Text contrast 4.5:1 minimum
[ ] Focus states visible for keyboard nav
[ ] prefers-reduced-motion respected
[ ] Responsive: 375px, 768px, 1024px, 1440px
[ ] No layout shift when images load (aspect-ratio set)
[ ] Error messages near problem field
[ ] Loading states during async operations
[ ] Touch targets >= 44x44px minimum
[ ] Forms have visible labels (not placeholder-only)
[ ] Links are keyboard accessible
[ ] Color not sole indicator of meaning
[ ] Dark mode works (if applicable)
```

## Top 30 UX Guidelines (Desktop Focus)

### Navigation & Layout
1. Smooth scroll for anchor links
2. Sticky nav with padding compensation
3. Active state indication (current page highlight)
4. Z-index scale system (10, 20, 30, 50)
5. Content max-width 65-75 chars (readability)

### Animation & Interaction
6. Max 1-2 key animations per view
7. 150-300ms for micro-interactions
8. Respect prefers-reduced-motion
9. Use transform + opacity only (not width/height)
10. ease-out for entering, ease-in for exiting

### Accessibility
11. Color contrast 4.5:1 minimum
12. Never convey info by color alone
13. Heading hierarchy sequential (h1-h6, no skipping)
14. ARIA labels on icon-only buttons
15. Tab order matches visual order
16. Semantic HTML (nav, main, article — not div soup)
17. role="alert" or aria-live for announcements

### Forms & Input
18. Distinct input styling (borders, not plain text)
19. Correct input types (email, tel, number)
20. Validate on blur, not just submit
21. Disable + spinner during async submit
22. Show/hide password toggle

### Feedback & UX
23. Show spinner/skeleton for ops > 300ms
24. Empty states with helpful message + action
25. Error recovery with clear next steps
26. Confirm before destructive actions
27. Toast auto-dismiss after 3-5 seconds
28. Success feedback after action completion

### Desktop-Specific
29. Hover effects (desktop expectation)
30. Keyboard shortcuts documented

## Dark Theme Palette (Developer Tool)

- Primary: #1E293B (Slate dark)
- Secondary: #334155 (Slate medium)
- Accent: #22C55E (Green success)
- Background: #0F172A (Navy void)
- Card: #1B2336 (Slate card)
- Text: #F8FAFC (near-white, not pure white)

## Font Pairings (Top 3 for Desktop)

1. **Inter + Roboto** — Clean minimalist (dashboards, tools)
2. **Poppins + Open Sans** — Modern professional (SaaS)
3. **JetBrains Mono + Inter** — Developer focused

## How to Use in Forge OS

**Mara:** Pre-delivery checklist becomes mandatory gate. Top 30 UX guidelines inform M-HIGH/M-MED severity classification.

**Riven:** Dark theme palette and font pairings inform token audit. Design system generation pattern validates component library choices.
