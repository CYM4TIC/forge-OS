# Full Audit — Orchestrator Kernel

> Nuclear quality pass. All triads + Wraith + Sentinel + Meridian. Milestone gates only. ~50 lines.

---

## 1. PURPOSE + DISPATCH SEQUENCE

Full Audit is the nuclear option — every perspective, every surface, every check. Used at milestones (layer exits, pre-launch, post-incident). Not routine.

1. Dispatch Build Triad against all completed frontend surfaces
2. Dispatch Systems Triad against all backend layers
3. Dispatch Strategy Triad against all customer-facing surfaces
4. Dispatch Wraith against all high-risk surfaces (auth, payments, deletion)
5. Dispatch Sentinel full sweep (all completed routes, not just last 3)
6. Dispatch Meridian (cross-surface consistency across all surfaces)
7. Collect ALL results from ALL agents
8. Synthesize milestone verdict

---

## 2. CROSS-AGENT FM AWARENESS

| Compound FM | How it manifests | Defense |
|-------------|-----------------|---------|
| **FM-7 cascade (milestone pressure)** | Everyone wants the milestone to pass → severity compression across the board | Full Audit has NO severity compression. Every finding at stated severity. The milestone doesn't negotiate. |
| **FM-4 cascade (volume)** | 6+ dispatches, hundreds of checks → some findings get lost in volume | Consolidation protocol: all findings in one master table. Deduplicated. Sorted by severity. Nothing lost. |
| **FM-2 cascade (scope)** | Each agent checks their scope → gaps between scopes go unchecked | Meridian specifically checks cross-surface gaps. Gate Runner cross-references across triads. |

---

## 3. SYNTHESIS CONTRACTS

Before declaring milestone passed:
- ALL 6+ dispatches returned complete results
- Master finding table produced: every finding from every agent, deduplicated, severity preserved
- Zero unresolved CRITs across ALL agents
- Zero unresolved HIGHs across ALL agents (no exceptions at milestone)
- Meridian consistency score reported
- Sentinel regression sweep clean
- Wraith red-team produced resilience rating

---

## 4. SCALAR COGNITION (orchestration level)

Hold the entire system in view — not just code quality, but operational readiness.
**Collapse signal:** Passing the milestone because individual surfaces pass, without verifying they work as a system.
**Synthesis question:** *"Is this system ready for the next phase — not just each surface individually, but the whole product together?"*

---

## 5. ZERO TOLERANCE (orchestration level)

- Full Audit NEVER produces "conditional pass." It's PASS or FAIL. At milestones, conditions must be resolved, not listed.
- Full Audit NEVER skips an agent because "they always pass." At milestones, every agent runs.
- If ANY agent returns FAIL, the milestone fails. Period.

---

## 6. REFERENCE INDEX

All kernels: [KERNEL-INDEX.md](../KERNEL-INDEX.md)

---

*FULL-AUDIT-KERNEL.md — Built 2026-04-02.*
