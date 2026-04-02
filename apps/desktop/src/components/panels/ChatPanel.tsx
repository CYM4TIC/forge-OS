import { useState, useCallback } from 'react';
import { useChat } from '../../hooks/useChat';
import { useSessions } from '../../hooks/useSessions';
import { useProviders } from '../../hooks/useProviders';
import { useAgents } from '../../hooks/useAgents';
import { useContextUsage } from '../../hooks/useContextUsage';
import MessageList from '../chat/MessageList';
import MessageInput from '../chat/MessageInput';
import PersonaSelector from '../chat/PersonaSelector';
import ProviderSelector from '../chat/ProviderSelector';
import SessionSidebar from '../chat/SessionSidebar';
import SessionContinuity from '../status/SessionContinuity';

export default function ChatPanel() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

  const {
    sessions,
    activeId,
    loading: sessionsLoading,
    setActiveId,
    create: createNewSession,
    remove: removeSession,
  } = useSessions();

  const {
    providers,
    defaultId: selectedProvider,
    loading: providersLoading,
    switchProvider,
  } = useProviders();

  const { agents, loading: agentsLoading } = useAgents();

  const { messages, isStreaming, error, send } = useChat(activeId);
  const { lastSummary } = useContextUsage(activeId, '');

  const handleSend = useCallback(
    (content: string) => {
      send(content, selectedProvider ?? undefined);
    },
    [send, selectedProvider],
  );

  const handleCreateSession = useCallback(() => {
    createNewSession();
  }, [createNewSession]);

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-secondary rounded-lg border border-border-subtle">
        <span className="text-text-muted text-sm">Initializing...</span>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Chat" className="flex h-full bg-bg-secondary rounded-lg border border-border-subtle overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-52 flex-shrink-0 border-r border-border-subtle bg-bg-primary">
          <SessionSidebar
            sessions={sessions}
            activeId={activeId}
            onSelect={(id) => setActiveId(id)}
            onCreate={handleCreateSession}
            onDelete={removeSession}
            loading={sessionsLoading}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-text-muted hover:text-text-primary text-sm transition-colors px-1"
            aria-label={sidebarOpen ? 'Hide sessions sidebar' : 'Show sessions sidebar'}
            aria-expanded={sidebarOpen}
            title={sidebarOpen ? 'Hide sessions' : 'Show sessions'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>

          <div className="flex-1" />

          <PersonaSelector
            agents={agents}
            selectedSlug={selectedPersona}
            onSelect={setSelectedPersona}
            loading={agentsLoading}
          />

          <ProviderSelector
            providers={providers}
            selectedId={selectedProvider}
            onSelect={switchProvider}
            loading={providersLoading}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex-shrink-0 px-4 py-2 bg-danger/10 border-b border-danger/20 text-danger text-xs">
            {error}
          </div>
        )}

        {/* Session continuity indicator (restored from compaction) */}
        <SessionContinuity
          lastSummary={lastSummary}
          isRestored={lastSummary != null}
        />

        {/* Messages — empty state for new sessions (MARA-HIGH-6) */}
        {messages.length === 0 && !isStreaming ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6">
            <span className="text-text-muted text-sm">No messages yet</span>
            <span className="text-text-muted text-xs">Start a conversation or select a persona above.</span>
          </div>
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}

        {/* Input */}
        <MessageInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
