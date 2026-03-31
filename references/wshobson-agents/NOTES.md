# wshobson/agents — Plugin Marketplace Patterns

> Model tiering, progressive disclosure, plugin evaluation. From wshobson/agents.

## Repo: github.com/wshobson/agents

72 plugins + 112 agents + 146 skills + 79 tools. Includes PluginEval quality framework.

## Model Tiering Strategy

| Tier | Model | Use Case | Count |
|------|-------|----------|-------|
| Tier 1 | Opus | Architecture, security, code review, production coding | 42 |
| Tier 2 | Inherit | Complex tasks — user chooses model | 42 |
| Tier 3 | Sonnet | Support: docs, testing, debugging, APIs, DX | 51 |
| Tier 4 | Haiku | Fast ops: SEO, deployment, simple docs, search | 18 |

**Rationale:** Opus for 80.8% SWE-bench accuracy + 65% fewer tokens on complex tasks. Haiku for speed-critical, low-complexity operations.

## Progressive Disclosure (Skills)

Three-tier architecture:
1. **Metadata** — Name, description, trigger conditions (always loaded)
2. **Instructions** — Full prompt, methodology (loaded on activation)
3. **Resources** — Reference files, examples (loaded on demand)

Skills activate on specific triggers: "when building FastAPI project" → Python async patterns skill.

## PluginEval Quality Framework

3-layer evaluation:
1. **Static** — Structural checks (frontmatter, file presence, naming)
2. **LLM Judge** — Semantic quality (is the prompt clear? actionable?)
3. **Monte Carlo** — Statistical reliability (repeat tests, compute variance)

10 quality dimensions:
- 25% triggering accuracy
- 15% instruction clarity
- 12% tool scoping
- 10% cross-plugin coherence
- Down to 2% ecosystem coherence

Quality badges: Platinum (>=90), Gold (>=80), Silver (>=70), Bronze (>=60)

Anti-pattern detection: OVER_CONSTRAINED, BLOATED_SKILL, DEAD_CROSS_REF

## Agent Frontmatter Pattern

```yaml
---
name: agent-name
description: "What this agent does. Use PROACTIVELY when [trigger]."
model: opus|sonnet|haiku|inherit
tools: Read, Grep, Glob
---
```

## How to Use in Forge OS

**Model tiering:** Adopt the 4-tier model. Map to our capability system: high=Opus, medium=Sonnet, fast=Haiku, inherit=user choice. Already planned in P2-M.

**Progressive disclosure:** Apply to agent loading. Don't parse 105 agent files on startup. Load metadata (frontmatter) only, then full prompt on activation.

**PluginEval:** Adapt for our agent quality certification. Run static + semantic checks on all genericized agents in P2-T verification step.
