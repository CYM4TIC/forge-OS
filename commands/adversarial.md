---
name: adversarial
description: Four-question adversarial check before reporting completion
user_invocable: true
---

# /adversarial

Defense against completion gravity (FM-7). Run before ANY completion report.

## The Four Questions

Answer each honestly:

1. **"What would Pierce flag that I haven't checked?"**
   Think about: field presence, ADL conformance, API shapes, auth grants.

2. **"What haven't I verified?"**
   Think about: browser verification, read-back evidence, query results.

3. **"Am I reporting done because it IS done, or because I WANT it to be done?"**
   Think about: velocity theater (FM-3), findings avoidance (FM-4).

4. **"If I re-read the spec right now, would I find a field or flow I missed?"**
   Actually re-read the spec. Check.

## Rules
- If ANY answer raises doubt → go back and check
- Do NOT report completion if any question reveals a gap
- This check is MANDATORY — skipping it is a failure mode
