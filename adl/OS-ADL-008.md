### OS-ADL-008: Vite + React for Dashboard
**Status:** LOCKED | **Date:** 2026-03-30 | **Domain:** runtime
**Decision:** The dashboard is a React + Vite application. Same stack as DMS frontend.
**Rationale:** Known stack, proven patterns, BL entries from DMS build transfer directly. Vite provides fast HMR for development. React provides the component model for hybrid DOM+Canvas architecture.
**Consequence:** `runtime/` is a Vite project with React. Canvas components use React refs to canvas elements. DOM components are standard React. State management through React context + Tauri events (per OS-ADL-009).
