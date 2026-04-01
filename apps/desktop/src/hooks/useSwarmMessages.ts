import { useState, useEffect, useCallback, useRef } from 'react';
import {
  swarmGetMessages,
  onSwarmMessage,
  swarmMarkRead,
  type SwarmMessage,
} from '../lib/tauri';

interface UseSwarmMessagesReturn {
  /** All messages for this agent. */
  messages: SwarmMessage[];
  /** Unread count. */
  unreadCount: number;
  /** Mark a specific message as read. */
  markRead: (messageId: string) => Promise<void>;
  /** Force refresh messages. */
  refresh: () => Promise<void>;
  /** Loading state. */
  loading: boolean;
  /** Last error. */
  error: string | null;
}

/**
 * Hook that subscribes to swarm messages for a specific agent.
 * Listens to 'swarm-message' Tauri events for real-time updates.
 */
export function useSwarmMessages(agentId: string): UseSwarmMessagesReturn {
  const [messages, setMessages] = useState<SwarmMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const agentIdRef = useRef(agentId);
  agentIdRef.current = agentId;

  const refresh = useCallback(async () => {
    try {
      const msgs = await swarmGetMessages({ to_agent: agentIdRef.current });
      setMessages(msgs);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh, agentId]);

  // Listen for real-time swarm events
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    onSwarmMessage((event) => {
      const msg = event.message;
      // Only add if it's for our agent
      if (msg.to_agent === agentIdRef.current || msg.from_agent === agentIdRef.current) {
        setMessages((prev) => [msg, ...prev]);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const markRead = useCallback(async (messageId: string) => {
    try {
      await swarmMarkRead(messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
      );
    } catch (e) {
      console.error('Failed to mark message read:', e);
    }
  }, []);

  const unreadCount = messages.filter((m) => !m.is_read && m.to_agent === agentId).length;

  return { messages, unreadCount, markRead, refresh, loading, error };
}
