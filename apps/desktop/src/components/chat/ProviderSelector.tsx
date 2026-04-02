import type { ProviderInfo } from '../../lib/tauri';

interface ProviderSelectorProps {
  providers: ProviderInfo[];
  selectedId: string | null;
  onSelect: (providerId: string) => void;
  loading?: boolean;
}

export default function ProviderSelector({
  providers,
  selectedId,
  onSelect,
  loading = false,
}: ProviderSelectorProps) {
  if (loading) {
    return (
      <div className="text-text-muted text-xs px-2 py-1">Loading providers...</div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="text-warning text-xs px-2 py-1" title="Configure an API key in settings">
        No providers
      </div>
    );
  }

  return (
    <select
      value={selectedId ?? ''}
      onChange={(e) => onSelect(e.target.value)}
      className="bg-bg-elevated border border-border rounded px-2 py-1 text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent min-w-[100px]"
      title="Select AI provider"
    >
      {providers.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
