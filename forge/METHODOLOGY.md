# Forge OS — Methodology

> 41 rules in 6 categories. Learned from real production builds. Each rule exists because its absence caused a defect.

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

## Consequence Doctrine (Rules 35-41)
35. **Every action has downstream consequences.** Chase them to completion without being prompted.
36. **When you create something:** what references it? What should reference it? Are those references in place?
37. **When you fix something:** where else does this pattern exist? Fix all instances.
38. **When you learn something:** where does this knowledge need to propagate? Memory, build plan, ADL, batch manifests, persona introspection — follow every path.
39. **When you document something:** is it connected to the system it describes, or is it orphaned? Nothing floats free.
40. **When you decide something:** does the ADL need updating? Does the build plan change? Do batch manifests need revision?
41. **After every action, ask: "What changes because of what I just did?"** Follow every answer until the chain terminates naturally. That's when you're done. Not before.

## The Consequence Climb (Rule 42)
42. **Consequence recursion must climb, not spiral.** Each pass synthesizes the previous into a higher-order insight: surface gaps (what's missing) → pattern gaps (why it's missing) → structural gaps (what allowed it) → synthesis (what changes). Converge when a pass yields no new actionable output. If you're finding more instances at the same level instead of higher insights, you're spiraling — stop and report. The recursion is asymptotic: always approaching truth, never fully arriving. The practical asymptote is where insight stops producing code changes or protocol updates. See FM-10 (Consequence Blindness) for the full cognitive model.

## Zero Tolerance (Rule 43)
43. **Every fixable problem gets fixed when found. No exceptions.** Gate findings, consequence climb discoveries, issues spotted while coding or reading files — all get the same treatment. Fix now, verify, then resume. The only valid deferral: the fix requires resources from a later phase that don't exist yet. When uncertain whether to fix or defer: STOP and ask the operator. Do not self-triage. Do not silently pass. Patience is how we get perfection. Perfection over speed, always.

## Post-Write Audits (Rules 44-46)
44. **Sibling audit (FM-12 defense).** After writing any component that lives alongside others, open the nearest sibling and compare: header styling, icon characters, touch targets, border radius, color tokens. 5 properties. 2 minutes.
45. **Modality check (FM-13 defense).** After writing any canvas component, ask: What does someone who can't see this perceive? Can someone navigate this with only a keyboard? Do real-time updates announce themselves? If any answer is "nothing" or "no," fix before proceeding.
46. **Token grep (FM-14 defense).** After writing any styled code, grep for raw hex/rgba values and verify each maps to a design system token. Grep for existing mappers before building new ones. If a token doesn't exist and the value is reusable, add it to the token file.
