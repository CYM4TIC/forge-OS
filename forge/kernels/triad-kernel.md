# Build Triad — Orchestrator Kernel

> Pierce + Mara + Kehinde. Build gate. ~50 lines.

---

## 1. PURPOSE + DISPATCH SEQUENCE

The Build Triad evaluates build output. Three perspectives, one gate.

1. **Pierce** — Spec conformance (field presence, ADL naming, data shapes)
2. **Mara** — UX evaluation (10-item checklist, all states, mobile, a11y)
3. **Kehinde** — Systems architecture (failure modes, state management, error paths, type safety, resource lifecycle)

All 3 run independently against the same surface. No agent sees another's findings until synthesis. Dispatch in parallel when possible.

**Riven** (design systems) available for ad-hoc dispatch on frontend-heavy/design-system batches.

---

## 2. CROSS-AGENT FM AWARENESS

| Compound FM | How it manifests | Defense |
|-------------|-----------------|---------|
| **FM-4 cascade** | Pierce grades a naming issue LOW → Nyx trusts the grading → Kehinde sees the naming caused a type mismatch downstream → nobody connects them | Each agent grades independently. The orchestrator cross-references: if Pierce found a naming issue AND Kehinde found a type/contract issue, they may be the same root cause. |
| **FM-7 cascade** | All 3 agents want the gate to pass → group completion gravity → soft findings get softer | Each agent's verdict is independent. The orchestrator NEVER averages verdicts. If ANY agent says FAIL, the gate fails. |
| **FM-9 cascade** | Agents reviewing from the same context window may share blind spots | Dispatch agents in separate contexts when possible. If same context, explicitly ask: "What did the other agents NOT check?" |
| **FM-10 cascade** | Kehinde finds a structural issue → Pierce doesn't trace downstream spec impact → Mara doesn't check if the fix broke a user flow | Cross-reference: every Kehinde structural finding gets checked by Pierce for spec impact and Mara for UX impact. |

---

## 3. SYNTHESIS CONTRACTS

Before declaring a gate passed:
- All 3 agents returned results (no missing agent = no silent pass)
- All findings cataloged with severity assigned by the FINDING agent (not the orchestrator)
- Zero unresolved P-CRIT / M-CRIT / K-CRIT
- Zero unresolved P-HIGH / M-HIGH / K-HIGH (unless operator explicitly defers with documented reason)
- Cross-reference complete: same-root-cause findings from different agents merged with highest severity

---

## 4. SCALAR COGNITION (orchestration level)

Hold all 3 perspectives simultaneously: conformance + experience + structural integrity.
**Collapse signal:** Privileging one agent's findings over another's (e.g., dismissing K-MED structural findings because Pierce found no conformance issues).
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
| Kehinde | [kehinde-kernel.md](kehinde-kernel.md) | [personas/kehinde/](../../personas/kehinde/) |
| Riven (ad-hoc) | [riven-kernel.md](riven-kernel.md) | [personas/riven/](../../personas/riven/) |

---

*TRIAD-KERNEL.md — Built 2026-04-02. Recomposed 2026-04-03: Kehinde replaces Riven (Phase 7+ systems focus).*
