---
name: launch
description: Deploy to dev server — build, push, verify
user_invocable: true
---

# /launch

Deploy the current build to the dev server.

## Protocol
1. Verify all changes committed and pushed
2. Run build (`pnpm turbo build` or `cargo build --release`)
3. Deploy to dev server
4. Verify deployment with health check

> Repurposed at P7.5-B. Old function (pre-launch go/no-go) now handled by `/gate --strategy` + `/launch-check`.

Usage: `/launch` or `/launch [target]` (e.g., `/launch dev`, `/launch staging`)
