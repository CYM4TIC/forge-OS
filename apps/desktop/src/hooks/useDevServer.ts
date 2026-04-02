import { useState, useEffect, useCallback, useRef } from 'react';
import {
  startDevServer,
  stopDevServer,
  restartDevServer,
  listDevServers,
  getServerLogs,
  onDevServerStatusChanged,
  type DevServerInfo,
  type LogLine,
} from '../lib/tauri';

interface UseDevServerReturn {
  /** Current server info (null if no server selected). */
  server: DevServerInfo | null;
  /** Recent log lines from the server. */
  logs: LogLine[];
  /** Start a new dev server. Returns the new server info. */
  start: (command: string, args: string[], cwd: string) => Promise<DevServerInfo>;
  /** Stop the current server. */
  stop: () => Promise<void>;
  /** Restart the current server. Returns the new server info. */
  restart: () => Promise<DevServerInfo>;
  /** Whether an operation is in progress. */
  loading: boolean;
  /** Last error message. */
  error: string | null;
}

/**
 * Hook for managing a single dev server.
 * Subscribes to `devserver:status-changed` events for real-time status updates.
 * Polls logs every 2s when the server is active.
 */
export function useDevServer(serverId: string | null): UseDevServerReturn {
  const [server, setServer] = useState<DevServerInfo | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch server info by scanning the server list
  const refreshServer = useCallback(async (id: string) => {
    try {
      const servers = await listDevServers();
      const found = servers.find((s) => s.id === id) ?? null;
      setServer(found);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  // Fetch logs for the server
  const refreshLogs = useCallback(async (id: string) => {
    try {
      const lines = await getServerLogs(id, 200);
      setLogs(lines);
    } catch {
      // Server may have been removed — ignore
    }
  }, []);

  // Load server info when serverId changes
  useEffect(() => {
    if (!serverId) {
      setServer(null);
      setLogs([]);
      return;
    }
    refreshServer(serverId);
    refreshLogs(serverId);
  }, [serverId, refreshServer, refreshLogs]);

  // Subscribe to status change events
  useEffect(() => {
    if (!serverId) return;

    let unlisten: (() => void) | null = null;

    onDevServerStatusChanged((event) => {
      if (event.serverId === serverId) {
        // Update server info with new status and port
        setServer((prev) =>
          prev
            ? { ...prev, status: event.status, port: event.port ?? prev.port }
            : prev,
        );
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [serverId]);

  // Poll logs every 2s when server is active
  useEffect(() => {
    if (!serverId || !server) return;

    const isActive =
      server.status === 'starting' ||
      server.status === 'running' ||
      server.status === 'healthy' ||
      server.status === 'degraded';

    if (isActive) {
      refreshLogs(serverId);
      logIntervalRef.current = setInterval(() => refreshLogs(serverId), 2000);
    }

    return () => {
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current);
        logIntervalRef.current = null;
      }
    };
  }, [serverId, server?.status, refreshLogs]);

  // ── Actions ──

  const start = useCallback(
    async (command: string, args: string[], cwd: string): Promise<DevServerInfo> => {
      setLoading(true);
      setError(null);
      try {
        const info = await startDevServer(command, args, cwd);
        setServer(info);
        return info;
      } catch (e) {
        const msg = String(e);
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const stop = useCallback(async (): Promise<void> => {
    if (!serverId) return;
    setLoading(true);
    setError(null);
    try {
      await stopDevServer(serverId);
      setServer((prev) => (prev ? { ...prev, status: 'stopped', pid: null } : prev));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  const restart = useCallback(async (): Promise<DevServerInfo> => {
    if (!serverId) throw new Error('No server to restart');
    setLoading(true);
    setError(null);
    try {
      const info = await restartDevServer(serverId);
      setServer(info);
      return info;
    } catch (e) {
      const msg = String(e);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  return { server, logs, start, stop, restart, loading, error };
}
