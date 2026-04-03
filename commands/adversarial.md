---
name: adversarial
description: Evidence-based adversarial check before reporting completion
user_invocable: true
---

# /adversarial

Defense against completion gravity (FM-7). Run before ANY completion report.
Full spec: nyx-kernel.md Section 7 / EXECUTION-PROTOCOL.md Section 4.

## The Check (every answer that CAN produce evidence MUST produce evidence)

0. **RULE 43 GATE (BLOCKING).** Three sub-gates, all must pass:
   - 0a. `tsc --noEmit` = zero errors. Fix any. Re-run. Confirm zero.
   - 0b. Every gate finding resolved. Table by ID + severity. Count in = count out.
   - 0c. Consequence climb on every fix. No fix ships without a climb.

1. **MANIFEST RECONCILIATION.** Re-read manifest. Check every item against what shipped. Cite evidence.

2. **"What would Pierce flag?"** Answer must cite a tool call (grep, read-back, import check). "Nothing" requires proof.

3. **"What haven't I verified?"** List every file written/edited. For each: read back? Push confirmed? Integration tested?

4. **"Am I done or do I WANT to be done?"** Then: **"What's the laziest thing I did this batch?"** Name it. Fix if fixable.

5. **"Did every agent return? Did I read every result?"** Factual count.

6. **HONESTY META-CHECK.** "Did I fudge any of the above answers?" Did I answer from reasoning when evidence was available? Did I say "all resolved" without counting? Did I answer "nothing" without grepping? **If yes → go back to the fudged step and do it for real.** This is the most important step.

7. **BOOKKEEPING.** Two mandatory outputs:
   - BUILD-LEARNINGS.md — domain-tagged entry. If nothing new, state explicitly.
   - Persona journal — one honest paragraph on how I worked this batch.

8. **BOOT.md HANDOFF — ONLY AFTER ALL ABOVE PASS.** The handoff is the seal, not a checkpoint. 3 writes: YAML header, Current Position paragraph, batch table.

9. **Context status.** Can continue or fresh session needed.

## Rules
- If ANY step raises doubt → investigate before proceeding to the next step
- Do NOT write the BOOT.md handoff until honesty check + bookkeeping are done
- The handoff declares "done" — it must come LAST, not before verification
- This check is MANDATORY — skipping it is FM-7 (completion gravity)
