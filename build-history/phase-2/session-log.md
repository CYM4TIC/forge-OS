**2026-03-31 — Session 2.5 final: P2-T — Reference Integration + Phase 2 Close**
- **P2-T COMPLETE:** Reference doc integration + CLAUDE.md update + verification. 1267 insertions. Commit `147b5c4`.
- **New files (3):** `docs/PHASE-3-ARCHITECTURE.md` (Phase 3+ implementation roadmap synthesized from 3 reference docs — KAIROS, Swarm, Agent Dispatch, SQLite State, Auto-Compact, Dream, Magic Docs, Session Memory, LSP, and 7 more systems prioritized across 4 tiers), `forge/ACTIVATION-GUIDE.md` (/init + /link flows), `forge/ENTITY-CATALOG.md` (complete 105-entity inventory with tiers, tools, dependencies).
- **Updated files (7):** CLAUDE.md (architecture refs, entity inventory, Phase 2 complete), SWARM-PROTOCOL.md (+TeamFile manifest, mailbox types, permission sync, failure catalog), EXECUTION-GATES.md (+gate-persona dispatch mapping, escalation procedures, bypass conditions), DESIGN-INTELLIGENCE.md (+component token anatomy, dark mode testing), BUILD-LOOP.md (+error recovery flows, micro-batch definitions, timeout handling), HANDOFF-PROTOCOL.md (+9-section canonical handoff format from compaction engine), Vane PERSONA.md (DMS residue fix).
- **Verification:** 0 DMS strings (after 1 fix). 75/75 agents have model frontmatter. 105/105 entities counted. 34/34 sub-agents reference parents. 30/30 commands valid.
- **PHASE 2 CONTENT LAYER COMPLETE.** 33 batches across 5 sessions. All 105 entities genericized, documented, and verified. Phase 3 architecture roadmap written. GitHub pushed.

**2026-03-31 — Session 2.5 continued: P2-R + P2-S + Research Deep Dive**
- **P2-R COMPLETE:** 20 persona identity files (Mara, Riven, Sable, Calloway, Voss × 4 files each). 1816 insertions. Gate passed (28 DMS string patterns, 0 matches after 4 fixes). Commit `bd2ee87`.
- **P2-S COMPLETE:** 11 template/protocol files (7 templates + 4 protocols). 988 insertions. Gate passed. Commit `6273690`.
- **Ecosystem research:** 3 external repos analyzed (OpenClaude, OpenCode/Crush, Claw Dev). 6 patterns documented in `references/ecosystem/DESKTOP-APP-PATTERNS.md`. Key finding: SQLite session state should replace monolithic BOOT.md in Tauri app. Commit `2903ab4`.
- **Claude Code source deep dive v2:** Full second extraction from src.zip. 11 systems documented in `references/claude-code/SOURCE-DEEP-DIVE-V2.md` (KAIROS, Swarm, Coordinator, Dream, Magic Docs, Session Memory, Agent Summary, LSP, UltraPlan, Team Memory Sync, Buddy). Core systems in `SOURCE-DEEP-DIVE-V2-SYSTEMS.md` (system prompt construction, compaction engine with 9-section summary, memory extraction with 4-type taxonomy, agent dispatch with CacheSafeParams, skills/plugin system, permission system, hook lifecycle, background housekeeping). Commits `d5e5a9b`, `c2d7c47`.
- **Critical findings for Forge OS architecture:**
  - KAIROS daily-log memory model: append-only date logs + nightly dream consolidation. Solves BOOT.md monolith.
  - Swarm TeamFile + Mailbox + Permission Sync: full multi-agent orchestration matching our Cathedral design.
  - Coordinator mode: Anthropic's own implementation of the Nyx orchestrator pattern.
  - 9-section compaction summary: directly adoptable for our handoff template.
  - Magic Docs: auto-maintained files eliminate manual handoff writing (FM-6 defense).
- **4 GitHub commits this session.** All pushed to main.
- **Next: P2-T (CLAUDE.md + Verification) — FINAL BATCH of Phase 2.** Should load fresh to see final repo state. The KAIROS and Swarm patterns may influence CLAUDE.md wiring — specifically the daily-log memory model, TeamFile manifest concept, and coordinator mode prompt pattern.

