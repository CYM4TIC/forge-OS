// ── useDispatchQueue — Dispatch queue state with real-time updates ──
// P7-L: composes from existing dispatch bridge functions (listActiveAgents, onAgentResult,
// onAgentWorkingStateChanged, onDispatchFlow, getFindingCounts).
// Priority derived from agent category. Gate status from finding counts + dispatch tracking.
// Checkpoint state is session-scoped (in-memory). Follows useProposalFeed patterns:
// OS-BL-022 (500ms debounce), fetchingRef guard, MAX_ENTRIES cap, mountedRef.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  listActiveAgents,
  onAgentResult,
  onAgentWorkingStateChanged,
  getFindingCounts,
  onDispatchFlow,
  onFindingAdded,
  onFindingResolved,
  getAgentRegistry,
  type AgentSummary,
  type AgentResult,
  type AgentWorkingStateEvent,
  type AgentCategory,
  type DispatchQueueEntry,
  type DispatchPriority,
  type GateStatus,
  type GateStage,
  type CheckpointState,
  type RegistryEntry,
  checkpointAction as sendCheckpointAction,
} from '../lib/tauri';

export type CheckpointAction = 'advance' | 're-gate' | 'hold';

export interface UseDispatchQueueReturn {
  /** All queue entries (pending + active + recent completed), sorted by priority then time. */
  queue: DispatchQueueEntry[];
  /** Currently running dispatches. */
  activeDispatches: DispatchQueueEntry[];
  /** Per-batch gate state. */
  gateStatus: GateStatus;
  /** Whether the batch can advance (triad dispatched + zero open findings + checkpoint acknowledged). */
  canAdvance: boolean;
  /** Checkpoint state for current batch. */
  checkpoint: CheckpointState;
  /** Set checkpoint action: advance, re-gate, or hold (PL-005). */
  setCheckpointAction: (action: CheckpointAction) => void;
  /** Reset checkpoint for a new batch. */
  resetCheckpoint: (batchId: string) => void;
  /** Max concurrent dispatches allowed. */
  maxConcurrent: number;
  /** Whether the initial load is in progress. */
  loading: boolean;
  /** Last error message. */
  error: string | null;
  /** Manual refresh. */
  refresh: () => Promise<void>;
  /** Export gate report (stub — wired when doc gen engine ships). */
  exportReport: () => Promise<void>;
}

const MAX_COMPLETED = 10;
const MAX_ENTRIES = 100;
/** Dispatches running longer than this are marked as timed out (PL-003). */
const STALE_DISPATCH_TIMEOUT_MS = 60_000;
/** Stale-dispatch sweep interval. */
const STALE_SWEEP_INTERVAL_MS = 10_000;
/** Default max concurrent dispatches (PL-004). 3 for triad, 1 for sequential. */
const MAX_CONCURRENT_DEFAULT = 3;
/** SessionStorage key for checkpoint persistence (K-L-012). */
const CHECKPOINT_STORAGE_KEY = 'forge-dispatch-checkpoint';

/** Map agent category to dispatch priority. */
function derivePriority(category: AgentCategory | undefined): DispatchPriority {
  switch (category) {
    case 'orchestrator': return 'critical';
    case 'persona': return 'high';
    case 'intelligence': return 'normal';
    case 'utility':
    case 'sub_agent':
    case 'command':
    default:
      return 'low';
  }
}

/** Priority sort weight (lower = higher priority). */
function priorityWeight(p: DispatchPriority): number {
  switch (p) {
    case 'critical': return 0;
    case 'high': return 1;
    case 'normal': return 2;
    case 'low': return 3;
  }
}

/** Convert an AgentSummary to a DispatchQueueEntry. */
/** Convert an AgentSummary to a DispatchQueueEntry. K-L-008: started_at null for queued. */
function summaryToEntry(
  summary: AgentSummary,
  categoryMap: Map<string, AgentCategory>,
): DispatchQueueEntry {
  const category = categoryMap.get(summary.agent_slug);
  const isTerminal = summary.status === 'complete' || summary.status === 'error'
    || summary.status === 'timeout' || summary.status === 'cancelled';
  return {
    dispatch_id: summary.dispatch_id,
    agent_slug: summary.agent_slug,
    status: summary.status,
    priority: derivePriority(category),
    elapsed_ms: summary.elapsed_ms,
    queued_at: Date.now() - summary.elapsed_ms,
    // K-L-008: only set started_at for non-queued agents
    started_at: summary.status === 'queued' ? null
      : summary.status === 'running' ? Date.now() - summary.elapsed_ms
      : null,
    // K-L-006: set completed_at on ALL terminal states
    completed_at: isTerminal ? Date.now() : null,
    error: null,
  };
}

