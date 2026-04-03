# Research: OpenCLI + Glaze + SQLite.swift — Infrastructure Patterns

## Session Date: 2026-04-03
## Participants: Nyx (research session)
## Sources:
- [jackwener/opencli](https://github.com/jackwener/opencli) — CLI hub, 73+ site adapters, dual adapter system
- [stephenberry/glaze](https://github.com/stephenberry/glaze) — C++23 high-performance JSON/binary serialization
- [stephencelis/SQLite.swift](https://github.com/stephencelis/SQLite.swift) — Type-safe SQLite query builder

---

## Context

These three repos are **infrastructure/performance** rather than agent architecture. The patterns primarily land in Phase 9 (polish/performance) with a few that reinforce current Phase 7-8 work.

---

## OpenCLI Patterns

### Pattern 1: Dual Adapter System (Declarative + Imperative)

**What OpenCLI Does:**
Simple commands defined in YAML with a pipeline DSL (fetch → map → filter → sort → limit). Complex commands in TypeScript with full `IPage` browser abstraction. Both register through one `registerCommand()` into a single `Map<string, CliCommand>`.

73+ adapters. YAML adapters are inlined into a build manifest at compile time for zero-parse-cost at runtime.

**Forge OS Integration:**
- **Landing zone:** Phase 7, P7-C patch (converges with AutoAgent three-tier + just-bash lazy loading)
- **What we adopt:** Support both declarative YAML capability definitions (for simple read-only operations like vault reads, sigil scans) and Rust `fn` implementations (for complex dispatch logic like gate routing, mana tracking). Both register into the same `CommandRegistry`. This is the fourth independent source validating this dual-registration pattern.

### Pattern 2: Lifecycle Hooks (Before/After/Startup)

**What OpenCLI Does:**
Three hooks via `globalThis` singleton: `onStartup`, `onBeforeExecute`, `onAfterExecute`. Each handler wrapped in try/catch — failing hook never blocks execution. Plugins register hooks without modifying core execution path.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.2 (dispatch pipeline)
- **What we adopt:** Dispatch lifecycle hooks: `on_before_dispatch` (inject goal ancestry, check capabilities, validate mana budget), `on_after_dispatch` (file echo, update traces, check for triggered chains). Hooks registered by intelligence modules — Sentinel registers `on_after_dispatch` to trigger regression checks, Beacon registers to extract signals. Failing hook logged but doesn't block dispatch.

### Pattern 3: Strategy Cascade (Minimum Privilege Discovery)

**What OpenCLI Does:**
5-tier strategy: `PUBLIC → COOKIE → HEADER → INTERCEPT → UI`. Probes each in order, returns simplest that works. Confidence decreases with complexity.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.2 (capability family enrichment)
- **What we adopt:** The cascade principle applied to capability grants. When dispatch context is ambiguous, try `ReadOnly` first. If the agent needs to write, escalate to `ReadOnly + WriteCode`. Never start with `Destructive`. The cascade auto-discovers minimum-privilege execution path for each dispatch.
- **What we don't adopt:** Runtime probing (our capabilities are declarative, not discovered by trial).

---

## Glaze Patterns (IPC Performance)

### Pattern 4: Compile-Time Key Hash Tables

**What Glaze Does:**
Pack known JSON keys as `u64` constants at compile time. At runtime, `memcpy` incoming key into `u64`, single integer comparison. For keys ≤8 bytes, the hash is one instruction.

```cpp
static constexpr auto packed = pack<"name", 8>();
uint64_t in; std::memcpy(&in, key, 8);
return (in == packed);  // one comparison
```

**Forge OS Integration:**
- **Landing zone:** Phase 9 (performance optimization)
- **Rust equivalent:** Proc macro generates `match` on packed key bytes for Tauri command dispatch:
  ```rust
  let mut buf = [0u8; 8];
  buf[..key.len().min(8)].copy_from_slice(&key[..key.len().min(8)]);
  match u64::from_le_bytes(buf) {
      0x..._name => dispatch_name(args),
      0x..._type => dispatch_type(args),
      _ => fallback(key, args),
  }
  ```
  Eliminates string hashing for the 80+ Tauri command dispatch hot path.

### Pattern 5: Buffer Reuse + Padding for Zero-Alloc IPC

**What Glaze Does:**
`write_padding_bytes = 256` — over-allocate write buffers so inner loops skip bounds checks. Buffer reused across serialization calls.

**Forge OS Integration:**
- **Landing zone:** Phase 9 (performance optimization)
- **Rust equivalent:** Thread-local reusable IPC buffer:
  ```rust
  thread_local! {
      static IPC_BUF: RefCell<Vec<u8>> = RefCell::new(Vec::with_capacity(4096));
  }
  ```
  For frequent small messages (HUD updates at 60fps, event emissions, mana tracking), this eliminates allocation per message.

### Pattern 6: Binary Format for Hot Paths

**What Glaze Does:**
BEVE (Binary Efficient Versatile Encoding) achieves ~3x JSON throughput. Same type system supports JSON and BEVE — format selected at compile time.

**Forge OS Integration:**
- **Landing zone:** Phase 9 (performance optimization)
- **What we adopt:** Use `rmp-serde` (MessagePack) or a custom binary format for high-frequency internal IPC: pipeline state updates, mana balance changes, echo filing, HUD refresh. Keep JSON for debug logging and human-readable Tauri events. Tauri v2 supports binary payloads natively via `tauri::ipc::Response`.

---

## SQLite.swift Patterns (Database Layer)

### Pattern 7: Expression<T> as Template + Bindings

**What SQLite.swift Does:**
```swift
struct Expression<T> {
    var template: String       // "? + ?"
    var bindings: [Binding?]   // [1, 2]
}
```
Expressions compose by concatenating templates and merging bindings. SQL injection impossible by construction. Nullability encoded in type parameter: `Expression<String>` = NOT NULL, `Expression<String?>` = nullable.

**Forge OS Integration:**
- **Landing zone:** Phase 9 (SQLite layer cleanup)
- **Rust equivalent:** Build `Expr<T>` struct with `sql: String, params: Vec<rusqlite::types::Value>`. Implement `BitAnd` for AND, `BitOr` for OR, comparison operators for WHERE predicates. All 80+ Tauri commands that touch SQLite would compose queries via typed expressions instead of raw SQL strings.
- **Assessment:** High value but high effort. Evaluate at Phase 9 whether the complexity is justified for a desktop app vs. staying with raw SQL + migrations.

### Pattern 8: Schema Reader via PRAGMA Introspection

**What SQLite.swift Does:**
Reads live schema from `PRAGMA table_info`, `PRAGMA index_list`, `PRAGMA foreign_key_list`, `sqlite_schema.sql`. Builds typed definitions. Used by the SchemaChanger for the 12-step table dance.

**Forge OS Integration:**
- **Landing zone:** Phase 9 (migration validation)
- **What we adopt:** Schema validation on app startup. After running migrations, read the live schema via PRAGMAs and compare against expected definitions. Log warnings for any drift. Catches migration bugs that produce wrong schema silently.

### Pattern 9: PRAGMA user_version for Migration Tracking

**What SQLite.swift Does:**
Uses `PRAGMA user_version` (built into SQLite, no extra table) for migration version tracking.

**Forge OS Integration:**
- **Landing zone:** Validates existing approach
- **What this validates:** We already track migrations via SQLite. This well-established library uses the same pattern — additional confidence in our migration architecture.

---

## Integration Summary

| # | Pattern | Source | Landing Zone |
|---|---------|--------|-------------|
| 1 | Dual adapter system (YAML + code) | OpenCLI | P7-C patch (4th validation) |
| 2 | Lifecycle hooks (before/after/startup) | OpenCLI | Phase 8 Session 8.2 |
| 3 | Strategy cascade (minimum privilege) | OpenCLI | Phase 8 Session 8.2 |
| 4 | Compile-time key hash tables | Glaze | Phase 9 |
| 5 | Buffer reuse + padding for IPC | Glaze | Phase 9 |
| 6 | Binary format for hot paths | Glaze | Phase 9 |
| 7 | Expression<T> template+bindings | SQLite.swift | Phase 9 |
| 8 | Schema reader via PRAGMA | SQLite.swift | Phase 9 |
| 9 | PRAGMA user_version | SQLite.swift | Validates existing |

**9 patterns. 1 P7-C reinforcement, 2 Phase 8, 6 Phase 9. 0 new sessions.**

---

*These repos are infrastructure/performance, not agent architecture. Primary value lands in Phase 9 polish.*
