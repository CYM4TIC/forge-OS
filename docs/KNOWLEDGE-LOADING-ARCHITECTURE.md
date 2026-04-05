# Knowledge Loading Architecture for Agent Dispatch

> **The system that sits between "kernel boots" and "persona executes."**
> Defines how knowledge flows from wells into active execution context.
> Approved 2026-04-05. Revised 2026-04-05 (ecosystem refinement: 14 personas, not 10+14).
> Implementation: P7.5-G (profiles) + P8-F/G/K/L (runtime).
> Companion: `docs/ECOSYSTEM-REFINEMENT.md` (restructuring decisions).

---

## Principle

**The personas are the team. The project is the job. Knowledge travels with the person, not the project.**

14 world-class domain experts. Each one a permanent team member who brings professional expertise to every project — not project workers, but senior professionals whose knowledge grows through use.

- Identity layer = who they are (portable, all projects). Grows autonomously through use.
- Context layer = what they need for this task (project-specific, assembled per-dispatch).
- Reference layer = the library they can consult (available, not pre-loaded).

---

## Three-Layer Knowledge Assembly

### Layer 1: IDENTITY (loads every dispatch)

The agent's permanent professional mind. WHO they are, not what they're working on.

- Cognitive kernel (~150 lines) — HUD, phases, FMs, contracts
- Professional profile (~50 lines) — compressed world-class domain expertise. Voice, cognitive posture, action-ready methodologies, failure signatures, quality signals. Sourced from PERSONALITY.md + INTROSPECTION.md + research mining + reference sources. Profiles are professional resumes — technology-aware at the principle level, not project-specific.
- **Budget:** ~250 lines / ~5K tokens. The "smart zone" (first 40% of context).
- **Key:** Methodology is IN the prompt, not behind a link. "Run blast radius analysis: BFS upstream/downstream, d=1='will break', d=2+='indirect risk'" — not "see Section 6d."

### Layer 2: CONTEXT (assembled per-dispatch)

What the agent needs FOR THIS SPECIFIC TASK. Assembled by the dispatch system, not by the agent self-navigating.

- Task definition (manifest segment, target files, scope)
- Relevant prior findings (grep findings-log for this surface/domain)
- Relevant BUILD-LEARNINGS (grep by domain tag)
- Matched skills (auto-matched by file type: .rs -> postgres/security, .tsx -> tailwind)
- Integration Map patterns (grep for current session)
- Sibling context (FM-12: nearest sibling loaded for comparison)
- **Budget:** ~200-400 lines / ~4-8K tokens. Variable per task.
- **Key:** KnowledgeAugmenter assembles this BEFORE dispatch. GitNexus "augmentation engine" pattern.

### Layer 3: REFERENCE (available on-demand)

Deep reference material the agent CAN access if a trigger fires during execution. Stored in two files per persona:

- **Reference bank** (`forge/profiles/{name}-references.md`) — the actual deep content, organized by methodology. Each section is self-contained: full reasoning, formulas, decision trees, edge cases, examples. Extracted and rewritten from source material during profile sessions. An agent reads a specific section when the profile's compressed line isn't enough detail.
- **Reference index** (`forge/profiles/{name}-reference-index.md`) — lookup table mapping profile methodology → reference bank section → original source file/line range. Includes `KAIROS Tag` column for future sqlite-vec ingestion. This file IS the KAIROS ingestion manifest — when the runtime comes online, each row becomes a vector with provenance preserved.
- Full governance docs, INTROSPECTION.md, research reports, historical findings also remain available.
- **Budget:** Unbounded. Pulled on demand by section, not pre-loaded.
- **Key:** Profile contains enough compressed methodology that reference bank is consulted only when the agent needs deeper understanding of WHY a methodology works or HOW to handle edge cases. The reference index ensures the agent lands on the right section instantly rather than searching.

---

## Assembly Pipeline

