### OS-ADL-009: Tauri Events for Real-Time Updates
**Status:** LOCKED | **Date:** 2026-03-30 | **Updated:** 2026-04-01 | **Domain:** runtime
**Decision:** The backend pushes state changes to the dashboard via Tauri's built-in event system (`app.emit()` / `listen()`). This is functionally superior to WebSocket for a desktop app — no server setup, typed events, built-in IPC.
**Rationale:** Polling is wasteful and introduces latency. The dashboard needs real-time visibility into build progress, agent status, and findings as they arrive. Tauri events provide push semantics natively without the overhead of a WebSocket server.
**Consequence:** Backend uses `app.emit("event-name", &payload)`. Frontend uses `listen("event-name", callback)`. Events: `chat:stream`, `agent:result`, `swarm-message`. No separate WebSocket server needed.