**2026-03-31 — P2-S: Templates + Protocols**
- 11 files: 7 templates + 4 protocols
- Templates: SESSION-HANDOFF, GATE-ENFORCEMENT, AGENT-BRIEF, BUILD-REPORT, RETROSPECTIVE, DECISION-RECORD, PROJECT-SCAFFOLD.
- Protocols: PARTY-MODE, RETROSPECTIVE-PROTOCOL, PERSONALITY-MAINTENANCE, COLLABORATION-PROTOCOL.
- Source: DMS vault `05-templates/` + `04-cross-refs/` → genericized for Forge OS structure.
- PROJECT-SCAFFOLD-TEMPLATE includes Pretext layout engine detection, PROJECT.json schema, STARTUP.md template, PERSONA-ASSIGNMENT.md template.
- COLLABORATION-PROTOCOL is new (not in DMS) — defines communication channels, handoff patterns, triad coordination, conflict resolution, dependency management.
- Gate: grep for DMS-specific strings — zero matches.
- GitHub: 1 commit (11 files, 988 insertions), pushed to main.
- **P2-S ✅.** Next: P2-T (CLAUDE.md + Verification — FINAL BATCH of Phase 2).

**2026-03-31 — P2-R: Persona Identity Sets — Medium-Tier 5 (Mara, Riven, Sable, Calloway, Voss)**
- 20 files: 5 personas x 4 files (PERSONA.md, PERSONALITY.md, INTROSPECTION.md, RELATIONSHIPS.md)
- Source: DMS vault `02-team-logs/dr-{name}/` → genericized → `forge-os/repo/personas/{name}/`
- Genericization: stripped DMS batch refs, table names (repair_orders, customer_shop_links, notification_log, etc.), segment paths, vault paths, spec section refs (§6.2, §9B, etc.), DMS product names (Cast→customer app, Waypoint→marketplace, DMS Admin→admin dashboard, Terminal→point-of-sale terminal). Kept "CDK Global's DMS" in Mara's bio (professional background, not project-specific). Preserved: identity, rules, failure modes, voice samples, backstory, museum/Cowboys stories, emotional registers, collaboration dynamics, introspection matrices, cognitive lenses, value hierarchies, self-correction protocols, activation signatures.
- 3 post-gate fixes: Mara INTROSPECTION.md had 3 surviving DMS table refs (notification_log, customer_shop_links x2) → genericized. Sable INTROSPECTION.md had "powersports idiom" → "industry-specific idiom".
- Gate: grep for 28 DMS-specific strings across all 20 files — zero matches after fixes.
- GitHub: 1 commit (20 files, 1816 insertions), pushed to main.
- **Session 2.5 continued. P2-R ✅.** Next: P2-S (Templates + Protocols).

**2026-03-31 — P2-Q: Persona Identity Sets — High-Tier 5 (Nyx, Pierce, Kehinde, Tanaka, Vane)**
- 20 files: 5 personas x 4 files (PERSONA.md, PERSONALITY.md, INTROSPECTION.md, RELATIONSHIPS.md)
- Source: DMS vault `02-team-logs/dr-{name}/` → genericized → `forge-os/repo/personas/{name}/`
- Genericization: stripped all DMS batch refs (L0-A through L4-M), DMS table names (repair_orders, approval_tokens, etc.), segment paths (06-bible-segments/), vault paths (02-team-logs/, 04-cross-refs/), "bible" → "spec". Preserved: identity, rules, failure modes, voice samples, backstory fragments, museum/Cowboys stories, emotional registers, collaboration dynamics, introspection matrices with post-build addendums, cognitive lenses, value hierarchies, self-correction protocols, activation signatures.
- Gate: grep for 28 DMS-specific strings across all 20 files — zero matches.
- GitHub: 1 commit (20 files, 2122 insertions), pushed to main.
- **Session 2.5 started. P2-Q ✅.** Next: P2-R (Persona Identity Sets — Medium-Tier 5: Mara, Riven, Sable, Calloway, Voss).

