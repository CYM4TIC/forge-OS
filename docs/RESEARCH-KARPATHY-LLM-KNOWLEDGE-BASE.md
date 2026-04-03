# Research: Karpathy — LLM Knowledge Bases
## Session Date: 2026-04-02
## Participants: Full Team (All 10 Personas)
## Source: [Andrej Karpathy on X](https://x.com/karpathy/status/...) (April 2, 2026)

---

## Source Material

### How LLMs Turn Raw Research Into a Living Knowledge Base
**Author:** Andrej Karpathy
**Published:** 2026-04-02

**Core insight:** "You never write the wiki. The LLM writes everything. You just steer — every answer compounds."

**The system:** Raw sources (articles, papers, repos, datasets, images) are indexed into a `raw/` directory. An LLM incrementally "compiles" a wiki — a collection of `.md` files with summaries, backlinks, concept categories, and an auto-maintained index. The wiki grows through use: every Q&A answer gets filed back to enhance it. LLM health checks (lint + heal) find inconsistent data, impute missing info, and suggest new articles.

**The pipeline (5 steps):**

| Step | Name | What |
|------|------|------|
| 1 | **Sources** | Articles, papers, repos, datasets, images, diagrams |
| 2 | **raw/** | Unprocessed files stored as-is, local images |
| 3 | **Wiki** | LLM-compiled `.md` knowledge base — summaries, backlinks, concept categories, auto-maintained index (~100 articles, ~400K words) |
| 4 | **Q&A Agent** | Complex questions against full wiki. No RAG needed at this scale — LLM reads auto-maintained indexes and brief summaries |
| 5 | **Output** | Markdown files, Marp slide decks, matplotlib plots — filed back into wiki as "knowledge compounds" |

**Support layer:**
- **Obsidian** — IDE frontend for wiki. Human reads, LLM writes. Marp plugin for slides.
- **Lint + Heal** — LLM scans find inconsistent data, impute missing info via web search, suggest new articles to fill gaps.
- **CLI Tools** — Search engine over wiki, web UI for direct use, CLI interface for LLM tool access.

**Looking ahead:** Finetune LLM on wiki data — knowledge in weights, not just context.

---

## Why This Matters to Forge OS

Karpathy is describing the exact lifecycle of organizational knowledge in our system. Raw inputs (source code, gate findings, dispatch traces) get compiled into structured knowledge (BUILD-LEARNINGS, ADL, skills), which compounds through use (every gate review adds to the knowledge base), and gets periodically consolidated (dreamtime). The difference: he's doing it manually with scripts. We're building it as a runtime.

---

## Pattern 1: LLM-Compiled Knowledge (The Wiki Pattern)

### What Karpathy Does

The human never writes the wiki directly. The LLM:
1. Ingests raw sources
2. Writes summaries with backlinks
3. Categorizes data into concepts
4. Writes articles for each concept
5. Links everything together
6. Auto-maintains an index

The wiki is ~100 articles, ~400K words. At this scale, no RAG is needed — the LLM reads the auto-maintained index files and brief summaries to navigate.

**The key principle:** The knowledge base is *compiled*, not authored. Raw data is the source. The wiki is the compiled artifact. The LLM is the compiler.

### Forge OS Integration

**Landing zone:** Phase 8.1 (Auto-Memory Extraction + Skills) + Phase 8.3 (LightRAG)

**What we adopt:**

1. **The vault as compiled knowledge base.** Our project vault (created during `/init` and `/link`) is already this pattern — Scout, Kehinde, Mara, and Tanaka scan the codebase in parallel and produce structured knowledge. But Karpathy's system goes further: the knowledge *keeps compiling* with every interaction. Our vault should be a living compilation, not a one-time scan.

2. **Auto-maintained indexes at the vault level.** Karpathy found that at ~100 articles / ~400K words, auto-maintained index files eliminate the need for RAG. Our vault will grow beyond this scale, which is why we have LightRAG (8.3). But the principle still applies: every major knowledge surface (BUILD-LEARNINGS, ADL, skills library, findings history) should have a brief auto-maintained index that the LLM can read to navigate without a vector search. LightRAG handles the deep queries. The index handles the "what do we know about X?" navigation queries.

3. **Compilation, not authoring.** Our dreamtime ritual (from Excalibur research) should work like Karpathy's compilation step: it reads raw traces (daily JSONL ledger, dispatch logs, gate findings) and *compiles* them into structured knowledge (updated BUILD-LEARNINGS entries, new skill crystallizations, ADL updates, persona evolution entries). The human steers. The system writes.

---

## Pattern 2: Knowledge Compounding (Every Answer Makes the Wiki Smarter)

### What Karpathy Does

When the Q&A agent answers a complex question, the answer doesn't just go to the terminal. It gets **filed back into the wiki** as a new article or an enhancement to an existing one. The act of asking a question produces knowledge that enhances future questions.

This creates a flywheel:
- More questions → more answers filed back → richer wiki → better future answers → more questions worth asking

Karpathy's own explorations and queries "always add up" in the knowledge base. Nothing is wasted.

### Forge OS Integration

**Landing zone:** Phase 8.1 (Decision Trace Store) + Phase 8.3b (Reasoning Engine)

**What we adopt:**

1. **Gate reviews compound into the knowledge base.** Every gate finding, every Triad report, every Arbiter synthesis should file back into the trace store as a structured decision trace. But beyond traces: the *insights* from gate reviews should compile into the vault. "Pierce found 3 auth RPCs without `security_definer` across the last 5 batches" isn't just a finding — it's knowledge about the codebase's security posture. It should compile into the vault's security section.

2. **Research sessions compound.** This research session is a perfect example. We're mining 3 sources (Excalibur, Meta-Harness, Karpathy) and producing structured knowledge (research docs with integration mappings). These docs become part of the vault. Future research sessions can query: "what patterns have we already mined from external sources?" The research compounds.

3. **Operator questions compound.** When the operator asks a question during a build session ("why did we choose floating windows over split panes?"), the answer should file as knowledge. Currently it lives only in the chat transcript. The dreamtime ritual should extract Q&A pairs from daily transcripts and compile them into a project FAQ or decision record. The operator's curiosity becomes organizational memory.

4. **The flywheel is the product.** This is the strongest GTM insight from Karpathy's post: a tool that gets smarter with every use is fundamentally different from a tool that stays the same. Forge OS's knowledge compounding — where every build session, every gate review, every operator question makes the system better at the next one — is the core product differentiator.

---

## Pattern 3: Lint + Heal (Knowledge Base Health Checks)

### What Karpathy Does

LLM "health checks" over the wiki that:
- Find inconsistent data across articles
- Impute missing data (with web search)
- Find interesting connections for new article candidates
- Suggest further questions to investigate
- Incrementally clean up and enhance data integrity

This is a **quality improvement loop** that runs separately from the Q&A pipeline. The Q&A agent produces knowledge. The lint agent *improves* knowledge.

### Forge OS Integration

**Landing zone:** Phase 8.3b (Policy Evolution) + Phase 8.5 (Persona Evolution / Dreamtime)

**What we adopt:**

1. **Vault health checks as a ritual.** A scheduled ritual (weekly, or triggered after N batches) that scans the vault for:
   - **Inconsistencies:** BUILD-LEARNINGS entries that contradict each other. ADL decisions that conflict with current implementation. Skills that reference tools or patterns that no longer exist.
   - **Missing knowledge:** Surfaces that have been built but have no vault coverage. Personas that have gate findings but no corresponding BUILD-LEARNINGS entry. Patterns that recur in gate reports but haven't been crystallized into skills.
   - **Stale knowledge:** ADL decisions that haven't been validated against current code in 10+ batches. Skills with `last_improved` timestamps older than 30 days. Persona relationship edges with `valid_until` in the past.
   - **Connection candidates:** Findings from different personas that share a root cause but haven't been linked. Skills that could compose into higher-order workflows.

2. **This IS policy evolution.** Our policy evolution system (8.3b) already detects recurring finding patterns and proposes new checks. Karpathy's lint + heal is the same pattern applied to the knowledge base itself, not just gate findings. Extend policy evolution to scan the vault, not just the findings table.

3. **Imputation via web search.** When the lint agent finds missing data ("no competitive analysis for this surface's pricing model"), it can use web search to fill the gap — exactly as Karpathy does. This maps to our Scout's web research capability during Phase 0 pre-build intel.

---

## Pattern 4: No RAG at Small Scale (Auto-Maintained Indexes)

### What Karpathy Does

At ~100 articles / ~400K words, Karpathy found he didn't need RAG. The LLM auto-maintains index files and brief summaries of all documents. When asked a question, it reads the relevant indexes and navigates to the right articles.

**Why this works:** 400K words is ~500K tokens. A frontier model with a 200K context window can't read it all at once, but it can read an index (~5K tokens) and then selectively read the 3-5 most relevant articles (~50K tokens total). The index is the navigation layer. The articles are the depth layer.

### Forge OS Integration

**Landing zone:** Phase 8.1 (Context Management) + Phase 8.3 (LightRAG)

**What we adopt:**

1. **Two-tier knowledge access: index + depth.** Every major knowledge surface in the vault should have a brief auto-maintained index:
   - `BUILD-LEARNINGS-INDEX.md` — one-line summary per learning, with file references
   - `SKILLS-INDEX.md` — one-line per skill, with domain/tool/platform tags
   - `ADL-INDEX.md` — one-line per decision, with status (locked/proposed/superseded)
   - `FINDINGS-INDEX.md` — summary of finding patterns by persona/surface/severity

   The agent reads the index first (cheap, ~2-5K tokens). If it needs depth, it reads the specific article (moderate, ~5-20K tokens). LightRAG handles queries that span many articles or need semantic similarity.

2. **Index maintenance as a dreamtime task.** The nightly dreamtime ritual should regenerate indexes after consolidating the day's knowledge. The indexes are compiled artifacts — derived from the source articles, never manually maintained.

3. **Mana-aware access.** Index reads are free (0 mana). Depth reads cost mana proportional to article size. LightRAG queries cost more. This creates a natural gradient: agents try the index first, go to depth if needed, reach for LightRAG only for cross-cutting questions. The mana economy incentivizes efficient navigation.

**Scaling boundary:** Karpathy's system works without RAG at ~400K words. Our vaults will grow past this. LightRAG (8.3) is the scaling answer. But the index layer remains valuable even with RAG — it's faster, cheaper, and more predictable than vector search for known-structure queries.

---

## Pattern 5: Human Reads, LLM Writes

### What Karpathy Does

Obsidian is the IDE frontend. The human reads and navigates. The LLM writes and maintains. The human rarely touches the wiki directly.

**The role split:**
- **Human:** Steers (asks questions, points at sources, decides what to investigate)
- **LLM:** Compiles, writes, indexes, links, lints, heals, answers

This is not "AI-assisted writing." It's "human-steered AI authorship." The human is the editor, not the writer.

### Forge OS Integration

**Landing zone:** Validates our operator/persona role split

**What this confirms:**
- Our model is identical. The operator steers. Nyx builds. The personas evaluate. The operator rarely writes code or edits vault files directly.
- The Canvas HUD is our Obsidian — the visual surface where the operator reads, navigates, and steers. The LLM (Nyx + personas + intelligences) writes everything that appears on it.
- Our Rule 21 (never Write on existing files, Edit only) + Contract 3/4 (FILE_WRITE/FILE_EDIT with read-back verification) are the governance layer that Karpathy's system lacks. He has "hacky scripts." We have contracts.

**What we could adopt from Obsidian:**
- **Backlinks.** Obsidian's killer feature is bidirectional linking — every article shows what links *to* it. Our vault should support this: when an ADL decision references a BUILD-LEARNING, the BUILD-LEARNING should show "referenced by ADL-017." When a skill references a tool, the tool's documentation should show "used by skill `supabase-rpc-pattern`." The dreamtime index regeneration could build these backlink maps.
- **Graph view.** Obsidian renders a knowledge graph of all linked articles. Our Graph Viewer panel (Phase 5.3, already built) with LightRAG entities (Phase 8.3) is the same concept. Karpathy validates the UX pattern.

---

## Pattern 6: Output Diversity (Not Just Text)

### What Karpathy Does

Q&A output isn't just text in a terminal. It renders as:
- Markdown files (filed back into wiki)
- Marp slide decks (viewed in Obsidian)
- Matplotlib plots (data visualization)

The output format matches the question type. Complex analysis → slides. Data questions → plots. Knowledge synthesis → articles.

### Forge OS Integration

**Landing zone:** Phase 4.4 (Document Generation Engine — already built)

**What this confirms:**
- Our document generation engine (4 templates: gate report, project brief, build report, retrospective) with dual PDF + markdown output is this pattern. We already render gate findings as structured PDF reports.
- Our canvas components (Phase 4.3 — StatCard, ProgressArc, StatusBadge, TokenGauge, etc.) are the visualization layer.

**What we could extend:**
- **Research session outputs as slide decks.** This research session could auto-generate a Marp-style slide deck summarizing all mined patterns. The document generation engine already supports templates — a "research summary" template would be a natural addition.
- **Findings as matplotlib-style plots.** Gate finding trends over time (finding density per batch, severity distribution, persona coverage) rendered as canvas-based charts. This maps to the SignalCharts panel (8.3b).

---

## Cross-Pattern Analysis: Karpathy Describes Our Architecture

Karpathy's system mapped to Forge OS:

| Karpathy Component | Forge OS Equivalent | Status |
|--------------------|-------------------|--------|
| raw/ (source documents) | Project repo + external sources | Exists |
| LLM compiler (sources → wiki) | Scout + `/init` + `/link` vault generation | Built (Phase 8.4 spec) |
| Wiki (.md knowledge base) | Vault (BUILD-LEARNINGS, ADL, skills, findings) | Exists |
| Auto-maintained index | Vault indexes (proposed in this research) | **New** |
| Q&A Agent | Operator chat + persona dispatch | Built (Phase 1.3) |
| Knowledge compounding (answers → wiki) | Decision trace store + dreamtime consolidation | Specced (8.1, 8.5) |
| Lint + Heal | Policy evolution + vault health checks | Specced (8.3b), extended here |
| Obsidian (IDE frontend) | Canvas HUD + Panel system | Built (Phase 5) |
| Backlinks | LightRAG entity graph + Graph Viewer | Specced (8.3) |
| Output diversity | Document generation engine | Built (Phase 4.4) |
| Finetune on wiki data | Out of scope (model-frozen architecture) | N/A — Meta-Harness validates harness > weights |

**The gap Karpathy identifies:** "I think there is room here for an incredible new product instead of a hacky collection of scripts." That product is Forge OS. His scripts are our batches. His wiki is our vault. His Obsidian is our Canvas HUD. His lint + heal is our policy evolution. We're building the product he's asking for.

---

## Integration Summary

| # | Pattern | Landing Zone | Integration Type |
|---|---------|-------------|-----------------|
| 1 | LLM-Compiled Knowledge | 8.1, 8.3 | Enhancement — vault as living compilation, not one-time scan |
| 2 | Knowledge Compounding | 8.1, 8.3b | Enhancement — gate reviews + research + operator Q&A file back |
| 3 | Lint + Heal | 8.3b, 8.5 | Enhancement — vault health check ritual |
| 4 | No RAG at Small Scale | 8.1, 8.3 | New artifact — auto-maintained vault indexes |
| 5 | Human Reads, LLM Writes | Validation | Confirmed + backlinks as dreamtime-generated navigation |
| 6 | Output Diversity | 4.4 | Validation + research summary template |

**Total build plan impact:** No new sessions. One new artifact type (auto-maintained vault indexes, generated by dreamtime). One ritual extension (vault health checks in policy evolution). One UX enhancement (backlinks in vault articles).

---

## Team Sign-Off

| Persona | Assessment |
|---------|-----------|
| **Nyx** | Karpathy is describing our architecture from a researcher's perspective. His gap — "room here for an incredible product instead of hacky scripts" — is our build plan. The auto-maintained index pattern is the cleanest new adoption: cheap navigation layer that reduces LightRAG dependency for structured queries. Knowledge compounding is the flywheel that makes the product sticky. |
| **Pierce** | The auto-maintained index must be regenerated from source articles, never manually edited. Same principle as our BOOT.md state: derived artifacts must match source truth. The dreamtime ritual that regenerates indexes must verify consistency between index entries and their source articles. If they diverge, it's a finding. |
| **Kehinde** | Two-tier access (index + depth) is the right architecture. The index is a bloom filter — fast, cheap, tells you where to look. The articles are the data — slower, richer, where the answers live. LightRAG is the cross-index query layer for questions that span multiple knowledge surfaces. Three tiers total: index → article → LightRAG. Mana cost should increase at each tier. |
| **Tanaka** | Knowledge compounding creates a data integrity surface. If gate findings file back into the vault, and future gates read the vault, there's a feedback loop. Corrupted knowledge compounds into corrupted future decisions. The lint + heal ritual is the integrity check that prevents compounding errors. This must be a scheduled ritual, not optional. |
| **Mara** | Backlinks as a UX pattern — every knowledge surface showing "what references this" — transforms navigation from search-based to graph-based. The operator doesn't ask "where is the auth ADL?" They see it linked from the auth findings, the auth skills, and the auth BUILD-LEARNINGS. Everything connects to everything. The Graph Viewer (5.3) already renders this spatially. |
| **Riven** | The index files are a design system primitive for knowledge surfaces. Consistent format: one line per entry, tags, file reference. Same component renders BUILD-LEARNINGS-INDEX and SKILLS-INDEX and FINDINGS-INDEX. The vault browser panel (Phase 5.3, already built) should render these indexes as navigable lists with tag filtering. |
| **Vane** | Mana-aware access tiers (index free, depth costs, LightRAG costs more) create a natural economic gradient. Agents optimize for efficiency automatically — check the index before reading the article, read the article before querying LightRAG. The grimoire prices each tier. The system self-optimizes toward cheap knowledge access. |
| **Voss** | Knowledge compounding creates an audit trail of organizational learning. Every vault article has a provenance chain: which source produced it, which ritual compiled it, which gate findings informed it. This satisfies "how did we arrive at this understanding?" — the legal equivalent of decision traceability. |
| **Calloway** | "Every answer makes the wiki smarter" is the product positioning. A tool that learns from every interaction, where the operator's work compounds into organizational intelligence that persists across sessions and projects. That's not a dev tool — that's an organizational memory product. The TAM expands beyond developers. |
| **Sable** | "You never write the wiki. The LLM writes everything. You just steer." That's the tagline. One sentence that explains the entire value proposition. For our context: "You never write the vault. The team writes everything. You just steer." The operator steers. The personas compile. The knowledge compounds. |

---

*Karpathy LLM Knowledge Base Research — Compiled 2026-04-02.*
*Source: Andrej Karpathy, X post, April 2, 2026.*
*6 patterns mined, 0 new sessions required, all fit existing build plan seams.*
