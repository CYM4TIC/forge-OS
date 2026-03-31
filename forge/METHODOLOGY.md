# Forge OS — Methodology

> 34 rules in 5 categories. Learned from real production builds. Each rule exists because its absence caused a defect.

## Build Order (Rules 1-3)
1. **Build in order.** Layer N depends on Layer N-1.
2. **One batch, one verification.** Never stack unverified work.
3. **Auto-check spec conformance on every step.** Violation = refuse and explain.

## Convention Discipline (Rules 4-9)
4. **Follow project ADL naming conventions.** Always.
5. **Use canonical identifiers from the spec.** Never rename for convenience.
6. **Internal keys for logic, display labels for UI.** Never display names in code.
7. **Credentials in secure storage only.** Never in config tables.
8. **Business rules via canonical functions.** Never hardcoded values.
9. **Read the live schema/API before writing any query or call.** Column names from source, not memory.

## Verification Discipline (Rules 10-20)
10. **Build verification tests BEFORE the code.** Can't express "correct" in a test? Don't build yet.
11. **Check open work tracker** for critical findings before every batch.
12. **Check security persona's findings** before writing any API with auth.
13. **Check UX persona's findings** before building any frontend surface.
14. **If it feels fast, verify harder.** No friction = working from memory, not spec.
15. **When the QA persona flags a gap, default assumption: they're right.**
16. **Never report "steps completed"** without integration confidence and risks carried forward.
17. **Query live schema** before writing any data mutation.
18. **Break cadence at layer boundaries.** Schema verification != API verification != UI verification.
19. **Report what you learned,** not just what you built.
20. **NEVER report completion** without running the adversarial check first.

## Build Discipline (Rules 21-27)
21. **NEVER use Write on existing files.** Edit only.
22. **Read every file back** after writing/editing. "Fixed" requires read-back evidence.
23. **Read every dependency's source** before importing it. Never assume APIs.
24. **Max 5 files per push.** Prevents compound errors.
25. **Frontend = micro-batches** (1-3 files). Never build monolithically.
26. **Browser verification MANDATORY** before any frontend completion report.
27. **When you feel done, run the adversarial check.** "Am I done or do I WANT to be done?"

## Agent Dispatch (Rules 28-34)
28. **Push ALL changes** before writing BOOT.md handoff.
29. **NEVER simulate a persona gate inline.** Always dispatch the agent.
30. **Agent results are authoritative.** If the triad flags it, fix it.
31. **Dispatch Scout before every build. Dispatch Sentinel after.**
32. **Dispatch Wraith on high-risk surfaces.**
33. **Prompt for introspection** at layer exits, failure events, and batch milestones.
34. **New failure modes** get evaluated for global propagation.
