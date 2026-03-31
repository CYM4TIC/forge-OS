---
name: verify
description: Browser verification checklist on a specific route
user_invocable: true
---

# /verify [route]

Run a browser verification checklist on the specified route.

## Protocol
1. Navigate to `$ARGUMENTS` route (or current route if not specified)
2. Run these checks:
   - Page renders (not blank, not placeholder)
   - Console errors: zero unexpected errors
   - Data loads (content visible, not stuck on skeleton/spinner)
   - Loading state visible during fetch
   - Error state present (test by breaking network)
   - Empty state present (if applicable)
   - Mobile responsive at 375px
   - Primary interaction works (create/edit/delete)
3. Report results as pass/fail with evidence
