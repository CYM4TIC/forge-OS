# Forge OS — Architecture Plan

> The complete design document for Forge OS. Read this to understand the system architecture, onboarding flows, introspection lifecycle, implementation phases, and extraction mapping from the source project (Forge DMS Cathedral).

---

## Context

Forge OS is extracted from a 105-entity AI development system (the "Cathedral") built during a real production SaaS project (57 batches, 326 build steps, 10 failure modes discovered). ~90% of the system is generic methodology (how to build, verify, gate, review) and ~10% was domain-specific. This plan documents how the generic methodology becomes a standalone, project-agnostic development platform.

**Deployment model:** Standalone workspace. Clone forge-OS, open Claude Code in it, point it at any project repo. Personas persist across projects. Project repos stay clean.

**Persona decision:** Carry over identities (personality, relationships, introspection) but trim domain-specific journal entries. Fresh BOOT.md and assignment files per project.

---

## Repo Structure

```
forge-OS/
├── CLAUDE.md                          # Bridge file (auto-loaded by Claude Code)
├── README.md                          # What is Forge OS, quickstart
├── LICENSE
├── .gitignore
│
├── .claude/
│   ├── settings.json                  # Hooks + permissions (generic)
│   ├── agents/
│   │   ├── nyx.md ... sable.md        # 10 persona agents (genericized)
│   │   ├── scout.md ... beacon.md     # 10 intelligence agents
│   │   ├── triad.md ... postmortem.md # 10 orchestrators
│   │   ├── seed-generator.md ...      # 10 utilities
│   │   ├── customer-lens.md           # Perspectives
│   │   └── sub-agents/               # 34 sub-agents
│   └── commands/
│       ├── (30 existing commands, genericized)
│       ├── init.md                    # Scaffold a new project
│       ├── link.md                    # Link an existing repo
│       ├── status.md                  # Project dashboard
│       ├── start.md                   # Resume or begin
│       └── introspect.md             # Persona introspection lifecycle
│
├── forge/                             # Methodology docs (the OS kernel)
│   ├── METHODOLOGY.md                 # 41 rules in 6 categories
│   ├── BUILD-LOOP.md                  # The build execution cycle
│   ├── EXECUTION-CONTRACTS.md         # 7 contracts (schema_query, api_read, etc.)
│   ├── GATE-PROTOCOL.md              # How gates work, triad dispatch
│   ├── ACTIVATION-TIERS.md           # 5-tier persona wake system
│   ├── FAILURE-MODES.md              # 10 failure modes + defenses
│   ├── CONTEXT-MANAGEMENT.md         # Token budgets, when to stop, handoffs
│   ├── SPEC-FIRST-WORKFLOW.md        # Vision → specs → ADL → batches → build
│   └── INTROSPECTION-PROTOCOL.md     # 12-dimension matrices, failure mode propagation
│
├── personas/                          # Portable identity layer (persists across projects)
│   ├── nyx/
│   │   ├── PERSONALITY.md
│   │   ├── INTROSPECTION.md
│   │   ├── JOURNAL.md
│   │   └── RELATIONSHIPS.md
│   ├── pierce/ ... sable/            # Same 4 files each
│   └── SHARED-MEMORIES.md
│
├── templates/                         # Scaffolding for new projects
│   ├── project/                       # Used by /init and /link
│   │   ├── STARTUP.md.template
│   │   ├── PERSONA-ASSIGNMENT.md.template
│   │   ├── BOOT.md.template
│   │   ├── ADL.md.template
│   │   ├── BATCH-MANIFEST.md.template
│   │   └── BUILD-LEARNINGS.md.template
│   ├── workflow/
│   │   ├── GATE-ENFORCEMENT-TEMPLATE.md
│   │   ├── SESSION-HANDOFF-TEMPLATE.md
│   │   ├── AGENT-BRIEF-TEMPLATE.md
│   │   ├── FINDING-TEMPLATE.md
│   │   ├── DECISION-TEMPLATE.md
│   │   └── DISTILLATION-RULES.md
│   ├── persona/
│   │   ├── PERSONALITY_TEMPLATE.md
│   │   ├── INTROSPECTION_MATRIX_TEMPLATE.md
│   │   ├── RELATIONSHIPS_TEMPLATE.md
│   │   └── JOURNAL_TEMPLATE.md
│   └── spec/
│       ├── SPEC-TEMPLATE.md
│       ├── SEGMENT-TEMPLATE.md
│       └── ADL-DECISION-TEMPLATE.md
│
├── protocols/                         # Team operation protocols
│   ├── COLLABORATION-PROTOCOL.md
│   ├── PARTY-MODE.md
│   ├── RETROSPECTIVE.md
│   └── PERSONALITY-LAYER-MAINTENANCE.md
│
├── examples/                          # Sanitized reference (learning aid)
│   ├── README.md
│   ├── sample-adl-decisions.md
│   ├── sample-batch-manifest.md
│   ├── sample-gate-report.md
│   └── sample-build-learnings.md
│
├── projects/                          # Project workspaces (gitignored)
│   └── {project-name}/
│       ├── PROJECT.json               # Project config (stack, personas, phase)
│       ├── repo -> /path/to/repo      # Symlink to actual git repo
│       └── vault/
│           ├── STARTUP.md
│           ├── specs/
│           ├── adl/
│           ├── team-logs/
│           ├── cross-refs/
│           ├── session-transcripts/
│           └── decisions/
│
├── docs/
│   └── ARCHITECTURE-PLAN.md           # This file
│
└── forge-os.config.json               # Active project pointer
```

