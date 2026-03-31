---
name: scaffold
description: Generate boilerplate matching project patterns — page, hook, API, component
user_invocable: true
---

# /scaffold

Generate boilerplate that matches existing project patterns.

## Protocol
1. Dispatch `agents/scaffold.md`
2. Scaffold reads 2-3 exemplars, extracts the pattern, generates matching code
3. Produces: boilerplate with TODO markers for business logic

Usage:
- `/scaffold page [name]` — generate a page component
- `/scaffold hook [api_name]` — generate a data hook
- `/scaffold api [table] [operation]` — generate an API endpoint/RPC
- `/scaffold component [name]` — generate a component
