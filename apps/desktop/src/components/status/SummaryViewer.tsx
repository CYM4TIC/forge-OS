import { useState } from 'react';
import type { CompactionSummary } from '../../lib/tauri';

interface SummaryViewerProps {
  summary: CompactionSummary | null;
}

/**
 * Expandable viewer for compaction summaries.
 * Shows a collapsed pill when a summary exists, expands to show full content.
 */
export default function SummaryViewer({ summary }: SummaryViewerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!summary || !summary.content) return null;

  const tokenLabel = summary.token_count
    ? `${Math.round(summary.token_count / 1000)}K tokens`
    : 'unknown size';

  return (
    <div className="border border-border-subtle rounded-md overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-bg-elevated transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3 h-3 text-text-muted transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs text-text-secondary">
            Compaction Summary
          </span>
          <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-bg-elevated">
            {summary.variant}
          </span>
        </div>
        <span className="text-[10px] text-text-muted">{tokenLabel}</span>
      </button>

      {/* Content — expandable */}
      {expanded && (
        <div className="px-3 py-2 border-t border-border-subtle bg-bg-secondary max-h-64 overflow-y-auto">
          <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
            {summary.content}
          </pre>
        </div>
      )}
    </div>
  );
}