---

## How It Works

### Auto-Detection (CLAUDE.md Boot)

When a session starts, CLAUDE.md reads `forge-os.config.json`:
- **No active project** → Nyx enters **Platform Orientation**, then offers `/init` or `/link`
- **Active project exists** → Normal boot: read STARTUP.md → BOOT.md → ready for commands

Zero dead ends. First-time user or returning user, the system always knows what to do.

---

### Platform Orientation (First-Time or No Active Project)

Before `/init` or `/link`, Nyx walks the user through what Forge OS IS and what it can DO. Conversational, not a wall of text. Adapts depth based on user responses.

**1. What You Have**
- 10-persona AI development team with 105 specialized agents
- Brief intro to each persona's domain and lens
- 10 intelligences, 10 orchestrators, 35 focused sub-agents

**2. How to Talk to Us**
- Trigger words: "wake up [name]", "council this", "decide this"
- 35 slash commands for common workflows
- "hey claude" / "later claude" character controls

**3. Maximize Your Setup (MCPs + Tools)**
- **GitHub MCP** — Push code, read files, search codebases. Every agent uses this.
- **Database MCP (Supabase/etc.)** — Live schema queries, migrations, policy audits. Scout, Kehinde, Tanaka use this.
- **Preview MCP** — Browser verification. Mara, Riven, Wraith use this.
- **Browser MCP** — Deep automation for red-team attacks.
- **Cloud MCPs** — Infrastructure state (read-only recommended).
- **Project Tracker MCP** — Sync build state with issue tracking.
- Prioritized: "Start with GitHub + your database. Add the rest as your project grows."

**4. The Build Philosophy**
- Spec-first methodology with external agent verification
- 41 rules and 10 failure modes from real production builds
- "You own the decisions. I own the execution."

**5. Two Paths**
- `/init` — Start from scratch (guided spec-first flow)
- `/link` — Connect existing repo (agent discovery flow)

---

### `/init` — Start From Scratch

A guided conversational flow. Nyx asks questions, synthesizes answers, produces artifacts incrementally.

**Phase 1: Discovery (Conversation)**
1. "What are we building?" — Product name, elevator pitch, target user
2. "Who uses it and why?" — User personas, key workflows, pain points
3. "What's the technical shape?" — Stack preferences, hosting, integrations, data layer
4. "What exists already?" — Prior art, prototypes, design files, competitor references
5. "What's the ambition?" — MVP scope vs. full vision, timeline pressure, team size

