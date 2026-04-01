import { useState, useEffect, useCallback, useRef } from 'react';
import {
  listActiveAgents,
  onAgentResult,
  type AgentSummary,
  type AgentResult,
} from '../lib/tauri';

interface UseAgentDispatchReturn {
  /** Currently active (queued/running) agents. */
  activeAgents: AgentSummary[];
  /** Completed agent results from this session. */
  results: AgentResult[];
  /** Whether we're polling for active agents. */
  loading: boolean;
  /** Last error from polling. */
  error: string | null;
  /** Force refresh the active agents list. */
  refresh: () => Promise<void>;
  /** Clear completed results. */
  clearResults: () => void;
}

/**
 * Hook that tracks dispatched agent activity.
 * Polls active agents every `pollInterval` ms and listens for result events.
 */
export function useAgentDispatch(pollInterval = 2000): UseAgentDispatchReturn {
  const [activeAgents, setActiveAgents] = useState<AgentSummary[]>([]);
  const [results, setResults] = useState<AgentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const agents = await listActiveAgents();
      setActiveAgents(agents);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for active agents
  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, pollInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, pollInterval]);

  // Listen for agent:result events
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    onAgentResult((result) => {
      setResults((prev) => [result, ...prev]);
      // Refresh active list when we get a result
      refresh();
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [refresh]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return { activeAgents, results, loading, error, refresh, clearResults };
}
