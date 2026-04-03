import { useState, useCallback, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { useSessions } from '../../hooks/useSessions';
import { useProviders } from '../../hooks/useProviders';
import { useAgents } from '../../hooks/useAgents';
import { useContextUsage } from '../../hooks/useContextUsage';
import { CANVAS, STATUS, RADIUS, TIMING, TINT } from '@forge-os/canvas-components';
import MessageList from '../chat/MessageList';
import MessageInput from '../chat/MessageInput';
import PersonaSelector from '../chat/PersonaSelector';
import ProviderSelector from '../chat/ProviderSelector';
import SessionSidebar from '../chat/SessionSidebar';
import SessionContinuity from '../status/SessionContinuity';

// ─── Static styles (RIVEN-HIGH-2: canvas-tokens, no Tailwind) ──────────────

const PANEL_SHELL: React.CSSProperties = {
  display: 'flex',
  height: '100%',
  background: CANVAS.bg,
  borderRadius: RADIUS.card,
  border: `1px solid ${CANVAS.border}`,
  overflow: 'hidden',
};

const CENTER_STATE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  background: CANVAS.bg,
  borderRadius: RADIUS.card,
  border: `1px solid ${CANVAS.border}`,
};

const TOOLBAR: React.CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  borderBottom: `1px solid ${CANVAS.border}`,
};

export default function ChatPanel() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [toggleHovered, setToggleHovered] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

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

  // MARA-MED-3: Move focus to sidebar on open
  const handleToggleSidebar = useCallback(() => {
    const opening = !sidebarOpen;
    setSidebarOpen(opening);
    if (opening) {
      requestAnimationFrame(() => {
        const first = sidebarRef.current?.querySelector<HTMLElement>('button, [tabindex="0"], a');
        first?.focus();
      });
    }
  }, [sidebarOpen]);

  if (sessionsLoading) {
    return (
      <div style={CENTER_STATE}>
        <span style={{ color: CANVAS.muted, fontSize: 13 }}>Initializing...</span>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Chat" style={PANEL_SHELL}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div
          ref={sidebarRef}
          style={{
            width: 208,
            flexShrink: 0,
            borderRight: `1px solid ${CANVAS.border}`,
            background: CANVAS.bg,
          }}
        >
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Toolbar */}
        <div style={TOOLBAR}>
          <button
            onClick={handleToggleSidebar}
            onMouseEnter={() => setToggleHovered(true)}
            onMouseLeave={() => setToggleHovered(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: toggleHovered ? CANVAS.text : CANVAS.muted,
              fontSize: 13,
              cursor: 'pointer',
              padding: '0 4px',
              transition: `color ${TIMING.fast}`,
              minHeight: 32,
              minWidth: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={sidebarOpen ? 'Hide sessions sidebar' : 'Show sessions sidebar'}
            aria-expanded={sidebarOpen}
            title={sidebarOpen ? 'Hide sessions' : 'Show sessions'}
          >
            {sidebarOpen ? '\u25C0' : '\u25B6'}
          </button>

          <div style={{ flex: 1 }} />

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
          <div style={{
            flexShrink: 0,
            padding: '8px 16px',
            background: TINT.danger,
            borderBottom: `1px solid ${STATUS.danger}33`,
            color: STATUS.danger,
            fontSize: 11,
          }}>
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
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            textAlign: 'center',
            padding: 24,
          }}>
            <span style={{ color: CANVAS.muted, fontSize: 13 }}>No messages yet</span>
            <span style={{ color: CANVAS.muted, fontSize: 11 }}>Start a conversation or select a persona above.</span>
          </div>
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} selectedPersona={selectedPersona} />
        )}

        {/* Input */}
        <MessageInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
