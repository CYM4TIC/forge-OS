import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAgents } from './useAgents';
import { useAgentDispatch } from './useAgentDispatch';
import {
  onAgentStatusChanged,
  type AgentInfo,
  type AgentHudStatus,
  type AgentStatusEvent,
} from '../lib/tauri';

// ─── Types ──────────────────────────────────────────────────────────────────

export type BoardAgentStatus = AgentHudStatus; // 'idle' | 'dispatched' | 'running' | 'complete' | 'error'

export interface BoardAgent {
  slug: string;
  name: string;
  description: string;
  filePath: string;
  status: BoardAgentStatus;
  modelTier: string | null;
  /** Elapsed ms if actively dispatched. */
  elapsedMs: number | null;
  /** Last error message if status is 'error'. */
  lastError: string | null;
}

export interface UseAgentBoardReturn {
  agents: BoardAgent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Agent currently expanded in the detail overlay, or null. */
  expandedSlug: string | null;
  setExpandedSlug: React.Dispatch<React.SetStateAction<string | null>>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAgentBoard(): UseAgentBoardReturn {
  const { agents: agentList, loading: agentsLoading, error: agentsError, refresh: refreshAgents } = useAgents();
  const { activeAgents, results, loading: dispatchLoading, error: dispatchError, refresh: refreshDispatch } = useAgentDispatch();
  const [hudStatuses, setHudStatuses] = useState<Map<string, AgentStatusEvent>>(new Map());
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  // Listen for HUD agent status events (real-time updates from Rust)
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let mounted = true;

    onAgentStatusChanged((event) => {
      setHudStatuses((prev) => {
        const next = new Map(prev);
        next.set(event.persona, event);
        return next;
      });
    }).then((fn) => {
      if (mounted) {
        unlisten = fn;
      } else {
        fn(); // Already unmounted — clean up immediately
      }
    });

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, []);

  // Merge agent list + dispatch status + HUD events into unified BoardAgent[]
  const agents: BoardAgent[] = useMemo(() => {
    return agentList.map((agent: AgentInfo): BoardAgent => {
      // HUD status takes priority (most recent real-time data)
      const hudEvent = hudStatuses.get(agent.slug);
      if (hudEvent) {
        return {
          slug: agent.slug,
          name: agent.name,
          description: agent.description,
          filePath: agent.file_path,
          status: hudEvent.status,
          modelTier: hudEvent.model_tier,
          elapsedMs: null,
          lastError: hudEvent.status === 'error' ? 'Agent reported error' : null,
        };
      }

      // Dispatch status as fallback
      const active = activeAgents.find((a) => a.agent_slug === agent.slug);
      if (active) {
        const isQueued = active.status === 'queued';
        return {
          slug: agent.slug,
          name: agent.name,
          description: agent.description,
          filePath: agent.file_path,
          status: isQueued ? 'dispatched'
            : active.status === 'running' ? 'running'
            : active.status === 'complete' ? 'complete'
            : active.status === 'error' || active.status === 'timeout' || active.status === 'cancelled' ? 'error'
            : 'idle',
          modelTier: null,
          elapsedMs: isQueued ? null : active.elapsed_ms,
          lastError: active.status === 'timeout' ? 'Agent timed out'
            : active.status === 'cancelled' ? 'Agent cancelled'
            : null,
        };
      }

      // Check completed results for recent status
      const lastResult = results.find((r) => r.agent_slug === agent.slug);
      if (lastResult) {
        return {
          slug: agent.slug,
          name: agent.name,
          description: agent.description,
          filePath: agent.file_path,
          status: lastResult.status === 'complete' ? 'complete'
            : lastResult.status === 'error' || lastResult.status === 'timeout' || lastResult.status === 'cancelled' ? 'error'
            : 'idle',
          modelTier: null,
          elapsedMs: lastResult.duration_ms,
          lastError: lastResult.error
            ?? (lastResult.status === 'timeout' ? 'Agent timed out'
              : lastResult.status === 'cancelled' ? 'Agent cancelled'
              : null),
        };
      }

      // Default: idle
      return {
        slug: agent.slug,
        name: agent.name,
        description: agent.description,
        filePath: agent.file_path,
        status: 'idle',
        modelTier: null,
        elapsedMs: null,
        lastError: null,
      };
    });
  }, [agentList, activeAgents, results, hudStatuses]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshAgents(), refreshDispatch()]);
  }, [refreshAgents, refreshDispatch]);

  return {
    agents,
    loading: agentsLoading || dispatchLoading,
    error: agentsError || dispatchError,
    refresh,
    expandedSlug,
    setExpandedSlug,
  };
}
