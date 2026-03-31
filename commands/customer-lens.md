---
name: customer-lens
description: Generate 5 customer perspectives for any surface or decision
user_invocable: true
---

# /customer-lens [surface, route, or question]

Generate 5 customer perspectives on `$ARGUMENTS`.

## Protocol
1. Dispatch `agents/customer-lens.md` with the target
2. Agent generates 5 personas from product context
3. All 5 perspectives evaluate the target in parallel
4. Synthesis: agreement, divergence, blind spots, priority fixes

## The 5 Frames
- **Daily Driver** — "Does this make my workflow faster or slower?"
- **First Timer** — "Can I figure this out without calling someone?"
- **Decision Maker** — "Is this worth the money?"
- **Reluctant User** — "How much of my time does this waste?"
- **Edge Case** — "Does this work for my situation?"

## Usage
- `/customer-lens /settings/billing` — evaluate a specific route
- `/customer-lens "Should we require email verification?"` — evaluate a decision
- `/customer-lens onboarding flow` — evaluate a journey
