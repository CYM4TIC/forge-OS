# Execution Gates

> Pre-build validation, circuit breakers, severity calibration, and pre-mortem analysis.
> Prevents wasted execution on vague requests and infinite spin on unsolvable problems.

---

## 1. Ralplan-First Gate (Vague Request Detection)

### The Problem
Expensive execution (multi-agent dispatch, database changes, frontend builds) on a vague request wastes tokens discovering scope instead of building. Planning should happen before execution, not during.

### Concrete Signal Detection

Before executing any build command, scan the request for **concrete anchors**:

| Signal Type | Example | Regex Pattern |
|-------------|---------|---------------|
| File path | `src/hooks/useChat.ts` | Contains `/` + file extension |
| Issue/PR number | `#42`, `issue-123` | `#\d+` or `issue-\d+` |
| camelCase symbol | `processKeywordDetector` | `[a-z]+[A-Z][a-zA-Z]+` |
| PascalCase symbol | `UserModel` | `[A-Z][a-z]+[A-Z]` |
| Numbered steps | `1. Add X\n2. Test Y` | `^\d+\.` on multiple lines |
| Acceptance criteria | `acceptance: user can...` | Contains "acceptance" or "criteria" |
| Test command | `npm test && fix failures` | Contains test runner command |
| Error reference | `TypeError in auth` | Contains error type keyword |
| SQL reference | `ALTER TABLE`, `CREATE INDEX` | SQL DDL/DML keywords |

### Gate Logic

```
IF request has >= 1 concrete signal:
  PASS — proceed to execution

ELSE IF request is <= 15 words AND no concrete signals:
  GATE — redirect to planning phase
  "This request needs more specificity before I build. Let me help scope it."
  → Dispatch planning (ralplan or deep-interview depending on ambiguity)

ELSE IF request has force prefix ("force:" or "!"):
  BYPASS — execute as-is (operator accepts the risk)
```

### What Happens When Gated

