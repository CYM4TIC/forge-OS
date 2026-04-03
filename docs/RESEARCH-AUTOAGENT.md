# Research: AutoAgent — Meta-Agent Harness Engineering

## Session Date: 2026-04-03
## Participants: Nyx (research session)
## Source: [kevinrgu/autoagent](https://github.com/kevinrgu/autoagent)

---

## Source Material

- **Author:** Kevin Gu
- **Stack:** Python 3.12, OpenAI Agents SDK / Claude Agent SDK, Harbor benchmarks, Docker isolation
- **Core thesis:** A meta-agent framework — an AI that autonomously engineers better AI agents by iteratively editing its own harness against benchmarks. Inspired by Karpathy's `autoresearch`.
- **Size:** 10 files total. The value is in the design philosophy, not codebase mass.

---

## Architecture Overview

```
program.md          -- Meta-agent instructions (the "program")
    |
Meta-Agent (coding AI)
    |
    ├── Reads: agent.py, run.log, results.tsv, trajectories
    ├── Edits: agent.py (harness)
    ├── Runs: Harbor benchmark suite (Docker-isolated)
    └── Decides: keep improvement or discard
         |
agent.py / agent-claude.py    -- The harness being optimized
    |
    ├── EDITABLE HARNESS (top)     -- prompt, tools, agent construction
    └── FIXED ADAPTER BOUNDARY     -- Harbor integration, ATIF serialization
```

Two harness implementations: OpenAI Agents SDK (`agent.py`) and Claude Agent SDK (`agent-claude.py`).

---

## Pattern 1: Three-Tier Capability Layering

**What AutoAgent Does (Claude variant):**
```python
TOOLS_PRESET = {"type": "preset", "preset": "claude_code"}  # bundled capability sets
CUSTOM_TOOLS = []                                             # per-agent custom tools
EXTERNAL_MCP_SERVERS = {}                                     # external MCP connections
```

Three clean layers:
1. **Presets** — bundled capability sets (e.g., "code" tools, "design" tools)
2. **Custom** — per-agent specialized tools defined in code
3. **MCP servers** — external integrations connected at runtime

Custom tools auto-wrapped into MCP servers via `create_sdk_mcp_server`. MCP servers passed as a dict — extensible.

**Forge OS Integration:**
- **Landing zone:** Phase 7, P7-C patch (capability family enrichment)
- **What we adopt:** The three-tier model maps to: base capabilities (all personas share) → persona-specific tools (Pierce gets conformance tools, Mara gets UX tools) → external MCP connections (Supabase, GitHub, Cloudflare). Our `CapabilityFamily` enum is the preset layer; persona tool registration is the custom layer; MCP bridge is the external layer.
- **Vocabulary:** Presets = capability families, Custom = persona tools, External = MCP connections.

---

## Pattern 2: Adapter Boundary (Fixed vs. Editable)

**What AutoAgent Does:**
Explicit `# === FIXED ADAPTER BOUNDARY ===` comment-fence in `agent.py`. Everything above: the meta-agent can modify (prompt, tools, orchestration). Everything below: infrastructure that must remain stable (Harbor integration, ATIF serialization, metrics reporting).

The meta-agent iterates freely on the editable zone without breaking the infrastructure.

**Forge OS Integration:**
- **Landing zone:** Validates existing kernel architecture
- **What this validates:** Our kernel files ARE the fixed adapter boundary. The kernel (phases, FMs, contracts, rules) is the stable infrastructure. Persona behavior, prompt assembly, and tool selection are the editable zone. AutoAgent proves this separation works in autonomous agent engineering — the meta-agent iterates on the editable zone while the adapter boundary holds.
- **Insight:** If we ever build autonomous persona tuning (8.5), the kernel is the boundary that prevents evolution from breaking governance.

---

## Pattern 3: Factory-Based Tool Registration

**What AutoAgent Does:**
```python
def create_tools(environment: BaseEnvironment) -> list[FunctionTool]:
    @function_tool
    async def run_shell(command: str) -> str:
        result = await environment.exec(command=command, timeout_sec=120)
        return out or "(no output)"
    return [run_shell]

agent = Agent(tools=create_tools(environment), ...)
```

