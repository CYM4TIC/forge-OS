import { useState, useEffect, useCallback } from 'react';
import { useChat } from '../../hooks/useChat';
import { createSession, listSessions } from '../../lib/tauri';
import MessageList from '../chat/MessageList';
import MessageInput from '../chat/MessageInput';

export default function ChatPanel() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const { messages, isStreaming, error, send } = useChat(sessionId);

  // On mount, load the most recent session or create one
  useEffect(() => {
    async function init() {
      try {
        const sessions = await listSessions();
        if (sessions.length > 0) {
          setSessionId(sessions[0].id);
        } else {
          const session = await createSession();
          setSessionId(session.id);
        }
      } catch (e) {
        console.error('Failed to initialize session:', e);
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, []);

  const handleSend = useCallback(
    (content: string) => {
      send(content);
    },
    [send],
  );

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-secondary rounded-lg border border-border-subtle">
        <span className="text-text-muted text-sm">Initializing...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-secondary rounded-lg border border-border-subtle overflow-hidden">
      {error && (
        <div className="flex-shrink-0 px-4 py-2 bg-danger/10 border-b border-danger/20 text-danger text-xs">
          {error}
        </div>
      )}
      <MessageList messages={messages} isStreaming={isStreaming} />
      <MessageInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
