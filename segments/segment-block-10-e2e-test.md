# Block 10: End-to-End Test

> **Sessions:** 1-2 | **Batches:** OS-B10.A through OS-B10.C | **Source:** BUILD-PLAN.md Block 10

---

## OS-B10.A: Fresh Clone Test
- Clone forge-OS to new directory
- `/init test-project` — full scaffold, verify PDF brief generated
- `/link` with test repo — agent discovery, vault generation, LightRAG indexing
- Verify dashboard: pipeline, agents, findings feed, graph viewer all render via canvas
- Verify PDF export: gate report with proper typography and page breaks

## OS-B10.B: Feedback Loop Verification
- File a test proposal from Mara: "template X is missing responsive breakpoint guidance" targeting `templates/spec/`
- Verify: proposal written to `.forge/proposals/PROPOSAL-001.md` with correct schema
- Verify: duplicate check queries LightRAG (no prior proposals, clean pass)
- Verify: triage routes to Pierce (scope: template)
- Spawn Pierce evaluation session — verify ruling written with reasoning
- Accept the proposal — verify: moved to `.forge/decisions/DECISION-001.md`, `FEEDBACK-LOG.md` updated, LightRAG re-indexed
- Dashboard: ProposalFeed shows resolved proposal with ruling
- File a duplicate proposal — verify: dedup catches it, returns prior decision reference

## OS-B10.C: DMS Reconnection — The Proof
- `/link` the DMS vault as a project
- LightRAG indexes 146 segments + ADL + build learnings
- Dashboard shows: L4-J.2c next, 57/122 batches, all open risks
- Spawn Scout against J.2c — verify LightRAG query + recon brief
- Spawn Build Triad in parallel — verify 3 simultaneous sessions, findings aggregated in dashboard
- "Export Report" — verify gate report PDF renders correctly
- Confirm: the OS is ready to build the DMS

### Exit Gate
- Fresh clone works end-to-end
- Feedback loop complete lifecycle verified
- DMS vault linked and operational in the OS
- Dashboard shows DMS state correctly
- All 20 verification items from BUILD-PLAN.md pass
- Pushed to GitHub: "Forge OS v1.0 — ready for production"

---
