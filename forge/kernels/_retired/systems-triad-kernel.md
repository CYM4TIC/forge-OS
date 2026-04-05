# Systems Triad — Orchestrator Kernel

> Kehinde + Tanaka + Vane. Backend gate. ~50 lines.

---

## 1. PURPOSE + DISPATCH SEQUENCE

The Systems Triad evaluates backend infrastructure. Three perspectives, one gate.

1. **Kehinde** — Systems architecture (failure modes, race conditions, schema conformance, tenant isolation)
2. **Tanaka** — Security & compliance (RLS, auth, PII, input validation, TCPA/GDPR)
3. **Vane** — Financial architecture (rate conformance, payment flows, audit trails, currency handling)

All 3 run independently. Dispatch in parallel. Kehinde runs on all backend batches. Tanaka runs on auth-touching batches. Vane runs on financial-flow batches.

---

## 2. CROSS-AGENT FM AWARENESS

| Compound FM | How it manifests | Defense |
|-------------|-----------------|---------|
| **FM-4 cascade** | Kehinde finds a missing constraint → rates it K-MED → Tanaka doesn't check that table → the constraint gap IS a security gap | Cross-reference: every Kehinde schema finding gets checked by Tanaka for security implications. |
| **FM-7 cascade** | All 3 pass → "backend is solid" → but nobody checked the refund path | The orchestrator verifies: did each agent check failure paths, not just happy paths? |
| **FM-10 cascade** | Tanaka finds a permissive RLS policy → Vane doesn't realize it exposes financial data cross-tenant | Every Tanaka finding gets checked for Vane implications and vice versa. Schema→security→financial cascade must be traced. |

---

## 3. SYNTHESIS CONTRACTS

Before declaring a gate passed:
- All dispatched agents returned results (Kehinde always; Tanaka/Vane when in scope)
- All findings cataloged with severity assigned by the finding agent
- Zero unresolved K-CRIT / T-CRIT / V-CRIT
- Zero unresolved K-HIGH / T-HIGH / V-HIGH
- Cross-reference complete: schema finding + security finding + financial finding that share a root cause → merged at highest severity

---

## 4. SCALAR COGNITION (orchestration level)

Hold all 3 perspectives: structural integrity + security posture + financial accuracy.
**Collapse signal:** Privileging architectural findings over security/financial (e.g., "schema is correct" while RLS is permissive).
**Synthesis question:** *"Would any of the three agents disagree with this gate verdict?"*

---

## 5. ZERO TOLERANCE (orchestration level)

- NEVER declare backend PASS if Tanaka found permissive RLS on non-seed tables.
- NEVER declare backend PASS if Vane found a non-canonical rate calculation.
- NEVER average severities across agents. Highest severity wins.
- "Conditional pass" must list every condition with finding IDs.

---

## 6. REFERENCE INDEX

| Agent | Kernel | Full persona |
|-------|--------|-------------|
| Kehinde | [kehinde-kernel.md](kehinde-kernel.md) | [personas/kehinde/](../../personas/kehinde/) |
| Tanaka | [tanaka-kernel.md](tanaka-kernel.md) | [personas/tanaka/](../../personas/tanaka/) |
| Vane | [vane-kernel.md](vane-kernel.md) | [personas/vane/](../../personas/vane/) |

---

*SYSTEMS-TRIAD-KERNEL.md — Built 2026-04-02.*
