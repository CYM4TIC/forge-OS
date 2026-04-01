import { useState, useEffect, useCallback } from 'react';
import {
  swarmGetMessages,
  swarmRespondPermission,
  onSwarmMessage,
  type SwarmMessage,
  type PermissionRequestPayload,
} from '../lib/tauri';

export interface PendingPermission {
  message: SwarmMessage;
  payload: PermissionRequestPayload;
}

interface UsePermissionsReturn {
  /** Pending permission requests awaiting approval. */
  pending: PendingPermission[];
  /** Approve a permission request. */
  approve: (requestId: string, reason?: string) => Promise<void>;
  /** Deny a permission request. */
  deny: (requestId: string, reason?: string) => Promise<void>;
  /** Loading state. */
  loading: boolean;
}

/**
 * Hook that manages the pending permission queue for a leader agent.
 * Filters unread permission_request messages and provides approve/deny actions.
 */
export function usePermissions(agentId: string): UsePermissionsReturn {
  const [pending, setPending] = useState<PendingPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    try {
      const msgs = await swarmGetMessages({
        to_agent: agentId,
        unread_only: true,
      });
      const permissions = msgs
        .filter((m) => m.msg_type === 'permission_request')
        .map((m) => {
          try {
            const payload: PermissionRequestPayload = JSON.parse(m.payload);
            return { message: m, payload };
          } catch {
            return null;
          }
        })
        .filter((p): p is PendingPermission => p !== null);
      setPending(permissions);
    } catch (e) {
      console.error('Failed to fetch permissions:', e);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Initial fetch
  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // Listen for new permission requests
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    onSwarmMessage((event) => {
      const msg = event.message;
      if (msg.to_agent === agentId && msg.msg_type === 'permission_request') {
        try {
          const payload: PermissionRequestPayload = JSON.parse(msg.payload);
          setPending((prev) => [...prev, { message: msg, payload }]);
        } catch {
          // ignore malformed payloads
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [agentId]);

  const approve = useCallback(
    async (requestId: string, reason?: string) => {
      await swarmRespondPermission({
        request_id: requestId,
        responder_agent: agentId,
        approved: true,
        reason,
      });
      setPending((prev) => prev.filter((p) => p.message.id !== requestId));
    },
    [agentId]
  );

  const deny = useCallback(
    async (requestId: string, reason?: string) => {
      await swarmRespondPermission({
        request_id: requestId,
        responder_agent: agentId,
        approved: false,
        reason,
      });
      setPending((prev) => prev.filter((p) => p.message.id !== requestId));
    },
    [agentId]
  );

  return { pending, approve, deny, loading };
}
