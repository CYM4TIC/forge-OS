import type { AgentSummary, AgentStatus } from '../../lib/tauri';

const STATUS_CONFIG: Record<AgentStatus, { color: string; label: string; pulse: boolean }> = {
  queued: { color: 'bg-warning', label: 'Queued', pulse: false },
  running: { color: 'bg-accent', label: 'Running', pulse: true },
  complete: { color: 'bg-success', label: 'Complete', pulse: false },
  error: { color: 'bg-danger', label: 'Error', pulse: false },
  timeout: { color: 'bg-warning', label: 'Timeout', pulse: false },
  cancelled: { color: 'bg-text-muted', label: 'Cancelled', pulse: false },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

interface AgentCardProps {
  agent: AgentSummary;
  onCancel?: (dispatchId: string) => void;
}

export default function AgentCard({ agent, onCancel }: AgentCardProps) {
  const config = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.queued;
  const isActive = agent.status === 'queued' || agent.status === 'running';

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-bg-elevated rounded-lg border border-border-subtle">
      {/* Status indicator */}
      <div className="relative flex-shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
        {config.pulse && (
          <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${config.color} animate-ping opacity-75`} />
        )}
      </div>

      {/* Agent info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-text-primary text-sm font-medium truncate">
            {agent.agent_slug}
          </span>
          <span className="text-text-muted text-xs">
            {config.label}
          </span>
        </div>
        <div className="text-text-muted text-xs mt-0.5">
          {formatDuration(agent.elapsed_ms)}
        </div>
      </div>

      {/* Cancel button for active agents */}
      {isActive && onCancel && (
        <button
          onClick={() => onCancel(agent.dispatch_id)}
          className="flex-shrink-0 text-text-muted hover:text-danger text-xs px-2 py-1 rounded hover:bg-bg-secondary transition-colors"
          aria-label={`Cancel ${agent.agent_slug}`}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
