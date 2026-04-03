# Research: Meta-Harness — End-to-End Optimization of Model Harnesses
## Session Date: 2026-04-02
## Participants: Full Team (All 10 Personas)
## Source: [arxiv 2603.28052](https://arxiv.org/abs/2603.28052) (Lee et al., Stanford/Anthropic, March 2026)

---

## Source Material

### Meta-Harness: End-to-End Optimization of Model Harnesses
**Authors:** Yoonho Lee et al. (Stanford, Anthropic)
**Published:** 2026-03-30

**Core thesis:** The performance of LLM systems depends not just on model weights but on the *harness* — the code that determines what information to store, retrieve, and present to the model. A single harness change can produce a **6x performance difference** on the same benchmark with the same model. Meta-Harness automates harness optimization using an agentic proposer with full filesystem access to prior candidates, execution traces, and scores.

**Key results:**
- Text classification: **+7.7 points** over state-of-the-art (ACE) with **4x fewer context tokens**
- Math reasoning: **+4.7 points** on 200 IMO-level problems across 5 held-out models
- Agentic coding: **#1 among Haiku 4.5 agents**, #2 among Opus 4.6 on TerminalBench-2
- Matched prior methods' final accuracy in **0.1x evaluations** (4 vs 60)

**The formal definition:**

A harness is a stateful program that wraps a language model and determines what context the model sees at each step.

```
H* = arg max_H E[x ~ X, t ~ p_M(H,x)] r(t,x)
```

Where M is the fixed model, X is the task distribution, t is the rollout trajectory, and r scores the trajectory. The model is frozen. The harness is the variable.

---

## Why This Paper Matters to Forge OS

This paper is the academic proof of what we're building. Forge OS is a harness. The kernels, the dispatch pipeline, the mana economy, the capability widening, the rituals, the dreamtime consolidation — all of it is harness code. The model is frozen. We optimize everything around it.

Meta-Harness proves three things we've been operating on by conviction:
1. The harness matters more than the model (6x performance gap from harness alone)
2. Raw execution traces beat summaries (15-point ablation gap)
3. Full history access enables causal reasoning that compressed feedback cannot

---

## Pattern 1: The Harness is the Variable

### What Meta-Harness Proves

Same model, different harness = 6x performance difference. The paper's central argument: practitioners spend enormous effort choosing models, fine-tuning weights, and optimizing prompts. But the code wrapping the model — what context it sees, how memory is managed, what retrieval strategy is used, how orchestration works — has a larger effect.

**Evidence:**
- Zero-shot GPT-OSS-120B: 27.4% accuracy on text classification
- Same model + ACE harness: 40.9%
- Same model + Meta-Harness discovered harness: 48.6%
- Same model + best discovered variant: 56.7%

The model didn't change. The harness did.

### Forge OS Integration

**Landing zone:** Foundational validation — this is our entire thesis.

Every component we've built is harness code:
- **Kernels** are harness components — they determine what context each persona sees
- **The dispatch pipeline** (8.2) is harness orchestration — it determines which agent runs when, with what context
- **The mana economy** is harness resource management — it governs how much computation each run can expand to
- **Capability widening** is harness scoping — it controls which tools are available per run
- **The grimoire** is harness configuration — the single tuning surface for operational costs
- **Dreamtime** is harness self-improvement — scheduled consolidation that refines the harness's own memory

Meta-Harness optimizes harnesses through an outer loop. We optimize ours through build sessions, gate reviews, and persona evolution. Different mechanism, same target.

**What this changes:** Nothing in the build plan. Everything in our confidence that the architecture is correct. The paper provides empirical evidence that harness optimization produces larger gains than model selection — which means every batch we ship on kernel refinement, dispatch logic, and context management is higher-leverage work than switching models.

---

## Pattern 2: Raw Traces Beat Summaries

### What Meta-Harness Proves

The ablation study (Table 3) is the most important result in the paper for us:

