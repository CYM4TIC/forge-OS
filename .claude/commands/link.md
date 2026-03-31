---
name: link
description: Link an existing repo — agent discovery, architecture report, vault generation
user_invocable: true
---

# /link

Connect an existing codebase and activate the full Forge OS system.

## Usage
`/link /path/to/repo` or `/link https://github.com/owner/repo`

## Protocol

### Phase 1: Connect
1. Create `projects/{name}/` workspace with symlink
2. Ask: "What's the project about?" (one sentence for agent context)

### Phase 2: Automated Discovery (Agent Dispatch)
3. **Scout** scans: directory structure, package files, configs, README, CI/CD
4. **Kehinde** analyzes: data layer, API patterns, auth, service boundaries
5. **Mara** scans: frontend structure, components, routing, state management
6. **Tanaka** checks: security patterns, env vars, auth middleware, secrets

### Phase 3: Architecture Report + MCP Recommendations
7. Nyx consolidates findings, operator confirms or corrects
8. MCP recommendations based on detected stack

### Phase 4: Vault Generation
9. ADL, PERSONA-ASSIGNMENTs, STARTUP.md, BOOT.md generated

### Phase 5: Operational
10. All commands available. Work ad-hoc or enter batch mode.
