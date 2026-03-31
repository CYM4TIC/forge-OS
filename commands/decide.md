---
name: decide
description: Run a decision through the Decision Council — 5 advisors, anonymous peer review, Arbiter synthesis
user_invocable: true
---

# /decide [question or decision]

Run `$ARGUMENTS` through the Decision Council.

## Triggers
- `/decide` followed by a question
- "council this" + context
- "pressure-test this" / "stress-test this"
- Any genuine decision with stakes where the user wants multiple perspectives

## Protocol
1. Dispatch `agents/decision-council.md` with the full question and context
2. The council orchestrator handles:
   - Context enrichment (scans workspace for relevant files)
   - Question framing (neutral, enriched with business context)
   - 5 advisor dispatch in parallel (Contrarian, First Principles, Expansionist, Outsider, Executor)
   - Anonymous peer review in parallel (5 reviewers, 3 questions each)
   - Arbiter synthesis (verdict with agreement, clashes, blind spots, recommendation, next step)
3. Present Arbiter's verdict to operator
4. Suggest Strategy Triad routing if relevant

## When NOT to use
- Factual questions (one right answer)
- Code review (use Build Triad)
- Architecture decisions (use `/council` with domain personas)
- Creation tasks (writing, designing)
