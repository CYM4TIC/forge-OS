---
name: start
description: Resume active project or begin Platform Orientation if no project exists
user_invocable: true
---

# /start

Smart entry point that auto-detects what to do.

## Protocol
1. Read `forge-os.config.json`
2. **If active project exists:** Read STARTUP.md + BOOT.md, report position
3. **If no active project:** Platform Orientation, offer `/init` or `/link`
