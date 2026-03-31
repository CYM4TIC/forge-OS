import { useState, useEffect, useCallback } from 'react';
import { listAgents, type AgentInfo } from '../lib/tauri';

interface UseAgentsReturn {
  agents: AgentInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAgents(agentsDir?: string): UseAgentsReturn {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listAgents(agentsDir);
      setAgents(list);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [agentsDir]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { agents, loading, error, refresh };
}