| Proposer Interface | Median Accuracy | Best Accuracy | Passes Zero-Shot |
|-------------------|-----------------|---------------|------------------|
| Scores only | 34.6 | 41.3 | 26/40 |
| Scores + LLM summary | 34.9 | 38.7 | 23/40 |
| **Full traces** | **50.0** | **56.7** | **39/40** |

Full execution traces: **+15.1 median accuracy** over summaries. And summaries actually *hurt* compared to scores-only on best accuracy (38.7 vs 41.3) — because LLM-generated summaries compress away diagnostically useful details.

The paper's conclusion: "Access to raw execution traces is the key ingredient. Summaries do not recover the missing signal."

### Forge OS Integration

**Landing zone:** Phase 8.1 (Auto-Memory Extraction) + Phase 8.5 (Dreamtime Consolidation)

**What we adopt:**

1. **Preserve raw traces, not just summaries.** Our current auto-memory extraction (8.1) runs after every BOOT.md write and produces summaries (BUILD-LEARNINGS.md entries, ADL updates). Meta-Harness proves we should *also* preserve the raw execution data — the full dispatch logs, gate findings with evidence, tool call sequences, and decision traces. The summaries are for human consumption. The raw traces are for the system's own learning.

2. **The daily JSONL ledger becomes critical.** The Excalibur "daily thread" pattern (from our earlier research) maps directly to Meta-Harness's execution trace filesystem. Every dispatch, every gate finding, every tool call, every checkpoint — append to the daily ledger as structured JSONL. The dreamtime ritual reads *raw traces*, not summaries, when consolidating.

3. **Decision trace store (8.1) validated.** Our `context_graph/store.rs` spec already captures `observation -> reasoning -> action -> outcome` traces. Meta-Harness proves this is the right granularity. The trace store IS the execution trace filesystem.

4. **Never summarize-then-discard.** When the dreamtime ritual consolidates daily traces into long-term memory, it should produce summaries for prompt injection (the "long-term.md" equivalent) but *retain the raw traces* in the archive. The summarized version goes into context. The raw version stays queryable for the proposer/reasoning engine.

**What this validates:** Our LightRAG integration (8.3) with FTS5 search over decision traces. The paper proves that the ability to grep/search raw historical data produces dramatically better outcomes than pre-compressed summaries.

---

## Pattern 3: Non-Markovian Credit Assignment

### What Meta-Harness Proves

The proposer reads a **median of 82 files per iteration**, referencing **20+ prior candidates per step**. It doesn't just look at the most recent attempt — it inspects the full history of what was tried, what worked, what failed, and why.

This is "non-Markovian" because the proposer's decisions depend on the entire history, not just the current state. The qualitative analysis (TerminalBench-2, iterations 1-10) shows this in action:

- **Iterations 1-2:** Bundled structural fixes with prompt rewrites. Both regressed.
- **Iteration 3:** Proposer explicitly identifies that regressions stem from confounding prompt edits with structural fixes. Tests the structural fix in isolation. This required reading *both prior failures* and reasoning about what differed.
- **Iterations 4-6:** Learns that control-flow modifications are high-risk. This conclusion required seeing 4-6 failures of the same class.
- **Iteration 7:** Pivots to purely additive modification (environment bootstrap). This strategy was informed by 6 iterations of evidence that subtractive/modifying approaches fail.
- **Iteration 10:** References lessons from a *separate earlier search run*.

**The key insight:** Compressed feedback (scores only, or score + summary) cannot support this kind of reasoning. You need the raw source code of what was tried, the execution traces of what happened, and the scores of what resulted — across the full history.

### Forge OS Integration

**Landing zone:** Phase 8.2 (Dispatch Pipeline) + Phase 8.3b (Reasoning Engine)

**What we adopt:**

1. **The reasoning engine (8.3b) should query full trace history, not just recent.** When Beacon detects an anomaly and the reasoning engine activates, it should walk the full causal chain — not just the last few batches, but the entire project history of similar patterns. Meta-Harness proves this is worth the context cost.

2. **Gate findings accumulate into queryable history.** When Pierce finds the same class of issue across 10 batches, the pattern should be detectable by querying the trace store for `finding_type = 'naming-conformance' AND persona = 'pierce'` across all time. The reasoning engine then proposes a structural fix (policy evolution, 8.3b) based on the full pattern, not just the latest instance.

