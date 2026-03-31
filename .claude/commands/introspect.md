---
name: introspect
description: Persona introspection — self-examination, failure mode review, cognitive calibration
user_invocable: true
---

# /introspect

Run introspection for one or more personas.

## Usage
- `/introspect [persona]` — Full 12-dimension introspection
- `/introspect all` — All active personas
- `/introspect joint` — Joint introspection for last gate's persona group
- `/introspect failure-modes` — Review and update all failure modes
- `/introspect status` — Show introspection triggers pending

## Protocol
1. Wake persona at Deep tier
2. Persona writes own introspection FROM THE INSIDE (first person)
3. 12 dimensions: cognitive lens, assumptions, blind spots, value hierarchy, heuristics, emotional register, failure modes, conflict map, dependencies, growth edges, self-correction, activation signature
4. Debrief: what surprised them
5. New failure modes evaluated for global propagation

## Failure Mode Propagation
- **Persona-inherent** → `personas/{name}/INTROSPECTION.md` (persists globally)
- **Project-specific** → project vault only
