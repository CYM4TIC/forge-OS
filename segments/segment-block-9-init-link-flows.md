# Block 9: /init and /link Flows

> **Sessions:** 2 | **Batches:** OS-B9.A, OS-B9.B | **Source:** BUILD-PLAN.md Block 9

---

## OS-B9.A: /init — New Project from Scratch
- 5-phase discovery conversation engine
- Architecture decision generator (Nyx + Kehinde)
- Spec generator with Pierce gap review
- Batch planner with dependency ordering
- Persona assignment generator
- All vault artifacts written to `projects/{name}/vault/`
- Pretext detection: scan for customer-facing surfaces. If found, scaffold `layout-engine/` package, add Pretext evaluation rules to Mara/Riven, note in batch manifest (OS-ADL-011)
- PDF Project Brief: generate via document engine (OS-ADL-010)
- LightRAG auto-indexes new vault

## OS-B9.B: /link — Existing Repo Onboarding
- Repo scanner (directory structure, packages, configs, README)
- Parallel agent discovery (Scout + Kehinde + Mara + Tanaka)
- Architecture report (canvas-rendered in dashboard + PDF export)
- MCP recommendation engine
- Vault generator
- Pretext detection: scan for React/Next.js/frontend code. If customer-facing, recommend Pretext integration, scaffold layout-engine if approved.
- LightRAG auto-indexes generated vault

### Exit Gate
- `/init test-project` produces full vault + PDF brief
- `/link` with test repo produces architecture report + vault
- Pretext detection fires correctly for frontend repos
- LightRAG indexes generated vaults
- Pushed to GitHub: "/init and /link operational"

---
