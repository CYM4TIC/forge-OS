import type { AgentResult } from '../../lib/tauri';
import AgentResultViewer from './AgentResultViewer';

interface DispatchLogProps {
  results: AgentResult[];
  onClear?: () => void;
}

export default function DispatchLog({ results, onClear }: DispatchLogProps) {
  if (results.length === 0) {
    return (
      <div role="status" className="flex items-center justify-center py-6 text-text-muted text-xs">
        No completed dispatches yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-text-secondary text-xs font-medium">
          Completed ({results.length})
        </span>
        {onClear && (
          <button
            onClick={onClear}
            className="text-text-muted hover:text-text-secondary text-xs transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results list */}
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
        {results.map((result) => (
          <AgentResultViewer key={result.dispatch_id} result={result} />
        ))}
      </div>
    </div>
  );
}
