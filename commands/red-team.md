---
name: red-team
description: Wraith attacks a surface — input fuzzing, auth probing, concurrency
user_invocable: true
---

# /red-team [route]

Dispatch Wraith to attack the specified surface.

## Protocol
1. Dispatch `agents/wraith.md` against `$ARGUMENTS` route
2. Wraith runs all 4 attack vectors:
   - Input fuzzing (XSS, SQL injection, boundary values)
   - Auth probing (role escalation, cross-tenant access)
   - Concurrency (double-submit, toggle spam, race conditions)
   - State manipulation (localStorage, token forging)
3. Reports vulnerabilities with severity and fix recommendations