**2026-03-31 — Swarm Dispatch Capability Layer (P2-P addendum)**
- New: `docs/SWARM-PROTOCOL.md` — Queen/Worker Bee pattern definition. Worker conventions, concurrency limits (browser:5, DB:8, file:12), timeout bounds, vault-based result streaming for large swarms, activation thresholds.
- 14 agents gained `## Swarm Dispatch` sections:
  - **Nyx** (3 patterns): parallel finding fixes (max 5 workers), parallel micro-batches (max 3), pre-build parallelism (always 3)
  - **Pierce**: multi-file spec conformance (max 10). **Mara**: multi-route UX testing (max 5). **Kehinde**: multi-API failure mode analysis (max 8). **Tanaka**: multi-surface security audit (max 8).
  - **Riven**: multi-component token audit (max 8). **Vane**: multi-flow financial verification (max 5). **Sable**: multi-surface voice consistency (max 8).
  - **Sentinel**: multi-route regression sweep + visual regression variant (max 5). **Wraith**: multi-surface adversarial testing (max 5). **Compass**: multi-change impact analysis (max 8). **Kiln**: multi-query performance profiling (max 8). **Scribe**: multi-entity documentation (max 10). **Beacon**: multi-service monitoring (max 5).
- 7 orchestrators upgraded to parallel internal dispatch:
  - **Build Triad**: Pierce+Mara+Riven now simultaneous (was sequential steps 2→3→4)
  - **Systems Triad**: Kehinde+Tanaka+Vane now simultaneous
  - **Strategy Triad**: Calloway+Voss+Sable now simultaneous
  - **Full Audit**: Single parallel wave (all 6 agents + triads dispatched simultaneously, up to 13 concurrent). 4 phases → 2 (dispatch + consolidate).
  - **Launch Sequence**: All 4 components in parallel. 5 phases → 2.
  - **Gate Runner**: Multi-triad parallel dispatch for mixed batches.
  - **Council**: Explicit 10-persona parallel dispatch.
  - **Decision Council**: Already correctly parallelized (no change needed).
- Gate: zero DMS strings. 14 swarm sections + 7 orchestrator upgrades = 22 entities enhanced.
- GitHub: 4 commits pushed to main.
- **Estimated impact:** Full Audit time 40min → ~12min (3.3x). Sentinel full sweep 20min → ~4min (5x). Build Triad 15min → ~5min (3x).

**2026-03-31 — P2-P: Skills + Quality Layer**
- 5 skills installed in `.claude/skills/`:
  - postgres-best-practices (Kehinde): 30+ rules in 6 categories — query performance, connection management, security/RLS, schema design, functions/RPCs, monitoring
  - security-auditor (Tanaka+Wraith): 12 security domains — auth, injection, insecure defaults, supply chain, data protection, TCPA/CAN-SPAM, API security, crypto, infrastructure, differential review, container, testing. Adapted from Antigravity + Trail of Bits.
  - nextjs-best-practices (Nyx): Server/client decision tree, data fetching patterns, routing conventions, caching strategy, performance, anti-patterns
  - stripe-integration (Vane): 4 payment flows (hosted checkout, PaymentIntent, subscription, Connect), webhook handling, testing methodology, financial accuracy
  - tailwind-design-system (Riven): 3-layer token hierarchy, 5-layer component architecture, dark mode, responsive design, accessibility, animation
- 3 quality docs in `docs/`:
  - DESIGN-INTELLIGENCE.md: 15-item pre-delivery checklist (mandatory Build Triad gate), 40 UX guidelines, severity mapping for Mara+Riven, dark theme palette, font pairings
  - ECOSYSTEM-PATTERNS.md: Token optimization (worker count, stall detection, context budgets), anti-drift (task source allowlist, iteration limits, safety bounds), self-learning loop (auto-extract pattern), agent discipline, session management, quality enforcement (three-mind principle)
  - ECOSYSTEM-INTEL.md: Full triage of 14 external sources across 5 tiers (Core Architecture → Integration Primitives → Identity). 7 architectural decisions documented.
