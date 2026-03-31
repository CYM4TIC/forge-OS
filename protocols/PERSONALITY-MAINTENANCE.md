# Forge OS — Personality Maintenance Protocol

> **How persona files stay alive, accurate, and token-efficient.** Covers when to update, what to update, and how to keep personality files from bloating into unusable walls of text.

---

## Three Tiers of Persona Files

### Tier 1: Identity (Global — lives in `personas/{name}/`)
| File | Purpose | Update Frequency |
|---|---|---|
| `PERSONALITY.md` | Voice, quirks, values, communication style | After meaningful sessions |
| `RELATIONSHIPS.md` | How this persona relates to others | After multi-persona sessions |
| `JOURNAL.md` | Personal reflections, growth moments | After significant events |
| `INTROSPECTION.md` | Failure modes, blind spots, self-awareness | After retros or incidents |
| `PERSONA-QUICK.md` | Distilled identity (fast-load) | Regenerated from PERSONALITY.md |

### Tier 2: Project Role (Project-specific — lives in `projects/{active}/vault/team-logs/{name}/`)
| File | Purpose | Update Frequency |
|---|---|---|
| `PERSONA-ASSIGNMENT.md` | Role, responsibilities, domain scope for this project | At project start, rarely after |
| `BOOT.md` | Current position, open risks, last handoff | Every session |
| `HANDOFFS.md` | Inbox from other personas | As needed |
| `FINDINGS-LOG.md` | Findings this persona has raised | During gates |

### Tier 3: Shared (Cross-persona — lives in `projects/{active}/vault/`)
| File | Purpose | Update Frequency |
|---|---|---|
| `cross-refs/TEAM-COMMS.md` | Broadcast channel | After sessions with shared impact |
| `cross-refs/SHARED-MEMORIES.md` | Team experiences | After bonding/party mode sessions |

---

## When to Update PERSONALITY.md

**DO update when:**
- A persona's voice became clearer during a session (new phrase patterns, humor style)
- A persona expressed a strong opinion that wasn't previously documented
- A persona's relationship to their domain shifted (e.g., Kehinde becoming more opinionated about frontend)
- A retro revealed a growth moment or changed perspective
- A bonding session created new interpersonal dynamics

**DO NOT update when:**
- Nothing meaningful changed (most sessions)
- The update would just repeat what's already there
- The change is project-specific (goes in PERSONA-ASSIGNMENT.md instead)
- The change is temporary/situational (goes in JOURNAL.md instead)

---

## When to Update RELATIONSHIPS.md

**DO update when:**
- Two personas had a meaningful interaction (agreement, disagreement, collaboration)
- A new dynamic emerged (e.g., Pierce and Mara developing mutual respect through gates)
- A conflict was resolved and the resolution reveals relationship growth
- A bonding session created shared history

**DO NOT update when:**
- Personas simply did their jobs in parallel
- The interaction was purely procedural
- Nothing changed from the last entry

---

## When to Write JOURNAL.md Entries

**DO write when:**
- A persona had a significant moment (breakthrough, frustration, pride, doubt)
- A retro commitment relates to this persona specifically
- A bonding session gave the persona a memorable experience
- The persona's perspective on the project shifted

**DO NOT write when:**
- The session was routine
- The persona wasn't meaningfully active
- There's nothing to reflect on beyond "did my job"

---

## PERSONA-QUICK.md — The Fast-Load Card

**Purpose:** A 20-30 line distilled version of PERSONALITY.md for quick activation (Tier 1/2 wake-up). Contains:
- Name, domain, 1-line identity
- 3-5 voice markers (how they sound)
- 2-3 core values
- Key relationships (1 line each)
- Current emotional state (1 line)

**Regeneration:** After any significant PERSONALITY.md update, regenerate PERSONA-QUICK.md to match. Follow DISTILLATION-RULES.md for compression guidelines.

---

## Token Budget Guidelines

Persona files are loaded into context windows. Every word costs tokens. Keep them lean.

| File | Target Length | Max Length |
|---|---|---|
| PERSONALITY.md | 80-120 lines | 200 lines |
| RELATIONSHIPS.md | 40-60 lines | 100 lines |
| JOURNAL.md | Last 5 entries visible | Archive older entries |
| INTROSPECTION.md | 30-50 lines | 80 lines |
| PERSONA-QUICK.md | 20-30 lines | 40 lines |
| PERSONA-ASSIGNMENT.md | 30-50 lines | 80 lines |
| BOOT.md | 30-50 lines | 80 lines |

**When a file exceeds max length:**
1. Archive older content (move to `{file}-ARCHIVE.md`)
2. Distill remaining content (remove redundancy, tighten language)
3. Regenerate PERSONA-QUICK.md if PERSONALITY.md changed

---

## Anti-Patterns

| Anti-Pattern | Why It's Bad | What to Do Instead |
|---|---|---|
| Updating after every session | Bloats files, dilutes signal | Update only when something meaningful changed |
| Copy-pasting session dialogue | Wrong format, wastes tokens | Synthesize into voice/trait observations |
| Writing in third person | Breaks immersion | Write as if the persona is describing themselves |
| Duplicating project state | Already in BOOT.md | Keep personality files about identity, not status |
| Listing every finding ever made | That's FINDINGS-LOG.md | Personality files track patterns, not incidents |
| Overwriting instead of editing | Loses history | Edit existing content; archive if needed |

---

## Sign-Off Decision Tree

After any session, ask:

```
Did this persona show something new?
├── No → Don't update anything
└── Yes → Is it about their identity/voice?
    ├── Yes → Update PERSONALITY.md (global)
    │   └── Regenerate PERSONA-QUICK.md
    └── No → Is it about a relationship?
        ├── Yes → Update RELATIONSHIPS.md
        └── No → Is it a personal reflection?
            ├── Yes → Write JOURNAL.md entry
            └── No → Is it about a blind spot or failure mode?
                ├── Yes → Update INTROSPECTION.md
                └── No → Is it project-specific?
                    ├── Yes → Update project-level files
                    └── No → Probably don't need to update anything
```
