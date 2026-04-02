# Block 2: Reference Documents

> **Sessions:** 1 | **Batches:** OS-B2.1 | **Source:** BUILD-PLAN.md Block 2

---

## OS-B2.1: Reference Documentation (8 docs)

### Scope
Write all new reference and methodology documents. These establish the knowledge base that agents and the runtime reference during builds.

### Documents to Write

**1. `docs/ECOSYSTEM-INTEL.md`**
Full triage of 12+ discoveries from ecosystem research. Each entry: what it is, what's relevant, what to extract, what to skip, risk level. Sources: Pretext, Trail of Bits, UI UX Pro Max, Antigravity, Ruflo, wshobson/agents, Rosehill, LightRAG, n8n-MCP, Anthropic Plugins, Ecosystem Index, Claude Agent SDK.

**2. `docs/DESIGN-INTELLIGENCE.md`**
UI UX Pro Max rules adapted for relevance. 161 industry reasoning rules distilled. 99 UX guidelines mapped to Mara/Riven evaluation criteria. Anti-pattern database for pre-delivery checks. Color palettes and font pairings as reference. Pre-delivery checklist integrated with Build Triad gates.

**3. `docs/ECOSYSTEM-PATTERNS.md`**
Ruflo token optimization (4-layer stacking). Self-learning loop (RETRIEVE->JUDGE->DISTILL->CONSOLIDATE->ROUTE). Anti-drift patterns (detection + prevention). Antigravity skill format analysis. Rosehill patterns (turnstile context routing, agent junction, workspace model).

**4. `docs/PRETEXT-INTEGRATION-PLAN.md`**
Full layout engine architecture: OS-level primitive, hybrid DOM+Canvas rendering, document generation engine, `/init` scaffolding for projects, dual-output (markdown + PDF). Covers: prepare.ts, measure.ts, fit.ts, canvas.ts, virtual.ts, pdf.ts. Maps to OS-ADL-001, OS-ADL-002, OS-ADL-010, OS-ADL-011.

**5. `docs/N8N-INTEGRATION.md`**
n8n as Tier 4 MCP (deferred to project-level activation). 1,396 nodes categorized by relevance. Installation + Claude Code MCP config. When to activate, what workflows to build first. Not part of OS core — available as project-level enhancement.

**6. `docs/LIGHTRAG-INTEGRATION.md`**
Knowledge graph architecture. LightRAG setup (pip install lightrag-hku). MCP bridge (22 tools). Storage decisions (local vs cloud). Indexing strategy (what gets indexed, what doesn't). Query modes (hybrid/local/global). Maps to OS-ADL-004.

**7. `forge/RECOMMENDED-TECHNOLOGIES.md`**
Pretext: Tier 1 (core OS primitive + project recommendation when customer-facing surfaces detected). n8n: Tier 4 (deferred, project-level). LightRAG: Tier 2 (OS infrastructure, project-level indexing). Trail of Bits patterns: Tier 2 (integrated into Tanaka). UI UX Pro Max: Tier 2 (integrated into Mara/Riven).

**8. `forge/MODEL-TIERING.md`**
Agent classification with rationale. Opus tier: Nyx, Pierce, Tanaka (architecture, judgment, security). Sonnet tier: Kehinde, Mara, Riven, Calloway, Voss, Vane, Sable (implementation, review, domain expertise). Haiku tier: sub-agents, utility commands, formatting. Maps to OS-ADL-006.

### Exit Gate
- All 8 documents written with real content (no placeholders)
- Each doc references relevant OS-ADL entries
- Cross-references between docs are accurate
- Pushed to GitHub: "Reference documentation complete"

---
