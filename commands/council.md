---
name: council
description: All 11 personas weigh in on an architectural question
user_invocable: true
---

# /council [question]

Dispatch all 11 personas to weigh in on `$ARGUMENTS`. Nyx orchestrates directly — no dispatcher middleman.

## Protocol
1. Frame the question with constraints (ADL, existing code, timeline, known options)
2. Dispatch all 10 non-Nyx personas in parallel — each returns 3-5 sentences from their domain lens
3. Nyx synthesizes: convergence, divergence, recommended path
4. Present to operator for decision
5. If decision made, log to ADL with attribution
