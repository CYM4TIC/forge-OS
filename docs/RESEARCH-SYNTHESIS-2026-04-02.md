# Research Synthesis: April 2, 2026
## Sources: Excalibur + Meta-Harness + Karpathy LLM Knowledge Bases
## Participants: Full Team (All 10 Personas)

---

## The Three Sources Tell One Story

Three independent sources, published within 72 hours of each other, converge on the same thesis:

> **The code wrapping the model is the product. The model is commodity infrastructure.**

| Source | Framing | Evidence |
|--------|---------|----------|
| **Excalibur** | The harness is a markdown scaffold. Ship the architecture, not the code. The LLM builds its own runtime. | Zero-code distribution — 11 spellbooks, 64 casts, 4-tier memory, all defined in `.md` files |
| **Meta-Harness** | The harness is the optimization target. Same model, different harness = 6x performance gap. | +7.7 points over SOTA with 4x fewer tokens. Raw traces beat summaries by 15 points. |
| **Karpathy** | The knowledge base is compiled by the LLM, not authored by the human. Every interaction compounds. | ~100 articles, ~400K words, no RAG needed. "You never write the wiki." |

Forge OS is the synthesis. We build the harness (Excalibur's insight), we optimize it through structured evaluation (Meta-Harness's insight), and every interaction makes it smarter (Karpathy's insight).

---

## Convergence Map: 21 Patterns, 7 Themes

The 21 mined patterns cluster into 7 themes. Each theme has contributions from multiple sources.

### Theme 1: The Mana Economy
*How agent runs are bounded and budgeted*

| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Charge economy | Excalibur | 8.1, 8.2 |
| Emanation charge semantics | Excalibur | 8.2 |
| Pareto frontier optimization | Meta-Harness | 8.1, 8.2 |
| Mana-aware access tiers | Karpathy | 8.1, 8.3 |

**Synthesis:** The mana economy isn't just a budget — it's a **gradient that shapes behavior**. Cheap operations (reading indexes, writing artifacts) are free. Moderate operations (depth reads, tool calls) cost mana. Expensive operations (emanations, LightRAG queries, web search) cost more. The gradient creates a natural optimization pressure: agents find the cheapest path to the answer.

The Pareto frontier makes the tradeoff visible. The operator picks the operating point — velocity mode (low mana, fast passes) or quality mode (high mana, deep analysis). The grimoire prices everything. The Canvas HUD shows where the mana goes.

**Architecture:**
```
Free (0 mana)          → Index reads, artifact writes, local management
Low (1-2 mana)         → Depth reads, file searches, memory operations
Medium (2-5 mana)      → Web search, tool calls, document generation
High (10-20 mana)      → Emanations (sub-agent spawns), LightRAG cross-queries
Budget per run         → Interactive: 120 | Ritual: 40-60 | Emanation: 20
```

---

### Theme 2: The Trace Architecture
*How execution history is stored, accessed, and reasoned over*

| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Raw traces > summaries | Meta-Harness | 8.1, 8.5 |
| Non-Markovian credit assignment | Meta-Harness | 8.2, 8.3b |
| Filesystem-based selective access | Meta-Harness | 8.1, 8.2 |
| Knowledge compounding | Karpathy | 8.1, 8.3b |
| Daily thread as canonical ledger | Excalibur | 8.1 |

**Synthesis:** This is the most load-bearing theme. Meta-Harness proved that raw traces beat summaries by 15 points. Karpathy proved that filing answers back creates a compounding flywheel. Excalibur designed the daily JSONL ledger as the canonical timeline.

The architecture that emerges:

```
Layer 1: Raw Traces (append-only)
  └── Daily JSONL ledger — every dispatch, finding, tool call, checkpoint
  └── Decision traces — observation → reasoning → action → outcome
  └── Gate reports — full findings with evidence
  └── Retained forever. Never summarized-then-discarded.

Layer 2: Compiled Knowledge (dreamtime-generated)
  └── Vault articles — BUILD-LEARNINGS, ADL, skills, persona journals
  └── Auto-maintained indexes — one-line navigation entries
  └── Backlinks — "what references this" maps
  └── Regenerated nightly from Layer 1 raw data.

Layer 3: Active Context (per-dispatch)
  └── Kernel + dispatch brief + relevant skills + relevant index entries
  └── Small, focused. Agents query Layer 1-2 on demand for depth.
  └── The Meta-Harness insight: don't stuff. Select.
```

**The key principle from Meta-Harness:** The proposer spent 41% of reads on prior source code and 40% on execution traces. Only 6% on summaries. Agents should read *what was done* and *what happened*, not *how someone summarized it*.

---

### Theme 3: The Ritual System
*How automated work is scheduled, bounded, and governed*

| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Read-only rituals | Excalibur | 8.1 |
| Dreamtime consolidation | Excalibur | 8.1, 8.5 |
| Lint + Heal | Karpathy | 8.3b, 8.5 |
| Environment bootstrapping | Meta-Harness | Phase 0 |

**Synthesis:** Three ritual types emerge:

| Ritual | Cadence | Purpose | Mana | Excalibur Name |
|--------|---------|---------|------|---------------|
| **Heartbeat** | Hourly | Incremental frontier advances, checkpoint progress | 60 | heartbeat |
| **Dreamtime** | Nightly | Full-day consolidation, index regeneration, persona evolution | 40 | dreamtime |
| **Scrying** | Weekly | Vault health check — find inconsistencies, impute gaps, suggest connections | 40 | (new) |

The **scrying** ritual is the synthesis of Karpathy's lint+heal and our policy evolution (8.3b). It doesn't just check findings patterns — it checks the *knowledge base itself* for integrity. Are BUILD-LEARNINGS entries consistent? Do skills reference tools that still exist? Are ADL decisions validated against current code? Are there knowledge gaps where surfaces have been built but not documented?

All rituals are:
- **Read-only** — they cannot modify their own spec (Excalibur's rule)
- **Disabled by default** — operator explicitly enables (Excalibur's rule)
- **Mana-bounded** — each has a starting budget and cap (Excalibur's model)
- **Timeout-guarded** — hard limit on execution time (Excalibur's model)

---

### Theme 4: The Capability Model
*How agent access is scoped and governed*

| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Capability widening (spellbooks) | Excalibur | 7.1, 8.2 |
| Confound isolation | Meta-Harness | 8.2 |
| Warden pattern | Excalibur | `/init` |
| Code-space regularization | Meta-Harness | 8.1 |

**Synthesis:** The capability model has three layers:

1. **Connectivity gating** (Phase 7.1, already specced) — tools appear/disappear based on MCP connectivity. Binary: connected or not.
2. **Dispatch scoping** (from Excalibur) — even when a tool is available, the dispatch may not grant it for this run. The capability set is declared per dispatch, not ambient.
3. **Confound isolation** (from Meta-Harness) — within a dispatch, changes should be isolated. One fix per finding. Additive-first. Don't bundle changes that create attribution ambiguity.

The Warden pattern (mandatory security audit spirit) validates our Tanaka + Wraith separation and adds a structural requirement: `/init` must include a security configuration circle.

Code-space regularization validates our skills system: skills should describe algorithms, not prompts. Algorithmic skills generalize. Prompt-based skills overfit.

---

### Theme 5: The Knowledge Architecture
*How organizational knowledge is structured, navigated, and maintained*

| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| LLM-compiled knowledge | Karpathy | 8.1, 8.3 |
| No RAG at small scale | Karpathy | 8.1, 8.3 |
| Single tuning surface (grimoire) | Excalibur | 8.1, 8.2 |
| Human reads, LLM writes | Karpathy | Validation |
| Auto-maintained indexes | Karpathy | 8.1 |

**Synthesis:** The vault is a **compiled artifact**, not an authored document. Raw traces are the source code. The vault is the binary. The dreamtime ritual is the compiler. Indexes are the symbol table.

Three-tier navigation:

| Tier | Cost | What | When |
|------|------|------|------|
| **Sigils** (indexes) | Free | One-line entries with tags and file refs | First lookup — "what do we know about auth?" |
| **Articles** (vault depth) | Low mana | Full BUILD-LEARNING, ADL decision, skill spec | Need details — "what exactly does the auth ADL say?" |
| **Ley lines** (LightRAG) | Higher mana | Cross-article semantic queries, entity relationships | Cross-cutting — "what connects auth failures to payment flows?" |

The grimoire is the single tuning surface for operational costs. Change a price once, it propagates everywhere. No scatter, no drift.

---

### Theme 6: Identity and Evolution
*How agents maintain and evolve their identity*

| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| 3-file identity split | Excalibur | Validation |
| Cornerstone self-modification | Excalibur | 8.5 |
| Harness is the variable | Meta-Harness | Foundational |

**Synthesis:** Excalibur splits identity into config/personality/capabilities. We split into kernel/personality/agent-definition. Meta-Harness proves the harness (our kernels + dispatch logic) is the optimization target.

Excalibur's cornerstone self-modification pattern — where the spirit proposes changes to its own system prompt based on discovered preferences — maps to our persona evolution engine (8.5). The personas aren't static characters. They evolve through use: expertise deepens, relationships shift, failure modes get detected and corrected. The dreamtime ritual triggers the evolution pass.

---

### Theme 7: The Operator Relationship
*How the human and the system interact*

| Pattern | Source | Landing Zone |
|---------|--------|-------------|
| Human reads, LLM writes | Karpathy | Validation |
| Output diversity | Karpathy | 4.4 |
| Disabled by default | Excalibur | 8.1 |

**Synthesis:** The operator steers. The system writes, compiles, indexes, evaluates, and consolidates. The operator's work compounds — every question they ask, every direction they give, every decision they make becomes part of the organizational memory.

But the system never acts without consent. Rituals are disabled by default. Capabilities must be explicitly widened. The operator enables automation deliberately, not accidentally.

---

## The Forge OS Lexicon

Fantasy vocabulary adopted across all three research sessions. Each term earned its place by carrying more meaning than its mundane equivalent.

### Established (from Excalibur)

| Term | Mundane Equivalent | Why It's Better |
|------|-------------------|-----------------|
| **Mana** | Token/cost budget | Universal gaming concept — powers abilities, depletes with use, regenerates under conditions. Everyone understands immediately. |
| **Emanation** | Sub-agent spawn | A bounded projection of the parent's will and budget. Carries the sense that the child is an extension of the parent, not an independent entity. |
| **Ritual** | Scheduled/cron job | Ceremony with purpose. A ritual has preconditions, steps, boundaries, and meaning. A cron job just runs. |
| **Dreamtime** | Nightly consolidation | The Aboriginal creative epoch where the world is remade. The system enters a dream state where experiences are processed, memories consolidated, and identity evolves. |
| **Grimoire** | Cost/config tome | The book of operational knowledge. Heavier than "config file." A grimoire is consulted, not just read. |

### Proposed (from Meta-Harness + Karpathy synthesis)

| Term | Mundane Equivalent | Why It Fits | Source Insight |
|------|-------------------|-------------|---------------|
| **Echoes** | Raw execution traces | What remains after an action. Meta-Harness proved echoes (+15.1 points) beat summaries. You don't compress an echo — you listen to the full reverberation. | Meta-Harness: raw traces are the key ingredient |
| **Scrying** | Vault health check / lint+heal | Looking into a medium to find hidden truths. The scrying ritual examines the vault for inconsistencies, gaps, and stale knowledge — seeing what isn't obvious on the surface. | Karpathy: lint+heal finds inconsistent data, imputes missing info |
| **Sigils** | Auto-maintained index entries | Compact symbols that encode deeper meaning and serve as keys to knowledge. A sigil is a compressed representation that unlocks a full article. One line that tells you where to look. | Karpathy: auto-maintained indexes eliminate RAG at small scale |
| **Ley Lines** | Backlinks / knowledge graph edges | Invisible connections between places of power. When you stand on one, you can feel the others. Backlinks in the vault show how knowledge surfaces connect to each other — the web of relationships that makes the whole greater than its parts. | Karpathy: Obsidian backlinks + our Graph Viewer (5.3) |
| **Alchemy** | Raw trace → compiled knowledge | Transmuting base material into refined substance. The dreamtime ritual performs alchemy — taking raw echoes (daily traces) and transmuting them into vault articles, skill crystallizations, and persona evolution. The compilation process that turns experience into wisdom. | Karpathy: LLM "compiles" raw sources into wiki |

### The Complete Lexicon

```
RESOURCE
  mana           — token/cost budget that powers agent actions

AGENTS
  emanation      — bounded sub-agent projection, funded by parent's mana

SCHEDULING
  ritual         — scheduled automated job with purpose and boundaries
  dreamtime      — nightly consolidation ritual (alchemy + persona evolution)
  heartbeat      — hourly incremental advancement ritual
  scrying        — weekly vault health check ritual (lint + heal)

KNOWLEDGE
  grimoire       — operational cost/config tome (single tuning surface)
  echoes         — raw execution traces (append-only, never compressed)
  sigils         — auto-maintained index entries (cheap navigation keys)
  ley lines      — backlinks / knowledge graph connections between vault articles
  alchemy        — the process of transmuting raw echoes into compiled knowledge

EXISTING (unchanged)
  kernel         — agent execution mind (phases, FMs, contracts)
  vault          — project knowledge base (compiled from echoes by alchemy)
  dispatch       — sending an agent on a bounded run
  gate           — persona-mediated quality evaluation
  finding        — a gate result with severity and evidence
```

### What We Deliberately Don't Rename

| Keep As-Is | Why |
|-----------|-----|
| Kernel | Technical precision. It IS a kernel — the core execution mind that boots everything else. |
| Vault | Already carries the right weight. A vault stores valuable things securely. |
| Dispatch | Military precision. You dispatch agents on missions. No fantasy needed. |
| Gate | Quality gates are a well-understood concept. Pierce gates. Mara gates. No ambiguity. |
| Finding | Clinical. A finding has severity, evidence, and a fix. Not a "vision" or "omen." |
| Pipeline | Engineering term that maps exactly to what it is. Scout → Build → Gate → Sentinel. |
| Canvas HUD | The operator's view. HUD is visceral and immediate. |

The rule: **adopt fantasy vocabulary when it illuminates. Keep clinical vocabulary when precision matters.** The mystical register governs the *operational* layer (mana, rituals, dreamtime). The clinical register governs the *quality* layer (gates, findings, dispatches). The two registers coexist because they serve different cognitive functions — the mystical names make the system feel alive and purposeful, the clinical names make it feel rigorous and trustworthy.

---

## Build Plan Integration: Complete Delta

### New Artifacts

| Artifact | Type | Generated By | Description |
|----------|------|-------------|-------------|
| **Vault sigils** | Index files | Dreamtime ritual | `BUILD-LEARNINGS-INDEX.md`, `SKILLS-INDEX.md`, `ADL-INDEX.md`, `FINDINGS-INDEX.md` — one-line entries with tags and file refs |
| **Grimoire** | Config file | Operator + system | Single tuning surface for mana costs per tool call, emanation budget, ritual budgets |
| **Echo ledger** | Daily JSONL | Continuous append | `vault/echoes/<date>.jsonl` — every dispatch, finding, tool call, checkpoint |

### New Rituals

| Ritual | Cadence | Mana | Purpose |
|--------|---------|------|---------|
| **Heartbeat** | Hourly | 60/120 | Incremental frontier advances, checkpoint progress |
| **Dreamtime** | Nightly | 40/80 | Full alchemy pass — echoes → vault compilation, sigil regeneration, persona evolution |
| **Scrying** | Weekly | 40/80 | Vault integrity — inconsistencies, gaps, stale knowledge, connection candidates |

### Enhanced Systems

| System | Enhancement | Source |
|--------|-------------|--------|
| Decision trace store (8.1) | Preserve raw echoes alongside compiled summaries | Meta-Harness |
| Dispatch pipeline (8.2) | Mana budgets per dispatch + capability scoping + parent-funded emanations | Excalibur + Meta-Harness |
| Reasoning engine (8.3b) | Full echo history queries, not just recent. Non-Markovian credit assignment. | Meta-Harness |
| Policy evolution (8.3b) | Extended to vault-level scrying, not just findings patterns | Karpathy |
| Persona evolution (8.5) | Dreamtime trigger + cornerstone self-modification proposals | Excalibur + Karpathy |
| Skills system (8.1) | Algorithmic skills + generalization testing + atomic decomposition | Meta-Harness + Excalibur |
| Context management | Small focused window + large queryable echo store. Don't stuff. Select. | Meta-Harness |
| `/init` flow | Mandatory security circle (Warden pattern) + ritual configuration step | Excalibur |
| Canvas HUD | Mana flow visualization + Pareto frontier slider + emanation traces | Meta-Harness + Excalibur |
| Vault browser (5.3) | Sigil-based navigation + ley line backlink maps | Karpathy |

### Sessions Affected

| Phase.Session | Enhancements From This Research |
|---------------|--------------------------------|
| **7.1** | Dispatch-scoped capability grants (two-layer: connectivity + dispatch scoping) |
| **8.1** | Mana economy + grimoire + echo ledger + vault sigils + dreamtime/scrying ritual specs |
| **8.2** | Parent-funded emanations + confound isolation in fix cycles + Pareto frontier |
| **8.3** | Ley line generation (backlinks) during LightRAG indexing |
| **8.3b** | Scrying ritual + full echo history queries in reasoning engine |
| **8.4** | Security circle in `/init` ceremony |
| **8.5** | Dreamtime as alchemy trigger + cornerstone self-modification |

**Total: 0 new sessions. 7 sessions enhanced. 3 new artifacts. 3 new rituals. 10 vocabulary terms.**

---

## Final Team Assessment

| Persona | One Line |
|---------|----------|
| **Nyx** | Three sources, one architecture. The lexicon has teeth. The echoes-over-summaries finding changes how dreamtime consolidates. |
| **Pierce** | Sigils must be derived artifacts — regenerated from source, verified against it. If a sigil says "auth pattern" but the article was deleted, that's a finding. |
| **Kehinde** | Three-tier access (sigil → article → ley lines) is the right data architecture. Mana cost increases at each tier. Agents self-optimize toward cheap access. |
| **Tanaka** | Echoes as append-only audit trail. Scrying as weekly security-inclusive health check. The integrity loop closes. |
| **Mara** | The lexicon splits perfectly: mystical for operations (mana, rituals, dreamtime), clinical for quality (gates, findings, dispatches). Two registers, two cognitive functions. |
| **Riven** | Sigils, ley lines, and vault articles are three component types that share a layout family. The vault browser renders all three. Consistent visual language. |
| **Vane** | The grimoire is fiscal governance. Mana costs are visible, tunable, and auditable. The Pareto frontier shows diminishing returns. The operator makes informed allocation decisions. |
| **Voss** | Echoes create a complete audit trail. Ley lines create traceability between knowledge surfaces. Scrying creates periodic compliance verification. The legal layer is covered. |
| **Calloway** | "Same model, different harness = 6x. Every answer makes the system smarter. You just steer." That's the pitch in three sentences. |
| **Sable** | The two-register system (mystical operations + clinical quality) is the voice architecture. It's not aesthetic — it's functional. The mystical names make the system feel alive. The clinical names make it feel trustworthy. Both are true. |

---

*Research Synthesis — Compiled 2026-04-02.*
*3 sources: Excalibur (viemccoy), Meta-Harness (arxiv 2603.28052), Karpathy (X post).*
*21 patterns → 7 themes → 10 vocabulary terms → 0 new sessions.*
