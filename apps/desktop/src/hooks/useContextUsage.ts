import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getContextUsage,
  getLastSummary,
  type ThresholdStatus,
  type UsageZone,
  type CompactionSummary,
} from '../lib/tauri';

interface UseContextUsageReturn {
  /** Current threshold status (null before first poll). */
  status: ThresholdStatus | null;
  /** Current zone for color coding. */
  zone: UsageZone | null;
  /** Whether auto-compact should trigger. */
  shouldCompact: boolean;
  /** Whether compaction is currently in progress. */
  isCompacting: boolean;
  /** Last compaction summary for the session. */
  lastSummary: CompactionSummary | null;
  /** Manually refresh usage. */
  refresh: () => void;
  /** Set compacting state (called by chat when compaction starts/ends). */
  setCompacting: (v: boolean) => void;
}

/**
 * Polls context usage at a regular interval.
 * Feeds the ContextMeter and triggers auto-compact.
 *
 * @param sessionId - Current session ID (null = no polling)
 * @param conversationContent - Full conversation text to count
 * @param pollIntervalMs - How often to poll (default 10s)
 */
export function useContextUsage(
  sessionId: string | null,
  conversationContent: string,
  pollIntervalMs = 10_000,
): UseContextUsageReturn {
  const [status, setStatus] = useState<ThresholdStatus | null>(null);
  const [isCompacting, setIsCompacting] = useState(false);
  const [lastSummary, setLastSummary] = useState<CompactionSummary | null>(null);
  const contentRef = useRef(conversationContent);
  contentRef.current = conversationContent;

  const fetchUsage = useCallback(async () => {
    if (!contentRef.current) return;
    try {
      const result = await getContextUsage({ content: contentRef.current });
      setStatus(result);
    } catch {
      // Silently fail — non-critical
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!sessionId) return;
    try {
      const summary = await getLastSummary(sessionId);
      setLastSummary(summary);
    } catch {
      // Silently fail
    }
  }, [sessionId]);

  // Poll context usage
  useEffect(() => {
    if (!sessionId) return;

    // Initial fetch
    fetchUsage();
    fetchSummary();

    const interval = setInterval(fetchUsage, pollIntervalMs);
    return () => clearInterval(interval);
  }, [sessionId, pollIntervalMs, fetchUsage, fetchSummary]);

  return {
    status,
    zone: status?.zone ?? null,
    shouldCompact: status?.should_compact ?? false,
    isCompacting,
    lastSummary,
    refresh: fetchUsage,
    setCompacting: setIsCompacting,
  };
}
