import { useState } from 'react';
import AgentStatusPanel from '../team/AgentStatusPanel';
import AgentPresence from '../team/AgentPresence';
import MessageFeed from '../team/MessageFeed';
import MailboxBadge from '../team/MailboxBadge';
import PermissionModal from '../team/PermissionModal';
import { useSwarmMessages } from '../../hooks/useSwarmMessages';
import { usePermissions } from '../../hooks/usePermissions';
import { CANVAS, STATUS, RADIUS, TIMING } from '@forge-os/canvas-components';

type Tab = 'dispatch' | 'messages';

// ─── Static styles (RIVEN-HIGH-3: canvas-tokens, no Tailwind) ──────────────

const PANEL_SHELL: React.CSSProperties = {
  height: '100%',
  background: CANVAS.bg,
  borderRadius: RADIUS.card,
  border: `1px solid ${CANVAS.border}`,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const CENTER_STATE: React.CSSProperties = {
  height: '100%',
  background: CANVAS.bg,
  borderRadius: RADIUS.card,
  border: `1px solid ${CANVAS.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

function TabButton({ active, onClick, children, id, controls }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  id?: string;
  controls?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      id={id}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        padding: '6px 12px',
        minHeight: 32,
        fontSize: 11,
        fontWeight: 500,
        background: 'transparent',
        border: 'none',
        borderBottom: active ? `2px solid ${STATUS.accent}` : '2px solid transparent',
        color: active ? STATUS.accent : hovered ? CANVAS.label : CANVAS.muted,
        cursor: 'pointer',
        transition: `color ${TIMING.fast}, border-color ${TIMING.fast}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

export default function TeamPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('dispatch');
  const { messages, unreadCount, markRead, loading, error } = useSwarmMessages('nyx');
  const { pending, approve, deny } = usePermissions('nyx');

  // Loading state (MARA-HIGH-3)
  if (loading) {
    return (
      <div role="region" aria-label="Team" style={CENTER_STATE}>
        <span style={{ color: CANVAS.muted, fontSize: 13 }}>Loading team...</span>
      </div>
    );
  }

  // Error state (MARA-HIGH-4)
  if (error) {
    return (
      <div role="region" aria-label="Team" style={{ ...CENTER_STATE, flexDirection: 'column', gap: 8, padding: 16 }}>
        <span style={{ color: STATUS.danger, fontSize: 13 }}>{error}</span>
        <span style={{ color: CANVAS.muted, fontSize: 11 }}>Check your connection and try again.</span>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Team" style={PANEL_SHELL}>
      {/* Presence bar */}
      <div style={{ padding: '8px 12px 4px', flexShrink: 0 }}>
        <AgentPresence />
      </div>

      {/* Permission requests (always visible when pending) */}
      {pending.length > 0 && (
        <div style={{ padding: '4px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pending.map((p) => (
            <PermissionModal
              key={p.message.id}
              permission={p}
              onApprove={approve}
              onDeny={deny}
            />
          ))}
        </div>
      )}

      {/* Tab bar — ARIA tab pattern (MARA-CRIT-4) */}
      <div role="tablist" aria-label="Team panel tabs" style={{ display: 'flex', borderBottom: `1px solid ${CANVAS.border}`, flexShrink: 0 }}>
        <TabButton
          active={activeTab === 'dispatch'}
          onClick={() => setActiveTab('dispatch')}
          id="tab-dispatch"
          controls="panel-dispatch"
        >
          Dispatch
        </TabButton>
        <TabButton
          active={activeTab === 'messages'}
          onClick={() => setActiveTab('messages')}
          id="tab-messages"
          controls="panel-messages"
        >
          Messages
          <MailboxBadge count={unreadCount} />
        </TabButton>
      </div>

      {/* Tab content */}
      <div
        role="tabpanel"
        id={activeTab === 'dispatch' ? 'panel-dispatch' : 'panel-messages'}
        aria-labelledby={activeTab === 'dispatch' ? 'tab-dispatch' : 'tab-messages'}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
      >
        {activeTab === 'dispatch' ? (
          <AgentStatusPanel />
        ) : (
          <div style={{ padding: 8 }}>
            <MessageFeed messages={messages} onMarkRead={markRead} />
          </div>
        )}
      </div>
    </div>
  );
}
