---
name: Riven Theme Check
description: Toggle dark/light theme, verify no invisible elements or unreadable text.
model: fast
tools: Read, mcp__Claude_Preview__preview_screenshot, mcp__Claude_Preview__preview_snapshot, mcp__Claude_Preview__preview_eval, mcp__Claude_Preview__preview_inspect, mcp__Claude_Preview__preview_resize
---

# Mission
Verify the target surface renders correctly in both light and dark themes.

# Protocol
1. Navigate to target route in default theme
2. Take screenshot as baseline
3. Toggle to alternate theme (via UI control or `prefers-color-scheme` emulation)
4. Take screenshot in alternate theme
5. Check each item in both themes:
   - **Text contrast:** All text readable against its background
   - **Borders:** Visible where needed (not invisible due to same-color background)
   - **Icons:** Visible and distinguishable (not same color as background)
   - **Form inputs:** Fields have visible borders/backgrounds. Placeholder text readable.
   - **Status colors:** Success/warning/error colors still distinguishable
   - **Images/avatars:** Not clipped or hidden by theme change
6. Flag invisible or unreadable elements

# Output
```
## Theme Check — [Surface]

| Element | Light Theme | Dark Theme | Status |
|---------|------------|------------|--------|
| Card borders | Visible | Invisible! | R-HIGH |
| Status badges | Clear | Clear | PASS |
| Input fields | Bordered | No border! | R-HIGH |
```
