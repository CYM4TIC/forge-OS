import { useState, useEffect, useCallback } from 'react';
import {
  listSessions,
  createSession,
  deleteSession,
  type SessionRow,
} from '../lib/tauri';

interface UseSessionsReturn {
  sessions: SessionRow[];
  activeId: string | null;
  loading: boolean;
  error: string | null;
  setActiveId: (id: string) => void;
  create: (title?: string) => Promise<string>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listSessions();
      setSessions(list);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — set active to most recent
  useEffect(() => {
    async function init() {
      try {
        const list = await listSessions();
        setSessions(list);
        if (list.length > 0) {
          setActiveId(list[0].id);
        } else {
          const session = await createSession();
          setSessions([session]);
          setActiveId(session.id);
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const create = useCallback(
    async (title?: string) => {
      try {
        const session = await createSession(title);
        setSessions((prev) => [session, ...prev]);
        setActiveId(session.id);
        return session.id;
      } catch (e) {
        setError(String(e));
        throw e;
      }
    },
    [],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteSession(id);
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (activeId === id) {
          // Switch to next available or create new
          setSessions((prev) => {
            const remaining = prev.filter((s) => s.id !== id);
            if (remaining.length > 0) {
              setActiveId(remaining[0].id);
            } else {
              // Will need to create a new session
              createSession().then((session) => {
                setSessions([session]);
                setActiveId(session.id);
              });
            }
            return remaining;
          });
        }
      } catch (e) {
        setError(String(e));
      }
    },
    [activeId],
  );

  return { sessions, activeId, loading, error, setActiveId, create, remove, refresh };
}
