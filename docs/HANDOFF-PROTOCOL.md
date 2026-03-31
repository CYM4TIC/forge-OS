# Handoff Protocol

> Structured context transfer between execution stages, agent boundaries, and sessions.
> Prevents context loss when agents change, sessions restart, or execution phases transition.

---

## 1. The Problem

When Agent A finishes and Agent B starts:
- Agent B doesn't know WHY Agent A made certain decisions
- Agent B may re-explore alternatives Agent A already rejected
- Risks identified by Agent A are invisible to Agent B
- Context that was obvious during Agent A's execution is lost

BOOT.md partially solves this for session boundaries. Handoff documents solve it for **every agent and stage transition**.

---

## 2. When to Write a Handoff

| Transition | Handoff Required |
|-----------|-----------------|
| Scout → Nyx (pre-build to build) | Yes — gotchas, schema state, open findings |
| Nyx → Build Triad (build to gate) | Yes — what was built, design decisions, known risks |
| Build Triad → Nyx (gate findings to fixes) | Yes — findings with context, severity rationale |
| Nyx → Sentinel (build to regression) | Yes — what changed, which routes to focus on |
| Stage N → Stage N+1 (pipeline transition) | Yes — decisions, rejected alternatives, risks |
| Session N → Session N+1 | BOOT.md (existing mechanism — enhanced with handoff fields) |

---

## 3. Handoff Document Format

```markdown
# Handoff: {from_stage} → {to_stage}

**Batch:** {batch ID}
**Date:** {timestamp}
**From:** {agent/stage name}
**To:** {agent/stage name}

## What Was Done
{1-3 sentences summarizing the completed work}

## Decisions Made
| Decision | Chosen | Why | Alternatives Rejected |
|----------|--------|-----|----------------------|
| Auth approach | JWT check in RPC | Consistent with other admin RPCs | Middleware (too broad), RLS only (can't log) |
| Config storage | shop_engine_settings columns | Already exists, typed | JSON blob (untyped, hard to query) |

## Risks Identified
- {Risk 1: description + severity + what to watch for}
- {Risk 2: description + severity + what to watch for}

## Remaining Work
- {Item 1: what's left for the next stage}
- {Item 2: what's left for the next stage}

## Context the Next Stage Needs
- {Specific file paths that were modified}
- {RPC names and their return shapes}
- {Any gotchas discovered during this stage}
```

---

## 4. Handoff Storage

### Within a Session
Handoffs live in the agent's working memory during the session. For swarm workers, handoffs are returned as part of the worker's result.

### Across Sessions
Handoffs are captured in BOOT.md's session log entry. The "Last session" entry in BOOT.md is effectively the session-level handoff.

### For Multi-Stage Pipelines
When running a staged pipeline (e.g., deep-interview → ralplan → autopilot), each stage writes its handoff to the vault:
```
{project}/vault/handoffs/{stage-name}.md
```
Next stage reads the handoff before starting.

---

## 5. Handoff Quality Rules

### Must Include
- **Decisions + rationale** — not just what was chosen, but WHY
- **Rejected alternatives** — what was considered and dismissed (prevents re-exploration)
- **Risks** — anything the next stage should watch for
- **File paths** — specific files modified or created

### Must NOT Include
- Full code listings (the next agent can read the files)
- Findings that were already fixed (only carry forward open items)
- Verbose explanations of obvious decisions

### Handoff Size
- Target: 20-50 lines. Enough for context recovery, not so much that it's a burden to read.
- If a handoff exceeds 100 lines, it's too detailed. Summarize.

---

## 6. Handoff for Swarm Workers

When swarm workers complete:

```markdown
# Worker {i} Handoff

## Targets Processed
- {file/route/API 1}: {status} — {brief note}
- {file/route/API 2}: {status} — {brief note}

## Findings
{standard finding table}

## Discoveries
- {anything unexpected that the Queen should know}
- {patterns that might affect other workers' targets}
```

The Queen reads all worker handoffs during aggregation. Discoveries from one worker may require re-checking another worker's targets.

---

## 7. Integration with Existing Mechanisms

| Mechanism | Scope | Handoff Enhancement |
|-----------|-------|-------------------|
| BOOT.md | Session → Session | Add "Decisions Made" and "Risks Identified" sections to session log |
| BUILD-LEARNINGS.md | Cross-session learnings | Handoff discoveries feed into learnings extraction (Step 8 auto-extract) |
| Swarm worker results | Worker → Queen | Standardize worker handoff format for all swarm dispatches |
| Scout brief | Scout → Nyx | Already a handoff — formalize with rejected alternatives |
| Triad findings | Triad → Nyx | Add "severity rationale" to each finding (why this severity, not lower) |
