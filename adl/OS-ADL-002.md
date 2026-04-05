### OS-ADL-002: Hybrid DOM+Canvas Architecture
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** architecture
**Decision:** The dashboard uses a hybrid rendering approach. DOM for all interactive elements (buttons, inputs, forms, navigation) — accessible, keyboard-navigable. Canvas for all presentation surfaces (pipeline, agent cards, findings, graphs, timelines) — GPU-accelerated, 60fps, pixel-perfect typography via Pretext.
**Rationale:** Pure canvas loses accessibility and keyboard navigation. Pure DOM loses rendering performance and typographic control. The hybrid approach gives both. Interactive surfaces are standard React components. Visual surfaces are Pretext-measured canvas renders.
**Consequence:** Every dashboard component is classified as either DOM (interactive) or Canvas (presentation). Mixed components use DOM for controls and Canvas for display areas.