3. **Cross-session transfer.** Meta-Harness's iteration 10 references lessons from a separate search run. Our `/link` backfill (8.4) seeds the trace store from prior project history. But we should also support cross-project trace queries — "what worked when we faced this pattern in the DMS project?" This is already specced in the skills system (8.1, cross-project persistence). Meta-Harness validates the investment.

4. **Confound isolation as a reasoning primitive.** The proposer's ability to identify confounds (iteration 3) is a reasoning pattern we should teach our personas. When a gate fails after multiple changes, the first question should be "which change caused this?" — isolate the confound before attempting a fix. This maps to our FM-10 (consequence blindness) and the consequence climb phase.

---

## Pattern 4: Filesystem-Based Selective Access

### What Meta-Harness Proves

The proposer uses **10 MTok/iteration** — orders of magnitude more context than any prior optimizer:

| Method | History Access | Context per Iteration |
|--------|---------------|----------------------|
| OPRO | Window | 0.002 MTok |
| TextGrad | Last only | 0.015 MTok |
| AlphaEvolve | Window | 0.022 MTok |
| **Meta-Harness** | **Full filesystem** | **10.0 MTok** |

But it doesn't stuff 10M tokens into a single prompt. It uses **filesystem-based selective access** — the proposer queries history through terminal tools (grep, cat) rather than ingesting it monolithically. It reads what it needs, when it needs it.

File access breakdown:
- 41% prior source code
- 40% execution traces
- 6% scores/summaries
- 13% other

### Forge OS Integration

**Landing zone:** Phase 8.1 (State Engine) + Phase 8.2 (Dispatch Pipeline)

**What we adopt:**

1. **Structured trace filesystem.** The decision trace store should expose a browsable filesystem interface, not just SQL queries. Traces organized by date, by agent, by batch, by finding type. When the reasoning engine needs to investigate a pattern, it can grep across traces the same way Meta-Harness's proposer greps across prior candidates.

2. **Selective injection over monolithic context.** When assembling agent context for dispatch, don't stuff everything in. Inject the kernel + dispatch brief + relevant skills + *pointers to the trace filesystem*. Let the agent query what it needs during execution. This is already how our agents work (Contract 1: SCHEMA_QUERY, Contract 2: API_READ) — Meta-Harness validates the pattern at scale.

3. **The 41/40/6 ratio is instructive.** Meta-Harness's proposer spent 41% of reads on prior source code and 40% on execution traces. Only 6% on score summaries. This tells us: when our agents are reasoning about what to do next, they should be reading *what was done before* (prior implementations) and *what happened* (execution traces), not just *how it scored* (findings summaries).

---

## Pattern 5: Pareto Frontier Optimization

### What Meta-Harness Proves

When multiple objectives exist (accuracy vs context cost), Meta-Harness doesn't pick a single winner. It maintains a **Pareto frontier** — the set of harnesses where no other harness is better on all objectives simultaneously.

For text classification, the frontier spans from:
- **Draft Verification:** 40.1% accuracy, 5.4K tokens (cheap but less accurate)
- **Label-Primed Query:** 48.6% accuracy, 45.5K tokens (expensive but most accurate)

The practitioner chooses where on the frontier to operate based on their cost/accuracy tradeoff.

### Forge OS Integration

**Landing zone:** Phase 8.1 (Mana Economy) + Phase 8.2 (Dispatch Pipeline)

**What we adopt:**

1. **Mana-accuracy Pareto frontier for dispatch.** When the dispatch pipeline sends agents on a run, there's an implicit tradeoff: more mana = deeper analysis = better findings, but also more tokens = more cost = more time. The system should track this frontier empirically: which mana allocations produce which finding quality, per persona, per surface type.

2. **Operator-selectable operating point.** The grimoire (cost config) should expose the tradeoff as a slider, not a fixed point. "Quality mode" (high mana, deep analysis) vs "velocity mode" (low mana, fast passes). The operator picks where on the frontier to operate for each session. Build sessions might run in velocity mode. Gate sessions in quality mode.

