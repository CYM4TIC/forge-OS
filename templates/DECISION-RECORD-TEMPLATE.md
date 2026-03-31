# Decision Record Template

> **Standard format for Architecture Decision Log entries.** Used when locking a decision or proposing one for review.

---

## For Locked Decisions

```markdown
### ADL-[NNN]: [Decision Title]
- **Date locked:** YYYY-MM-DD
- **Context:** [Why this decision was needed — what problem or ambiguity triggered it]
- **Decision:** [What was decided — be precise and unambiguous]
- **Alternatives considered:**
  - [Option A]: [Why it was rejected]
  - [Option B]: [Why it was rejected]
- **Consequences:** [What this decision constrains — what CAN'T we do now]
- **Locked by:** Dr. [Name(s)] + operator ratification
- **Affected specs:** [Which spec sections this touches]
```

## For Pending Decisions

```markdown
### PADL-[NNN]: [Decision Title]
- **Status:** OPEN / UNDER REVIEW / BLOCKED / READY TO LOCK
- **Date raised:** YYYY-MM-DD
- **Raised by:** Dr. [Name]
- **Context:** [Why this decision is needed]
- **Options:**
  - A: [Option A] — Pros: / Cons: / Effort:
  - B: [Option B] — Pros: / Cons: / Effort:
  - C: [Option C] — Pros: / Cons: / Effort: (if applicable)
- **Recommendation:** [Option X because... OR "Need more data — specifically..."]
- **Blocking:** [What can't proceed until this is decided]
- **Data needed:** [What information would make this decision clearer]
```
