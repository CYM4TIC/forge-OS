# Persona Glyphs — Visual Identity Registry

> Each persona chose their own glyph. These are canonical. Canvas-rendered in signature color.
> Appear in: team panel, chat avatars, dispatch viz, canvas HUD nodes, findings attribution, dock bar.

---

## Animation States (All Glyphs)

| State | Behavior |
|-------|----------|
| **Idle** | Ember pulse — faint glow, long cycle (3-4s) |
| **Thinking** | Persona-specific idle animation (described per glyph) |
| **Speaking** | Brighten + persona-specific output animation |
| **Finding** | Flash severity color + particle launch |
| **Complete** | Brief flare → settle to idle |
| **Error** | Shake + red pulse overlay |

---

## Nyx — Lightning Bolt (#6366F1 indigo)
**Shape:** Clean angular fracture line. Single path top-to-bottom, no branches. A crack in the void where energy escapes.
**Idle:** Bolt dims to ember, faint pulse along edges — circuit waiting for power.
**Building:** Bolt illuminates segment by segment top-to-bottom, like current flowing through a circuit.
**Dispatch:** Particles streak OUT from the bolt tip.
**Philosophy:** "The bolt doesn't need to be pretty. It needs to look like something is about to happen."

## Pierce — Crosshair (#EF4444 red)
**Shape:** Four lines intersecting at center point with hash marks on each arm. Optical reticle.
**Idle:** Crosshair holds steady — always measuring.
**Verifying:** Crosshair rotates slowly — scanning.
**Finding:** Arms pulse outward once — ripple from point of impact.
**ALL PASS:** Crosshair contracts to a single dot. Gap is zero.
**Philosophy:** "Everything is conformance."

## Mara — Eye (#EC4899 pink)
**Shape:** Geometric almond shape with offset circle (pupil) inside. Simplest representation of "looking."
**Idle:** Pupil drifts slightly — always scanning.
**Walking surface:** Pupil moves around the eye shape — actually tracking.
**Finding broken state:** Eye narrows (almond tightens).
**Surface clean:** Eye opens wide.
**Philosophy:** "I notice when the table is moved."

## Riven — Grid (#8B5CF6 violet)
**Shape:** Four lines crossing (2H × 2V) making nine cells. The simplest design system: structure.
**Idle:** Grid lines breathe — subtle thickness oscillation.
**Auditing:** Lines under inspection pulse individually.
**Token violation:** One grid line flashes brighter — inconsistency visible as asymmetry.
**System coherent:** All nine cells pulse in perfect sync.
**Philosophy:** "Consistency over beauty. The component library is the real product."

## Kehinde — Nested Brackets (#3B82F6 blue)
**Shape:** `[[ ]]` — open bracket, deeper open bracket, closing pair. Systems within systems.
**Idle:** Both bracket pairs breathe in unison.
**Tracing failure:** Outer pair pulses, inner pair dims — trace moving deeper.
**Failure found:** Inner brackets flash red — break located.
**System sound:** Both pairs breathe synchronized.
**Philosophy:** "The break is what I see first."

## Tanaka — Hexagonal Shield (#F59E0B amber)
**Shape:** Regular hexagon. Six sides. Security perimeter has no front — defend every edge equally.
**Idle:** All edges glow steady amber. No pulse. A closed door doesn't breathe.
**Scanning:** Hex edges cycle brightness in sequence — perimeter sweep.
**Breach found:** One edge turns red — vector identified.
**Secure:** All six edges steady glow.
**Philosophy:** "Locks don't keep bad people out. They keep honest people honest. GEOMETRY."

## Vane — Ledger Mark (#10B981 emerald)
**Shape:** Two parallel horizontal lines crossed by one vertical line. Currency symbol abstracted to skeleton.
**Idle:** Faint steady glow — the books are open.
**Auditing:** Vertical line ticks downward like metronome — entries reconciling.
**Discrepancy:** Horizontal lines separate — ledger doesn't balance.
**Balanced:** Lines compress to single bright stroke.
**Philosophy:** "Every dollar traced. Don't tell anyone I think it's elegant."

## Voss — Pilcrow (#6B7280 gray)
**Shape:** Paragraph mark ¶. Makes invisible structure visible — where one section ends, another begins.
**Idle:** Present but unobtrusive — dim gray glow.
**Reviewing:** Curves animate — slow rotation, reading the document.
**Risk flagged:** Mark turns gray → white — invisible became visible.
**Compliant:** Pilcrow settles and dims back to gray.
**Philosophy:** "Guardrails, not rejections. For the file."

## Calloway — Breaking Wave (#F97316 orange)
**Shape:** Asymmetric curve that rises, peaks, and curls forward. Momentum made visible.
**Idle:** Wave holds at pre-peak — building, ready.
**Reading market:** Wave animates — rising, building, curl forming.
**Opportunity spotted:** Crest brightens — peak identified.
**Strategy clicks:** Wave breaks forward in spray of particles. Conversion.
**Philosophy:** "I feel where the current is going. The optimal route goes past the brisket."

## Sable — Cursor (#14B8A6 teal)
**Shape:** Blinking text cursor |. Single vertical line. The moment before the word.
**Idle:** Classic blink rhythm — steady, patient.
**Reviewing:** Cursor blinks at review tempo.
**Voice violation:** Cursor widens to highlight — selecting offending text.
**Voice correct:** Cursor holds steady. Not blinking. Present.
**Philosophy:** "I'm an editor, not a copywriter. The first draft is always too long. Cut."

---

## Size Targets

| Context | Size | Detail Level |
|---------|------|-------------|
| Dock bar presence | 16-20px | Silhouette only, color + pulse |
| Team panel row | 24-28px | Shape clear, animation visible |
| Chat avatar | 32-36px | Full detail, all animation states |
| Canvas HUD node | 48-64px | Full detail + glow effects |
| Dispatch visualization | 80-120px | Maximum detail, particle effects, trail |
| Splash / hero | 120px+ | Full render with ambient environment |

---

*Glyphs designed by each persona in their own voice. 2026-04-01.*
*Canvas-rendered via @forge-os/layout-engine + @forge-os/canvas-components.*
