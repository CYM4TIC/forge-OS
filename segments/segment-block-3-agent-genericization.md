# Block 3: Agent Genericization

> **Sessions:** 4-5 | **Batches:** OS-B3.A through OS-B3.E | **Source:** BUILD-PLAN.md Block 3

---

## OS-B3.A: 10 Personas (main agents)
Nyx, Pierce, Mara, Riven, Kehinde, Tanaka, Vane, Voss, Calloway, Sable. Strip DMS tables/RPCs/segments. Keep methodology, rules, checklists, tools, personality, failure modes. Output: `.claude/agents/` with 10 genericized persona files.

## OS-B3.B: 10 Intelligences + Customer Lens
Scout, Sentinel, Wraith, Meridian, Chronicle, Arbiter, Compass, Scribe, Kiln, Beacon, Customer-Lens. Same genericization process.

## OS-B3.C: 10 Orchestrators + 10 Utilities
All 20 entities. Update vault path references to OS structure.

## OS-B3.D: 34 Sub-agents
Batch 8-10 per micro-batch. Inherit parent structure. Output: `.claude/agents/sub-agents/`.

## OS-B3.E: 30 Commands + model tiering + persona enhancements
- Genericize all commands to `.claude/commands/`
- Add `model:` frontmatter to all 74 agent files (OS-ADL-006)
- Tanaka: Trail of Bits static analysis + supply chain sub-agents (2 new sub-agents)
- Mara: design intelligence + SEO + Pretext/CLS evaluation rules + new sub-agent (mara-design-intelligence)
- Riven: canvas rendering token compliance + tailwind skill ref
- Kehinde: postgres skill ref
- Nyx: nextjs skill ref for projects using Next.js
- Vane: stripe skill ref

### Exit Gate
- 105 agent files in `.claude/agents/` and `.claude/agents/sub-agents/`
- 30 command files in `.claude/commands/`
- All files have `model:` frontmatter
- Zero DMS-specific references (grep verification)
- Tanaka, Mara, Riven, Kehinde, Nyx, Vane enhancements complete
- Pushed to GitHub: "105 agents genericized + enhanced"

---
