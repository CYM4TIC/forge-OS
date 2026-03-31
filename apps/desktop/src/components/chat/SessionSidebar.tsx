import type { SessionRow } from '../../lib/tauri';

interface SessionSidebarProps {
  sessions: SessionRow[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function SessionSidebar({
  sessions,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  loading = false,
}: SessionSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <span className="text-text-secondary text-xs font-medium uppercase tracking-wide">
          Sessions
        </span>
        <button
          onClick={onCreate}
          className="text-accent hover:text-accent-hover text-xs font-medium transition-colors"
          title="New session"
        >
          + New
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-text-muted text-xs px-3 py-4 text-center">
            Loading...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-text-muted text-xs px-3 py-4 text-center">
            No sessions
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`group flex items-center justify-between px-3 py-2 cursor-pointer border-b border-border-subtle/50 transition-colors ${
                session.id === activeId
                  ? 'bg-accent/10 border-l-2 border-l-accent'
                  : 'hover:bg-bg-elevated border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-xs truncate">
                  {session.title}
                </p>
                <p className="text-text-muted text-[10px] mt-0.5">
                  {formatDate(session.updated_at)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger text-xs ml-2 transition-opacity"
                title="Delete session"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
