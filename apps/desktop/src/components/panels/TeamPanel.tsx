import { useState } from 'react';
import AgentStatusPanel from '../team/AgentStatusPanel';
import AgentPresence from '../team/AgentPresence';
import MessageFeed from '../team/MessageFeed';
import MailboxBadge from '../team/MailboxBadge';
import PermissionModal from '../team/PermissionModal';
import { useSwarmMessages } from '../../hooks/useSwarmMessages';
import { usePermissions } from '../../hooks/usePermissions';

type Tab = 'dispatch' | 'messages';

export default function TeamPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('dispatch');
  const { messages, unreadCount, markRead, loading, error } = useSwarmMessages('nyx');
  const { pending, approve, deny } = usePermissions('nyx');

  // Loading state (MARA-HIGH-3)
  if (loading) {
    return (
      <div role="region" aria-label="Team" className="h-full bg-bg-secondary rounded-lg border border-border-subtle flex items-center justify-center">
        <span className="text-text-muted text-sm">Loading team...</span>
      </div>
    );
  }

  // Error state (MARA-HIGH-4)
  if (error) {
    return (
      <div role="region" aria-label="Team" className="h-full bg-bg-secondary rounded-lg border border-border-subtle flex flex-col items-center justify-center gap-2 p-4">
        <span className="text-danger text-sm">{error}</span>
        <span className="text-text-muted text-xs">Check your connection and try again.</span>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Team" className="h-full bg-bg-secondary rounded-lg border border-border-subtle overflow-hidden flex flex-col">
      {/* Presence bar */}
      <div className="px-3 pt-2 pb-1 flex-shrink-0">
        <AgentPresence />
      </div>

      {/* Permission requests (always visible when pending) */}
      {pending.length > 0 && (
        <div className="px-3 py-1 flex-shrink-0 space-y-1.5">
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
      <div role="tablist" aria-label="Team panel tabs" className="flex border-b border-border-subtle flex-shrink-0">
        <button
          role="tab"
          aria-selected={activeTab === 'dispatch'}
          aria-controls="panel-dispatch"
          id="tab-dispatch"
          onClick={() => setActiveTab('dispatch')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'dispatch'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Dispatch
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'messages'}
          aria-controls="panel-messages"
          id="tab-messages"
          onClick={() => setActiveTab('messages')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'messages'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Messages
          <MailboxBadge count={unreadCount} />
        </button>
      </div>

      {/* Tab content */}
      <div
        role="tabpanel"
        id={activeTab === 'dispatch' ? 'panel-dispatch' : 'panel-messages'}
        aria-labelledby={activeTab === 'dispatch' ? 'tab-dispatch' : 'tab-messages'}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {activeTab === 'dispatch' ? (
          <AgentStatusPanel />
        ) : (
          <div className="p-2">
            <MessageFeed messages={messages} onMarkRead={markRead} />
          </div>
        )}
      </div>
    </div>
  );
}