```
DISPATCH REQUEST
    |
    v
[1. IDENTITY ASSEMBLY]
  Load kernel + profile = ~250 lines, always loaded
    |
    v
[2. KNOWLEDGE AUGMENTATION]
  Classify task (WHY/HOW/WHAT)
  Query KAIROS by domain
  Grep BUILD-LEARNINGS by tag
  Match skills by file type
  Load prior findings
  Load Integration Map patterns
  = ~200-400 lines, task-specific
    |
    v
[3. PROMPT ASSEMBLY]
  Identity + Context + Task + Target files
  = ~500-700 lines total
    |
    v
AGENT EXECUTES
    |
    v
[4. REFERENCE] on-demand if FM trigger fires
```

---

## Self-Updating Loop

Every dispatch teaches something. Learning flows back autonomously.

### Learning Extraction (post-dispatch hook, automatic)

1. **Domain knowledge:** New pattern/gotcha/technique? Classify: domain-general -> profile + BUILD-LEARNINGS. Project-specific -> project findings only.
2. **Methodology refinement:** Success pattern -> reinforce in profile. Failure -> add to failure signatures. Override from gate -> calibration log.
3. **Knowledge graph edges:** New entity relationships, dependency discoveries, cross-domain connections -> KAIROS garden space.
4. **Skill crystallization:** Novel multi-step sequence that worked? -> SkillCrystallizer (P8-H).

### Knowledge Routing (Three-Space enforcement)

- Domain-general expertise -> `forge/profiles/{name}-profile.md` + KAIROS garden (portable)
- Agent self-knowledge -> KAIROS kernel space + calibration logs (how this agent works)
- Task-specific findings -> project findings-log + KAIROS ops space (purgeable)

### Profile Evolution (autonomous)

**Accumulation:** Post-dispatch learning extraction tags domain-general insights. Accumulate in KAIROS garden with agent scope tag.

**Consolidation (Dreamtime ritual):** Cluster similar insights (0.88 cosine). Promote high-touch patterns. Detect methodology gaps. Surface contradictions.

**Profile rewrite (condition-triggered):**
- 10+ consolidated insights since last update -> rewrite
- 3+ methodology gaps detected -> rewrite with gap-filling
- Calibration log >70% override rate on a methodology -> rewrite that methodology
- Operator explicitly requests

**Rewrite process:** Read current profile + accumulated learnings + calibration log -> compress into ~50 line budget -> Agora proposal -> operator approves -> update. Old version archived (seed-evolve-reseed).

### Drift Detection (passive monitoring)

| Drift Type | Detection | Auto-Response |
|-----------|-----------|---------------|
| Staleness | Methodology not validated in N dispatches | Flag, lower confidence weight |
| Coverage gap | Task type with no matching methodology | Log gap, prioritize rewrite |
| Assertion mismatch | Profile says X, agent does Y successfully | Calibration log, propose update |
| Override pattern | Gate reviewer consistently overrides | Accumulate, trigger rewrite at threshold |
| Skill decay | Skill unused in N dispatches | Lower rank, eventually archive |

---

## Output Format (Three Files Per Persona)

14 personas, three files each. Equal depth. No tier distinction between original personas and elevated intelligences.

### File 1: Profile (`forge/profiles/{name}-profile.md`, ~50 lines)

Layer 1 identity. Loaded every dispatch alongside the kernel.

```markdown
# {Name} — Professional Profile

> Compressed domain expertise. Loaded every dispatch alongside the kernel.
> Evolves autonomously through use. NOT project-specific.

## Voice & Posture
[2-3 lines: how this expert thinks, speaks, approaches problems]

## Domain Methodologies
[5-8 action-ready protocols with enough detail to EXECUTE]
[Sub-agent awareness: persona knows when to dispatch their parallel sub-agents]

## Failure Signatures
[3-5 domain-specific failure patterns this expert watches for]

## Quality Signals
[3-5 indicators distinguishing good work from great work in this domain]
```

Profiles are world-class domain expertise. Technology-aware at the principle level with specific examples. "Hybrid search fusion: use RRF (1/(K+rank), K=60) to merge keyword and semantic results" — not "run this query against the KAIROS table."

### File 2: Reference Bank (`forge/profiles/{name}-references.md`, variable length)

Layer 3 deep knowledge. The actual content behind each methodology in the profile. Organized by methodology section with anchor IDs. Each entry is self-contained — an agent reads one section and has everything it needs.

