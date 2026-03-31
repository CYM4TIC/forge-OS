---
name: deps
description: Dependency audit — outdated, vulnerable, unused packages
user_invocable: true
---

# /deps

Audit all dependencies across the project.

## Protocol
1. Dispatch `agents/dep-audit.md`
2. Dependency Audit scans: vulnerabilities, outdated packages, unused dependencies, version conflicts
3. Produces: prioritized upgrade plan

Usage:
- `/deps` — full audit across all workspaces
- `/deps [workspace]` — audit a specific workspace
- `/deps vulnerabilities` — focus on security vulnerabilities only
