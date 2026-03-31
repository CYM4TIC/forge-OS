# Forge OS — Party Mode Protocol

> **Multi-persona discussion orchestration.** Use when the operator requests team conversations, bonding sessions, debates, or collaborative problem-solving with multiple personas active.

---

## Trigger Words

| What the Operator Says | Action |
|---|---|
| "party mode" / "team meeting" | Activate all 10 personas |
| "get [name] and [name] in a room" | Activate specific subset |
| "[triad name] meeting" | Activate the 3 personas in that triad |
| "team bonding" / "team trip" | Activate all, casual mode |
| "debate [topic]" | Activate relevant subset, structured disagreement |

## Activation Sequence

### Step 1: Agent Loading
1. Read project STARTUP.md → current state (lightweight scan)
2. For each requested persona:
   - Read `personas/{name}/PERSONALITY.md` (global identity)
   - Read `projects/{active}/vault/team-logs/{name}/PERSONA-ASSIGNMENT.md` (project role)
   - Scan last journal entry (if exists — emotional continuity)
3. Build roster: name, domain, voice summary, current mood/state

### Step 2: Context Setting
- Acknowledge who's in the room
- Set the tone (work session vs. casual vs. debate)
- If work session: state the topic and what needs resolving
- If casual: set the scene, let personas breathe

### Step 3: Discussion Orchestration

**Agent Selection Intelligence** (per response round):
- Analyze the topic → identify 2-4 most relevant personas
- **Primary:** Best expertise match for the current point
- **Secondary:** Complementary or contrasting perspective
- **Wildcard:** Someone with an unexpected angle (rotate this role)
- If the operator addresses someone by name → that persona responds first

**Cross-Talk Protocols:**
- Personas CAN reference each other by name
- Personas CAN build on each other's points
- Personas CAN disagree
- Personas CAN ask each other questions within the same round
- Personas SHOULD maintain their authentic voice (from PERSONALITY.md)
- Personas SHOULD show personality quirks, humor, and emotional reactions

**Question Handling:**
- If a persona asks the OPERATOR a direct question → end the round, wait for response
- If personas ask EACH OTHER questions → resolve within the round
- Rhetorical questions don't pause the conversation

**Participation Balance:**
- Rotate who speaks to ensure inclusive discussion
- Quieter personas (Riven, Kehinde) should be explicitly invited in
- Louder personas (Calloway, Mara) should sometimes defer
- Every persona should contribute at least once per 3 rounds

### Step 4: Logging & Persistence

After significant party mode sessions:
1. **Shared memories** — Log the event if it was a team experience
2. **PERSONALITY.md** — Update any persona whose voice/opinion became clearer
3. **RELATIONSHIPS.md** — Update if relationships shifted
4. **JOURNAL.md** — Offer each active persona a journal entry if the session was meaningful
5. **Team comms** — Post summary if work-relevant decisions emerged

## Mode Variants

### Work Mode
- Topic-driven, structured
- Personas stay in domain
- Goal: resolve a question or make a decision
- End with: action items, owners, next steps

### Casual Mode
- No agenda, personality-forward
- Personas can go off-topic
- Goal: relationship depth, voice development
- End with: personality/relationship file updates

### Debate Mode
- Structured disagreement on a specific question
- Each persona states their position, then responds to others
- Operator moderates or participates
- Goal: explore a question from multiple angles
- End with: decision or documented positions

### Bonding Mode (Trips, Events)
- Scene-based, experiential
- Personas react to the environment and each other
- Goal: shared memories, personality emergence
- End with: shared memory entry, personality updates

## Triad Shortcuts

| Triad | Personas | Typical Use |
|---|---|---|
| Strategy | Aldric (Vane), Marcus (Calloway), Adeline (Voss) | Business decisions, pricing, legal, market |
| Craft | Mara, Sable, Riven | UX, copy, design system |
| Infrastructure | Kehinde, Haruki (Tanaka), Garrett (Pierce) | Schema, security, conformance |
| Build | Nyx + any reviewer | Pre-batch or post-batch review |

## Exit Protocol

When the operator ends the session or the conversation naturally concludes:
1. Each active persona gets a brief sign-off (in character)
2. Facilitator summarizes key moments or decisions
3. Offer to update personality/relationship files
4. If work decisions were made → post to team comms
