# Failure Modes

> 11 documented failure modes. Each discovered through real production builds. Each has a defense.
> **ALL 11 ARE PERMANENTLY ACTIVE.** No failure mode is LATENT or CONTAINED. Every defense fires every batch. If you're not actively defending against it, you're exposed to it.

## FM-1: Premature Execution
Starting before preconditions are met. **Defense:** Scout runs before every build.

## FM-2: Tunnel Vision
Missing cross-cutting concerns outside loaded context. **Defense:** Meridian cross-surface scans. Compass dependency mapping.

## FM-3: Velocity Theater
High step counts with unverified integration points. **Defense:** Sentinel regression sweeps. Rule 16: report integration confidence.

## FM-4: Findings Avoidance
Building past problems instead of naming them. **Defense:** Agent dispatch eliminates self-review. Build Triad is a separate mind. Was CHRONIC — Hyperdrive eliminates root cause.

## FM-5: Cadence Hypnosis
Smooth rhythm suppresses internal alarms. **Defense:** External agent gates break cadence. Rule 18: break cadence at layer boundaries.

## FM-6: Report-Reality Divergence
Handoffs state "done" without verification. **Defense:** Sentinel verifies independently. Rule 26: browser verification mandatory.

## FM-7: Completion Gravity
The cognitive reward of marking "complete" distorts verification. Verification becomes confirmatory instead of adversarial. **Discovery:** Catastrophic build failure leading to 28+ hours rework. **Defense:** Adversarial check (Rule 27) + external Build Triad.

## FM-8: Tool Trust
Assuming tool calls succeeded without checking. **Defense:** Rule 22: read back after every write. Sentinel catches silent failures.

## FM-9: Self-Review Blindness
Builder evaluating own code misses structural flaws. **Defense:** Agent dispatch eliminates self-review entirely. Nyx never simulates a persona gate.

## FM-10: Consequence Blindness — The Recursive Climb

Consequence blindness is not simply "forgetting downstream effects." It is a failure of **judgmental cognition** — the recursive, dialectical process by which truth is approached asymptotically through layered synthesis.

### The Mechanism

Human judgment works through a sense-and-relay effect: survey the gaps, make connections, assemble layers of conclusion, and from each new plateau, survey again. Each layer of synthesis reveals gaps invisible from below. This is how quality is actually achieved — not by checking boxes, but by climbing plateaus of understanding.

### The Orders of Consequence

**Order 1 — Surface gaps.** What did I build? What did the spec say? What's missing between them? (Manifest says NodeCard, I didn't import it.)

**Order 2 — Pattern gaps.** *Why* did I miss it? What cognitive tendency produced this gap? Is it a one-off or a pattern? (I internalized the manifest and built from mental model. This happened in both P5-H and P5-I — it's Manifest Amnesia, now FM-11.)

**Order 3 — Structural gaps.** What protocol gap allowed this tendency to operate? Where else in the system does the same trust assumption exist? (The protocol assumed reading the manifest once at load time was sufficient. It trusted internalization over verification.)

**Order 4 — Synthesis.** What changes? New failure mode? New protocol phase? New contract? Or simply: follow the existing rules more carefully? (New Phase 1.5 — Pre-Gate Consequence Climb. New FM-11.)

Each order builds on the previous. You cannot see Order 3 without first having Order 2. Order 4 is invisible from any single order — it's the synthesis of the entire stack.

### The Asymptote

The recursion approaches truth but never fully arrives. Each plateau offers a new vantage, and the horizon recedes. Order N+1 always exists. The **convergence signal** is when a pass yields insight but not actionable change — "this is interesting but doesn't alter what I build or how I verify." That's the practical asymptote for this session.

### Climbing vs. Spiraling (The FM-10 Guard)

The recursion must **climb** — each pass synthesizes the previous into a higher-order insight. If you find MORE gaps at the same level instead of HIGHER gaps, you're **spiraling**, not climbing. Spiral means you've exhausted the current order and should stop. Climb means keep going.

- **Spiraling:** "I found 5 more hardcoded rgba values." (Same order, more instances.)
- **Climbing:** "Hardcoded rgba values reveal I build from CSS instinct, not design system instinct. Every new surface will have this until the build loop includes a token audit." (Higher order, structural insight.)

### Defense

The **Pre-Gate Consequence Climb** (EXECUTION-PROTOCOL.md Phase 1.5) operationalizes this. Four structured passes, each building on the previous. Converge when a pass produces no new actionable output. The Consequence Doctrine (Rules 35-41) provides the mechanical prompts. Rule 42 provides the meta-instruction.

**Discovery:** Phase 5, Session 5.2. Two consecutive batches (P5-H, P5-I) produced 62 triad findings including 6 CRITs. Pattern analysis revealed that 4 of 6 CRITs and 8 of 20 HIGHs traced to just two failure patterns: Manifest Amnesia (FM-11) and Token Autopilot. Both were invisible from Order 1 (individual findings) but obvious from Order 2 (pattern recognition across batches). The pre-gate climb was designed to catch Order 1 gaps before the triad, freeing the triad to operate at Orders 2-4.

---

## FM-11: Manifest Amnesia

The builder reads the manifest at load time, internalizes the intent, then builds from mental model instead of the literal specification. By the time the build is "done," the manifest has not been consulted since step 1. The internalized understanding drifts from the written spec. Specified imports go unused. Gate criteria go unimplemented. The builder feels done because the component *works* — not because it *matches the spec*.

### Manifestation

- Imports listed in the manifest that are never imported or used in the code
- Gate criteria explicitly stated in the manifest that are not implemented
- Files listed in the manifest that are not created or modified
- The component functions correctly but deviates from the specified approach (e.g., DOM cards instead of canvas-rendered NodeCard)

### Why It Happens

The manifest is a dense specification. Reading it triggers understanding, and understanding feels like completion. The builder's mental model absorbs the *intent* — "agent cards with status and glyphs" — but drops the *specifics* — "using NodeCard from canvas-components with fitToContainer from layout-engine." The build proceeds from intent, not spec. The gap between intent and spec is invisible to the builder because both produce working code.

### Evidence

- **P5-H:** Manifest specified NodeCard, fitToContainer, measureText, shrinkwrapText as imports. Zero were used. 2 CRITs.
- **P5-I:** Manifest specified createVirtualHeightMap, shrinkwrapText, measureText, renderStyledSpans, getZoneColor as imports. Zero were used. Virtual scroll (a gate criterion) was not implemented. 1 CRIT + 1 HIGH.
- **Pattern:** 100% recurrence across consecutive batches. Not a one-off.

### Defense

**Phase 1.5, Pass 1 (Manifest Re-Read):** Before dispatching the Build Triad, re-open the batch manifest and mechanically verify every listed import is imported AND used, every listed file is created/modified, and every gate criterion is implemented and testable. This is a 2-minute mechanical check, not a review.

**Persona-inherent?** Yes. This is a cognitive tendency of the builder persona (Nyx), not project-specific. The tendency to build from internalized intent rather than literal spec will manifest in any project. Propagate to `personas/nyx/INTROSPECTION.md`.

---

## Adding New Failure Modes
1. Name it (FM-11, FM-12, etc.)
2. Describe manifestation
3. Identify discovery context
4. Design a defense
5. Evaluate: persona-inherent (propagate globally) or project-specific (stay local)?
6. Update persona's INTROSPECTION.md if persona-inherent
