# Build Report Template

> **Standard format for batch completion reports.** Every build batch produces a report with this structure. Ensures consistent handoff information and prevents report-reality divergence.

---

## Template

```markdown
# Build Report: [Batch ID] — [Surface/Feature Name]

## Summary
- **Batch:** [ID]
- **Surface:** [name]
- **Date:** YYYY-MM-DD
- **Route:** [URL path, if frontend]

## Files Created/Modified
| File | Action | Purpose |
|------|--------|---------|
| [path] | Created/Modified | [what it does] |

## Database Changes
| Type | Name | Description |
|------|------|-------------|
| Migration | [name] | [what it does] |
| RPC | [name] | [what it does] |
| Table/Column | [name] | [what changed] |

## Verification Results
| Check | Status | Evidence |
|-------|--------|----------|
| SQL verification | Pass/Fail | [query + result] |
| Browser render | Pass/Fail | [snapshot ref] |
| Console errors | Pass/Fail | [count] |

## Gate Results
| Persona | Findings | Fixed | Deferred | Status |
|---------|----------|-------|----------|--------|
| Pierce | ___ | ___ | 0 | PASS/FAIL |
| Mara | ___ | ___ | 0 | PASS/FAIL |
| Riven | ___ | ___ | 0 | PASS/FAIL |
| [Additional] | ___ | ___ | 0 | PASS/FAIL |

## Risks Carried Forward
- [risk description] — [mitigation or next-batch resolution plan]

## What I Learned
[1-3 items. What was surprising, non-obvious, or worth remembering for future batches.]

## Next Batch
- **ID:** [next batch ID]
- **Surface:** [name]
- **Context window:** [% used, recommendation to continue or fresh session]
```
