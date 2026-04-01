/**
 * TokenGaugeDisplay — Wraps ProgressArc + TokenGauge for context window usage.
 * Shows current context window fill as a circular arc with zone coloring
 * (green < 60%, yellow 60-85%, red 85%+). Percentage text centered.
 * Connects to useContextUsage hook for real-time data.
 */

import { ProgressArc } from '@forge-os/canvas-components';
import type { ThresholdStatus } from '../../../lib/tauri';

interface TokenGaugeDisplayProps {
  status: ThresholdStatus | null;
  isCompacting: boolean;
  width: number;
  height: number;
}

export function TokenGaugeDisplay({ status, isCompacting, width, height }: TokenGaugeDisplayProps) {
  const fraction = status?.usage_percent != null
    ? status.usage_percent / 100
    : 0;

  const pct = status?.usage_percent != null
    ? `${Math.round(status.usage_percent)}%`
    : '--';

  const subLabel = isCompacting
    ? 'Compacting'
    : status?.tokens_remaining != null
      ? `${formatTokens(status.tokens_remaining)} left`
      : 'Context';

  return (
    <ProgressArc
      width={width}
      height={height}
      value={fraction}
      centerText={pct}
      subLabel={subLabel}
      colorMode="zone"
      animated
      aria-label={`Context window: ${pct} used${isCompacting ? ' (compacting)' : ''}`}
    />
  );
}

/** Format token count for compact display (e.g., 150000 → "150K") */
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 10_000) return `${Math.round(tokens / 1_000)}K`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return `${tokens}`;
}
