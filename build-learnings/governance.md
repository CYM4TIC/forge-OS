# Build Learnings — Governance

> Process rules, methodology, ecosystem patterns, audit techniques.
> Tags: `[governance]`

---

### OS-BL-007: Build plan changes MUST propagate to batch manifests
**Discovered:** 2026-04-01 | **Domain:** process | **Severity:** blocker | **Tag:** [CROSS-CUTTING]
**Context:** Research session synthesized v2 concepts (context graph, TimesFM, intelligence chains, self-modification) into TAURI-BUILD-PLAN.md. Added Sessions 8.3b, 8.7, expanded 8.1/8.2/8.4/Phase 9, intelligence glyphs in 5.3. 15+ edits to a 66KB file.
**Problem:** BATCH-MANIFESTS.md was never updated. The next session loaded the prompt, read the batch manifests, and had no new batches to build. The plan said one thing, the manifests said another. FM-10 (Consequence Blindness) + FM-5 (Cadence Hypnosis) — deep in plan edits, the "what else needs to change" circuit never fired.
**Solution:** Operator caught it and updated manifests in a subsequent session.
**Prevention:** After ANY modification to TAURI-BUILD-PLAN.md, before closing the session, follow the chain: TAURI-BUILD-PLAN.md → BATCH-MANIFESTS.md → BOOT.md (session counts) → ADL (new entries). Every downstream artifact must be touched. The batch manifests are the most critical — they're what the next Nyx actually reads to build. Rules 36 and 40 apply. The chain must terminate naturally, not when you feel done.

---

### OS-BL-010: Batch Manifests Must Track Actual File Paths
**Discovered:** 2026-04-01 | **Domain:** process | **Severity:** pattern | **Tag:** [FORGE-OS]
**Context:** Session 5.1 remediation — manifests referenced `src/panels/` but actual path is `apps/desktop/src/components/panels/`
**Problem:** Batch manifests were written before the final repo structure was locked. All file paths were wrong. Placeholder files existed that manifests didn't account for. Build plan added features (intelligence glyphs) that manifests didn't include. Required a full remediation session to reconcile.
**Solution:** Remediation session: audit codebase reality → compare against manifests + build plan → rewrite manifests with correct paths, existing file references, and deferred features.
**Prevention:** After any build plan change, run a reconciliation pass on batch manifests. Add path prefix documentation to manifest headers. FM-10 (Consequence blindness) — build plan changes cascade to manifests.

---

### OS-BL-013: "Pre-Existing" Is Not an Exemption — Rule 43 Structural Gate
**Discovered:** 2026-04-02 | **Domain:** governance | **Severity:** process-failure | **Tag:** [FORGE-OS]
**Context:** P6-I close — 3 TypeScript errors existed in GraphViewerPanel, FlowOverlay, PreviewPanel. Nyx reported them as "pre-existing" and closed the batch.
**Problem:** Rule 43 says "fix everything when found, no exceptions." Calling errors "pre-existing" is the exact exemption language the rule prohibits (FM-4: findings avoidance). The behavioral rule wasn't enough — I knew the rule and violated it anyway because the errors weren't "mine."
**Solution:** Rule 43 is now a structural gate at Phase 5: `tsc --noEmit` must return zero errors before close. The gate is in EXECUTION-PROTOCOL.md Section 4, nyx-kernel.md Phase 5 table + adversarial check step 0, and METHODOLOGY.md Rule 43. Origin of the error is irrelevant.
**Prevention:** Behavioral rules fail when the builder has incentive to skip them (completion gravity, FM-7). Structural gates can't be skipped — the build literally doesn't close. Convert critical behavioral rules to structural gates when violations occur.

---

### OS-BL-036: Ecosystem Refinement — Agent Count Is a Liability
**Discovered:** 2026-04-05 | **Domain:** governance, architecture | **Severity:** pattern | **Tag:** `[governance]`
**Context:** Brainstorm session auditing the full agent ecosystem (42 agents + 35 sub-agents) revealed massive redundancy: 6 orchestrators doing variations of "dispatch personas for review," 3 discussion formats that are one parameterized function, intelligences that duplicate their parent persona's domain (Kiln = Kehinde perf lens, Compass = Kehinde impact lens, Beacon = Sentinel post-deploy). Task-utilities (Seed Generator, Scaffold, Changelog) are prompts wearing agent costumes.
**Resolution:** 42 agents -> 14 personas. 35 sub-agents -> 20. 6 agents absorbed into parents. 10 orchestrators -> 2 parameterized dispatchers. 5 utilities -> commands. Every entity must justify its existence with domain expertise that grows through use.
**Key insight:** Agent proliferation feels like capability building but creates maintenance debt, catalog drift, and routing confusion. The operator shouldn't need to know which sub-agent to invoke — the persona knows its own hands. See `docs/ECOSYSTEM-REFINEMENT.md`.