Per-agent factory returns only authorized tools. Environment captured via closure.

**Forge OS Integration:**
- **Landing zone:** Phase 7, P7-C patch
- **What we adopt:** The factory pattern for per-persona tool registration. Rust equivalent: `fn create_persona_tools(persona: &PersonaSlug, capabilities: &[CapabilityFamily]) -> Vec<CommandDef>`. Each persona's tool set is computed at dispatch time from their granted capabilities — not a static list.

---

## Pattern 4: Meta-Agent Hill-Climbing Loop

**What AutoAgent Does:**
The core innovation — an autonomous optimization loop defined in `program.md`:
1. Establish baseline (run unmodified harness)
2. Read logs, diagnose failures
3. Group failures by root cause
4. Choose one general improvement
5. Edit `agent.py`
6. Commit the change
7. Rebuild + rerun benchmark
8. Record in `results.tsv` (keep if improved, discard otherwise)
9. Repeat forever (explicit "NEVER STOP" directive)

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.5 (Persona Evolution Engine)
- **What we adopt:** The hill-climbing optimization structure. Each persona could have a quality benchmark (Pierce: gate pass rate, Mara: UX finding relevance, Tanaka: security coverage). Dreamtime consolidation iterates on persona prompts/tool selections, keeps improvements, discards regressions. `results.tsv` maps to our Pareto frontier tracker in the grimoire.
- **What we don't adopt:** "NEVER STOP" autonomous iteration. Our persona evolution is gated by the dreamtime ritual schedule and operator approval.

---

## Pattern 5: ATIF Trajectory Serialization

**What AutoAgent Does:**
Both harness variants serialize execution traces to ATIF (Agent Trajectory Interchange Format):
- Steps with tool calls, observations, and reasoning
- Token counts and USD costs per step
- Total metrics (tokens, cost, turns)
- Replayable format for post-hoc analysis

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1/8.2 (Echo Ledger format)
- **What we adopt:** The structured trajectory format reinforces our echo ledger design. Each echo should include: step index, type (dispatch/finding/tool_call), token count, mana cost, and outcome. This makes echoes replayable and auditable — not just event logs.
- **Enhancement:** We add causal edges (caused_by/leads_to) which ATIF lacks. Our echoes feed into the decision trace graph.

---

## Pattern 6: Program-as-Markdown

**What AutoAgent Does:**
The human writes `program.md` — a natural language document (~2K words) that steers the meta-agent's behavior. The meta-agent reads it and writes code. The entire system's intelligence lives in a .md file.

**Forge OS Integration:**
- **Landing zone:** Validates kernel architecture
- **What this validates:** Our `{name}-kernel.md` files follow exactly this pattern. The kernel IS the program. AutoAgent proves at scale (benchmark-verified) that markdown-as-program works for autonomous agent engineering. The meta-agent achieves measurable improvements by following markdown instructions.

---

## Pattern 7: Thinking Budget Control

**What AutoAgent Does (Claude variant):**
```python
THINKING = {"type": "enabled", "budget_tokens": 10000}
```
Explicit thinking token allocation as a tunable per-agent parameter.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1/8.2 (Mana budget system)
- **What we adopt:** Thinking budget maps directly to mana allocation. Per-persona thinking budgets: Pierce gets higher thinking tokens (deep conformance reasoning), Scout gets lower (quick recon). The grimoire should expose thinking budget as a tunable alongside run mana.

---

## Key Differences from Forge OS

| Aspect | AutoAgent | Forge OS |
|--------|-----------|----------|
| Agent count | 1 (single harness) | 10 personas + 24 kernels |
| Memory | Stateless (Docker per task) | KAIROS + SQLite + echoes |
| Multi-agent | Slots exist, nothing wired | Swarm + mailbox + event bus |
| Evolution | Autonomous hill-climbing | Gated dreamtime ritual |
| Configuration | Code-level constants | Grimoire + YAML frontmatter |
| Governance | None (benchmark is the gate) | 46 rules + 14 FMs + Build Triad |

---

*7 patterns mined. 3 Tier 1 (direct adoption), 4 Tier 2 (adapt). All fit existing sessions.*