- Gate: zero DMS-specific strings across all 8 files. All 5 skills have valid YAML frontmatter.
- GitHub: 1 commit (8 files, 1622 insertions), pushed to main.
- **Session 2.4: P2-M ✅ P2-N ✅ P2-O ✅ P2-P ✅. Session 2.4 COMPLETE.**
- Next: P2-Q (Persona Identity Sets — High-Tier 5). Session 2.5.

**2026-03-31 — P2-N + P2-O: All 30 Slash Commands**
- 30 genericized slash commands in `commands/`:
  - P2-N (Build+Quality+Analysis, 15): gate, next-batch, verify, adversarial, batch-status, scaffold, regression, consistency, red-team, audit, perf, impact, deps, env-check, postmortem
  - P2-O (Persona+Reporting+Ops, 15): wake, council, decide, customer-lens, findings, retro, launch-check, tech-debt, demo, changelog, launch, onboard, seed, api-docs, parallel-build
- All DMS paths genericized (02-team-logs → build state, 04-cross-refs → project config, .claude/agents → agents/).
- Agent dispatch paths use relative `agents/` references.
- "Alex" → "operator." DMS-specific examples replaced with generic placeholders.
- Gate: zero DMS strings across all 30 command files.
- **MILESTONE: 105 entities complete (75 agents + 30 commands).** Entity parity with DMS Cathedral.
- GitHub: 2 commits (15+15 files), pushed to main.
- Next: P2-P (Skills + Quality Layer)

**2026-03-31 — P2-M: Model Tiering System**
- `forge/MODEL-TIERING.md`: 3-tier system (high/medium/fast). Tier definitions with rationale, cost estimation model, override mechanism, validation rule.
- `forge/AGENT-MANIFEST.md`: Canonical inventory of all 75 agents. 5 categories, numbered 1-75. Tier distribution: 10 high (Nyx, Pierce, Kehinde, Tanaka, Vane, Arbiter, Decision Council, Full Audit, Launch Sequence), 23 medium, 42 fast.
- Fixed 11 P2-K utility agents missing `model:` frontmatter (customer-lens→medium, seed-generator→medium, launch-readiness→medium, migration-planner→medium, test-generator→fast, api-docs→fast, onboarding→fast, scaffold→fast, changelog→fast, dep-audit→fast, env-validator→fast).
- Gate: 75/75 agent files have valid `model:` field. Zero missing.
- Note: Manifest shows 75 agents + 30 commands (P2-N/P2-O) = 105 total entities.
- GitHub: 1 commit (13 files: 2 new forge/ docs + 11 utility frontmatter fixes), pushed to main.
- Next: P2-N (Slash Commands — Build + Quality, 15 commands)

**2026-03-31 — P2-L: Sub-Agents — All 34**
- 34 genericized sub-agent files in `agents/sub-agents/`:
  - Pierce (3): adl-audit, field-presence, rpc-shape
  - Mara (3): accessibility, interaction, mobile
  - Riven (3): token-audit, touch-targets, theme-check
  - Kehinde (4): failure-modes, schema-drift, race-conditions, migration-validator
  - Tanaka (3): rls-audit, tcpa-check, pii-scan
  - Wraith (3): input-fuzzer, auth-probe, concurrency
  - Sable (1): voice-consistency
  - Calloway (1): competitive-scan
  - Meridian (1): pattern-scan
  - Instrumentation (1): audit
  - Compass (2): dependency-map, change-impact
  - Kiln (2): query-profiler, bundle-analyzer
  - Beacon (2): error-watch, performance-watch
  - Council advisors (5): contrarian, first-principles, expansionist, outsider, executor
