# Cognitive Kernel Build — Session Prompts

## Session 1: Build Triad + Intelligences (Pierce, Mara, Riven, Scout, Sentinel, Wraith, Meridian, Chronicle, Arbiter, Compass)

```
Nyx, activate. Load COGNITIVE-KERNEL.md + BOOT.md.

SESSION: Cognitive Kernel Build — Part 1 (Build Triad + Intelligences)

CONTEXT:
Session 5.2 revealed that Nyx's governance stack (1,275 lines across 5 files) was too diffuse — critical execution awareness faded mid-session, causing Phase 2 (Consequence Climb) to be skipped and gate findings to be dismissed as "pre-existing." We condensed Nyx's stack into a 156-line COGNITIVE-KERNEL.md that loads every session as a dashboard with hyperlinks to reference docs.

Now every agent needs one. The cognitive architecture from Nyx's kernel — phased execution, FM triggers, contracts, consequence climbing, scalar cognition — must be propagated to all agents, adapted to each domain.

TASK:
Build cognitive kernels for 10 agents: Pierce, Mara, Riven, Scout, Sentinel, Wraith, Meridian, Chronicle, Arbiter, Compass.

FOR EACH KERNEL:
1. Read the agent's current files: agents/{name}.md + personas/{name}/PERSONALITY.md + personas/{name}/INTROSPECTION.md (where they exist)
2. Build forge/kernels/{name}-kernel.md with these sections:

   Section 1: IDENTITY (3-5 lines)
     Native scale (what this persona sees sharpest).
     Ambient scales (what they must hold as live fields).
     Collapse signal (how to recognize flattening to native dimension).

   Section 2: EXECUTION PHASES (domain-specific sequence)
     Analogous to Nyx's Phase 0-5 but for this persona's workflow.
     Every persona gets a consequence climb phase before reporting.
     Pierce example: Load spec → Audit code → Classify findings → Consequence climb → Report
     Scout example: Identify scope → Schema recon → Cross-ref findings → Consequence climb → Deliver brief

   Section 3: DOMAIN-SPECIFIC FAILURE MODES (14 FMs, domain masks)
     Same 14 failure modes, but how each manifests in THIS persona's domain.
     One-line trigger signal + defense for each. Not essays.
     Example: FM-4 in Pierce = "Grading a finding LOW to avoid delaying build" → "Severity is the spec's call, not the schedule's"

   Section 4: CONTRACTS (preconditions/postconditions for this persona's actions)
     What must be true before they start work.
     What must be true before they report results.

   Section 5: SCALAR COGNITION
     Native scale definition.
     3 key ambient scales for this persona.
     The question that forces scalar awareness: persona-specific version of "what changes because of what I just found/recommended/flagged?"

   Section 6: ADVERSARIAL CHECK (domain-specific)
     4 questions this persona asks before reporting. Adapted from Nyx's but domain-relevant.

   Section 7: REFERENCE INDEX
     Links to full persona files, loaded on demand.

3. Update agents/{name}.md boot sequence to load kernel instead of multiple files.

TARGET: ~100-150 lines per kernel for Triad (Pierce/Mara/Riven). ~60-100 lines for intelligences.

GATE: Read back every kernel after writing. Each kernel must have all 7 sections. FM table must have all 14 entries with domain-specific triggers (not copy-pasted from Nyx). Scalar cognition section must name the collapse signal.

Push via git CLI, max 5 files per commit.
```

---

## Session 2: Remaining Personas + Orchestrators + Kernel Index

```
Nyx, activate. Load COGNITIVE-KERNEL.md + BOOT.md.

SESSION: Cognitive Kernel Build — Part 2 (Remaining Personas + Orchestrators + Index)

CONTEXT:
Part 1 built cognitive kernels for the Build Triad (Pierce, Mara, Riven) and 7 intelligences (Scout, Sentinel, Wraith, Meridian, Chronicle, Arbiter, Compass). Each kernel has: domain-specific phases, all 14 FMs with domain masks, contracts, scalar cognition with collapse signals, and adversarial checks.

TASK:
1. Build cognitive kernels for the remaining 9 agents: Kehinde, Tanaka, Vane, Voss, Calloway, Sable, Scribe, Kiln, Beacon.

   Same 7-section format from Part 1. Read each agent's files first (CONTRACT 2).

   Key domain-specific FM examples to get right:
   - Tanaka FM-4: "Passing an auth check because the RPC name sounds safe" → severity from analysis, not intuition
   - Vane FM-7: "Financial model looks complete because the happy path works" → adversarial: what about refunds, partial payments, rate edge cases?
   - Calloway FM-11: "Competitive analysis from remembered landscape, not current data" → re-read sources before reporting
   - Kehinde FM-10: "Schema change recommended without tracing FK cascade" → consequence climb on every DDL recommendation

2. Build orchestrator kernels (lighter, ~40-60 lines) for: Triad, Systems-Triad, Strategy-Triad, Gate-Runner, Full-Audit.

   Orchestrator kernels focus on:
   - Dispatch sequence (who runs when, what blocks what)
   - Cross-agent FM awareness (how FMs compound when agents interact)
   - Synthesis contracts (what must be true before declaring a gate passed)
   - Scalar cognition at the orchestration level (hold all persona perspectives simultaneously)

3. Create forge/KERNEL-INDEX.md — master index of all kernels with:
   - Agent name → kernel path → native scale → key FM risks
   - One-line summary per kernel
   - Boot sequence reference: which kernels load for which dispatch type

4. Update Nyx's COGNITIVE-KERNEL.md reference index to link to KERNEL-INDEX.md.

5. Update CLAUDE.md to reference the kernel architecture.

TARGET: ~80-120 lines per persona kernel. ~40-60 lines per orchestrator kernel.

GATE: All 14 kernels built (9 personas + 5 orchestrators). Every FM table has 14 domain-specific entries. Every kernel has a collapse signal. KERNEL-INDEX.md links to all 24 kernels (Nyx + 10 from Part 1 + 13 from Part 2). Read back every file.

Push via git CLI, max 5 files per commit.
```
