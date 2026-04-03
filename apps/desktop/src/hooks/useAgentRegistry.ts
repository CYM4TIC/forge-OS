// ── useAgentRegistry — Cached-then-fresh agent registry with real-time state ──
// P7-E: follows useConnectivity pattern (OS-BL-008: isTauriRuntime guarded in bridge).
// Groups agents by category for TeamPanel rendering.
// Subscribes to agent:working-state-changed for live glyph animation.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getAgentRegistry,
  refreshAgentRegistry,
  getCommandRegistry,
  onAgentWorkingStateChanged,
  onConnectivityChanged,
  type RegistryEntry,
  type CommandDef,
  type AgentWorkingStateEvent,
} from '../lib/tauri';

// ── Types ────────────────────────────────────────────────────────────────────

/** Agent working state keyed by slug — drives glyph animation in TeamPanel. */
export type AgentStateMap = Record<string, AgentWorkingStateEvent['state']>;

/** Agents grouped by category for section rendering. */
export interface GroupedAgents {
  persona: RegistryEntry[];
  intelligence: RegistryEntry[];
  orchestrator: RegistryEntry[];
  utility: RegistryEntry[];
  sub_agent: RegistryEntry[];
  command: RegistryEntry[];
}

export interface UseAgentRegistryReturn {
  /** Flat list of all registered agents. */
  agents: RegistryEntry[];
  /** Agents grouped by category. */
  grouped: GroupedAgents;
  /** All registered slash commands. */
  commands: CommandDef[];
  /** Per-agent working state (slug → state). */
  agentStates: AgentStateMap;
  /** Whether initial load is in progress. */
  loading: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** Force-rescan the registry (triggers file walk). */
  refresh: () => Promise<void>;
}

// ── Grouping Helper ──────────────────────────────────────────────────────────

const EMPTY_GROUPS: GroupedAgents = {
  persona: [],
  intelligence: [],
  orchestrator: [],
  utility: [],
  sub_agent: [],
  command: [],
};

function groupByCategory(agents: RegistryEntry[]): GroupedAgents {
  const groups: GroupedAgents = {
    persona: [],
    intelligence: [],
    orchestrator: [],
    utility: [],
    sub_agent: [],
    command: [],
  };
  for (const agent of agents) {
    const bucket = groups[agent.category as keyof GroupedAgents];
    if (bucket) {
      bucket.push(agent);
    }
  }
  return groups;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook for the agent registry and working state.
 * On mount: loads cached registry (fast), then triggers a fresh rescan.
 * Subscribes to `agent:working-state-changed` for real-time glyph updates.
 * Re-fetches on `connectivity:status-changed` (availability may change).
 */
export function useAgentRegistry(): UseAgentRegistryReturn {
  const [agents, setAgents] = useState<RegistryEntry[]>([]);
  const [commands, setCommands] = useState<CommandDef[]>([]);
  const [agentStates, setAgentStates] = useState<AgentStateMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // ── Initial load: cached first, then fresh ──

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const load = async () => {
      try {
        // Phase 1: cached registry (fast — no file walk)
        const [cachedAgents, cachedCommands] = await Promise.all([
          getAgentRegistry(),
          getCommandRegistry(),
        ]);
        if (!cancelled && cachedAgents.length > 0) {
          setAgents(cachedAgents);
          setCommands(cachedCommands);
        }

        // Phase 2: fresh rescan (triggers agent/ directory walk)
        const freshAgents = await refreshAgentRegistry();
        if (!cancelled) {
          setAgents(freshAgents);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  // ── Subscribe to agent working state changes ──

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    const setup = async () => {
      const unsub = await onAgentWorkingStateChanged((event) => {
        if (cancelled) return;
        setAgentStates((prev) => ({
          ...prev,
          [event.agent_slug]: event.state,
        }));
      });
      if (!cancelled) unlisten = unsub;
    };

    setup();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // ── Re-fetch on connectivity changes (availability may have changed) ──

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    const setup = async () => {
      const unsub = await onConnectivityChanged(async () => {
        if (cancelled) return;
        try {
          const fresh = await refreshAgentRegistry();
          if (!cancelled && mountedRef.current) {
            setAgents(fresh);
          }
        } catch {
          // Non-fatal: keep stale data
        }
      });
      if (!cancelled) unlisten = unsub;
    };

    setup();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // ── Actions ──

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [freshAgents, freshCommands] = await Promise.all([
        refreshAgentRegistry(),
        getCommandRegistry(),
      ]);
      if (mountedRef.current) {
        setAgents(freshAgents);
        setCommands(freshCommands);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(String(e));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // ── Memoized grouping (only recomputes when agents array changes) ──

  const grouped = useMemo(() => {
    if (agents.length === 0) return EMPTY_GROUPS;
    return groupByCategory(agents);
  }, [agents]);

  return { agents, grouped, commands, agentStates, loading, error, refresh };
}
