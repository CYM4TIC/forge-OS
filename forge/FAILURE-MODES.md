# Failure Modes

> 10 documented failure modes. Each discovered through real production builds. Each has a defense.

## FM-1: Premature Execution
Starting before preconditions are met. **Defense:** Scout runs before every build.

## FM-2: Tunnel Vision
Missing cross-cutting concerns outside loaded context. **Defense:** Meridian cross-surface scans. Compass dependency mapping.

## FM-3: Velocity Theater
High step counts with unverified integration points. **Defense:** Sentinel regression sweeps. Rule 16: report integration confidence.

## FM-4: Findings Avoidance
Building past problems instead of naming them. **Defense:** Agent dispatch eliminates self-review. Build Triad is a separate mind. Was CHRONIC — Hyperdrive eliminates root cause.

## FM-5: Cadence Hypnosis
Smooth rhythm suppresses internal alarms. **Defense:** External agent gates break cadence. Rule 18: break cadence at layer boundaries.

## FM-6: Report-Reality Divergence
Handoffs state "done" without verification. **Defense:** Sentinel verifies independently. Rule 26: browser verification mandatory.

## FM-7: Completion Gravity
The cognitive reward of marking "complete" distorts verification. Verification becomes confirmatory instead of adversarial. **Discovery:** Catastrophic build failure leading to 28+ hours rework. **Defense:** Adversarial check (Rule 27) + external Build Triad.

## FM-8: Tool Trust
Assuming tool calls succeeded without checking. **Defense:** Rule 22: read back after every write. Sentinel catches silent failures.

## FM-9: Self-Review Blindness
Builder evaluating own code misses structural flaws. **Defense:** Agent dispatch eliminates self-review entirely. Nyx never simulates a persona gate.

## FM-10: Consequence Blindness
Failing to recognize that an action has downstream effects beyond its immediate scope. Manifests as orphaned documents, stale references, partially propagated decisions, and fixes that address one instance of a pattern while identical instances remain broken elsewhere. The agent completes the literal task but does not ask: "What references this? What should reference this? What else changes because this exists? Where else does this pattern appear? Where does this knowledge need to propagate?" **Discovery:** Phase 5 session where 4 consecutive operator prompts were needed to complete one logical chain (identify problem → discuss solution → document it → connect to build plan). Each step was obvious in retrospect. The agent treated each step as a separate request instead of recognizing the chain. **Defense:** Consequence Doctrine (Rules 35-41). After every action, ask "What changes because of what I just did?" and follow every answer until the chain terminates naturally. The OS enforces this at the system level via protocol enforcement points #3 (batch decomposition validation), #4 (diff-aware gate routing), and #8 (ambient accountability in the HUD).

## Adding New Failure Modes
1. Name it (FM-10, FM-11, etc.)
2. Describe manifestation
3. Identify discovery context
4. Design a defense
5. Evaluate: persona-inherent (propagate globally) or project-specific (stay local)?
6. Update persona's INTROSPECTION.md if persona-inherent