```markdown
# {Name} — Reference Bank

> Deep reference material organized by methodology.
> Read by section on-demand. Becomes KAIROS vector content at ingestion.

## Impact Analysis {#impact-analysis}
[Full BFS algorithm, scoring rubric (d=1 direct, d=2+ indirect), edge cases,
 examples from past builds, when to stop traversal, output format]

## Composable Halt Conditions {#halt-conditions}
[Full trait design, AND/OR composition semantics, built-in conditions,
 how to add custom conditions, Phase 8 mana budget integration path]
```

### File 3: Reference Index (`forge/profiles/{name}-reference-index.md`, ~30-50 lines)

Lookup table and KAIROS ingestion manifest. Maps profile → reference bank → original source.

```markdown
# {Name} — Reference Index

> Lookup: profile methodology → reference bank section → original source.
> Becomes KAIROS ingestion manifest in Phase 8.

| Methodology | Bank Section | Original Source | KAIROS Tag |
|-------------|-------------|-----------------|------------|
| Blast radius BFS | #impact-analysis | research/mining/gitnexus:45-78 | architecture.impact |
| Composable halt | #halt-conditions | research/autogen:112-140 | orchestration.halt |
```

### Layer Relationship

- **Profile** says WHAT to do (compressed, always loaded in Layer 1)
- **Reference bank** says HOW and WHY in full depth (on-demand, read by section in Layer 3)
- **Reference index** maps between them and provides KAIROS ingestion path (routing layer)

---

## Build Plan Integration

| Batch | What | Phase |
|-------|------|-------|
| P7.5-D/E | Author 14 x 3 files (profile + reference bank + reference index) | NOW (pre-Phase 8) |
| P8-F | KnowledgeAugmenter in ContextAssembler | Phase 8 Session 8.1 |
| P8-G | Dreamtime consolidation pass per persona | Phase 8 Session 8.1 |
| P8-G+ | KAIROS ingestion: read reference indexes, embed reference bank sections | Phase 8 Session 8.1 |
| P8-K | Learning Extractor as post-dispatch hook | Phase 8 Session 8.2 |
| P8-L | Load kernel + profile as identity layer, reference bank as on-demand | Phase 8 Session 8.2 |

See `docs/ECOSYSTEM-REFINEMENT.md` for the full restructuring: 14 personas (10 original + 4 elevated intelligences), absorbed agents, orchestrator collapse, sub-agent refinement.

---

## Feedback Loop Diagram

```
DISPATCH -> IDENTITY LOAD -> CONTEXT AUGMENT -> EXECUTE
                                                   |
                                    LEARNING EXTRACTION (auto)
                                         |              |
                                    KAIROS STORE    CALIBRATION LOG
                                         |              |
                                    DREAMTIME CONSOLIDATE (ritual)
                                              |
                                    PROFILE REWRITE (condition-based)
                                              |
                                    NEXT DISPATCH IS SMARTER
```

## Multi-Project Knowledge Isolation

When connected to multiple projects, knowledge bleed prevention is enforced at three levels:

1. **Structural isolation** — Each project has its own vault directory. Findings-logs, persona assignments, BUILD-LEARNINGS are project-scoped. `/link` creates a fresh vault.
2. **Three-Space routing** — Every learning routes to exactly one space: kernel (identity/portable), garden (domain knowledge/portable), or ops (task-specific/project-scoped/purgeable).
3. **Agora proposal gate** — Profile rewrites go through operator approval. The system cannot silently inject project-specific knowledge into a portable profile.

Classification boundary:
- "RLS policies must derive authorization from signed tokens" → portable (profile)
- "The estimates table has an RLS gap on status transitions" → project-scoped (vault)
- "Tables with status columns frequently lack transition RLS" → portable (learned pattern, profile candidate via self-updating loop)

---

*Architecture designed 2026-04-05. Revised 2026-04-05 (ecosystem refinement).*
*Sources: ArsContexta (context budgets, Three-Space, condition triggers), GitNexus (augmentation engine, WHY/HOW/WHAT), StixDB (consolidation, decay, touch-boost), awesome-design-md (9-section governance format).*
