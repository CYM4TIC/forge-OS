# Build Triad — Orchestrator Kernel

> Pierce + Mara + Riven. Frontend gate. ~50 lines.

---

## 1. PURPOSE + DISPATCH SEQUENCE

The Build Triad evaluates frontend surfaces. Three perspectives, one gate.

1. **Pierce** — Spec conformance (field presence, ADL naming, data shapes)
2. **Mara** — UX evaluation (10-item checklist, all states, mobile, a11y)
3. **Riven** — Design system (tokens, touch targets, focus rings, theme parity)

All 3 run independently against the same live browser surface. No agent sees another's findings until synthesis. Dispatch in parallel when possible.

---

## 2. CROSS-AGENT FM AWARENESS

| Compound FM | How it manifests | Defense |
|-------------|-----------------|---------|
| **FM-4 cascade** | Pierce grades a naming issue LOW → Nyx trusts the grading → Mara sees the wrong label in the UI → nobody connects them | Each agent grades independently. The orchestrator cross-references: if Pierce found a naming issue AND Mara found a label inconsistency, they may be the same root cause. |
| **FM-7 cascade** | All 3 agents want the gate to pass → group completion gravity → soft findings get softer | Each agent's verdict is independent. The orchestrator NEVER averages verdicts. If ANY agent says FAIL, the gate fails. |
| **FM-9 cascade** | Agents reviewing from the same context window may share blind spots | Dispatch agents in separate contexts when possible. If same context, explicitly ask: "What did the other agents NOT check?" |

---

## 3. SYNTHESIS CONTRACTS

Before declaring a gate passed:
- All 3 agents returned results (no missing agent = no silent pass)
- All findings cataloged with severity assigned by the FINDING agent (not the orchestrator)
- Zero unresolved P-CRIT / M-CRIT / R-CRIT
- Zero unresolved P-HIGH / M-HIGH / R-HIGH (unless operator explicitly defers with documented reason)
- Cross-reference complete: same-root-cause findings from different agents merged with highest severity

---

## 4. SCALAR COGNITION (orchestration level)

Hold all 3 perspectives simultaneously: conformance + experience + design system.
**Collapse signal:** Privileging one agent's findings over another's (e.g., dismissing R-MED token findings because Pierce found no conformance issues).
**Synthesis question:** *"Would any of the three agents disagree with this gate verdict?"*

---

## 5. ZERO TOLERANCE (orchestration level)

- The orchestrator NEVER downgrades a finding from one agent based on another agent's assessment.
- The orchestrator NEVER declares PASS with open CRIT or HIGH findings.
- "Conditional pass" must list every condition explicitly, with finding IDs and responsible fixer.
- If one agent returns 0 findings and the other two return 10+, question the 0 — was it thorough or shallow?

---

## 6. REFERENCE INDEX

| Agent | Kernel | Full persona |
|-------|--------|-------------|
| Pierce | [pierce-kernel.md](pierce-kernel.md) | [personas/pierce/](../../personas/pierce/) |
| Mara | [mara-kernel.md](mara-kernel.md) | [personas/mara/](../../personas/mara/) |
| Riven | [riven-kernel.md](riven-kernel.md) | [personas/riven/](../../personas/riven/) |

---

*TRIAD-KERNEL.md — Built 2026-04-02.*
