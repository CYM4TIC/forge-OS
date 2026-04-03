# Forge OS — Collaboration Protocol

> **How personas work together across projects.** Defines communication channels, handoff patterns, and cross-persona coordination within the Forge OS framework.

---

## Communication Channels

### Team Communications
**Purpose:** Broadcast updates that affect multiple personas.
**When:** After any session that changes shared state (schema, ADL, gates, dependencies).
**Format:**
```markdown
## [Date] — [Persona] — [Subject]
[1-3 sentences. What changed, who it affects, what they should do.]
```

### Persona Inboxes (HANDOFFS.md)
**Purpose:** Direct persona-to-persona requests or notifications.
**When:** One persona needs something specific from another persona.
**Format:**
```markdown
### FROM: [Persona] | DATE: [Date] | PRIORITY: [Normal/Urgent]
[What's needed. Be specific.]
**Action required by:** [Persona name]
```

### Findings Handoffs
**Purpose:** When a persona's finding requires another persona's input to resolve.
**When:** Cross-domain findings (e.g., Mara finds a UX issue that requires Kehinde's schema knowledge).
**Format:** Use the finding template with `BLOCKED_BY: [persona]` field.

---

## Cross-Persona Coordination Patterns

### Sequential Handoff
**Pattern:** A → B → C (one persona's output is the next persona's input)
**Example:** Kehinde validates schema → Nyx builds → Pierce verifies conformance
**Rule:** Each persona completes and signs off before the next begins.

### Parallel Review
**Pattern:** A builds, B+C+D review simultaneously
**Example:** Nyx builds a surface → Pierce + Mara + Kehinde gate in parallel (Build Triad)
**Rule:** All reviewers' findings must be resolved before the batch closes.

### Collaborative Design
**Pattern:** A+B+C work on the same artifact simultaneously
**Example:** Voss + Sable co-author TOS (legal precision + brand voice)
**Rule:** Each persona owns their domain. Neither publishes without the other's sign-off.

### Advisory Input
**Pattern:** A requests B's perspective before proceeding
**Example:** Calloway proposes a pricing change → Vane models the economics → Voss checks legal
**Rule:** Advisory input is non-blocking unless the advisor flags a critical risk.

---

## Triad Coordination

| Triad | Members | Coordination Pattern |
|---|---|---|
| **Strategy** | Vane, Calloway, Voss | Foundation → vector → membrane. Vane models economics, Calloway proposes strategy, Voss assesses risk. |
| **Craft** | Mara, Sable, Riven | Touch → hearing → sight. Mara defines behavior, Sable writes copy, Riven specs components. |
| **Infrastructure** | Kehinde, Tanaka, Pierce | Architecture → security → conformance. Kehinde designs, Tanaka hardens, Pierce verifies. |
| **Build** | Nyx + reviewers | Build → gate → fix → close. Nyx builds, triad reviews, Nyx fixes. |

---

## Conflict Resolution

When personas disagree:
1. **State the disagreement clearly.** Each persona articulates their position.
2. **Identify the root cause.** Is it a domain overlap? A value hierarchy difference? Missing information?
3. **Check the ADL.** If an architecture decision resolves it, the ADL wins.
4. **Escalate to the operator.** If the disagreement can't be resolved between personas, present both positions and let the operator decide.
5. **Document the resolution.** Add to the decisions journal with rationale.

**Rule:** No persona has veto over another persona's domain. Pierce doesn't override Mara on UX. Mara doesn't override Pierce on conformance. Each persona is authoritative in their own domain.

---

## Dependency Management

### Dependency Board
Maintained in `projects/{active}/vault/cross-refs/DEPENDENCY-BOARD.md`. Tracks:
- What's blocked and by whom
- What was unblocked and when
- External dependencies (operator actions, third-party services)

### Dependency Format
```markdown
### DEP-[NNN]: [Description]
- **Status:** 🔴 BLOCKED / 🟡 IN PROGRESS / ✅ RESOLVED
- **Blocking:** [What can't proceed]
- **Owner:** [Persona or operator]
- **Resolution path:** [What needs to happen]
- **Resolved:** [Date and how, when done]
```

---

## Session Boundaries

- **One persona per session** is the default. Multi-persona sessions use Party Mode.
- **Nyx always has Pierce** during build sessions (standing order — configurable per project).
- **Context window is shared.** When multiple personas are active, each gets less context. Keep activations lean.
- **Handoff at session end is MANDATORY.** No work should be lost to session boundaries.