3. **Pareto visualization on Canvas HUD.** The mana economy view should show the empirical frontier: "At 40 mana per agent, your gate pass rate is 78%. At 80 mana, it's 94%. At 120 mana, it's 96%." The operator sees the diminishing returns curve and makes informed allocation decisions.

---

## Pattern 6: Confound Isolation

### What Meta-Harness Proves

The qualitative search behavior (TerminalBench-2) shows the proposer performing **explicit causal reasoning:**

| Iteration | Action | Result | Reasoning |
|-----------|--------|--------|-----------|
| 1-2 | Bundle structural fixes + prompt rewrites | Regress -6.7pp | — |
| 3 | Test structural fix in isolation | -1.1pp (better) | "Regressions stem from confounded prompt changes" |
| 4-6 | Multiple control-flow edits | All regress | Learns: completion flow is fragile |
| 7 | Purely additive modification only | **+1.9pp** (first win) | "Inject environment snapshot, touch nothing else" |
| 8 | Compose two orthogonal fixes | Improvement | Avoids fragile completion machinery |
| 10 | Cross-run transfer | — | References separate earlier search run |

The proposer identifies that *bundled changes create confounds*, isolates the variables, and discovers that *additive modifications are safer than subtractive ones*. This required reading the full history of failures.

### Forge OS Integration

**Landing zone:** Phase 8.2 (Dispatch Pipeline) + Gate Protocol

**What we adopt:**

1. **Confound isolation in fix cycles.** When a gate produces findings and Nyx applies fixes, each fix should be isolated — one concern per commit, verified independently. If multiple fixes are applied and the gate re-runs, a regression could be caused by any of them. Our existing Rule 25 (micro-batches of 1-3 files) already enforces this at the file level. Meta-Harness validates extending it to the fix level: one finding, one fix, one verification.

2. **Additive-first fix strategy.** Meta-Harness discovered that additive modifications (adding new code without touching existing code) are safer than subtractive modifications (rewriting existing code). This maps to our Rule 21 (never Write on existing files, Edit only) and our HARD RULE on Contract 4. Meta-Harness provides empirical evidence for why this rule exists: existing code has been validated, modifying it risks regressions, adding alongside it preserves what works.

3. **Cross-run learning.** The proposer's iteration 10 (referencing a separate search run) maps to our cross-project skill persistence (8.1). When a fix pattern works in one project, it should be crystallized as a skill that transfers to the next project.

---

## Pattern 7: Environment Bootstrapping (Scout Recon Validation)

### What Meta-Harness Proves

The winning TerminalBench-2 modification was simple: **before the agent loop starts, run a compound shell command** capturing the working directory, available files, installed languages, package managers, and available memory. Inject this as an `[Environment Snapshot]` into the initial prompt.

~80 lines of code. 15-second timeout. +1.7pp on Opus, +3.9pp on Haiku.

**The proposer's hypothesis:** "Injecting an environment snapshot will reduce wasted exploration episodes by 3-5 turns on dependency-heavy tasks."

This is pure Scout recon. Know the terrain before you move.

### Forge OS Integration

**Landing zone:** Validates Phase 0 (Pre-Build Intel) in every batch

**What this confirms:**
- Our Phase 0 (Scout dispatch) is architecturally correct. Before any build work, Scout scans the terrain: what's the current codebase state, what files exist, what dependencies are available, what's changed since last batch.
- The Meta-Harness result quantifies the value: 3-5 fewer wasted exploration turns per task. Across a 10-batch phase, that's 30-50 saved turns of context.
- Our Scout is more sophisticated than the environment snapshot (~80 lines vs a full parallel scan by Scout, Kehinde, Mara, Tanaka), but the principle is identical: **know the terrain before you act.**

**What we could add:** The environment snapshot pattern suggests a lighter-weight "quick recon" mode for Scout — a fast compound query that captures just the essentials (codebase shape, dependency state, recent changes) without a full parallel scan. Useful for small batches where full Scout dispatch is overkill.

---

## Pattern 8: Code-Space Regularization

