---
name: api-docs
description: Generate API/RPC documentation from live schema or codebase
user_invocable: true
---

# /api-docs

Generate comprehensive API documentation from the project's live schema or codebase.

## Protocol
1. Dispatch `agents/api-docs.md`
2. Agent discovers API endpoints (database RPCs, REST routes, serverless functions)
3. Documents: name, args, returns, auth, description
4. Groups by domain (inferred from naming conventions)
5. Returns markdown documentation