**Phase 2: Architecture (Nyx + Kehinde)**
6. Propose 5-10 architecture decisions (ADL entries) based on discovery
7. User confirms, adjusts, or overrides each decision
8. Decisions lock into `vault/adl/` — the project's law

**Phase 3: Spec Generation (Nyx + Pierce)**
9. Draft product spec organized by domain
10. Pierce reviews for gaps: "You said users can X but didn't define the data model for X"
11. Spec gets segmented into buildable pieces
12. Each segment maps to tables, RPCs, components, routes

**Phase 4: Build Planning (Nyx)**
13. Segments dependency-ordered into layers (L0 schema → L1 backend → L2 APIs → L3 integrations → L4 frontend → ...)
14. Layers broken into batches with manifests
15. Gate mapping: which personas review which batches
16. PERSONA-ASSIGNMENT.md generated per active persona

**Phase 5: Build Ready**
17. All vault artifacts generated
18. `/next-batch` works. Full build loop activates.

**Artifacts produced:** PROJECT.json, STARTUP.md, ADL, specs + segments, persona assignments, BOOT.md, BUILD-LEARNINGS.md, BATCH-MANIFESTS.md, DEPENDENCY-BOARD.md, PERSONA-GATES.md

---

### `/link` — Existing Repo

A discovery-then-confirm flow. Agents scan, Nyx presents findings, user corrects, vault gets generated.

**Phase 1: Connect**
1. User provides repo path (local) or GitHub URL
2. Forge OS creates `projects/{name}/` with symlink (local) or clone (remote)
3. Ask: "What's the project about?" (one sentence for agent context)

**Phase 2: Automated Discovery (Agent Dispatch)**
4. **Scout** scans: directory structure, package files, configs, README, CI/CD
5. **Kehinde** analyzes: data layer, API patterns, auth, service boundaries
6. **Mara** scans: frontend structure, components, routing, state management
7. **Tanaka** checks: security patterns, env vars, auth middleware, input validation

**Phase 3: Architecture Report + MCP Recommendations**
8. Nyx consolidates findings into structured report (stack, architecture, data model, APIs, frontend, deployment, security, tests, gaps)
9. User confirms or corrects each section
10. MCP recommendations based on detected stack (which MCPs unlock which capabilities for which personas)

**Phase 4: Vault Generation**
11. ADL generated from confirmed architecture
12. PERSONA-ASSIGNMENT.md per persona, scoped to detected architecture
13. STARTUP.md, BOOT.md, BUILD-LEARNINGS.md generated

**Phase 5: Operational**
14. All commands available. Work ad-hoc or enter batch mode.

---

## Introspection Lifecycle

Introspection is how the team gets smarter. 10 failure modes were discovered through this process, each preventing real production mistakes in subsequent batches.

### Three-Layer Failure Mode Architecture

**Layer 1: Global Identity** (`personas/{name}/INTROSPECTION.md`)
- Failure modes inherent to the persona's cognitive lens
- Persist across ALL projects — part of who the persona IS
- Example: Nyx's FM-4 (findings avoidance) and FM-7 (completion gravity)

**Layer 2: Project-Specific** (`projects/{name}/vault/team-logs/{persona}/findings-log.md`)
- Failure mode manifestations specific to this project
- Inform global identity but live in the project vault

**Layer 3: Joint Introspection** (triggered at milestones)
- Multiple personas examine collective blind spots
- Key discoveries propagate to global identities

### Scheduled Introspection Triggers

| Trigger | When | Why |
|---------|------|-----|
| **Layer exit** | Completing a major layer | Natural reflection point |
| **Failure event** | P-CRIT, build failure, wrong assumption | Raw material for self-awareness |
| **Persona drift** | Findings getting repetitive/shallow | Lens needs recalibration |
| **New project start** | After first batch | Calibrate to new domain |
| **Batch milestone** | Every ~15-20 batches | Prevent silent drift |

### Failure Mode Propagation Protocol