- All agents have `model: fast` frontmatter.
- HIGH genericization: pierce-adl-audit (removed 62 DMS assertions → generic ADL grep pattern), calloway-competitive-scan (removed Tekmetric/Shop-Ware/ShopBoss → reads competitors from project context).
- MEDIUM genericization (12): Replaced shop_id → tenant_id, repair_orders → generic entities, 13-repo paths → generic, Supabase-specific tools → generic Bash. DMS table/RPC examples replaced with placeholder patterns.
- LOW genericization (18): Already domain-agnostic frameworks (council advisors, accessibility, mobile, touch targets, theme check, migration validator, voice consistency, change impact, bundle analyzer, error watch, performance watch). Cleaned MCP tool refs.
- Tool strategy: Preview MCP tools kept (standard Claude Code). Database-specific MCP tools (mcp__supabase__*) → generic Bash. GitHub MCP tools (mcp__github__*) → generic Read/Glob/Grep.
- Gate: grep for 28 DMS-specific strings — zero matches across all 34 files.
- **MILESTONE: 75 agents genericized. Session 2.3 COMPLETE (P2-I through P2-L). All agents done.**
- GitHub: 2 commits (17+17 files, 1302 insertions total), pushed to main.
- Next: P2-M (Model Tiering System — Session 2.4)

**2026-03-31 — P2-K: Customer Lens + 10 Utilities**
- 11 genericized utility agents: agents/customer-lens.md, agents/seed-generator.md, agents/test-generator.md, agents/api-docs.md, agents/launch-readiness.md, agents/onboarding.md, agents/scaffold.md, agents/changelog.md, agents/dep-audit.md, agents/env-validator.md, agents/migration-planner.md
- Customer Lens (already domain-agnostic): Cleaned "RO" example ref, "PIN" auth ref → generic. 5 evaluation frames preserved.
- Seed Generator (high genericization): Removed powersports, Metric Motorsports, Honda/Yamaha/Kawasaki/Harley, VINs, specific service descriptions. Now config-driven schema with domain adaptation.
- Test Generator (low): Already generic. Removed BOOT.md path specifics. Now reads "build state or equivalent."
- API Docs (low): "Postgres/Supabase" → "Postgres or similar." Removed DMS domain grouping (customer, repair order, inventory). Now infers from naming conventions.
- Launch Readiness (medium): Removed all DMS vault paths (02-team-logs, 04-cross-refs). Now reads "build state file or equivalent." Removed Supabase-specific RLS query. Generic access control posture check.
- Onboarding (high): Removed all DMS specifics (powersports dealerships, 148 tables, 171 RPCs, 13-repo, specific persona roles). Now progressive 5-level walkthrough for any project.
- Scaffold (low): "Alex or Nyx" → "Operator or build orchestrator." "settings-page.tsx" → "project's router configuration."
- Changelog (low): "Alex" → "project owner." DMS batch refs (L4-H.1) → generic "batch/phase range."
- Dep Audit (medium): Specific workspaces (apps/dms, apps/website, apps/storefront, apps/cast, packages/shared) → generic "each workspace/package." Package manager agnostic.
- Env Validator (high): Removed all DMS-specific service refs (Supabase, Stripe, Twilio, WPS, Typesense, SendGrid, forge_config). Now scans for env var patterns across any language/framework (Node, Vite, Deno, Python, Rust, SQL, Docker, CI/CD).
- Migration Planner (low): Removed "repair_orders" and "line_items" from example output. Generic table/column placeholders.
- All tools genericized: MCP-specific tools (mcp__supabase__*, mcp__github__*) replaced with generic tools (Read, Glob, Grep, Bash). Agents adapt to available tools at runtime.
- **MILESTONE: 41 agents genericized (10+10+10+11). Only sub-agents (34) remain for Session 2.3.**
- Gate: grep for 28 DMS-specific strings — zero matches across all 11 files.
- GitHub: 1 commit (11 files, 858 insertions), pushed to main.
- Next: P2-L (Sub-Agents — All 34)

