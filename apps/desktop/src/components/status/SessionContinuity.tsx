import type { CompactionSummary } from '../../lib/tauri';

interface SessionContinuityProps {
  /** Last compaction summary (null = fresh session, no prior compaction). */
  lastSummary: CompactionSummary | null;
  /** Whether this session was restored from a compacted summary. */
  isRestored: boolean;
}

/**
 * Indicator shown at the top of a session when context was restored
 * from a prior compaction. Lets the operator know the conversation
 * was compressed and what variant was used.
 */
export default function SessionContinuity({
  lastSummary,
  isRestored,
}: SessionContinuityProps) {
  if (!isRestored || !lastSummary) return null;

  const variantLabel: Record<string, string> = {
    base: 'Full compaction',
    partial: 'Partial compaction',
    partial_up_to: 'Prefix compaction',
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 mx-2 mt-2 rounded-md bg-accent/5 border border-accent/10"
      role="status"
    >
      {/* Chain icon */}
      <svg
        className="w-3.5 h-3.5 text-accent shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>

      <span className="text-xs text-text-secondary">
        Continued from prior context.{' '}
        <span className="text-text-muted">
          {variantLabel[lastSummary.variant] || lastSummary.variant}
          {lastSummary.token_count
            ? ` (${Math.round(lastSummary.token_count / 1000)}K tokens restored)`
            : ''}
        </span>
      </span>
    </div>
  );
}
