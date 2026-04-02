// useSessionTimeline — Phase 5.2 (P5-J)
// Aggregates session events (commits, findings, gate verdicts) into a time-ordered list.
// Subscribes to real-time HUD events. Returns merged + sorted timeline.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isTauriRuntime,
  getBuildStateSnapshot,
  listHudFindings,
  onBuildStateChanged,
  onFindingAdded,
  onFindingResolved,
  type BuildStateSnapshot,
  type HudFinding,
} from '../lib/tauri';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TimelineEventKind = 'commit' | 'finding_added' | 'finding_resolved' | 'gate_verdict' | 'batch_complete';

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  timestamp: string; // ISO 8601
  title: string;
  detail: string | null;
  severity: string | null; // for findings
  persona: string | null;  // for findings + gate verdicts
  batchId: string | null;
}

export interface UseSessionTimelineReturn {
  events: TimelineEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ─── Event Builders ─────────────────────────────────────────────────────────

function findingToEvent(f: HudFinding): TimelineEvent {
  return {
    id: `finding-${f.id}`,
    kind: 'finding_added',
    timestamp: f.created_at,
    title: f.title,
    detail: f.description,
    severity: f.severity,
    persona: f.persona,
    batchId: f.batch_id,
  };
}

function findingResolvedToEvent(findingId: string, resolvedAt: string): TimelineEvent {
  return {
    id: `resolved-${findingId}`,
    kind: 'finding_resolved',
    timestamp: resolvedAt,
    title: 'Finding resolved',
    detail: findingId,
    severity: null,
    persona: null,
    batchId: null,
  };
}

function snapshotToEvents(snap: BuildStateSnapshot): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Current batch as a batch_complete or in-progress marker
  if (snap.current_batch && snap.last_updated) {
    events.push({
      id: `batch-${snap.current_batch}-${snap.last_updated}`,
      kind: 'batch_complete',
      timestamp: snap.last_updated,
      title: `Batch ${snap.current_batch}`,
      detail: snap.current_session ?? null,
      severity: null,
      persona: null,
      batchId: snap.current_batch,
    });
  }

  // Last commit
  if (snap.last_commit && snap.last_updated) {
    events.push({
      id: `commit-${snap.last_commit}`,
      kind: 'commit',
      timestamp: snap.last_updated,
      title: snap.last_commit.slice(0, 7),
      detail: `Phase ${snap.phase}`,
      severity: null,
      persona: null,
      batchId: snap.current_batch ?? null,
    });
  }

  return events;
}

// ─── Sorting ────────────────────────────────────────────────────────────────

function sortByTimestamp(a: TimelineEvent, b: TimelineEvent): number {
  return a.timestamp.localeCompare(b.timestamp);
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useSessionTimeline(): UseSessionTimelineReturn {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Dedup set to prevent duplicate events on re-render
  const seenIdsRef = useRef<Set<string>>(new Set());

  const addEvent = useCallback((evt: TimelineEvent) => {
    if (seenIdsRef.current.has(evt.id)) return;
    seenIdsRef.current.add(evt.id);
    setEvents((prev) => {
      const next = [...prev, evt];
      next.sort(sortByTimestamp);
      return next;
    });
  }, []);

  const addEvents = useCallback((evts: TimelineEvent[]) => {
    const fresh = evts.filter((e) => !seenIdsRef.current.has(e.id));
    if (fresh.length === 0) return;
    for (const e of fresh) seenIdsRef.current.add(e.id);
    setEvents((prev) => {
      const next = [...prev, ...fresh];
      next.sort(sortByTimestamp);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!isTauriRuntime) return;
    try {
      setLoading(true);
      setError(null);

      const [findings, snapshot] = await Promise.all([
        listHudFindings({}),
        getBuildStateSnapshot(''),
      ]);

      const findingEvents = findings.map(findingToEvent);
      const snapshotEvents = snapshotToEvents(snapshot);

      // Reset seen IDs on full refresh
      seenIdsRef.current = new Set();
      const allEvents = [...findingEvents, ...snapshotEvents];
      for (const e of allEvents) seenIdsRef.current.add(e.id);
      allEvents.sort(sortByTimestamp);

      if (mountedRef.current) {
        setEvents(allEvents);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real-time subscriptions
  useEffect(() => {
    if (!isTauriRuntime) return;

    let mounted = true;
    const unlisteners: Array<() => void> = [];

    // New finding → add to timeline
    onFindingAdded((finding) => {
      if (!mounted) return;
      addEvent(findingToEvent(finding));
    }).then((fn) => {
      if (mounted) unlisteners.push(fn);
      else fn();
    });

    // Finding resolved → add resolved event
    onFindingResolved((event) => {
      if (!mounted) return;
      addEvent(findingResolvedToEvent(event.finding_id, event.resolved_at));
    }).then((fn) => {
      if (mounted) unlisteners.push(fn);
      else fn();
    });

    // Build state changed → extract new commit/batch events
    onBuildStateChanged((snapshot) => {
      if (!mounted) return;
      addEvents(snapshotToEvents(snapshot));
    }).then((fn) => {
      if (mounted) unlisteners.push(fn);
      else fn();
    });

    return () => {
      mounted = false;
      for (const fn of unlisteners) fn();
    };
  }, [addEvent, addEvents]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { events, loading, error, refresh };
}
