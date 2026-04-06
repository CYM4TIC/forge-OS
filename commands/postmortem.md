---
name: postmortem
description: Blameless incident analysis — Chronicle + domain personas for root cause and prevention
user_invocable: true
---

# /postmortem

Run a blameless postmortem on an incident or failure.

## Protocol
1. Run `/council` scoped to the incident (Nyx dispatches all 10 non-Nyx personas)
2. Nyx constructs timeline (chronicle sub-agent), domain personas provide diagnosis → root cause analysis → prevention
3. Produces: timeline, 5 Whys, action items, lessons learned

Usage: `/postmortem [incident description]` (e.g., `/postmortem build failure in batch X`, `/postmortem email service timeouts`)
