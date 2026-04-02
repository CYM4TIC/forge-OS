// ── DockBar ──
// Horizontal bar at bottom of app frame. One pill per registered panel type.
// Active = lit with neon glow, minimized = dim with restore click, closed = dim.
// Scales to 20+ panel types. Rave aesthetic: pulsing jewels, not corporate tabs.

import { useCallback, useEffect, useState } from 'react';
import type { PanelInstance, PanelType } from './types';
import { ForgeWindowManager } from './manager';
import { DOCK_BAR_HEIGHT } from './snapping';
import { getFindingCounts } from '../lib/tauri';
import type { HudSeverityCounts } from '../lib/tauri';
import { STATUS } from '@forge-os/canvas-components';

interface DockBarProps {
  panels: PanelInstance[];
  onRestore: (panelId: string) => void;
  onOpen: (type: PanelType) => void;
  onFocus: (panelId: string) => void;
}

type DockPillState = 'active' | 'minimized' | 'closed';

interface DockPillData {
  type: PanelType;
  label: string;
  icon: string;
  state: DockPillState;
  panelId: string | null;
  badgeCount: number;
  badgeColor: string | null;
  isActive: boolean;
}

/** Determine badge color from severity counts. CRIT = danger, HIGH = critical, else warning. */
function findingsBadgeColor(counts: HudSeverityCounts | null): string | null {
  if (!counts || counts.total === 0) return null;
  if (counts.critical > 0) return STATUS.danger;
  if (counts.high > 0) return STATUS.critical;
  return STATUS.warning;
}

function buildDockPills(panels: PanelInstance[], findingsCounts: HudSeverityCounts | null): DockPillData[] {
  const allTypes = ForgeWindowManager.getAllPanelTypes();
  const pills: DockPillData[] = [];

  for (const typeInfo of allTypes) {
    const instances = panels.filter((p) => p.type === typeInfo.type);

    // For findings pills: override badge with severity counts
    const isFindings = typeInfo.type === 'findings';
    const fBadgeCount = isFindings && findingsCounts ? findingsCounts.total : 0;
    const fBadgeColor = isFindings ? findingsBadgeColor(findingsCounts) : null;

    if (instances.length === 0) {
      pills.push({
        type: typeInfo.type,
        label: typeInfo.label,
        icon: typeInfo.icon,
        state: 'closed',
        panelId: null,
        badgeCount: isFindings ? fBadgeCount : 0,
        badgeColor: fBadgeColor,
        isActive: false,
      });
    } else {
      for (const inst of instances) {
        pills.push({
          type: inst.type,
          label: inst.title,
          icon: typeInfo.icon,
          state: inst.state === 'minimized' ? 'minimized' : 'active',
          panelId: inst.id,
          badgeCount: isFindings ? fBadgeCount : inst.badgeCount,
          badgeColor: isFindings ? fBadgeColor : null,
          isActive: inst.isActive,
        });
      }
    }
  }

  return pills;
}

function DockPill({
  pill,
  onClick,
}: {
  pill: DockPillData;
  onClick: () => void;
}) {
  const stateClasses: Record<DockPillState, string> = {
    active: 'bg-accent/20 border-accent/40 text-accent shadow-[0_0_8px_rgba(99,102,241,0.3)]',
    minimized: 'bg-bg-elevated/60 border-border-subtle text-text-muted hover:bg-bg-elevated hover:border-accent/30 hover:text-text-secondary',
    closed: 'bg-bg-primary/40 border-border-subtle/50 text-text-muted/50 hover:bg-bg-elevated/40 hover:text-text-muted',
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-1.5 px-2.5 py-1 rounded-full border
        text-xs font-medium transition-all duration-200
        ${stateClasses[pill.state]}
        ${pill.isActive ? 'animate-pulse' : ''}
      `}
      title={`${pill.label} (${pill.state})`}
    >
      <span className="text-sm">{pill.icon}</span>
      <span className="truncate max-w-[60px]">{pill.label}</span>
      {pill.badgeCount > 0 && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center h-3.5 min-w-[14px] px-0.5 rounded-full text-[9px] text-white font-bold"
          style={{ backgroundColor: pill.badgeColor ?? STATUS.danger }}
        >
          {pill.badgeCount > 99 ? '99+' : pill.badgeCount}
        </span>
      )}
    </button>
  );
}

export function DockBar({
  panels,
  onRestore,
  onOpen,
  onFocus,
}: DockBarProps) {
  // Poll finding counts for severity-aware badge on Findings pill
  const [findingsCounts, setFindingsCounts] = useState<HudSeverityCounts | null>(null);
  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      getFindingCounts().then((counts) => {
        if (!cancelled) setFindingsCounts(counts);
      }).catch(() => { /* silent — non-Tauri or DB unavailable */ });
    };
    poll();
    const interval = setInterval(poll, 5000); // refresh every 5s
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const pills = buildDockPills(panels, findingsCounts);

  const handlePillClick = useCallback(
    (pill: DockPillData) => {
      if (pill.state === 'minimized' && pill.panelId) {
        onRestore(pill.panelId);
      } else if (pill.state === 'closed') {
        onOpen(pill.type);
      } else if (pill.panelId) {
        onFocus(pill.panelId);
      }
    },
    [onRestore, onOpen, onFocus],
  );

  return (
    <div
      className="flex items-center px-3 border-t border-border-subtle bg-bg-primary/80 backdrop-blur-sm"
      style={{ height: DOCK_BAR_HEIGHT }}
    >
      {/* Panel pills — horizontal scroll for overflow */}
      <div className="flex items-center gap-1.5 overflow-x-auto" style={{ maxHeight: DOCK_BAR_HEIGHT - 8 }}>
        {pills.map((pill, i) => (
          <DockPill
            key={pill.panelId ?? `${pill.type}-${i}`}
            pill={pill}
            onClick={() => handlePillClick(pill)}
          />
        ))}
      </div>
    </div>
  );
}

// DOCK_BAR_HEIGHT exported from snapping.ts via index barrel
