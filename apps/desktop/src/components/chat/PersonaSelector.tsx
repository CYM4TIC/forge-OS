import type { AgentInfo } from '../../lib/tauri';

interface PersonaSelectorProps {
  agents: AgentInfo[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  loading?: boolean;
}

export default function PersonaSelector({
  agents,
  selectedSlug,
  onSelect,
  loading = false,
}: PersonaSelectorProps) {
  if (loading) {
    return (
      <div className="text-text-muted text-xs px-2 py-1">Loading personas...</div>
    );
  }

  return (
    <select
      value={selectedSlug ?? ''}
      onChange={(e) => onSelect(e.target.value || null)}
      className="bg-bg-elevated border border-border rounded px-2 py-1 text-text-primary text-xs focus:outline-none focus:border-accent min-w-[120px]"
      title="Select persona"
    >
      <option value="">No persona</option>
      {agents.map((agent) => (
        <option key={agent.slug} value={agent.slug}>
          {agent.name}
        </option>
      ))}
    </select>
  );
}