**2026-03-31 — P2-J: All 10 Orchestrators**
- 10 genericized orchestrator agents: triad.md, systems-triad.md, strategy-triad.md, gate-runner.md, council.md, decision-council.md, debate.md, full-audit.md, launch-sequence.md, postmortem.md
- Build Triad (medium): 3-persona frontend gate with adversarial check (Rule 27). Generic agent path refs.
- Systems Triad (medium): 3-persona backend gate. shop_id → "tenant scope." get_effective_rate() → "canonical rate functions."
- Strategy Triad (medium): 3-persona business gate. Removed Cast engagement ref, DMS competitor names.
- Gate Runner (medium): Config-driven gate dispatch. PERSONA-GATES.md → project-relative. .claude/agents/ → agents/.
- Council (medium): 10-persona architectural review. Already mostly generic.
- Decision Council (high): 5 cognitive-lens advisors + Arbiter. Already domain-agnostic. Cleaned Alex → operator.
- Debate (medium): 2-persona structured debate. Already generic. Alex → operator.
- Full Audit (high): Nuclear quality pass. MCP-specific tools removed from frontmatter. Dispatch pattern preserved.
- Launch Sequence (high): Pre-launch go/no-go. Metric Motorsports ref removed. VOSS-002 ref removed.
- Postmortem (medium): Blameless incident analysis. L4-G ref removed. Generic incident types.
- **MILESTONE: 30 agents genericized (10+10+10). agents/ directory complete for personas, intelligences, orchestrators.**
- Gate: grep for 30 DMS-specific strings — zero matches across all 10 files.
- GitHub: 1 commit (10 files), pushed to main.
- Next: P2-K (Customer Lens + 10 Utilities — 11 agents)

**2026-03-31 — P2-I: Intelligences — Arbiter + Compass + Scribe + Kiln + Beacon**
- 5 genericized intelligence agents: agents/arbiter.md, agents/compass.md, agents/scribe.md, agents/kiln.md, agents/beacon.md
- Arbiter (model: high): Already domain-agnostic. Synthesis protocol, 5 quality signals, post-council routing to Strategy Triad. No changes needed beyond path cleanup.
- Compass (model: medium): 3-direction dependency trace (downward schema→UI, upward UI→schema, lateral cross-cutting). DMS examples (repair_orders, line_items) removed → generic entity refs. TABLE-INDEX ref removed.
- Scribe (model: medium): 4 doc types (API, architecture, onboarding, release notes). 4 audience formats (developer, operator, stakeholder, agent). All paths genericized.
- Kiln (model: medium): 3 analysis domains (query performance, bundle analysis, render performance). DB tool conditional. DMS-specific examples (repair_orders.shop_id, get_ro_pipeline) removed → generic placeholders.
- Beacon (model: medium): 3-check protocol (error logs, function health, pattern detection). Supabase-specific service refs → generic service categories. send-email/send-notification refs removed.
- **MILESTONE: All 20 core agents genericized (10 personas + 10 intelligences).**
- Gate: grep for 28 DMS-specific strings — zero matches.
- GitHub: 1 commit pushed to main.
- Next: P2-J (Orchestrators — Triad, Systems Triad, Strategy Triad, Gate Runner)

**2026-03-31 — P2-H: Intelligences — Scout + Sentinel + Wraith + Meridian + Chronicle**
- 5 genericized intelligence agents: agents/scout.md, agents/sentinel.md, agents/wraith.md, agents/meridian.md, agents/chronicle.md
- Scout (model: medium): Schema recon (conditional on DB tool), BUILD-LEARNINGS filter, open findings scan across all personas, cross-cutting concern detection, component inventory. All DMS persona paths → generic `projects/{active}/vault/team-logs/{persona}/`.
- Sentinel (model: fast): 4-check regression protocol (renders, console clean, data loads, elements present). Full sweep mode. Visual regression spec for future screenshot comparison. DMS route examples removed.
- Wraith (model: medium): 4 attack vectors preserved (input fuzzing, auth probing, concurrency, state manipulation). E2B sandbox support. "Shop A/B" → "Tenant A/B". Sub-agent dispatch for focused attacks.
- Meridian (model: medium): 8-dimension pattern inventory. Drift detection by majority count. Component reuse audit. Naming + layout consistency. DMS component refs → generic "project's component library."
- Chronicle (model: medium): 6 analysis modes (velocity, finding patterns, tech debt, persona effectiveness, retrospective, projection). DMS tech debt items → generic categories. All persona path refs genericized.
- Gate: grep for 24 DMS-specific strings — zero matches across all 5 files.
- GitHub: 1 commit pushed to main.
- **Running total: 15 agents genericized (10 personas + 5 intelligences).**
- Next: P2-I (Arbiter, Compass, Scribe, Kiln, Beacon — analysis/monitoring intelligences)

