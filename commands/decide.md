---
name: decide
description: Run a decision through structured deliberation — 5 cognitive lenses, peer review, synthesis
user_invocable: true
---

# /decide [question or decision]

Structured deliberation for expensive decisions. Nyx orchestrates directly.

## Triggers
- `/decide` followed by a question
- "decide this" + context
- "pressure-test this" / "stress-test this"
- Any genuine decision with stakes where the user wants multiple perspectives

## The 5 Cognitive Lenses

| Lens | Question | Catches |
|------|----------|---------|
| **Contrarian** | What will fail? Assumes fatal flaw. | Blind spots from excitement |
| **First Principles** | What are we actually solving? Strips assumptions. | Wrong variable optimization |
| **Expansionist** | What upside are we missing? Adjacent opportunities. | Thinking too small |
| **Outsider** | Zero context, fresh eyes only. | Curse of knowledge |
| **Executor** | What do you do Monday morning? | Brilliant plans with no path |

## Protocol
1. **Brief** — Present the decision with full context (scan workspace for relevant files)
2. **Independent analysis** — Each lens produces 100-200 word assessment (no cross-contamination)
3. **Anonymous peer review** — Each lens reviews all 5 assessments without knowing authorship
4. **Synthesis** — Nyx produces verdict with:
   - Recommended path + confidence level
   - Key risks from Contrarian that survive peer review
   - Implementation sequence from Executor
   - Dissenting positions that couldn't be resolved
5. Present to operator for decision

## When NOT to use
- Factual questions (one right answer)
- Code review (use `/gate`)
- Architecture decisions (use `/council` with domain personas)
- Creation tasks (writing, designing)
