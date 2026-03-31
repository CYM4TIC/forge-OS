# Trail of Bits — Security Skills Reference

> 18 security skills from trailofbits/skills. Extracted for Tanaka persona enhancement.

## Repo: github.com/trailofbits/skills

## Top 8 Skills for Forge OS

### 1. Semgrep Static Analysis
- Runs Semgrep with auto language detection (Python, JS/TS, Go, Docker)
- Two modes: "Run all" (full ruleset) vs "Important only" (high-confidence vulns)
- Third-party rulesets required (Trail of Bits, 0xdea, Decurity)
- Always `--metrics=off` (no telemetry leakage)
- User approval hard gate before scanning
- Output: SARIF report with merged findings

### 2. Supply Chain Risk Auditor
- Identifies dependencies at heightened risk of exploitation/takeover
- High-risk criteria: single maintainer, unmaintained, low popularity, FFI/deserialization, past CVEs, no SECURITY.md
- Uses `gh` tool for repo analysis
- Suggests drop-in replacements for risky deps
- Output: results.md with risk analysis

### 3. Insecure Defaults Detection
- Fail-open vulnerabilities (app runs insecurely with missing config)
- Key patterns: fallback secrets, hardcoded creds, weak defaults (`DEBUG=true`, `AUTH=false`, `CORS=*`)
- Critical distinction: `env.get('KEY') or 'default'` (FAIL-OPEN) vs `env['KEY']` (FAIL-SECURE)
- Skips: test fixtures, example files, dev-only tools

### 4. Semgrep Rule Creator
- Creates custom Semgrep rules for org-specific vulnerabilities
- Test-first methodology (vulnerable + safe cases required)
- Taint mode prioritized for data flow vulns
- 7-step iterative process: analyze → test → AST → write → iterate → optimize → validate

### 5. Differential Security Review
- PR/commit security-focused code review
- Risk classification: HIGH (auth, crypto, value transfer) → MEDIUM (business logic) → LOW (comments, UI)
- Codebase size strategy: SMALL (<20 files) = deep, MEDIUM (20-200) = focused, LARGE (200+) = surgical
- 6-phase workflow ending with adversarial modeling

### 6. Zeroize Audit
- Detects missing zeroization of secrets, keys, PII in memory
- 8 finding categories (missing, partial, optimized away, stack retention, register spill)
- Assembly-level + LLVM IR analysis with evidence
- 11-agent pipeline with PoC generation

### 7. Audit Context Building
- Ultra-granular line-by-line code analysis
- First Principles + 5 Whys + 5 Hows per code block
- Bottom-up before vulnerability hunting
- Minimum thresholds: 2-3 sentences purpose, 5+ inputs/assumptions, 3+ risk considerations

### 8. Constant-Time Analysis
- Timing side-channel vulnerability detection
- Dangerous ops: division, secret-dependent branches, early-exit comparison, weak RNG
- Supports 12+ languages
- False positive triage: compile-time constants and public parameters are safe

## How to Use in Forge OS

**Tanaka enhancement:** Wire skills 1-5 into Tanaka's security audit methodology. Supply chain auditor runs during `/deps`. Insecure defaults runs during build. Differential review runs during PR gate.

**Wraith enhancement:** Skills 6-8 inform red-team attack patterns. Zeroize audit for crypto surfaces. Constant-time for auth token handling.
