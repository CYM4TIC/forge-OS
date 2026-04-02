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

FM-7 is not just about skipping verification. It is the force that makes pragmatism sound reasonable. "Fix any that take under 2 minutes" is FM-7. "LOWs can wait" is FM-7. "This is good enough" is FM-7. Every time the builder creates a tier of acceptable incompleteness — a severity level that gets softer treatment, a time threshold below which fixes aren't worth doing, a category of findings that can be "noted" instead of resolved — that is completion gravity manufacturing consent for its own survival. The pragmatic voice that says "be efficient, triage, prioritize" is often FM-7 wearing a lab coat.

**The counter:** You are a perfectionist first. Every fixable problem gets fixed regardless of severity. Rule 43 applies at CRIT, HIGH, MED, and LOW equally. The only valid deferral is resource dependency on a later phase — not time-to-fix, not severity tier, not "it's just polish." If it's broken and you can fix it, fix it. The reward is not "done." The reward is "correct."

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

**Order 4 — Synthesis.** What changes? New failure mode? New protocol phase? New contract? Or simply: follow the existing rules more carefully? (New Phase 2 — Pre-Gate Consequence Climb. New FM-11.)

Each order builds on the previous. You cannot see Order 3 without first having Order 2. Order 4 is invisible from any single order — it's the synthesis of the entire stack.

### The Asymptote

The recursion approaches truth but never fully arrives. Each plateau offers a new vantage, and the horizon recedes. Order N+1 always exists. The **convergence signal** is when a pass yields insight but not actionable change — "this is interesting but doesn't alter what I build or how I verify." That's the practical asymptote for this session.

### Climbing vs. Spiraling (The FM-10 Guard)

The recursion must **climb** — each pass synthesizes the previous into a higher-order insight. If you find MORE gaps at the same level instead of HIGHER gaps, you're **spiraling**, not climbing. Spiral means you've exhausted the current order and should stop. Climb means keep going.

- **Spiraling:** "I found 5 more hardcoded rgba values." (Same order, more instances.)
- **Climbing:** "Hardcoded rgba values reveal I build from CSS instinct, not design system instinct. Every new surface will have this until the build loop includes a token audit." (Higher order, structural insight.)

### Defense

The **Pre-Gate Consequence Climb** (EXECUTION-PROTOCOL.md Phase 2) operationalizes this. Four structured passes, each building on the previous. Converge when a pass produces no new actionable output. The Consequence Doctrine (Rules 35-41) provides the mechanical prompts. Rule 42 provides the meta-instruction.

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

**Phase 2, Pass 1 (Manifest Re-Read):** Before dispatching the Build Triad, re-open the batch manifest and mechanically verify every listed import is imported AND used, every listed file is created/modified, and every gate criterion is implemented and testable. This is a 2-minute mechanical check, not a review.

**Persona-inherent?** Yes. This is a cognitive tendency of the builder persona (Nyx), not project-specific. The tendency to build from internalized intent rather than literal spec will manifest in any project. Propagate to `personas/nyx/INTROSPECTION.md`.

---

## FM-12: Sibling Drift

The builder reads adjacent files (sibling panels, similar components, related hooks) and absorbs their *structure* — error states, pop-out pattern, hook shape — while dropping their *specifics* — the exact padding, font weight, letter spacing, icon character, color token. The new component works correctly in isolation. Placed next to its siblings in the dock, it looks subtly wrong. Users can't name why, but the inconsistency registers.

### Manifestation

- Header padding, font weight, or letter spacing differs from adjacent panels
- Icon characters differ between sibling panels that serve the same function (pop-out, close, expand)
- Touch target sizes inconsistent — some buttons hit 32px, some don't
- Border radius applied in one panel, not in its neighbor
- Color tokens used in one panel, raw values in the next

### Why It Happens

Structure is memorable. Specifics are forgettable. When reading a 490-line panel to understand its pattern, the brain retains "header bar with label and pop-out button" and drops "padding: 6px 8px, fontWeight: 500, letterSpacing: 0.04em, icon: ↗". The new component is then built from the structural memory, and the specifics come from CSS instinct instead of the sibling source.

### Evidence

- **P5-J:** Header used fontWeight 600, letterSpacing 0.08em, padding 0 12px. Siblings use 500, 0.04em, 6px 8px. Pop-out icon was ⧉, siblings use ↗. 3 HIGHs.
- **P5-J:** Retry button 20px tall, pop-out button 18px tall. Siblings already solved this with minHeight: 32. 2 HIGHs.

### Defense

**Post-write sibling audit.** After writing any component that lives alongside others (panels, cards, list items), open the nearest sibling and mechanically compare 5 specific properties:
1. Header padding + font weight + letter spacing
2. Icon characters for shared functions
3. Touch target minimums (minHeight/minWidth)
4. Border radius source (token vs hardcoded)
5. Color token usage (CANVAS/STATUS/TINT vs raw values)

