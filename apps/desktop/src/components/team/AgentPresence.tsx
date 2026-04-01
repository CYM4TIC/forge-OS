import { useAgentDispatch } from '../../hooks/useAgentDispatch';

type PresenceStatus = 'active' | 'idle' | 'offline';

interface AgentPresenceItem {
  slug: string;
  status: PresenceStatus;
}

const STATUS_DOT: Record<PresenceStatus, string> = {
  active: 'bg-success',
  idle: 'bg-warning',
  offline: 'bg-text-muted',
};

const STATUS_LABEL: Record<PresenceStatus, string> = {
  active: 'Active',
  idle: 'Idle',
  offline: 'Offline',
};

export default function AgentPresence() {
  const { activeAgents } = useAgentDispatch();

  // Derive presence from dispatch state
  const activeSet = new Set(activeAgents.map((a) => a.agent_slug));

  // Core personas — always shown
  const coreAgents = [
    'nyx', 'pierce', 'mara', 'riven', 'kehinde',
    'tanaka', 'vane', 'voss', 'calloway', 'sable',
  ];

  const presence: AgentPresenceItem[] = coreAgents.map((slug) => ({
    slug,
    status: activeSet.has(slug) ? 'active' : 'idle',
  }));

  return (
    <div className="flex flex-wrap gap-1.5">
      {presence.map((agent) => (
        <div
          key={agent.slug}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-tertiary/50"
          title={`${agent.slug}: ${STATUS_LABEL[agent.status]}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[agent.status]} ${
            agent.status === 'active' ? 'animate-pulse' : ''
          }`} />
          <span className="text-text-secondary text-[10px] capitalize">
            {agent.slug}
          </span>
        </div>
      ))}
    </div>
  );
}
