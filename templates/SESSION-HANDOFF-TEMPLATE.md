# Session Handoff Template

> **Standardized session sign-off format.** Every persona uses this when updating BOOT.md at session end. Consistent format enables any persona (or the operator) to pick up exactly where the previous session left off.

---

## When to Use

Every session that produces work output gets a handoff entry in the persona's BOOT.md. This replaces free-form session logging with a structured format.

**Exception:** Tier 0 personality sessions (pure Q&A, no vault changes) can skip the handoff — just update the session log table.

## Template

```markdown
## Handoff — [DATE] [TIME-OF-DAY if multiple sessions same day]

### What Was Done
[2-5 bullet points. Concrete deliverables, not process descriptions.]
- [File created/modified]: [what changed]
- [Decision made]: [what was decided]
- [Finding fixed]: [ID and one-line summary]

### What Changed (Files Touched)
[List every file created, modified, or deleted. This is the "diff" for the session.]
- CREATED: [path] — [purpose]
- MODIFIED: [path] — [what changed]
- DELETED: [path] — [why]

### What's Next
[1-3 items. The immediate next action for this persona or the operator.]
1. [Next action] — [who owns it]
2. [Next action] — [who owns it]

### What's Blocked
[0-3 items. Things that can't proceed without external input.]
- [Blocked item] — waiting on [persona/operator] for [specific thing]

### Upstream Impacts
[0-3 items. Things other personas need to know about because of what changed this session.]
- [Persona affected]: [what they need to know or do]

### Operator Actions Required
[0-3 items. Things the operator must do manually (file replacements, account setup, etc.)]
- [ ] [Action] — [context]

### Personality Tier
[Tier 0 / Tier 1 / Tier 2] — [If Tier 1+, which trigger(s) from the checklist fired?]
```

## Integration with Existing Protocols

| Existing Protocol | How Handoff Relates |
|---|---|
| BOOT.md updates | Handoff IS the BOOT.md update. Replace the "Current Position" and "Session Log" sections with the handoff. |
| Team communications | If "Upstream Impacts" is non-empty, also post to team comms. |
| Persona inboxes | If "What's Blocked" names another persona, also add to their inbox. |
| Project state file | The operator (or Nyx) distills the handoff into 3-5 lines for the project state file after significant sessions. |
| Dependency board | If a dependency was resolved or discovered, update the board. Reference from "Upstream Impacts." |
| Build learnings | If a gotcha was discovered, append there too. Reference from "What Was Done." |

## Anti-Patterns

- **Writing a handoff longer than 30 lines.** If it's longer, the session did too many things — next time, break into smaller sessions.
- **Listing process steps instead of outcomes.** "Read 5 segments, loaded ADL, checked comms" is process. "Patched 3 schema files, resolved DEP-071" is outcome. Write outcomes.
- **Skipping "What's Blocked."** Even if nothing is blocked, write "Nothing." Explicit is better than absent.
- **Forgetting "Operator Actions Required."** The operator is the physical executor. If they need to run a script, replace a file, or create an account — say so explicitly.
