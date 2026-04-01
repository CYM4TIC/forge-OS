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
  const { messages, unreadCount, markRead } = useSwarmMessages('nyx');
  const { pending, approve, deny } = usePermissions('nyx');

  return (
    <div className="h-full bg-bg-secondary rounded-lg border border-border-subtle overflow-hidden flex flex-col">
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

      {/* Tab bar */}
      <div className="flex border-b border-border-subtle flex-shrink-0">
        <button
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
      <div className="flex-1 min-h-0 overflow-y-auto">
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
