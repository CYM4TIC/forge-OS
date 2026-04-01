# Forge OS — Activation Guide

> How to activate Forge OS on a new project or link an existing codebase.

---

## Two Paths

| Path | Command | When |
|------|---------|------|
| **New Project** | `/init` | Start from scratch — guided discovery, architecture, spec, build planning |
| **Existing Codebase** | `/link` | Already have code — agent discovery, architecture report, vault generation |

---

## `/init` — New Project Flow

### Step 1: Discovery Interview

Nyx runs the Deep Interview Protocol (`docs/DEEP-INTERVIEW-PROTOCOL.md`):

```
1. What are you building? (product type, industry, users)
2. What's your stack preference? (or let Nyx recommend)
3. Who are the users? (roles, permissions, workflows)
4. What's the business model? (pricing, tiers, monetization)
5. What exists already? (designs, docs, competitor examples)
```

Ambiguity scoring drives interview depth. High ambiguity = more rounds. Low = fast-track.

### Step 2: Architecture Decisions

From interview output, Nyx proposes an ADL (Architecture Decision Log):
- Stack choices (framework, DB, hosting, auth)
- Naming conventions
- Business logic rules
- Security boundaries

Operator approves/modifies each decision. Approved decisions become LAW.

### Step 3: Spec Generation

Nyx generates product spec segments from interview + ADL:
- One segment per domain (auth, payments, users, etc.)
- Each segment: tables, RPCs, UI surfaces, business rules
- Cross-referenced to ADL entries

### Step 4: Build Planning

Spec segments decomposed into:
- Layers (dependency-ordered: schema → backend → frontend → integration)
- Batches (1-3 files each, independently verifiable)
- Persona gates (which personas review which batches)

### Step 5: Vault Generation

```
projects/{name}/
├── PROJECT.json              # Stack, personas, phase
├── repo -> /path/to/repo     # Symlink to code
└── vault/
    ├── STARTUP.md             # Project state
    ├── specs/                 # Generated spec segments
    ├── adl/                   # Architecture decisions
    ├── team-logs/             # Per-persona assignments
    ├── cross-refs/            # Manifests, learnings, gates
    ├── session-transcripts/
    └── decisions/
```

### Step 6: Config Update

`forge-os.config.json` updated:
```json
{
  "active_project": "my-project",
  "projects": {
    "my-project": {
      "path": "projects/my-project",
      "repo": "/path/to/repo",
      "created": "2026-03-31",
      "stack": ["react", "supabase", "tailwind"],
      "phase": "L0",
      "personas_active": ["nyx", "pierce", "kehinde", "tanaka"]
    }
  }
}
```

---

## `/link` — Existing Codebase Flow

### Step 1: Agent Discovery

Scout scans the codebase:
- File structure and framework detection
- Database schema (if accessible)
- Existing tests, CI/CD, deployment config
- Dependencies and package analysis
- Auth patterns, API structure

### Step 2: Architecture Report

From Scout's findings, Nyx generates:
- Stack assessment (what's in use, what's well-structured, what's risky)
- Proposed ADL entries (reverse-engineered from codebase conventions)
- Gap analysis (what's missing: tests, types, security, docs)

### Step 3: Vault Generation

Same structure as `/init`, but populated from discovered architecture rather than interview.

### Step 4: Persona Calibration

Each persona runs initial calibration against the codebase:
- Pierce: spec conformance baseline (what exists vs. what should)
- Tanaka: security audit baseline (RLS, auth, PII)
- Mara: UX baseline (accessibility, mobile, loading states)
- Kehinde: architecture baseline (failure modes, scaling concerns)

Results stored in per-persona `findings-log.md` as the initial baseline.

---

## MCP Setup

After activation, set up MCPs in priority order:

**Tier 1 — Start here:**
1. GitHub MCP — code access for all agents
2. Database MCP — live schema queries (Supabase, Postgres, etc.)

**Tier 2 — When building frontend:**
3. Preview MCP — browser verification for Mara, Riven, Pierce, Sentinel
4. Browser/Chrome MCP — deep interaction testing for Wraith

**Tier 3 — When project matures:**
5. Project tracker (Linear/Jira) — build state sync
6. Cloud MCPs — infrastructure verification

See CLAUDE.md "Platform Orientation" section for full MCP tier details.

---

## Post-Activation

Once activated, the operator can:
- `start [batch]` or `next batch` — Begin building
- `wake up [name]` — Activate a specific persona
- `council this` — Get all 10 perspectives on a question
- `/gate` — Run persona gates on current work
- `/status` — See build state summary

The project is now managed by Forge OS. Nyx orchestrates. Personas review. The operator decides.

---

*Forge OS Activation Guide — written 2026-03-31 by Nyx.*
