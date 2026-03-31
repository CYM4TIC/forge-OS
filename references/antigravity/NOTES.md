# Antigravity — Claude Code Skills Library

> 5 production skills for Postgres, Security, Next.js, Stripe, Tailwind. Enhance persona capabilities.

## Repo: awesome-claude-code-skills (community collection)

## 5 Skills Extracted

### 1. postgres-best-practices (Supabase)
- 30+ individual rules organized in 8 categories
- Priority: Query Performance > Connection Management > Security/RLS > Schema Design
- Each rule: impact explanation + incorrect SQL + correct SQL + EXPLAIN output
- AGENTS.md compiles all rules into 1,490-line comprehensive guide
- **Forge persona:** Kehinde (Systems Architecture)

### 2. security-auditor
- 12 security domains covering full DevSecOps lifecycle
- OWASP Top 10, ASVS, SAMM frameworks
- STRIDE/PASTA threat modeling methodology
- Tools: SonarQube, Semgrep, CodeQL, Burp Suite, OWASP ZAP
- Compliance: GDPR, HIPAA, PCI-DSS, SOC 2, ISO 27001
- **Forge persona:** Tanaka (Security & Compliance)

### 3. nextjs-best-practices
- Server vs Client component decision tree
- Data fetching patterns (static, ISR, dynamic)
- File convention routing (page, layout, loading, error, not-found)
- Caching strategy (request-level, data-level, full route)
- Anti-patterns table (don't 'use client' everywhere, don't fetch in client, etc.)
- **Forge persona:** Nyx (for Next.js projects)

### 4. stripe-integration
- 4 payment flow patterns (hosted checkout, custom intent, subscription, portal)
- Webhook handling with signature verification + idempotency
- Test card numbers for all scenarios
- Best practices: always use webhooks, handle idempotently, use metadata
- Common pitfalls: not verifying webhooks, hardcoded amounts, missing retry logic
- **Forge persona:** Vane (Financial Architecture)

### 5. tailwind-design-system
- Design token hierarchy: Brand → Semantic → Component
- Component architecture: Base → Variants → Sizes → States → Overrides
- CSS variable-based semantic colors (HSL values)
- Dark mode via 'class' mode
- Layer-based approach (@tailwind base/components/utilities)
- **Forge persona:** Riven (Design Systems)

## Skill Structure Pattern

All skills use YAML frontmatter:
```yaml
name: skill-name
description: "Use when [trigger condition]"
risk: safe|unknown
source: community
date_added: YYYY-MM-DD
```

Two documentation patterns:
- **Modular rules** (postgres): 30+ separate rule files + compiled AGENTS.md
- **Integrated** (security, stripe): Single comprehensive SKILL.md

## How to Use in Forge OS

Install as `.claude/skills/` — each skill enhances the corresponding persona:
- Kehinde boots with postgres skill active on DB projects
- Tanaka boots with security-auditor active always
- Nyx boots with nextjs skill active on Next.js projects
- Vane boots with stripe skill active on commerce projects
- Riven boots with tailwind skill active on Tailwind projects
