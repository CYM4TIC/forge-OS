import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getServiceStatus,
  checkAllServices,
  setCheckInterval as setCheckIntervalCmd,
  onConnectivityChanged,
  type ServiceHealth,
} from '../lib/tauri';

interface UseConnectivityReturn {
  /** Array of service health results. */
  services: ServiceHealth[];
  /** Whether the initial load or a refresh is in progress. */
  loading: boolean;
  /** Last error message. */
  error: string | null;
  /** Force an immediate re-check of all services. */
  refresh: () => Promise<void>;
  /** Update the background polling interval (10-3600 seconds). */
  setInterval: (seconds: number) => Promise<void>;
}

/**
 * Hook for service health monitoring.
 * Subscribes to `connectivity:status-changed` events for real-time status transitions.
 * On mount: loads cached status first (fast), then triggers a fresh check.
 */
export function useConnectivity(): UseConnectivityReturn {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // ── Initial load: cached first, then fresh ──

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const load = async () => {
      try {
        // Fast: return cached results immediately
        const cached = await getServiceStatus();
        if (!cancelled && cached.length > 0) {
          setServices(cached);
        }

        // Then: trigger a fresh check (network calls)
        const fresh = await checkAllServices();
        if (!cancelled) {
          setServices(fresh);
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

  // ── Subscribe to real-time status change events ──

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    const setup = async () => {
      const unsub = await onConnectivityChanged((event) => {
        if (cancelled) return;
        // Update the matching service's status in the array
        setServices((prev) =>
          prev.map((s) =>
            s.serviceType === event.serviceType
              ? { ...s, status: event.status, lastChecked: new Date().toISOString() }
              : s,
          ),
        );
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
      const fresh = await checkAllServices();
      if (mountedRef.current) {
        setServices(fresh);
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

  const setInterval = useCallback(async (seconds: number) => {
    try {
      await setCheckIntervalCmd(seconds);
    } catch (e) {
      if (mountedRef.current) {
        setError(String(e));
      }
    }
  }, []);

  return { services, loading, error, refresh, setInterval };
}
