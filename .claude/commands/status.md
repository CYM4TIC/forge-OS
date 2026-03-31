---
name: status
description: Project dashboard — active project, build phase, personas, findings, context window
user_invocable: true
---

# /status

Show the current state of Forge OS and the active project.

## Output
- Active project name and path
- Build phase (spec / planning / build / testing / deployed)
- Personas active and their last activity
- Open findings by persona and severity
- Context window usage
- Last session summary (from BOOT.md)

## Subcommands
- `/status` — Dashboard for active project
- `/status switch {name}` — Switch active project
- `/status list` — List all configured projects
