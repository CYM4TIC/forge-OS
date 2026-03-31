# Gate Protocol

> Every batch gets reviewed by external agents. The builder never grades their own work.

## Gate Types

**Build Triad** (Frontend): Pierce (QA) + Mara (UX) + Riven (Design). After every frontend batch.

**Systems Triad** (Backend): Kehinde (Systems) + Tanaka (Security) + Vane (Financial). After backend batches with auth/financial implications.

**Strategy Triad** (Business): Calloway (Growth) + Voss (Legal) + Sable (Brand). Before customer-facing launches.

**Full Audit** (Nuclear): All triads + Wraith + Sentinel + Meridian. Layer exits, milestones, pre-launch.

**Red Team** (Adversarial): Wraith + sub-agents. High-risk surfaces (auth, payments, deletion).

## Enforcement
- All findings get fixed before batch closes. No deferrals. CRIT through LOW.
- Agent results are authoritative (Rule 30).
- Sentinel regression check after every gate pass.
- NEVER simulate a gate inline (Rule 29).

## Configuring Gates
`projects/{name}/vault/cross-refs/PERSONA-GATES.md` maps batches to required gates.
