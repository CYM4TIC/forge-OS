import { useState, useEffect, useCallback } from 'react';
import {
  listProviders,
  setDefaultProvider,
  type ProviderInfo,
} from '../lib/tauri';

interface UseProvidersReturn {
  providers: ProviderInfo[];
  defaultId: string | null;
  loading: boolean;
  error: string | null;
  switchProvider: (providerId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProviders(): UseProvidersReturn {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listProviders();
      setProviders(list);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const defaultId = providers.find((p) => p.is_default)?.id ?? null;

  const switchProvider = useCallback(
    async (providerId: string) => {
      const ok = await setDefaultProvider(providerId);
      if (ok) {
        await refresh();
      }
    },
    [refresh],
  );

  return { providers, defaultId, loading, error, switchProvider, refresh };
}