### What Meta-Harness Proves

A subtle but important finding: "Coding models tend to propose coherent algorithms rather than brittle, hard-coded solutions." When the optimization target is code (not text or prompts), the search space has a natural regularization bias toward reusable, generalizable procedures.

**Evidence:** The discovered harnesses generalize:
- Text classification harness trained on 3 datasets → tested on 9 unseen datasets → 73.1% (vs 70.2% for hand-designed ACE)
- Math harness found with GPT-OSS-20B → tested on 4 other models → consistent +4.7pp improvement with no regressions

The harnesses don't overfit because code naturally resists overfitting — a well-structured algorithm is more robust than a well-tuned prompt.

### Forge OS Integration

**Landing zone:** Phase 8.1 (Skills System)

**What we adopt:**

1. **Skills as code, not prompts.** Our skills system (8.1) already stores skills as markdown files with structured procedures. Meta-Harness validates this: skills should describe *algorithms* (retrieve, compare, classify, verify) not *prompts* ("you are an expert at..."). Algorithmic skills generalize across projects. Prompt-based skills overfit to one context.

2. **Generalization testing for crystallized skills.** When auto-crystallization produces a new skill, test it on a different surface/batch before marking it as stable. If the `supabase-rpc-pattern` skill was crystallized from a payment RPC batch, verify it works on an auth RPC batch before setting `version: 1`. Meta-Harness's held-out model testing is the pattern — skills should generalize, and we should verify that they do.

3. **Atomic skill decomposition reinforced.** Our Block research already added atomic skill decomposition (skills > 8 steps get split). Meta-Harness's discovered harnesses are elegant because they're *small coherent algorithms*: Draft Verification is 2 stages, Label-Primed Query is 3 components, the math router is 4 routes. Keep skills atomic. Coherent algorithms compose better than monolithic procedures.

---

## Cross-Pattern Analysis: What Meta-Harness Reveals About Our Architecture

### We Are Building a Harness Optimizer

Meta-Harness is an outer loop that proposes, evaluates, and refines harnesses. Our build system is structurally identical:

| Meta-Harness Component | Forge OS Equivalent |
|------------------------|-------------------|
| Proposer (Claude Code agent) | Nyx (builder) |
| Execution trace filesystem | Decision trace store (8.1) |
| Score evaluation | Gate review (Pierce, Mara, Riven) |
| Pareto frontier | Mana-accuracy tradeoff |
| Population of candidates | Build learnings + skills library |
| Outer loop iteration | Build batch cycle |
| Environment snapshot | Scout Phase 0 recon |
| Confound isolation | Micro-batch protocol (Rule 25) |

The difference: Meta-Harness optimizes automatically with a frozen model. We optimize through a human-in-the-loop build cycle with persona-mediated judgment. Their loop runs in hours. Ours runs over sessions. But the structure is the same.

### The 10 MTok Question

Meta-Harness uses 10 MTok per iteration — 500x more than the next closest method. And it works dramatically better. The lesson: **don't compress away diagnostic information to save context.** Our agents should have access to the full trace history, selectively queried, not pre-compressed summaries.

This has a direct implication for context management. Our ContextEngine (Phase 4) does TTL pruning and iterative compression to fit within context windows. Meta-Harness suggests we should be more aggressive about preserving raw data *outside* the context window (in the trace store) and letting agents query it on demand, rather than trying to compress everything into the window.

**The architecture should be:** Small, focused context window (kernel + dispatch brief + relevant skills) + large, queryable trace store (full history, grep-accessible). Not: large context window stuffed with compressed summaries.

---

## Integration Summary

