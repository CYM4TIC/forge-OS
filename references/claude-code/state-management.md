# State Management — External Store Pattern

> How Claude Code manages state across React UI, CLI, background agents, and SDK modes.

## Store Implementation

```typescript
function createStore<T>(initialState, onChange?) {
  let state = initialState
  const listeners = new Set<Listener>()

  return {
    getState: () => state,
    setState: (updater) => {
      const prev = state
      const next = updater(prev)
      if (Object.is(next, prev)) return  // No-op optimization
      state = next
      onChange?.({ newState: next, oldState: prev })
      for (const listener of listeners) listener()
    },
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) }
  }
}
```

## React Bridge

```typescript
// Provider: created ONCE, never re-renders (store reference is stable)
function AppStateProvider({ children, initialState }) {
  const [store] = useState(() => createStore(initialState))
  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>
}

// Selector hook: only re-renders when selected slice changes
function useAppState<T>(selector: (state: AppState) => T): T {
  const store = useAppStore()
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()))
}

// Updater hook: NEVER re-renders (returns stable function)
function useSetAppState() {
  return useAppStore().setState
}
```

## Why External Store

Claude Code runs in multiple contexts:
- **Terminal UI** (React/Ink) — needs reactive updates
- **CLI mode** (no UI) — needs state without React
- **SDK mode** (programmatic) — needs state without UI
- **Background agents** — each has isolated state

External store decouples state from React. Non-React code calls `setState()` directly. React components subscribe via `useSyncExternalStore`.

## AppState Structure (key domains)

```typescript
AppState = {
  // Session
  settings, verbose, mainLoopModel, statusLineText

  // Agent Management
  tasks: { [taskId]: TaskState }
  agentNameRegistry: Map<string, AgentId>
  foregroundedTaskId?: string

  // Permissions
  toolPermissionContext: ToolPermissionContext

  // Memory
  fileHistory: FileHistoryState
  todos: { [agentId]: TodoList }

  // MCP & Plugins
  mcp: { clients, tools, commands, resources }
  plugins: { enabled, disabled, commands, errors }

  // Remote/Bridge
  remoteSessionUrl?, remoteConnectionStatus, replBridgeEnabled

  // UI
  expandedView, footerSelection, activeOverlays
}
```

## Forge OS Application

Tauri already separates state (Rust) from UI (React). The mapping:

| Claude Code | Forge OS |
|-------------|----------|
| `createStore()` | Rust `AppState` in `Mutex<>` |
| `setState()` | Tauri `state.lock().unwrap()` mutations |
| `useSyncExternalStore` | Tauri event listeners in React |
| Agent-scoped state | Per-agent SQLite rows |

What to adopt:
1. **Selector-based subscriptions** — Components subscribe to slices, not the whole tree
2. **Stable provider** — Don't recreate context on state change
3. **Agent isolation** — Each spawned agent gets its own state scope
4. **File state cache** — LRU cache of recently-read files (prevents re-reading)
