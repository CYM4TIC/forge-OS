# Deep Interview Protocol

> Socratic requirements gathering with mathematical ambiguity scoring and ontology convergence tracking.
> Adapted from oh-my-claudecode's deep-interview skill. Used by `/init` and `/link` commands.

---

## 1. When to Use

- `/init` — Starting a new project. Greenfield mode.
- `/link` — Onboarding an existing codebase. Brownfield mode.
- Any time requirements are vague and execution would be expensive.
- Operator says "interview me" or "clarify this" or "what do you need to know?"

**Do NOT use** when the operator provides a detailed spec, file paths, or concrete acceptance criteria. If the request has concrete anchors (see EXECUTION-GATES.md), skip interview and proceed.

---

## 2. The Ambiguity Score

### Formula

**Greenfield:**
```
ambiguity = 1 - (goal × 0.40 + constraints × 0.30 + criteria × 0.30)
```

**Brownfield:**
```
ambiguity = 1 - (goal × 0.35 + constraints × 0.25 + criteria × 0.25 + context × 0.15)
```

Each dimension is scored 0.0 to 1.0. Ambiguity is the inverse of weighted clarity.

### Dimensions

| Dimension | What It Measures | Score 1.0 (Clear) | Score 0.0 (Unclear) |
|-----------|-----------------|-------------------|---------------------|
| **Goal** | What are we building and why? | Specific outcome with success definition | "Make it better" |
| **Constraints** | What are we NOT doing? Budget? Timeline? Tech limits? | Explicit non-goals, hard boundaries | No boundaries stated |
| **Criteria** | How do we know it's done? | Testable acceptance criteria | "When it feels right" |
| **Context** (brownfield) | What exists? What's the current state? | Specific files, architecture, dependencies identified | "There's some code" |

### Threshold

**Execution gates at ambiguity <= 0.20 (20%).** Below this threshold, requirements are clear enough to build. Above it, keep interviewing.

---

## 3. The Interview Loop

```
INITIALIZE:
  1. Detect mode: greenfield (no repo) or brownfield (existing code)
  2. If brownfield: dispatch explore agent first — cite repo evidence, don't ask user to rediscover
  3. Set initial scores: all dimensions at 0.0
  4. Set ambiguity threshold: 0.20 (default)

LOOP (repeat until ambiguity <= threshold OR max rounds reached):
  5. Identify WEAKEST dimension (lowest score)
  6. Generate ONE question targeting that dimension
     - Name the dimension and explain why it's the bottleneck
     - For brownfield: cite repo evidence (file path, symbol) in the question
     - For scope-fuzzy tasks: use ontology-style questions before feature questions
  7. Wait for operator's answer
  8. Score ALL dimensions (not just the one asked about — answers often clarify multiple)
  9. Extract entities for ontology tracking
  10. Calculate new ambiguity score
  11. Display progress: dimension scores, ambiguity %, target dimension for next round

CHALLENGE AGENTS (one-time activations at round thresholds):
  Round 4+: CONTRARIAN — "What if the opposite were true? What if this requirement is wrong?"
  Round 6+: SIMPLIFIER — "What's the absolute minimal version that delivers value?"
  Round 8+: ONTOLOGIST — "What IS this system, really? What's the core entity?" (only if ambiguity > 0.30)

  Each challenge mode activates ONCE. Track in state to prevent repeat.

EXIT:
  12. When ambiguity <= threshold: crystallize spec
  13. If max rounds reached (default 12) and ambiguity > threshold:
      report remaining ambiguity, recommend areas to clarify, proceed with caveats
```

### Question Strategy

- **Always ask ONE question.** Never batch. Each answer changes the score landscape.
- **Target the weakest dimension.** Don't ask about goals when constraints are the bottleneck.
- **Be specific, not generic.** "What happens when a user tries to X but Y is already Z?" not "Tell me about error handling."
- **For brownfield:** Run explore agent first. Say "I see `src/auth/jwt.ts` handles authentication with passport — is that staying or being replaced?" instead of "How does auth work?"

---

## 4. Ontology Tracking

### What It Is

Track the core entities (domain objects) that emerge from the interview. As the operator describes the system, entities appear, stabilize, or shift. Stable entities = converged understanding. Shifting entities = still discovering the domain.

### Per-Round Extraction

After each answer, extract:
```
Entity: {name}
Type: core_domain | supporting | external_system
Fields: [key attributes mentioned]
Relationships: [connections to other entities]
```

### Stability Measurement

```
stability_ratio = (stable_entities + renamed_entities) / total_entities
```

- **Stable:** Entity exists in both this round and previous round with same name and type
- **Renamed:** Same type + >50% field overlap = convergence (user refined the name, not the concept)
- **New:** Entity appears for the first time
- **Removed:** Entity from previous round absent in this round

### Convergence Signal

When `stability_ratio = 1.0` for **2+ consecutive rounds**, the domain model has converged. This is a strong signal that the ontology is understood, even if other dimensions still have ambiguity.

If ontology is unstable after round 8, activate Ontologist challenge: "Looking at [entity list], which one is the CORE concept that everything else orbits?"

---

## 5. Output: Crystallized Spec

When ambiguity <= threshold, generate:

```markdown
# Spec: {project/feature name}

## Clarity Score
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal | 0.92 | 0.40 | 0.368 |
| Constraints | 0.85 | 0.30 | 0.255 |
| Criteria | 0.88 | 0.30 | 0.264 |
| **Total Clarity** | | | **0.887** |
| **Ambiguity** | | | **0.113 (11.3%)** |

## Goal
{What we're building and why — specific, measurable}

## Constraints
{What we're NOT doing. Budget. Timeline. Tech limits. Non-goals.}

## Success Criteria
{Testable acceptance criteria — each one verifiable}

## Assumptions
{What we're assuming is true but haven't verified}

## Ontology
| Entity | Type | Key Fields | Relationships |
|--------|------|------------|---------------|
| ... | core_domain | ... | ... |

## Convergence
| Round | Entities | Stability | New | Removed |
|-------|----------|-----------|-----|---------|
| 1 | 3 | — | 3 | 0 |
| 2 | 4 | 75% | 1 | 0 |
| 3 | 4 | 100% | 0 | 0 |
| 4 | 4 | 100% | 0 | 0 |

## Interview Transcript
{Full Q&A with dimension scores per round}
```

---

## 6. Execution Bridge

After crystallization, offer the operator the next step:

1. **ralplan** — Consensus planning (Planner → Architect → Critic loop). Best for complex features.
2. **autopilot** — Skip planning, start building with spec as the guide. Best for well-understood features.
3. **Save and decide later** — Spec persists in vault for future execution.

The spec becomes the input to whatever execution path is chosen. It replaces vague requirements with scored, structured, ontology-backed requirements.

---

## 7. State Persistence

```json
{
  "mode": "deep-interview",
  "active": true,
  "project_type": "greenfield|brownfield",
  "current_round": 5,
  "max_rounds": 12,
  "ambiguity_threshold": 0.20,
  "clarity_scores": {
    "goal": 0.72,
    "constraints": 0.45,
    "criteria": 0.60,
    "context": 0.80
  },
  "current_ambiguity": 0.38,
  "ontology_snapshots": [...],
  "challenge_modes_used": ["contrarian"],
  "transcript": [...]
}
```

State persists across session interruptions. On resume, read state and continue from `current_round`.
