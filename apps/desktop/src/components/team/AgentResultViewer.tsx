import type { AgentResult } from '../../lib/tauri';

interface AgentResultViewerProps {
  result: AgentResult;
}

export default function AgentResultViewer({ result }: AgentResultViewerProps) {
  const isError = result.status === 'error' || result.status === 'timeout' || result.status === 'cancelled';
  const durationSec = (result.duration_ms / 1000).toFixed(1);

  return (
    <div className={`px-3 py-2 rounded-lg border ${
      isError ? 'border-danger/30 bg-danger/5' : 'border-border-subtle bg-bg-elevated'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-text-primary text-sm font-medium">
            {result.agent_slug}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            isError ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'
          }`}>
            {result.status}
          </span>
        </div>
        <span className="text-text-muted text-xs">
          {durationSec}s
          {result.model && ` · ${result.model}`}
        </span>
      </div>

      {/* Content or error */}
      {result.error ? (
        <p className="text-danger text-xs">{result.error}</p>
      ) : result.content ? (
        <div className="text-text-secondary text-xs leading-relaxed max-h-32 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans">{result.content.slice(0, 500)}{result.content.length > 500 ? '...' : ''}</pre>
        </div>
      ) : null}

      {/* Token usage */}
      {(result.tokens_in || result.tokens_out) && (
        <div className="flex gap-3 mt-1.5 text-text-muted text-xs">
          {result.tokens_in && <span>In: {result.tokens_in.toLocaleString()}</span>}
          {result.tokens_out && <span>Out: {result.tokens_out.toLocaleString()}</span>}
        </div>
      )}
    </div>
  );
}
