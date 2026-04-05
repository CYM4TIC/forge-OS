---
name: perf
description: Kehinde performance analysis — profile queries, bundles, render paths
user_invocable: true
---

# /perf

Profile performance for a specific function, component, route, or the whole system.

## Protocol
1. Dispatch Kehinde (absorbed Kiln's performance profiling methodology)
2. Kehinde analyzes: query plans, index usage, bundle sizes, render performance
3. Produces: actionable optimization report

Usage:
- `/perf [function_name]` — profile a specific function's queries
- `/perf bundle [app]` — analyze bundle size for an app
- `/perf render [component]` — check render performance
- `/perf` — full system scan
