import { useAgentDispatch } from '../../hooks/useAgentDispatch';
import { cancelAgent } from '../../lib/tauri';
import AgentCard from './AgentCard';
import DispatchLog from './DispatchLog';

export default function AgentStatusPanel() {
  const { activeAgents, results, loading, error, clearResults } = useAgentDispatch();

  const handleCancel = async (dispatchId: string) => {
    try {
      await cancelAgent(dispatchId);
    } catch (e) {
      console.error('Failed to cancel agent:', e);
    }
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-text-primary text-sm font-semibold tracking-wide uppercase">
          Agent Dispatch
        </h2>
        {activeAgents.length > 0 && (
          <span className="text-accent text-xs font-medium">
            {activeAgents.length} active
          </span>
        )}
      </div>

      {/* Error banner — show graceful message in browser-only mode */}
      {error && (
        <div className="px-3 py-2 bg-danger/10 border border-danger/30 rounded-lg text-danger text-xs flex-shrink-0">
          {error.includes('invoke') ? 'Agent dispatch requires the Forge desktop app' : error}
        </div>
      )}

      {/* Active agents section */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        {loading && activeAgents.length === 0 ? (
          <div className="flex items-center justify-center py-4 text-text-muted text-xs">
            Loading...
          </div>
        ) : activeAgents.length === 0 ? (
          <div className="flex items-center justify-center py-4 text-text-muted text-xs">
            No active agents
          </div>
        ) : (
          activeAgents.map((agent) => (
            <AgentCard
              key={agent.dispatch_id}
              agent={agent}
              onCancel={handleCancel}
            />
          ))
        )}
      </div>

      {/* Divider */}
      {results.length > 0 && (
        <div className="border-t border-border-subtle flex-shrink-0" />
      )}

      {/* Completed results section */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <DispatchLog results={results} onClear={clearResults} />
      </div>
    </div>
  );
}