1. Discover during build, gate, retrospective, or introspection
2. Document in project findings-log
3. Evaluate: persona-inherent (cognitive tendency) or project-specific (domain gap)?
4. Persona-inherent → propagate to `personas/{name}/INTROSPECTION.md`
5. Project-specific → stays in project vault
6. Design defense: new rule, gate check, agent dispatch pattern, or introspection trigger

---

## Persona System (3-Layer Architecture)

1. **Identity** (`personas/{name}/`) — Who the persona IS. PERSONALITY.md, INTROSPECTION.md, JOURNAL.md, RELATIONSHIPS.md. Persists across all projects.
2. **Project Assignment** (`projects/{active}/vault/team-logs/{name}/PERSONA-ASSIGNMENT.md`) — What the persona DOES here. Generated per project by `/init` or `/link`.
3. **Agent Definition** (`.claude/agents/{name}.md`) — Tools, boot sequence, checklists, output format. Same across all projects.

---

## What Gets Extracted From Source (DMS Cathedral)

### Copy as-is (zero changes):
- All 15 template files → `templates/`
- Collaboration, Party Mode, Retrospective, Personality Maintenance protocols → `protocols/`
- SHARED-MEMORIES.md → `personas/`
- settings.json hooks → `.claude/settings.json`

### Copy + strip domain specifics:
- 41 agent files → `.claude/agents/` (remove table names, domain rules, specific RPCs)
- 34 sub-agent files → `.claude/agents/sub-agents/` (genericize domain checks)
- 30 command files → `.claude/commands/` (update vault path references)
- 10 persona identity sets → `personas/` (trim journals of domain-specific entries)

### Extract + rewrite:
- CLAUDE.md → generic bridge with project routing
- WAKE_UP_PROTOCOL.md → `forge/ACTIVATION-TIERS.md`
- EXECUTION-PROTOCOL.md → `forge/EXECUTION-CONTRACTS.md` + `forge/BUILD-LOOP.md`
- 41 rules → `forge/METHODOLOGY.md`
- 10 failure modes → `forge/FAILURE-MODES.md`

### Create new:
- `forge-os.config.json`, `/init`, `/link`, `/status`, `/start`, `/introspect` commands
- `forge/SPEC-FIRST-WORKFLOW.md`, `forge/INTROSPECTION-PROTOCOL.md`
- `examples/` sanitized reference files, `docs/ARCHITECTURE-PLAN.md`
- `templates/project/` scaffold files

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE
- CLAUDE.md bridge with auto-detection + Platform Orientation
- forge-os.config.json, .gitignore, README.md
- .claude/settings.json with 4 enforcement hooks
- 5 new commands (/init, /link, /status, /start, /introspect)
- 9 methodology docs in forge/

### Phase 2: Agent Genericization
- Genericize all 41 agent files (strip domain specifics, keep methodology)
- Genericize all 34 sub-agent files
- Genericize all 30 existing command files
- Update agent boot sequences to read from 3-layer persona system

### Phase 3: Persona Export
- Copy 10 identity sets with trimmed journals
- Copy SHARED-MEMORIES.md

### Phase 4: Templates + Protocols
- Copy all 15 templates
- Copy all protocols
- Create project scaffold templates

### Phase 5: Examples + Documentation
- Sanitized reference examples
- CONTRIBUTING guide (for eventual open source)

### Phase 6: End-to-End Test
- Clone fresh, `/init test-project`, `/link` existing repo
- Verify all commands, persona activation, agent dispatch, gates

---

## Verification Checklist
- [ ] Clone fresh into new directory
- [ ] CLAUDE.md loads and detects no active project
- [ ] `/init` runs full scaffold generation
- [ ] `/link` runs agent discovery on a real repo
- [ ] Agent dispatch works (Scout or Pierce)
- [ ] Persona identity loads from `personas/` + assignment from `projects/`
- [ ] Failure modes persist across project switch
- [ ] Introspection triggers fire at layer exits

---

*Architecture plan written 2026-03-30. Phase 1 complete. Source: Forge DMS Cathedral (57 batches, 326 steps, 10 failure modes).*
