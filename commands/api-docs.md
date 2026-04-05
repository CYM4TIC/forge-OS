---
name: api-docs
description: Generate API/RPC documentation from live schema or codebase
user_invocable: true
---

# /api-docs

Generate comprehensive API documentation from the project's live schema or codebase.

## Protocol
1. Nyx discovers API endpoints (Tauri commands, database RPCs, REST routes)
2. Documents: name, args, returns, auth, description
3. Groups by domain (inferred from naming conventions)
4. Returns markdown documentation

> Converted from API Docs agent at P7.5-B. Nyx executes directly.
