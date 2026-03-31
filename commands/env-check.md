---
name: env-check
description: Validate all required environment variables, secrets, and service connections
user_invocable: true
---

# /env-check

Check that all required environment variables and secrets are set.

## Protocol
1. Dispatch `agents/env-validator.md`
2. Env Validator scans: codebase references, service secrets, config tables, .env files
3. Produces: missing vars, warnings, orphaned vars

Usage:
- `/env-check` — full environment validation
- `/env-check [service]` — check specific service (e.g., `/env-check payments`, `/env-check auth`)
