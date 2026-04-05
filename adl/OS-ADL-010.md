### OS-ADL-010: Dual-Output Document Generation
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** content
**Decision:** The document generation engine produces two outputs from the same content: markdown files for Claude to read, and Pretext-rendered PDFs for human stakeholders.
**Rationale:** Claude needs markdown. Humans need typeset documents. Maintaining two separate content sources creates drift. Single-source dual-output ensures both versions are always in sync.
**Consequence:** `/init` produces a vault markdown Project Brief AND a PDF version. Gate completions produce vault gate report AND PDF. Retrospectives produce vault markdown AND interactive timeline. Build reports export as typeset PDFs with proper page breaks.
