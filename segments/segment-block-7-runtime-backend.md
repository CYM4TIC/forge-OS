# Block 7: Runtime Backend

> **Sessions:** 2-3 | **Batches:** OS-B7.A through OS-B7.D | **Source:** BUILD-PLAN.md Block 7

---

## OS-B7.A: Agent SDK + Parallel Execution
- Claude Agent SDK client (`runtime/src/server/agent-sdk.ts`)
- Session spawner: create agent sessions with specific CLAUDE.md, tool permissions, model tier
- Parallel execution: spawn N agents simultaneously, stream responses via callbacks
- WebSocket server for real-time frontend communication

## OS-B7.B: Vault Integration + State Management
- `vault-watcher.ts` — fs.watch on BOOT.md, BUILD-LEARNINGS, build-state.json
- BOOT.md parser — extract YAML block, current position, risks, session history
- Build-state aggregator — batch count, step count, layer progress
- Session history manager — track all sessions, handoffs, durations, token usage

## OS-B7.C: Orchestration Engine
- `orchestrator.ts` — build pipeline: Scout -> Build -> Triad -> Sentinel -> Report
- Gate dispatcher: read PERSONA-GATES entry, spawn required agents (parallel Build Triad = 3 simultaneous sessions)
- Findings aggregator: collect from parallel agents, deduplicate, severity-sort
- "Fix All" flow: spawn Nyx session with aggregated findings
- Token budget manager: track per session, alert at 70% context
- Document generation triggers: auto-generate gate report PDF on gate completion

## OS-B7.D: Feedback Loop Engine
- Create `.forge/` directory structure + `feedback-schema.md`
- `proposal.ts` — file-based CRUD for `.forge/proposals/`
- `triage.ts` — scope-to-evaluator routing table
- `evaluate.ts` — spawns evaluator session with proposal context
- `integrate.ts` — accepted proposal execution + FEEDBACK-LOG.md append
- `dedup.ts` — pre-submission duplicate check via LightRAG
- Wire into orchestrator: session boot checks proposals, surfaces in dashboard

### Exit Gate
- Agent SDK spawns sessions with correct model tiers
- Parallel execution verified (3 simultaneous sessions)
- WebSocket pushes events to frontend
- Vault watcher detects file changes
- Orchestrator runs full pipeline
- Feedback loop creates/triages/evaluates/integrates proposals
- Pushed to GitHub: "Runtime backend operational"

---
