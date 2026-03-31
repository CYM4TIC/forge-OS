---
name: launch-check
description: Launch readiness across all blockers, risks, deferred findings
user_invocable: true
---

# /launch-check

Dispatch the launch readiness agent for a comprehensive pre-launch audit.

## Protocol
1. Dispatch `agents/launch-readiness.md`
2. Checks: build completion, open findings, critical issues, dependencies, security posture, environment
3. Returns: READY / NOT READY / CONDITIONAL with specific conditions