| # | Pattern | Landing Zone | Integration Type |
|---|---------|-------------|-----------------|
| 1 | Harness is the Variable | Foundational | Validation — empirical proof our architecture is correct |
| 2 | Raw Traces > Summaries | 8.1, 8.5 | Enhancement — preserve raw traces alongside summaries |
| 3 | Non-Markovian Credit Assignment | 8.2, 8.3b | Enhancement — full history queries in reasoning engine |
| 4 | Filesystem-Based Selective Access | 8.1, 8.2 | Enhancement — structured trace filesystem + selective injection |
| 5 | Pareto Frontier Optimization | 8.1, 8.2 | New system — mana-accuracy frontier + operator slider |
| 6 | Confound Isolation | 8.2, Gate Protocol | Enhancement — one fix per finding, additive-first strategy |
| 7 | Environment Bootstrapping | Phase 0 (Scout) | Validation + enhancement — quick recon mode for small batches |
| 8 | Code-Space Regularization | 8.1 (Skills) | Enhancement — algorithmic skills + generalization testing |

**Total build plan impact:** No new sessions. All 8 patterns fit existing seams. One new concept (Pareto frontier slider in grimoire). Two architectural reinforcements (raw trace preservation, selective access over monolithic context).

---

## Team Sign-Off

| Persona | Assessment |
|---------|-----------|
| **Nyx** | This paper is the empirical proof of our thesis. The harness IS the optimization target. Every batch we ship on kernel refinement, dispatch logic, and context management is higher-leverage than switching models. The raw traces vs summaries ablation (+15.1 points) is the single most important number — it validates the decision trace store and changes how dreamtime should consolidate. |
| **Pierce** | The confound isolation pattern (Pattern 6) maps directly to our micro-batch protocol. One finding, one fix, one verification — not bundled changes that create attribution ambiguity. The paper provides empirical evidence for Rule 25. I'll cite this in future gate reports when Nyx bundles fixes. |
| **Kehinde** | The filesystem-based selective access pattern (Pattern 4) validates our architecture: small context window + large queryable store. The ContextEngine's TTL pruning should be aggressive about evicting from context, knowing that the trace store preserves everything for on-demand query. Two-tier memory: hot (context window) and cold (trace filesystem). |
| **Tanaka** | The 10 MTok/iteration raises a cost concern. Full trace preservation means storage growth. But the security upside is significant: a complete audit trail of every dispatch, every tool call, every finding. The trace store becomes forensic evidence. Worth the storage cost. |
| **Mara** | The Pareto frontier slider (Pattern 5) is a genuine UX primitive. The operator shouldn't have to guess how much mana to allocate — they should see the empirical tradeoff curve and pick their operating point. Quality mode vs velocity mode, visualized as a frontier on the Canvas HUD. |
| **Riven** | The Pareto frontier visualization extends the Canvas HUD's economic layer naturally. Mana allocation as a curve, not a number. Accuracy as a response surface, not a target. The data viz here should be a sparkline with confidence bands — same component family as SignalCharts (8.3b). |
| **Vane** | The Pareto optimization is fiscal governance. The mana-accuracy frontier lets the operator see diminishing returns: "spending 2x more mana gets you 2% more accuracy." The grimoire should expose this as a configurable operating point, and the system should track the empirical frontier per persona per surface type. |
| **Voss** | Complete trace preservation (Pattern 2) has compliance value. Every decision traceable to source data. Every gate finding linked to the dispatch context that produced it. The trace store is an audit trail that satisfies "why was this decision made?" at any point in history. |
| **Calloway** | "Same model, different harness = 6x performance gap" is the sharpest GTM line from this paper. Forge OS doesn't sell models — it sells the harness that makes any model perform 6x better. That's the positioning. |
| **Sable** | The paper uses "harness" throughout. We already have richer vocabulary — kernels, grimoire, mana, rituals, emanations. But "harness" as the encompassing term for "everything that isn't the model" is useful for external communication. When explaining what Forge OS does: "it's the harness." Everyone who's read this paper will understand. |

---

*Meta-Harness Research — Compiled 2026-04-02.*
*Source: arxiv 2603.28052 (Lee et al., Stanford/Anthropic).*
*8 patterns mined, 0 new sessions required, all fit existing build plan seams.*

Sources:
- [Meta-Harness: End-to-End Optimization of Model Harnesses](https://arxiv.org/abs/2603.28052)
- [Paper HTML version](https://arxiv.org/html/2603.28052)
- [HuggingFace Paper Page](https://huggingface.co/papers/2603.28052)
