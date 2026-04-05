### OS-ADL-011: Pretext Detection in /init
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** platform
**Decision:** During `/init`, the discovery conversation scans for customer-facing surfaces (website, storefront, mobile app, ecommerce). If detected, the scaffold includes a `layout-engine/` package in the project repo based on the OS's own engine as template. Pretext evaluation rules are added to Mara/Riven assignments. The batch manifest notes: first sub-batch builds layout-engine.
**Rationale:** Pretext solves real problems (CLS, layout shift, text fitting) that every customer-facing surface encounters. Detecting this at project creation ensures the right foundation is laid before UI work begins.
**Consequence:** `/init` has a Pretext detection step. Projects with customer-facing surfaces get layout-engine scaffolded. Projects without (pure API, CLI, backend) skip it.