1. Nyx reports: "No concrete anchors detected. Redirecting to planning."
2. If ambiguity is high: dispatch Deep Interview
3. If ambiguity is moderate (operator knows what they want but didn't specify): dispatch planning agent
4. Planning produces a concrete plan with file paths, acceptance criteria, and scope
5. Operator approves plan
6. Execution begins with concrete anchors from the plan

---

## 2. Circuit Breakers

### 3-Failure Rule

After **3 failed attempts** to fix the same issue, STOP. Do not continue spinning.

```
failure_count = 0

FOR each fix attempt:
  Apply fix → Verify
  IF verification passes:
    reset failure_count
    continue to next issue
  ELSE:
    failure_count++
    IF failure_count >= 3:
      CIRCUIT BREAK
      Report: "Issue X has failed 3 fix attempts.
        Attempt 1: [approach] → [result]
        Attempt 2: [approach] → [result]
        Attempt 3: [approach] → [result]
        Root cause may be architectural. Recommend reframe."
      Escalate to architect-level agent or operator
```

### Where Circuit Breakers Apply

| Context | Threshold | Escalation |
|---------|-----------|------------|
| Fix cycle (single finding) | 3 attempts | Escalate to operator |
| Verification loop (story) | 3 iterations | Escalate to architect |
| Ralplan critic loop | 5 iterations | Accept best plan so far |
| Ralph persistence loop | 10 iterations | Stop, report progress |
| Swarm worker | 10 iterations | Force-return findings |

### Circuit Breaker is a Feature, Not a Failure

Breaking the circuit early prevents:
- Infinite token burn on an unsolvable problem
- Context window exhaustion on a single issue
- Confirmation bias (trying the same approach with minor variations)

The right response to a circuit break is **reframe the problem**, not retry harder.

---

## 3. Critic Self-Audit + Realist Check

### The Problem
Quality gate personas (Pierce, Mara, Riven) can inflate severity. A theoretical spec deviation that affects no user gets classified as P-CRIT. This wastes fix cycles on low-impact issues.

### Self-Audit (Before Reporting)

Before reporting findings, the reviewing persona must:

1. **Confidence check each finding:**
   - "Am I certain this is wrong, or am I uncertain and defaulting to 'flag it'?"
   - If uncertain: downgrade one severity level and note the uncertainty

2. **Evidence check each finding:**
   - "Do I have file:line evidence, or am I reasoning from memory?"
   - If no evidence: either find it or drop the finding

3. **Duplicate check:**
   - "Have I flagged this same pattern multiple times across different files?"
   - If yes: consolidate into one systemic finding, not N individual findings

### Realist Check (Severity Calibration)

After self-audit, recalibrate severity against **realistic worst-case**:

| Severity | Realistic Worst-Case |
|----------|---------------------|
| **CRIT** | Data loss, security breach, financial error, app crash for all users |
| **HIGH** | Broken feature for most users, accessibility barrier, spec violation with user impact |
| **MED** | Minor UX issue, cosmetic spec deviation, edge case not handled |
| **LOW** | Polish item, style preference, optimization opportunity |

**The test:** "If this shipped to production unfixed, what actually happens?"
- If the answer is "nothing noticeable" → it's LOW, not MED
- If the answer is "one edge case user hits a confusing state" → it's MED, not HIGH
- If the answer is "payments are incorrect" → that's genuinely CRIT

### Adversarial Escalation

Only escalate to ADVERSARIAL review mode when:
- A finding passes self-audit + realist check AND is still CRIT
- OR 3+ findings pass self-audit + realist check AND are still HIGH

This prevents "everything is critical" fatigue while ensuring real issues get attention.

---

## 4. Pre-Mortem Analysis

### The Problem
The adversarial check (Rule 30) runs AFTER building. By then, you've already committed to an approach. A pre-mortem runs BEFORE building, when changing direction is cheap.

### When to Run

- **Automatically** on high-risk surfaces: auth, payments, deletion, data migration
- **On `--deliberate` flag** from operator
- **When Scout identifies high complexity** during pre-build intelligence

### The Pre-Mortem

Generate **3 failure scenarios** before building:

```markdown
## Pre-Mortem — {batch/surface name}

### Scenario 1: {most likely failure}
**What goes wrong:** {specific technical failure}
**Impact:** {who is affected, how badly}
**Mitigation:** {what we do in the code to prevent this}
**Detection:** {how we'd know if it happened despite mitigation}

### Scenario 2: {sneaky failure}
**What goes wrong:** {non-obvious failure mode}
**Impact:** ...
**Mitigation:** ...
**Detection:** ...

### Scenario 3: {catastrophic failure}
**What goes wrong:** {worst case — data loss, security breach, etc.}
**Impact:** ...
**Mitigation:** ...
**Detection:** ...
```

### How It Feeds into Build

Each mitigation becomes a **verification point** during the build. If the pre-mortem says "Scenario 1: RPC has no auth check → anyone can modify config," then the build must include an auth check AND the verification must confirm it works.

Pre-mortem scenarios also feed into Wraith red-team: "Here are the 3 failure modes we identified. Try to trigger them."

---

## 5. Multi-Perspective Review Lenses

### Code Review Lenses
When Pierce or the Build Triad reviews code, rotate through 3 lenses:

1. **Security lens:** "If I were an attacker, what would I exploit here?"
2. **New-hire lens:** "If a developer saw this for the first time, would they understand it?"
3. **Ops lens:** "When this fails at 3 AM, what information do I have to debug it?"

### Plan Review Lenses
When reviewing architecture decisions or plans:

1. **Executor lens:** "Can I actually build this? Is every step concrete?"
2. **Stakeholder lens:** "Does this deliver what the business needs, not just what's technically interesting?"
3. **Skeptic lens:** "What's the hidden assumption that makes this plan fragile?"

### How to Apply

Each lens doesn't require a separate pass. During a single review, the reviewer asks themselves all 3 questions for each significant finding. The lens that catches the issue determines the finding's category.

---

## 6. Integration Summary

| Gate | When It Fires | What It Does |
|------|--------------|-------------|
| Ralplan-first | Before any build command | Detects vague requests, redirects to planning |
| Circuit breaker | During fix cycles | Stops after 3 failures, escalates |
| Self-audit | Before reporting findings | Checks confidence and evidence |
| Realist check | After self-audit | Calibrates severity against realistic impact |
| Pre-mortem | Before high-risk builds | Identifies 3 failure scenarios, creates mitigations |
| Multi-perspective | During review | Rotates through security/new-hire/ops lenses |

---

## 7. Gate-to-Persona Dispatch Mapping

> Which gates dispatch which personas, and when to escalate.

### Automatic Dispatch Rules

| Surface Type | Always Dispatch | Conditional Dispatch | Wraith Trigger |
|-------------|-----------------|---------------------|----------------|
| **Frontend (any)** | Build Triad (Pierce + Mara + Riven) | — | If auth-gated or handles PII |
| **Backend RPC** | Pierce + Kehinde | Tanaka (if auth/RLS) | If handles payments or deletion |
| **Edge Function** | Pierce + Kehinde | Tanaka (if handles secrets) | If webhook or external API |
| **Payment flow** | Pierce + Vane + Tanaka | Voss (if terms/consent) | Always |
| **Auth/session** | Pierce + Tanaka + Kehinde | — | Always |
| **Data migration** | Pierce + Kehinde | Tanaka (if PII) | If destructive |
| **Customer-facing** | Build Triad + Sable | Calloway (if pricing/tiers) | If public API |
| **Infrastructure** | Kehinde + Tanaka | Beacon (post-deploy) | If DNS/routing |

### Escalation Procedures

**When to dispatch Wraith (beyond the table above):**
- Any surface handling financial data
- Any surface with deletion capabilities
- Any surface accepting external input (webhooks, API endpoints)
- When Scout identifies high complexity during pre-build
- When operator explicitly requests red-team (`/red-team`)

**When to escalate to operator:**
- Circuit breaker fires (3 failed fix attempts)
- Conflicting CRIT findings from different personas
- Pre-mortem identifies risk with no clear mitigation
- Any finding touching ADL violations

### Gate Bypass Conditions

Gates can be bypassed ONLY when:
1. Operator explicitly uses `force:` prefix — they accept the risk
2. Surface is documentation-only (no code changes)
3. Surface is seed data only (no schema or logic changes)

**Gates that can NEVER be bypassed:**
- Build Triad on frontend surfaces
- Tanaka on auth/payment surfaces
- Adversarial check (Rule 27)
