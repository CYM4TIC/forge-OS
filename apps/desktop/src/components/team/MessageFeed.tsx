import type { SwarmMessage } from '../../lib/tauri';

interface MessageFeedProps {
  messages: SwarmMessage[];
  onMarkRead: (messageId: string) => Promise<void>;
}

const MSG_TYPE_LABELS: Record<string, string> = {
  permission_request: 'Permission',
  permission_response: 'Response',
  idle_notification: 'Idle',
  shutdown_signal: 'Shutdown',
  direct_message: 'Message',
};

const MSG_TYPE_COLORS: Record<string, string> = {
  permission_request: 'text-warning',
  permission_response: 'text-accent',
  idle_notification: 'text-text-muted',
  shutdown_signal: 'text-danger',
  direct_message: 'text-text-secondary',
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function truncatePayload(payload: string, maxLen = 80): string {
  if (payload === '{}') return '';
  try {
    const obj = JSON.parse(payload);
    // Show the most useful field
    if (obj.action) return obj.action;
    if (obj.approved !== undefined) return obj.approved ? 'Approved' : 'Denied';
    if (obj.reason) return obj.reason;
    const str = JSON.stringify(obj);
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
  } catch {
    return payload.length > maxLen ? payload.slice(0, maxLen) + '...' : payload;
  }
}

export default function MessageFeed({ messages, onMarkRead }: MessageFeedProps) {
  if (messages.length === 0) {
    return (
      <div role="status" className="flex items-center justify-center py-6 text-text-muted text-xs">
        No messages
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {messages.map((msg) => (
        <button
          key={msg.id}
          onClick={() => !msg.is_read && onMarkRead(msg.id)}
          className={`text-left w-full px-2 py-1.5 rounded transition-colors ${
            msg.is_read
              ? 'bg-transparent hover:bg-bg-tertiary/50'
              : 'bg-bg-tertiary/40 hover:bg-bg-tertiary/60'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {!msg.is_read && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
            )}
            <span className={`text-[10px] font-medium ${MSG_TYPE_COLORS[msg.msg_type] || 'text-text-muted'}`}>
              {MSG_TYPE_LABELS[msg.msg_type] || msg.msg_type}
            </span>
            <span className="text-text-muted text-[10px]">
              {msg.from_agent} → {msg.to_agent}
            </span>
            <span className="text-text-muted text-[10px] ml-auto flex-shrink-0">
              {formatTime(msg.created_at)}
            </span>
          </div>
          {truncatePayload(msg.payload) && (
            <div className="text-text-secondary text-[10px] mt-0.5 pl-3 truncate">
              {truncatePayload(msg.payload)}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
