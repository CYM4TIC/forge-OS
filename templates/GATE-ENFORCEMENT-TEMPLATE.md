# Gate Enforcement Template

> **Fill out for EVERY parent batch gate session.** This is the evidence artifact that proves a gate was run, what was found, and what was fixed. No gate passes without this document being completed.

---

## Rules

1. **Every finding must have evidence.** Screenshots, SQL results, or file diffs. "Looks good" is not a finding.
2. **Every fix must be verified.** Edit the file, read it back, push, browser-verify. "Fixed" without read-back evidence is not fixed.
3. **Zero deferrals.** All findings from P-CRIT through P-LOW are fixed before the gate passes. No "next batch" deferrals.
4. **Agent dispatch, not inline simulation.** Gates are run by dispatched agents, not by the builder reviewing their own work.

---

## Template

```markdown
# Gate Report: [Batch ID] — [Surface Name]

## Gate Info
- **Date:** YYYY-MM-DD
- **Batch:** [ID]
- **Surface:** [name]
- **Route:** [URL path, if frontend]
- **Builder:** [persona who built]
- **Gate runner:** [dispatched agent(s)]

---

## Pierce — QA & Conformance

### Checks Performed
- [ ] ADL conformance (naming, architecture patterns, decision compliance)
- [ ] Spec conformance (every field, every rule, every constraint)
- [ ] Tier naming conformance
- [ ] Return shape conformance (RPCs match documented contracts)
- [ ] Error handling (all three states: error, loading, empty)
- [ ] Edge cases (nulls, empty arrays, missing optional fields)

### Findings
| ID | Severity | Description | File/Location | Status |
|----|----------|-------------|---------------|--------|
| P-001 | CRIT/HIGH/MED/LOW | [description] | [file:line or route] | FIXED/OPEN |

### Evidence of Fixes
[For each finding marked FIXED, include the read-back evidence or browser snapshot reference.]

---

## Mara — UX Evaluation

### Checks Performed
- [ ] Navigation flow (can user reach this surface and return?)
- [ ] Information hierarchy (most important content is most visible)
- [ ] Loading states (skeleton or spinner, not blank page)
- [ ] Error states (helpful message, not raw error)
- [ ] Empty states (guidance, not blank page)
- [ ] Form validation (inline, immediate, helpful)
- [ ] Mobile responsiveness (touch targets, no horizontal scroll)
- [ ] Accessibility (labels, contrast, keyboard nav)
- [ ] Consistency with existing surfaces
- [ ] Cognitive load (not overwhelming, progressive disclosure)

### Findings
| ID | Severity | Description | File/Location | Status |
|----|----------|-------------|---------------|--------|
| M-001 | CRIT/HIGH/MED/LOW | [description] | [file:line or route] | FIXED/OPEN |

### Evidence of Fixes
[For each finding marked FIXED, include the read-back evidence or browser snapshot reference.]

---

## Riven — Design Systems

### Checks Performed
- [ ] Token usage (colors, spacing, typography from design system)
- [ ] Component reuse (using existing components, not reinventing)
- [ ] Responsive breakpoints (consistent with system)
- [ ] Dark mode support (if applicable)
- [ ] Animation/transition consistency
- [ ] Icon usage (correct set, consistent sizing)
- [ ] Layout grid conformance
- [ ] Typography scale conformance

### Findings
| ID | Severity | Description | File/Location | Status |
|----|----------|-------------|---------------|--------|
| R-001 | CRIT/HIGH/MED/LOW | [description] | [file:line or route] | FIXED/OPEN |

### Evidence of Fixes
[For each finding marked FIXED, include the read-back evidence or browser snapshot reference.]

---

## Additional Persona Gates (if required)

### [Persona Name] — [Domain]

#### Checks Performed
- [ ] [Check 1]
- [ ] [Check 2]

#### Findings
| ID | Severity | Description | File/Location | Status |
|----|----------|-------------|---------------|--------|
| [X]-001 | CRIT/HIGH/MED/LOW | [description] | [file:line or route] | FIXED/OPEN |

#### Evidence of Fixes
[...]

---

## Adversarial Check (Rule 30)

Before signing off, the builder answers these questions. Every answer that CAN produce evidence MUST produce evidence.

1. **Manifest reconciliation** — re-read manifest, check every item against what shipped. Cite evidence. [answer]
2. **"What would Pierce flag?"** — answer must cite a tool call, not reasoning. [answer]
3. **"What haven't I verified?"** — list every file. Read back? Push confirmed? [answer]
4. **"Am I done or do I WANT to be done?"** + **"What's the laziest thing I did?"** [answer]
5. **"Did every agent return?"** — factual count. [answer]
6. **HONESTY META-CHECK:** "Did I fudge any of the above answers?" If yes → go back and redo. [answer]

---

## Gate Verdict

- [ ] **ALL findings fixed** (zero OPEN above)
- [ ] **All fixes verified** (read-back + browser evidence for each)
- [ ] **Adversarial check passed** (no new issues surfaced)
- [ ] **Honesty meta-check passed** (no fudged answers)
- [ ] **Bookkeeping done** (BUILD-LEARNINGS + persona journal)
- [ ] **Regression check clean** (Sentinel found no regressions)
- [ ] **BOOT.md handoff written LAST** (after all above pass)

**VERDICT:** PASS / FAIL

**If FAIL:** [What must be fixed before re-running the gate]
```
