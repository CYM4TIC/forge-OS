import { useState, useEffect, useCallback, useRef } from 'react';
import {
  listMessages,
  sendMessage,
  onChatStream,
  type StreamEvent,
  type CapabilityTier,
} from '../lib/tauri';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  status: 'complete' | 'streaming' | 'error';
}

interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  send: (content: string, providerId?: string, tier?: CapabilityTier) => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;
}

export function useChat(sessionId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingRef = useRef<{ messageId: string; content: string } | null>(null);

  // Load existing messages for a session
  const loadMessages = useCallback(async (sid: string) => {
    try {
      const rows = await listMessages(sid);
      setMessages(
        rows.map((r) => ({
          id: r.id,
          role: r.role,
          content: r.content,
          model: r.model,
          tokens_in: r.tokens_in,
          tokens_out: r.tokens_out,
          status: 'complete' as const,
        })),
      );
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (sessionId) {
      loadMessages(sessionId);
    } else {
      setMessages([]);
    }
  }, [sessionId, loadMessages]);

  // Listen for streaming events
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    onChatStream((event: StreamEvent) => {
      // Only process events for the current session
      if (event.session_id !== sessionId) return;

      if (event.done) {
        // Stream complete — finalize the message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event.message_id
              ? {
                  ...m,
                  status: 'complete' as const,
                  model: event.model ?? m.model,
                  tokens_in: event.tokens_in ?? m.tokens_in,
                  tokens_out: event.tokens_out ?? m.tokens_out,
                }
              : m,
          ),
        );
        streamingRef.current = null;
        setIsStreaming(false);
      } else {
        // Streaming delta
        if (
          !streamingRef.current ||
          streamingRef.current.messageId !== event.message_id
        ) {
          // First chunk — create the message
          streamingRef.current = {
            messageId: event.message_id,
            content: event.delta,
          };
          setMessages((prev) => [
            ...prev,
            {
              id: event.message_id,
              role: 'assistant',
              content: event.delta,
              model: event.model,
              tokens_in: null,
              tokens_out: null,
              status: 'streaming',
            },
          ]);
        } else {
          // Subsequent chunk — append
          streamingRef.current.content += event.delta;
          const accumulated = streamingRef.current.content;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === event.message_id
                ? { ...m, content: accumulated }
                : m,
            ),
          );
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [sessionId]);

  // Send a message
  const send = useCallback(
    async (content: string, providerId?: string, tier?: CapabilityTier) => {
      if (!sessionId || !content.trim() || isStreaming) return;

      setError(null);
      setIsStreaming(true);

      // Optimistically add the user message
      const tempId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          role: 'user',
          content: content.trim(),
          model: null,
          tokens_in: null,
          tokens_out: null,
          status: 'complete',
        },
      ]);

      try {
        await sendMessage({
          session_id: sessionId,
          content: content.trim(),
          provider_id: providerId,
          tier,
        });
      } catch (e) {
        setError(String(e));
        setIsStreaming(false);
        // Reload to get accurate state from DB
        await loadMessages(sessionId);
      }
    },
    [sessionId, isStreaming, loadMessages],
  );

  return { messages, isStreaming, error, send, loadMessages };
}
