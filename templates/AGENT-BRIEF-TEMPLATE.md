# Agent Brief Template

> **Standard format for dispatching agents.** When Nyx (or any orchestrator) dispatches an agent, this template ensures the agent has all context needed to execute independently.

---

## When to Use

Every agent dispatch — Scout, Triad, Sentinel, Wraith, or any individual persona — gets a brief. The brief is the contract between the dispatcher and the agent. If it's not in the brief, the agent doesn't know about it.

## Template

```markdown
# Agent Brief: [Agent Name] — [Task]

## Mission
[1-2 sentences. What this agent needs to accomplish.]

## Context

### Project
- **Project:** [name]
- **Stack:** [frontend, backend, hosting, CSS]
- **Repo:** [path or URL]

### Batch
- **Batch ID:** [ID]
- **Surface:** [name]
- **Route:** [URL path, if frontend]
- **What was built:** [1-3 sentence summary of what the builder produced]

### Files to Review
[List every file the agent should examine.]
- [path] — [what it is]
- [path] — [what it is]

### Database Changes
[List any new/modified tables, RPCs, migrations.]
- [type]: [name] — [what it does]

## Reference Documents
[List the spec segments, ADL entries, and build learnings the agent should load.]
- ADL: `projects/{active}/vault/adl/locked-decisions.md` — [specific entries if applicable]
- Spec: `projects/{active}/vault/specs/segments/[file]` — [which segment]
- Build learnings: `projects/{active}/vault/cross-refs/BUILD-LEARNINGS.md` — [domain filter]
- Persona gates: `projects/{active}/vault/cross-refs/PERSONA-GATES.md` — [this batch's gates]

## Known Issues
[Anything the agent should be aware of — open risks, deferred items, known limitations.]
- [issue] — [context]

## Verification Targets
[What "success" looks like for this agent's review.]
- [ ] [Target 1]
- [ ] [Target 2]
- [ ] [Target 3]

## Output Format
[What the agent should produce.]
- For **Scout:** Schema recon brief + open findings + gotchas
- For **Build Triad (Pierce+Mara+Riven):** Gate Enforcement Template (filled out)
- For **Sentinel:** Regression report (last 3 surfaces, pass/fail per surface)
- For **Wraith:** Red team report (attack vectors attempted, results, severity)
- For **Individual persona:** Findings list with severity + evidence

## Constraints
- READ-ONLY unless explicitly stated otherwise
- Do not modify files without dispatcher approval
- Report ALL findings, including low-severity ones
- Evidence required for every finding (screenshot, SQL result, or file reference)
```
