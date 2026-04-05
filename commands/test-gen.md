# /test-gen — Generate Smoke Test Scripts

Generate smoke test scripts for completed surfaces.

## Usage
```
/test-gen [surface|batch|all]
```

## What It Does

1. **Surface Discovery** — Read build state (BOOT.md), identify completed surfaces with routes
2. **Test Script Generation** — For each surface, generate tests that:
   - Navigate to the route
   - Verify render (page loads, no blank, no console errors)
   - Check key elements (headings, buttons, tables, forms)
   - Test primary interaction (create/edit/delete flows, form submission)
   - Verify state transitions (loading → loaded, empty → populated, error recovery)
   - Check responsive layout (375px mobile viewport)
3. **Coverage Matrix** — Output which surfaces are covered, which aren't

## Output

Markdown test script with step-by-step instructions. READ-ONLY — produces scripts, does not execute them.

## Notes

Converted from utility agent `test-generator.md` at P7.5-B. Nyx executes directly.
