# Rosehill — Workspace Model Patterns

> CLAUDE.md turnstile, agent junction, workspace organization. From Forge DMS vault (our own patterns).

## Source: Forge DMS vault (the canonical implementation)

Rosehill patterns are what WE built. Documented here as the reference implementation for genericization.

## CLAUDE.md Turnstile Pattern

Auto-loaded entry point that:
1. Declares identity (who am I?)
2. Links to current state (read STARTUP.md, BOOT.md)
3. Maps trigger words to protocols ("start L2-A" → build loop)
4. Lists available tools and their scoping
5. Defines rules and failure modes
6. References key file paths

**Key insight:** CLAUDE.md is NOT a prompt. It's a bridge — tells the AI how to USE the vault, not what the vault contains.

## Agent Junction Pattern (Handoff)

7-phase build loop: WAKE → LOAD HUD → PRE-INTEL → BUILD → GATE → REGRESSION → CLOSE

Handoff protocol:
- BOOT.md maintains state across sessions
- Session boundary at 70% context window
- Next session reads BOOT and picks up immediately
- No context bleed between sessions

## Workspace Model

```
vault/
├── STARTUP.md        # Current state
├── CLAUDE.md         # Bridge (auto-loaded)
├── 01-adl/           # Architecture decisions (locked)
├── 02-team-logs/     # Persona state (10 personas)
├── 04-cross-refs/    # Collaboration system
├── 06-bible-segments/# Canonical spec segments
└── 13-repo/          # Live code
```

Separation of concerns: specs (06-bible-segments) vs code (13-repo) vs state (02-team-logs) vs decisions (01-adl).

## How to Use in Forge OS

This IS our pattern. Genericize by:
- Replace `06-bible-segments/` → `{{project.spec_dir}}/`
- Replace `13-repo/` → `{{project.repo_dir}}/`
- Replace DMS-specific ADL entries → project-specific ADL template
- Keep the turnstile + junction + workspace separation model