/** Sort entries: priority ascending, then queued_at ascending (FIFO within tier). */
function sortEntries(entries: DispatchQueueEntry[]): DispatchQueueEntry[] {
  return [...entries].sort((a, b) => {
    const pw = priorityWeight(a.priority) - priorityWeight(b.priority);
    if (pw !== 0) return pw;
    return a.queued_at - b.queued_at;
  });
}

/** Derive gate stage from dispatch tracking. PL-010: exact or prefix match, not substring. */
function deriveGateStage(
  entries: DispatchQueueEntry[],
  slugPatterns: string[],
): GateStage {
  const matching = entries.filter((e) =>
    slugPatterns.some((p) => e.agent_slug === p || e.agent_slug.startsWith(p + '-')),
  );
  if (matching.length === 0) return 'not_started';
  const hasRunning = matching.some((e) => e.status === 'queued' || e.status === 'running');
  if (hasRunning) return 'in_progress';
  const hasFailed = matching.some((e) => e.status === 'error' || e.status === 'timeout');
  if (hasFailed) return 'fail';
  const allComplete = matching.every((e) => e.status === 'complete');
  if (allComplete) return 'pass';
  return 'pending';
}

export function useDispatchQueue(): UseDispatchQueueReturn {
  const [entries, setEntries] = useState<DispatchQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFindings, setOpenFindings] = useState(0);
  // K-L-012: persist checkpoint to sessionStorage to survive remounts
  const [checkpoint, setCheckpoint] = useState<CheckpointState>(() => {
    try {
      const stored = sessionStorage.getItem(CHECKPOINT_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore parse errors */ }
    return { batch_id: '', acknowledged: false, summary: null };
  });
  const [, setCheckpointActionState] = useState<CheckpointAction | null>(null);

  // Sync checkpoint to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(checkpoint));
    } catch { /* quota exceeded — non-fatal */ }
  }, [checkpoint]);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const categoryMapRef = useRef<Map<string, AgentCategory>>(new Map());

  // ── Initial load: registry first, then active agents + finding counts (K-L-001 fix) ──

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      fetchingRef.current = true;

      // Load registry first so priority derivation is correct on initial render
      try {
        const registry: RegistryEntry[] = await getAgentRegistry();
        if (!cancelled) {
          const map = new Map<string, AgentCategory>();
          for (const entry of registry) {
            map.set(entry.slug, entry.category);
          }
          categoryMapRef.current = map;
        }
      } catch {
        // Non-fatal: priority derivation falls back to 'low'
      }

      if (cancelled) return;

      try {
        const [agents, findings] = await Promise.all([
          listActiveAgents(),
          getFindingCounts(),
        ]);
        if (!cancelled) {
          const mapped = agents.map((a) => summaryToEntry(a, categoryMapRef.current));
          setEntries(sortEntries(mapped));
          // PL-009: only critical+high+medium block advancement — low findings don't block
          setOpenFindings(findings.critical + findings.high + findings.medium);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      } finally {
        fetchingRef.current = false;
      }
    };

    load();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  // ── Subscribe to agent working state changes (real-time queue updates) ──

  // K-L-002 fix: no shared debounce — React batches setState calls automatically.
  // A shared debounce timer drops events from parallel dispatches.
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    const setup = async () => {
      const unsub = await onAgentWorkingStateChanged((event: AgentWorkingStateEvent) => {
        if (cancelled || !mountedRef.current || fetchingRef.current) return;
        // Update or insert the entry for this dispatch
        setEntries((prev) => {
          const dispatchId = event.dispatch_id;
          if (!dispatchId) {
            // K-L-003: log null dispatch_id events for diagnostics
            console.warn('[useDispatchQueue] Received working-state event with null dispatch_id:', event.agent_slug, event.state);
            return prev;
          }

          const idx = prev.findIndex((e) => e.dispatch_id === dispatchId);
          if (idx >= 0) {
            // Update existing entry — K-L-004 fix: don't map idle to complete
            const updated = [...prev];
            const existing = updated[idx];
            const newStatus = mapWorkingStateToStatus(event.state);
            // Skip idle→complete transition — completion comes from agent:result
            if (newStatus === 'queued' && existing.status === 'running') return prev;
            updated[idx] = {
              ...existing,
              status: newStatus,
              started_at: existing.started_at ?? (newStatus === 'running' ? Date.now() : null),
            };
            return sortEntries(trimCompleted(updated));
          }
          // New dispatch — insert
          const category = categoryMapRef.current.get(event.agent_slug);
          const newStatus = mapWorkingStateToStatus(event.state);
          const newEntry: DispatchQueueEntry = {
            dispatch_id: dispatchId,
            agent_slug: event.agent_slug,
            status: newStatus,
            priority: derivePriority(category),
            elapsed_ms: 0,
            queued_at: Date.now(),
            started_at: newStatus === 'running' ? Date.now() : null,
            completed_at: null,
            error: null,
          };
          return sortEntries([...prev, newEntry].slice(0, MAX_ENTRIES));
        });
      });
      unlisten = unsub;
      if (cancelled) unsub();
    };

    setup();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // ── Subscribe to agent results (completions) ──

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    const setup = async () => {
      const unsub = await onAgentResult((result: AgentResult) => {
        if (cancelled || !mountedRef.current) return;
        setEntries((prev) => {
          const idx = prev.findIndex((e) => e.dispatch_id === result.dispatch_id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              status: result.status,
              elapsed_ms: result.duration_ms,
              completed_at: Date.now(),
              error: result.error,
            };
            return sortEntries(trimCompleted(updated));
          }
          // Result for unknown dispatch — add as completed entry
          const category = categoryMapRef.current.get(result.agent_slug);
          const entry: DispatchQueueEntry = {
            dispatch_id: result.dispatch_id,
            agent_slug: result.agent_slug,
            status: result.status,
            priority: derivePriority(category),
            elapsed_ms: result.duration_ms,
            queued_at: Date.now() - result.duration_ms,
            started_at: Date.now() - result.duration_ms,
            completed_at: Date.now(),
            error: result.error,
          };
          return sortEntries([...prev, entry].slice(0, MAX_ENTRIES));
        });
        // Refresh finding counts after agent completion (gate may have changed)
        refreshFindings();
      });
      unlisten = unsub;
      if (cancelled) unsub();
    };

    setup();
    return () => {
      cancelled = true;
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshFindings is stable (useCallback with [] deps)
  }, []);

  // ── Subscribe to dispatch flow events (inter-agent coordination) ──

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    const setup = async () => {
      const unsub = await onDispatchFlow(() => {
        if (cancelled || !mountedRef.current) return;
        // Dispatch flow events trigger a queue refresh to capture new dispatches
        refreshQueue();
      });
      unlisten = unsub;
      if (cancelled) unsub();
    };

    setup();
    return () => {
      cancelled = true;
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshQueue is stable (useCallback with [] deps)
  }, []);

  // ── PL-003: Stale dispatch sweep — mark entries running > 60s as timeout ──

  useEffect(() => {
    const timer = setInterval(() => {
      if (!mountedRef.current) return;
      const now = Date.now();
      setEntries((prev) => {
        let changed = false;
        const updated = prev.map((e) => {
          if (e.status === 'running' && e.started_at && (now - e.started_at) > STALE_DISPATCH_TIMEOUT_MS) {
            changed = true;
            return { ...e, status: 'timeout' as const, completed_at: now, error: 'Dispatch timed out (60s)' };
          }
          return e;
        });
        return changed ? sortEntries(trimCompleted(updated)) : prev;
      });
    }, STALE_SWEEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // ── Subscribe to finding events for reactive gate updates (K-L-005 fix) ──

  useEffect(() => {
    let unlistenAdded: (() => void) | null = null;
    let unlistenResolved: (() => void) | null = null;
    let cancelled = false;

    const setup = async () => {
      const [addedUnsub, resolvedUnsub] = await Promise.all([
        onFindingAdded(() => {
          if (!cancelled && mountedRef.current) refreshFindings();
        }),
        onFindingResolved(() => {
          if (!cancelled && mountedRef.current) refreshFindings();
        }),
      ]);
      unlistenAdded = addedUnsub;
      unlistenResolved = resolvedUnsub;
      if (cancelled) {
        addedUnsub();
        resolvedUnsub();
      }
    };

    setup();
    return () => {
      cancelled = true;
      unlistenAdded?.();
      unlistenResolved?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshFindings is stable (useCallback with [] deps)
  }, []);

  // ── Refresh helpers ──

  const refreshFindings = useCallback(async () => {
    try {
      const findings = await getFindingCounts();
      if (mountedRef.current) {
        // PL-009: only critical+high+medium block advancement — low findings don't block
          setOpenFindings(findings.critical + findings.high + findings.medium);
      }
    } catch (e) {
      console.warn('[useDispatchQueue] refreshFindings failed:', e);
    }
  }, []);

  const refreshQueue = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const agents = await listActiveAgents();
      if (mountedRef.current) {
        setEntries((prev) => {
          const activeIds = new Set(agents.map((a) => a.dispatch_id));
          // Keep completed entries not in active list
          const completed = prev.filter(
            (e) => !activeIds.has(e.dispatch_id) &&
              (e.status === 'complete' || e.status === 'error' || e.status === 'timeout' || e.status === 'cancelled'),
          );
          // K-L-007: retain recently-running entries for one cycle to prevent vanishing
          const recentlyRunning = prev.filter(
            (e) => !activeIds.has(e.dispatch_id) && e.status === 'running',
          );
          const active = agents.map((a) => {
            const existing = prev.find((e) => e.dispatch_id === a.dispatch_id);
            if (existing) {
              return { ...existing, status: a.status, elapsed_ms: a.elapsed_ms };
            }
            return summaryToEntry(a, categoryMapRef.current);
          });
          return sortEntries([...active, ...recentlyRunning, ...completed].slice(0, MAX_ENTRIES));
        });
      }
    } catch (e) {
      console.warn('[useDispatchQueue] refreshQueue failed:', e);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    fetchingRef.current = true;
    try {
      const [agents, findings] = await Promise.all([
        listActiveAgents(),
        getFindingCounts(),
      ]);
      if (mountedRef.current) {
        const mapped = agents.map((a) => summaryToEntry(a, categoryMapRef.current));
        setEntries(sortEntries(mapped));
        // PL-009: only critical+high+medium block advancement — low findings don't block
          setOpenFindings(findings.critical + findings.high + findings.medium);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(String(e));
      }
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // ── Derived state ──

  const activeDispatches = useMemo(
    () => entries.filter((e) => e.status === 'queued' || e.status === 'running'),
    [entries],
  );

  const gateStatus: GateStatus = useMemo(() => {
    const buildStage = deriveGateStage(entries, ['nyx']);
    const triadStage = deriveGateStage(entries, ['triad', 'pierce', 'mara', 'kehinde']);
    const sentinelStage = deriveGateStage(entries, ['sentinel']);
    const meridianStage = deriveGateStage(entries, ['meridian']);

    const canAdv = triadStage === 'pass' && openFindings === 0 && checkpoint.acknowledged;

    return {
      build: buildStage,
      triad: triadStage,
      sentinel: sentinelStage,
      meridian: meridianStage,
      open_findings: openFindings,
      can_advance: canAdv,
    };
  }, [entries, openFindings, checkpoint.acknowledged]);

  const canAdvance = gateStatus.can_advance;

  // ── Checkpoint management (PL-005: 3 actions — advance, re-gate, hold) ──

  const setCheckpointAction = useCallback((action: CheckpointAction) => {
    setCheckpointActionState(action);
    if (action === 'advance') {
      setCheckpoint((prev) => ({ ...prev, acknowledged: true }));
    } else {
      setCheckpoint((prev) => ({ ...prev, acknowledged: false }));
    }
    // PL-005: persist to backend — map 're-gate' to 'regate' for Rust enum
    const backendAction = action === 're-gate' ? 'regate' : action;
    sendCheckpointAction(backendAction as 'advance' | 'regate' | 'hold', checkpoint.batch_id)
      .catch((err) => console.warn('[useDispatchQueue] checkpoint action failed:', err));
  }, [checkpoint.batch_id]);

  const resetCheckpoint = useCallback((batchId: string) => {
    setCheckpoint({ batch_id: batchId, acknowledged: false, summary: null });
    setCheckpointActionState(null);
  }, []);

  // Stub — wired when document generation engine ships (Phase 8+)
  const exportReport = useCallback(async () => {
    // Will invoke doc gen Tauri command when available
  }, []);

  return {
    queue: entries,
    activeDispatches,
    gateStatus,
    canAdvance,
    checkpoint,
    setCheckpointAction,
    resetCheckpoint,
    maxConcurrent: MAX_CONCURRENT_DEFAULT,
    loading,
    error,
    refresh,
    exportReport,
  };
}

// ── Helpers ──

/** Map AgentWorkingState values to AgentStatus. */
// K-L-004 fix: idle maps to 'queued' (not 'complete'). True completion
// comes from agent:result events, not working state transitions.
function mapWorkingStateToStatus(state: string): DispatchQueueEntry['status'] {
  switch (state) {
    case 'idle': return 'queued';
    case 'streaming':
    case 'executing_tool': return 'running';
    case 'waiting_for_confirmation':
    case 'compacting': return 'running';
    default: return 'queued';
  }
}

/** Trim completed entries to keep only the most recent MAX_COMPLETED.
 *  K-L-006: ensure completed_at is set on all terminal entries for stable sort. */
function trimCompleted(entries: DispatchQueueEntry[]): DispatchQueueEntry[] {
  const now = Date.now();
  const active = entries.filter(
    (e) => e.status === 'queued' || e.status === 'running',
  );
  const completed = entries
    .filter((e) => e.status !== 'queued' && e.status !== 'running')
    .map((e) => e.completed_at ? e : { ...e, completed_at: now })
    .sort((a, b) => (b.completed_at ?? 0) - (a.completed_at ?? 0))
    .slice(0, MAX_COMPLETED);
  return [...active, ...completed];
}