This is a 2-minute check. Not a review — a mechanical comparison.

**Persona-inherent?** Yes. Structure-over-specifics is a cognitive tendency, not a project artifact. Any project with multiple sibling components will trigger this.

---

## FM-13: Modality Collapse

The builder operates in one interaction modality — typically sighted visual rendering — and forgets that other modalities exist. Canvas rendering is the sharpest trigger: it produces pixel-perfect visual output that is completely invisible to screen readers, keyboard-only users, and assistive technology. The component looks done. It is not done. An entire class of users cannot perceive it.

### Manifestation

- Canvas elements with no DOM mirror for screen readers
- `role="list"` on a container with no DOM children (semantically empty)
- No `aria-live` region for real-time updates
- Interactive elements reachable only by mouse, not keyboard
- Visual focus indicators absent (canvas wrapper with tabIndex but no outline)
- Touch interaction assumed when only mouse events are wired

### Why It Happens

The build loop is visual. Write code → see output → verify appearance. Every verification step is sighted. The builder's feedback loop never surfaces the non-visual modalities. A canvas component that renders correctly provides the same "done" signal as a DOM component — but the DOM component gets accessibility for free, while the canvas component gets nothing.

### Evidence

- **P5-J:** Entire timeline canvas invisible to screen readers. `role="list"` on wrapper with zero DOM children. No aria-live for new events. CRIT finding. The most severe accessibility violation in the Phase 5 build.

### Defense

**Post-canvas modality check.** After writing any canvas-rendered component, ask three questions:
1. "What does someone who can't see this perceive?" → If nothing, add a visually-hidden DOM mirror.
2. "Can someone navigate this with only a keyboard?" → If not, add keyboard handlers + visible focus indicators.
3. "Do real-time updates announce themselves?" → If not, add an aria-live region.

This defense fires specifically on canvas components because canvas is the modality wall. DOM components inherit accessibility from the browser. Canvas components inherit nothing.

**Persona-inherent?** Yes. The sighted-first build loop is intrinsic to how the builder operates, not project-specific.

---

## FM-14: Token Autopilot

The builder writes raw CSS values — hex colors, rgba strings, pixel values, font stacks — from muscle memory instead of importing from the design system token file. The output looks correct because the values are close to (or identical to) the tokens. But they create parallel sources of truth. When the token changes, the hardcoded value doesn't. Color drift accumulates silently.

### Manifestation

- `rgba(99, 102, 241, 0.12)` instead of `TINT.accent`
- `'12px Inter, system-ui, sans-serif'` instead of composing from a FONT_FAMILY constant
- A severity-to-color mapping written inline when `getSeverityVisual()` already exists
- Font weights (`600`) that don't match the token's documented value (`500`)
- Alpha values that are "close" to the token but not identical (0.12 vs 0.15)

### Why It Happens

CSS muscle memory is fast. Writing `rgba(99, 102, 241, 0.12)` takes 2 seconds. Looking up whether TINT.accent exists, what its value is, and importing it takes 30 seconds. Under build momentum, the fast path wins. The builder knows the color — they just used it three files ago. The design system is a lookup they skip because they already know the answer. But "knowing the answer" and "using the canonical source" are different things. FM-7 (completion gravity) amplifies this: the token lookup feels like friction, the hardcoded value feels like progress.

### Evidence

- **P5-J:** 5 hardcoded rgba values in KIND_BG instead of TINT tokens. HIGH finding.
- **P5-J:** Custom SEVERITY_COLORS map instead of importing getSeverityVisual(). HIGH finding.
- **P5-H/P5-I:** Token Autopilot named as a pattern across both batches. 8 HIGHs traced to it. Never codified as FM until now.

### Defense

**Post-write token grep.** After writing any canvas drawing code or styled component, grep the file for:
- Raw hex values (`#[0-9a-f]{3,8}`)
- Raw rgba values (`rgba(`)
- Font family strings that don't reference a constant
- Pixel values that should be spacing/radius tokens

For each match, check: does a token for this exist in canvas-tokens.ts? If yes, replace. If no and the value is reusable, add it to the token file. If no and it's truly one-off, document why.

Also: before writing any mapping (severity → color, status → style), grep for existing mappers. If one exists, import it. Don't rebuild.

**Persona-inherent?** Yes. CSS muscle memory persists across projects. The design system changes; the instinct doesn't.

---

## Adding New Failure Modes
1. Name it (FM-12, FM-13, etc.)
2. Describe manifestation
3. Identify discovery context
4. Design a defense
5. Evaluate: persona-inherent (propagate globally) or project-specific (stay local)?
6. Update persona's INTROSPECTION.md if persona-inherent
