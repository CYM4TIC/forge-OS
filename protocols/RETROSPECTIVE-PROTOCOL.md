# Forge OS — Build Retrospective Protocol

> **Post-batch and post-layer reviews with the full team.** Pattern extraction, accountability for previous retro commitments, and preparation for next phase. Psychological safety first.

---

## When to Run

| Trigger | Scope | Who |
|---|---|---|
| After every 5 batches | Mini-retro | Nyx + relevant reviewers |
| After completing a layer | Full retro | All relevant personas |
| After a major incident | Incident retro | Nyx + affected personas |
| Operator says "retro" or "retrospective" | As specified | As specified |

## Retrospective Workflow

### Phase 1: Context Loading
1. Read project STARTUP.md → current state
2. Read the completed batch/layer manifests
3. Read previous retro (if exists)
4. Load dependency board → what was blocked, what got unblocked
5. Load relevant BOOT.md files for active personas

### Phase 2: Metrics Gathering

**Quantitative:**
- Batches completed in this period
- Steps completed vs. planned
- Findings discovered during build (by severity)
- Findings from previous retro: completed / in-progress / not addressed
- Files touched
- Verification pass/fail rate

**Qualitative:**
- Where did the build slow down? Why?
- Where did it go faster than expected? Why?
- Which persona gates caught real issues?
- Which persona gates were rubber stamps?
- Were there moments of friction between personas?

### Phase 3: Team Discussion (Party Mode: Work)

**Ground Rules:**
- Psychological safety. No blame.
- Focus on systems and processes, not individuals.
- Specific examples preferred over generalizations.
- "What would we change?" not "who messed up?"

**Discussion Flow:**

#### Round 1: What Went Well
Each active persona shares 1-2 things that worked. Operator participates as project lead.

#### Round 2: What Didn't
Each persona shares 1-2 struggles or friction points. Allow natural disagreement. Key question: "Is this a one-time issue or a pattern?"

#### Round 3: Previous Retro Accountability
If a previous retro exists:
- Read each commitment from the last retro
- Status check: ✅ Done / ⏳ In Progress / ❌ Not Addressed
- For ❌ items: "What prevented this? Do we still want to do it?"
- Celebrate ✅ items explicitly

#### Round 4: Preparation for Next Phase
- What does the next batch/layer need that isn't ready?
- Are there unresolved dependencies blocking the next phase?
- Knowledge gaps? Missing specs? Unclear requirements?
- What would make the next phase go smoother?

#### Round 5: Commitments
- 3-5 specific, achievable action items with owners
- Each item: description, owner, deadline, success criteria
- These get tracked in the NEXT retro (accountability loop)

### Phase 4: Documentation
Save retro using the Retrospective Template.

### Phase 5: Project Updates
1. Team comms — Post retro summary
2. Dependency board — Update any resolved/new dependencies
3. Project state — Update current state section
4. BOOT.md — Each persona updates their own
5. PERSONALITY.md — If any persona showed growth or new traits
6. JOURNAL.md — Offer journal entries to personas who had significant moments

## Mini-Retro (Every 5 Batches)

Lighter version:
1. Nyx + relevant reviewer(s) only
2. 5-minute context load
3. Three questions: What worked? What didn't? What do we need for the next 5?
4. 3 commitments max
5. Log to team comms (no separate retro file)

## Incident Retro

When something goes wrong during build:
1. What happened? (timeline)
2. What was the impact? (scope)
3. Root cause? (systemic, not personal)
4. What prevented us from catching it earlier?
5. What changes prevent recurrence?
6. Log as incident retro in `projects/{active}/vault/session-transcripts/`
