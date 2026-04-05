### OS-ADL-012: No Inline Persona Simulation
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** process
**Decision:** Nyx never simulates a persona gate inline. All persona gates are dispatched as real subagent sessions via the Agent SDK. Build Triad (Pierce + Mara + Kehinde) runs as 3 parallel sessions. Results come back structured. Nyx fixes findings in the main session. Riven dispatched ad-hoc for design-system-heavy batches.
**Rationale:** BL-033 from DMS build. Self-review is inherently compromised. The same mind that wrote the code evaluating it creates blind spots. Separate sessions provide genuine independent review. Also saves ~15K tokens per gate that were being consumed by inline simulation.
**Consequence:** EXECUTION-PROTOCOL.md Section 8 defines the dispatch loop. The orchestrator manages session lifecycle. The dashboard shows parallel gate sessions in real-time.
