---
name: changelog
description: Generate release notes from git history + build state handoffs
user_invocable: true
---

# /changelog

Generate a changelog for a batch range, date range, or the full project.

## Protocol
1. Nyx reads git history + build state handoffs (BOOT.md, build-history/)
2. Produces: categorized release notes for the specified audience

> Converted from Changelog agent at P7.5-B. Nyx executes directly.

Usage:
- `/changelog [batch-range]` — e.g., `/changelog P1-A..P1-L`
- `/changelog [date-range]` — e.g., `/changelog 2026-03-29..2026-03-30`
- `/changelog technical` — developer-focused with full detail
- `/changelog customer` — customer-facing, no internals
