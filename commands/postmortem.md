---
name: postmortem
description: Blameless incident analysis — Chronicle + domain personas for root cause and prevention
user_invocable: true
---

# /postmortem

Run a blameless postmortem on an incident or failure.

## Protocol
1. Dispatch `agents/discussion-protocol.md --council` scoped to the incident
2. Nyx constructs timeline (absorbed Chronicle), domain personas provide diagnosis → root cause analysis → prevention
3. Produces: timeline, 5 Whys, action items, lessons learned

Usage: `/postmortem [incident description]` (e.g., `/postmortem build failure in batch X`, `/postmortem email service timeouts`)