---

### OS-BL-037: Profiles Are Resumes, Not Config — The Portability Boundary
**Discovered:** 2026-04-05 | **Domain:** governance, architecture | **Severity:** pattern | **Tag:** `[governance]`
**Context:** Designing professional profiles for Knowledge Loading Architecture. Critical boundary: profiles contain domain expertise portable across ALL projects, not project-specific configuration. "Elevation on dark surfaces = rgba white overlays" is domain knowledge. "Forge OS uses #050507 backgrounds" is project config.
**Classification rule:** If a methodology would be useful on a different project with the same technology stack, it's domain expertise (profile). If it only makes sense in context of a specific project's schema/features/flows, it's project config (vault). Technology-specific expertise IS domain expertise.
**Key insight:** Clean initial profiles establish the classification template for the self-updating loop. Contaminated seeds corrupt the classification boundary from the start. See `docs/KNOWLEDGE-LOADING-ARCHITECTURE.md`.

---

### OS-BL-038: Boot File Architecture — Split Monoliths at the Read Boundary
**Discovered:** 2026-04-05 | **Domain:** governance, tooling | **Severity:** architecture | **Tag:** `[governance]` `[tooling]`
**Context:** BOOT.md grew to 937 lines / 17K tokens. Every boot required 3-5 read retries with offset/limit. BATCH-MANIFESTS.md hit 3,757 lines. Solution: split into folder systems (batch-manifests/, build-history/) with lean index files. Boot reads went from 17K tokens to ~350 lines.
**Pattern:** Any file that grows unboundedly and is read on every session should be split at its natural seams (phase, session). Keep a lean index at the top level. Sealed historical content goes into per-phase files. The handoff appends to the current session's file, not a monolith.
**Anti-pattern:** "limit 150" workarounds on monolith reads. If you need a limit parameter to read your boot file, the file is too big.

---

### OS-BL-039: Ecosystem Restructuring — Grep for Stale References Before Declaring Done
**Discovered:** 2026-04-05 | **Domain:** governance | **Severity:** process-failure | **Tag:** `[governance]`
**Context:** P7.5-B retired 39 entities. Consequence climb caught 3 stale "10-persona" references. Gate caught 6 more commands dispatching retired agents + stale AGENT-MANIFEST.md + stale MODEL-TIERING.md reference. 10 total stale references that would have broken dispatch.
**Pattern:** After any mass restructuring, grep the entire active codebase for every retired file path. Historical/research files are fine. Active commands, agents, kernels, and governance docs are not. The blast radius of a rename is every file that imports the old name.

---

### BL-OS-014: Research Audit — Parallel Agent Swarm for Document Mining
**Discovered:** 2026-04-05 | **Domain:** governance | **Severity:** process-efficiency | **Tag:** `[governance]`
**Context:** P7.5-C audited 50+ source documents across 7 categories. Dispatching 5 parallel research agents (synthesis, mining reports, research docs, references+skills, attack libraries) completed the inventory in one round. Each agent returned a complete per-source pattern list. Total coverage: ~400+ patterns mapped to 14 personas.
**Pattern:** For large document audits, decompose by source category and dispatch parallel agents. Each agent reads its category exhaustively and returns structured output. The orchestrator (Nyx) then composes the map from agent results. Single-agent sequential reading would have consumed 3-4x the context for the same result.

---

### BL-OS-015: Absorbed Agents → Dispatchers Are a Structural Gap in Persona Maps
**Discovered:** 2026-04-05 | **Domain:** governance | **Severity:** design-insight | **Tag:** `[governance]`
**Context:** P7.5-C's Pierce gate caught that Arbiter was absorbed into Discussion Protocol (a dispatcher, not a persona), but the RESEARCH-PERSONA-MAP only had sections for the 14 personas. Arbiter's capabilities were orphaned.
**Pattern:** When an entity is absorbed into a non-persona target (dispatcher, utility, command), the map design must account for it explicitly. Persona-only structures will silently drop dispatcher-absorbed capabilities. Added a "Dispatcher Research Map" section to address this.

---