**2026-03-31 — P2-G: Core Personas — Mara + Riven + Sable + Calloway**
- 4 genericized agent files completing the original 10: agents/mara.md, agents/riven.md, agents/sable.md, agents/calloway.md
- Mara (model: medium): 10-item UX evaluation checklist. UI UX Pro Max ref wired. Customer Lens sub-agent dispatch. Removed Shopify/Toast/CDK references.
- Riven (model: medium): 8-item design system checklist. All `--forge-*` token refs → generic "project design tokens." Component reuse → "project's UI library." No hardcoded framework refs.
- Sable (model: medium): 8-item check scope (expanded from 6). Added jargon audit + confirmation copy checks. Removed all DMS voice specifics.
- Calloway (model: medium): 8-item check scope (expanded from 4). Market Position comparison table added to output. Removed Tekmetric/Shop-Ware/ShopBoss. Added marketplace dynamics, conversion friction, retention signals.
- **MILESTONE: All 10 original personas now genericized for Forge OS.** 6 agents at model:high (Nyx, Pierce, Kehinde, Tanaka, Vane + Voss at medium), 4 at model:medium (Mara, Riven, Sable, Calloway).
- Gate: grep for 24 DMS-specific strings across all 10 agents — zero matches.
- GitHub: 1 commit pushed to main.
- Next: P2-H (Intelligences — Scout, Sentinel, Wraith, Meridian, Chronicle)

**2026-03-31 — P2-F: Core Personas — Tanaka + Voss + Vane**
- 3 genericized agent files: agents/tanaka.md, agents/voss.md, agents/vane.md
- Tanaka (model: high): 9-item check scope (access policies, auth verification, security functions, PII scan, communication compliance, input validation, supply chain, insecure defaults, secrets scanning). Trail of Bits reference wired. OWASP/TCPA/PCI/GDPR severity refs.
- Voss (model: medium): 7-item check scope (communication compliance, TOS/Privacy links, consent mechanisms, data retention, disclosure requirements, third-party API usage, marketplace compliance). V-ASSESSMENT format preserved for legal rulings. All DMS V-ASSESSMENT-NNN rulings removed.
- Vane (model: high): 8-item check scope (rate conformance, payment platform correctness, financial traceability, currency handling, revenue attribution, tax compliance, reconciliation, subscription lifecycle). Financial Flow Trace table added to output format. get_effective_rate() → generic "canonical rate functions" ref.
- Gate: grep for 20 DMS-specific strings — zero matches.
- GitHub: 1 commit pushed to main.
- Next: P2-G (Mara, Riven, Sable, Calloway — UX + Design + Brand + Growth)

**2026-03-31 — P2-E: Core Personas — Nyx + Pierce + Kehinde**
- 3 genericized agent files: agents/nyx.md, agents/pierce.md, agents/kehinde.md
- Nyx: Full build loop, 34 rules (5 categories), 9 failure modes, next batch protocol, sub-agent dispatch, context management. All DMS paths → `projects/{active}/vault/...`. All DMS-specific naming rules → generic project ADL references. Tools: generic (Read/Edit/Write/Glob/Grep/Bash/Agent — no MCP-specific tools hardcoded).
- Pierce: Severity classification (P-CRIT through P-LOW), browser verification checklist (6 items), finding fix verification protocol, sub-agent dispatch for large reviews. Removed all DMS ADL examples (assigned_tech_id, pin_hash, etc.) — replaced with generic spec conformance rules.
- Kehinde: 8-item check scope (failure modes, schema conformance, race conditions, migration validation, index coverage, tenant isolation, idempotency, connection management). Failure mode coverage table in output format. Removed Stripe Connect specifics — kept generic financial/payment patterns.
- All three: `model: high` frontmatter, READ-ONLY for Pierce/Kehinde, project-relative paths, no DMS-specific strings verified via grep.
- GitHub: 1 commit pushed to main. CRLF warnings (cosmetic).
- Gate: grep for DMS-specific strings (bible, supabase, forge-dms, waypoint, shop_, assigned_tech, pin_hash, get_effective_rate, etc.) — zero matches.
- Next: P2-F (Tanaka, Voss, Vane — Security + Legal + Finance personas)

