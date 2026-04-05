---
name: scaffold
description: Generate boilerplate matching project patterns — page, hook, API, component
user_invocable: true
---

# /scaffold

Generate boilerplate that matches existing project patterns.

## Protocol
1. Nyx reads 2-3 exemplars from the codebase, extracts the pattern
2. Generate matching boilerplate with TODO markers for business logic

> Converted from Scaffold agent at P7.5-B. Nyx executes directly.

Usage:
- `/scaffold page [name]` — generate a page component
- `/scaffold hook [api_name]` — generate a data hook
- `/scaffold api [table] [operation]` — generate an API endpoint/RPC
- `/scaffold component [name]` — generate a component
