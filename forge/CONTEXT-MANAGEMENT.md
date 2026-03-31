# Context Management

> How to manage Claude's context window. The limiting resource.

## Strategies

1. **Tiered Activation** — Load only what the session needs. Quick question = Tier 1. Deep work = Tier 3.
2. **Demand Loading** — Read batch manifest first, then only load referenced specs.
3. **BOOT.md Handoffs** — Structured handoff preserves continuity across sessions.
4. **Distillation** — For large files, create distilled versions (key decisions only).

## Budgeting

| Session Type | Budget |
|---|---|
| Lightweight batches | 3-4 per session |
| Heavy batches | 1-2 per session |
| Frontend batches | 1 per session |
| Agent dispatch (triad gates) | 1 gate session |
| Introspection | 1-2 personas |

## Stop Conditions
- Context > 70% → STOP. Write BOOT.md handoff.
- Domain change → STOP. Different context needed.
- Gate blocks → STOP. Don't build past unresolved findings.
- Operator says stop → STOP. Always.
