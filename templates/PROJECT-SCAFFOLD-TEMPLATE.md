# Project Scaffold Template

> **Standard structure for new Forge OS projects.** When `/init` or `/link` creates a new project, this is the directory structure and file set generated.

---

## Directory Structure

```
projects/{project-name}/
├── PROJECT.json               # Stack, personas, phase, config
├── repo -> /path/to/repo      # Symlink or clone of the code repository
└── vault/
    ├── STARTUP.md             # Project state (entry point — current state, triggers, nav)
    ├── specs/                 # Product spec + segments
    │   └── segments/          # Broken-down spec segments by domain
    ├── adl/                   # Architecture Decision Log
    │   └── locked-decisions.md
    ├── team-logs/             # Per-persona: assignment + state + findings
    │   └── {persona}/
    │       ├── PERSONA-ASSIGNMENT.md   # What this persona does HERE
    │       ├── BOOT.md                 # Build state for this persona
    │       └── findings-log.md         # Findings with severities
    ├── cross-refs/            # Build coordination files
    │   ├── BUILD-LEARNINGS.md
    │   ├── BATCH-MANIFESTS.md
    │   ├── DEPENDENCY-BOARD.md
    │   └── PERSONA-GATES.md
    ├── session-transcripts/   # Session outputs and retros
    └── decisions/             # Decision journal (WHY entries)
```

## PROJECT.json Schema

```json
{
  "name": "project-name",
  "description": "One-line project description",
  "stack": {
    "frontend": "react|next|vue|svelte|none",
    "backend": "supabase|postgres|node|python|none",
    "hosting": "vercel|cloudflare|aws|none",
    "css": "tailwind|css-modules|styled-components|none"
  },
  "personas": {
    "active": ["nyx", "pierce"],
    "available": ["mara", "riven", "sable", "kehinde", "tanaka", "vane", "voss", "calloway"]
  },
  "phase": "discovery|spec|build|test|deploy",
  "created": "YYYY-MM-DD",
  "repo_path": "/absolute/path/to/repo"
}
```

## STARTUP.md Template

```markdown
# [Project Name] — Current State

## What This Is
[1-2 sentences describing the project]

## Current Phase
[discovery / spec / build / test / deploy]

## What Just Happened
[3-5 bullet points from the last session]

## What's Next
[1-3 immediate next actions]

## Quick Links
- Repo: [path or URL]
- Build state: `vault/team-logs/nyx/BOOT.md`
- ADL: `vault/adl/locked-decisions.md`
- Batch manifests: `vault/cross-refs/BATCH-MANIFESTS.md`
```

## PERSONA-ASSIGNMENT.md Template

```markdown
# Dr. [Name] — [Project Name] Assignment

## Role in This Project
[What this persona specifically does for THIS project]

## Domain Scope
[Which parts of the codebase/spec this persona owns or reviews]

## Key Constraints
[Project-specific rules or limitations for this persona]

## Current Focus
[What this persona is currently working on or waiting for]
```

## Layout Engine Detection

When the project's `repo_path` contains Pretext (`@chenglou/pretext` in dependencies):
- Add `layout_engine: "pretext"` to PROJECT.json
- Include Pretext-specific component patterns in the scaffold
- Riven's assignment should note hybrid DOM+Canvas rendering constraints
- Mara's assignment should note Canvas accessibility considerations
