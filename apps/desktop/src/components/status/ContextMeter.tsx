import type { ThresholdStatus, UsageZone } from '../../lib/tauri';

interface ContextMeterProps {
  status: ThresholdStatus | null;
  isCompacting: boolean;
}

const ZONE_COLORS: Record<UsageZone, string> = {
  comfortable: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-warning',
  compacting: 'bg-danger',
};

const ZONE_BG: Record<UsageZone, string> = {
  comfortable: 'bg-success/20',
  warning: 'bg-warning/20',
  critical: 'bg-warning/30',
  compacting: 'bg-danger/30',
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

/**
 * Visual context window usage meter.
 * Shows a horizontal bar that fills and changes color as usage increases.
 * Green → Yellow → Red mapping follows the 4-zone system.
 */
export default function ContextMeter({ status, isCompacting }: ContextMeterProps) {
  if (!status) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1">
        <div className="w-16 h-1.5 rounded-full bg-bg-elevated" />
        <span className="text-text-muted text-[10px]">--</span>
      </div>
    );
  }

  const zone = status.zone;
  const percent = Math.min(status.usage_fraction * 100, 100);
  const fillColor = ZONE_COLORS[zone];
  const trackColor = ZONE_BG[zone];

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 group"
      role="meter"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Context usage: ${Math.round(percent)}%`}
      title={`${formatTokens(status.current_tokens)} / ${formatTokens(status.context_window_size)} tokens (${Math.round(percent)}%)`}
    >
      {/* Bar */}
      <div className={`w-16 h-1.5 rounded-full ${trackColor} overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${fillColor} ${
            isCompacting ? 'animate-pulse' : ''
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Label */}
      <span
        className={`text-[10px] font-mono tabular-nums ${
          zone === 'compacting'
            ? 'text-danger'
            : zone === 'critical' || zone === 'warning'
              ? 'text-warning'
              : 'text-text-muted'
        }`}
      >
        {isCompacting ? 'Compacting...' : `${Math.round(percent)}%`}
      </span>
    </div>
  );
}
