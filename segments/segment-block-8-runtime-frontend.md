# Block 8: Runtime Frontend

> **Sessions:** 2-3 | **Batches:** OS-B8.A through OS-B8.C | **Source:** BUILD-PLAN.md Block 8
> **Key rule:** Every visual component uses the layout engine from Block 5. Canvas for presentation, DOM for interaction.

---

## OS-B8.A: Dashboard Shell + Canvas Components
- Dashboard layout (sidebar nav [DOM] + main content area)
- `PipelineCanvas.tsx` — canvas-rendered pipeline with animated stage transitions
- `AgentBoard.tsx` — canvas-rendered agent cards, animated state changes, dynamic font sizing
- `BatchProgress.tsx` — layer visualization, animated counters, percentage arc
- `TokenGauge.tsx` — pre-measured number displays, zero-shift updates
- `ContextMeter.tsx` — per-session context window fill gauge

## OS-B8.B: Data Feeds + Vault Browser
- `FindingsFeed.tsx` — virtualized (Pretext pre-computed heights), canvas-rendered cards, severity colors, real-time WebSocket stream
- `VaultBrowser.tsx` — tree view (DOM for interaction), content panel (canvas-rendered), pre-computed document heights for virtual scroll
- `GraphViewer.tsx` — LightRAG knowledge graph, Pretext-measured node labels, canvas pan/zoom, entity highlighting
- `SessionTimeline.tsx` — BOOT.md handoffs as canvas-rendered timeline with annotations
- `ProposalFeed.tsx` — canvas-rendered proposal cards, open proposal count badge, "Review Proposals" button dispatches evaluator session

## OS-B8.C: Controls + Orchestration UI
- "Resume from BOOT.md" button — parses BOOT, spawns session with right context
- "Run Gate" button — dispatches Build Triad (3 parallel sessions), shows findings aggregation
- "Next Batch" button — reads manifest, shows batch info, confirms, launches pipeline
- "Export Report" — generates PDF via document engine
- Settings panel — active project, MCP connections, model tier overrides, LightRAG status
- All controls are DOM (accessible, keyboard-navigable). All visualizations are canvas.

### Exit Gate
- Dashboard renders with all components
- Canvas components use Pretext layout engine for all text
- WebSocket events update dashboard in real-time
- ProposalFeed shows open proposals with severity and triage status
- "Export Report" generates valid PDF
- Pushed to GitHub: "Runtime frontend complete"

---
