interface CompactionIndicatorProps {
  isCompacting: boolean;
  conversationTokens?: number;
}

/**
 * Overlay indicator shown during active compaction.
 * Displays a pulsing animation and status text.
 * Only renders when isCompacting is true.
 */
export default function CompactionIndicator({
  isCompacting,
  conversationTokens,
}: CompactionIndicatorProps) {
  if (!isCompacting) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent/10 border border-accent/20"
      role="status"
      aria-live="polite"
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>

      {/* Status text */}
      <span className="text-xs text-accent">
        Compacting context
        {conversationTokens
          ? ` (${Math.round(conversationTokens / 1000)}K tokens)`
          : ''}
        ...
      </span>
    </div>
  );
}
