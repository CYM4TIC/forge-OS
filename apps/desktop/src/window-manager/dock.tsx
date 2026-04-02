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
import { STATUS, CANVAS, GLOW, TINT, TIMING } from '@forge-os/canvas-components';

interface DockBarProps {
  panels: PanelInstance[];
  onRestore: (panelId: string) => void;
  onOpen: (type: PanelType) => void;
  onFocus: (panelId: string) => void;
}

type DockPillState = 'active' | 'minimized' | 'closed';

// Badge sizing constants — intentionally minimal for dock pill overlay.
// h=14px matches the pill's py-1 (4px) vertical rhythm. 9px is the smallest
// legible size for 1-2 digit counts at this element scale.
const BADGE = { height: 14, minWidth: 14, paddingX: 2, fontSize: 9 } as const;

interface BadgeStyle {
  bg: string;
  text: string;
}

interface DockPillData {
  type: PanelType;
  label: string;
  icon: string;
  state: DockPillState;
  panelId: string | null;
  badgeCount: number;
  badgeStyle: BadgeStyle | null;
  isActive: boolean;
}

/** Determine badge colors from severity counts. Returns bg + text for WCAG contrast. */
function findingsBadgeColors(counts: HudSeverityCounts | null): { bg: string; text: string } | null {
  if (!counts || counts.total === 0) return null;
  if (counts.critical > 0) return { bg: STATUS.danger, text: '#fff' };
  if (counts.high > 0) return { bg: STATUS.critical, text: '#fff' };
  // Warning (amber) needs dark text — white on #f59e0b is only 2.1:1 contrast
  return { bg: STATUS.warning, text: CANVAS.bg };
}

function buildDockPills(panels: PanelInstance[], findingsCounts: HudSeverityCounts | null, findingsLoading: boolean): DockPillData[] {
  const allTypes = ForgeWindowManager.getAllPanelTypes();
  const pills: DockPillData[] = [];

  for (const typeInfo of allTypes) {
    const instances = panels.filter((p) => p.type === typeInfo.type);

    // For findings pills: override badge with severity counts
    const isFindings = typeInfo.type === 'findings';
    const fBadgeCount = isFindings && findingsCounts ? findingsCounts.total : 0;
    const fBadgeStyle = isFindings ? findingsBadgeColors(findingsCounts) : null;

    if (instances.length === 0) {
      pills.push({
        type: typeInfo.type,
        label: typeInfo.label,
        icon: typeInfo.icon,
        state: 'closed',
        panelId: null,
        badgeCount: isFindings ? fBadgeCount : 0,
        badgeStyle: fBadgeStyle,
        isActive: isFindings && findingsLoading ? true : false,
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
          badgeStyle: isFindings ? fBadgeStyle : null,
          isActive: inst.isActive,
        });
      }
    }
  }

  return pills;
}

const PILL_BASE: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  paddingLeft: 10,
  paddingRight: 10,
  paddingTop: 4,
  paddingBottom: 4,
  borderRadius: 9999,
  border: '1px solid',
  fontSize: 12,
  fontWeight: 500,
  transition: `all ${TIMING.fast}`,
  cursor: 'pointer',
  outline: 'none',
};

const PILL_STATES: Record<DockPillState, React.CSSProperties> = {
  active: {
    background: TINT.accent,
    borderColor: GLOW.accentSubtle,
    color: STATUS.accent,
    boxShadow: `0 0 8px ${GLOW.accent}`,
  },
  minimized: {
    background: `${CANVAS.bgElevated}99`,
    borderColor: CANVAS.border,
    color: CANVAS.muted,
  },
  closed: {
    background: `${CANVAS.bg}66`,
    borderColor: `${CANVAS.border}80`,
    color: `${CANVAS.muted}80`,
  },
};

function DockPill({
  pill,
  onClick,
}: {
  pill: DockPillData;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...PILL_BASE,
        ...PILL_STATES[pill.state],
        ...(pill.isActive ? { animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : {}),
      }}
      title={`${pill.label} (${pill.state})`}
    >
      <span style={{ fontSize: 14 }}>{pill.icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 60 }}>{pill.label}</span>
      {pill.badgeCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 9999,
            fontWeight: 700,
            height: BADGE.height,
            minWidth: BADGE.minWidth,
            paddingLeft: BADGE.paddingX,
            paddingRight: BADGE.paddingX,
            fontSize: BADGE.fontSize,
            backgroundColor: pill.badgeStyle?.bg ?? STATUS.danger,
            color: pill.badgeStyle?.text ?? '#fff',
          }}
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
  const [findingsLoading, setFindingsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      getFindingCounts().then((counts) => {
        if (!cancelled) {
          setFindingsCounts(counts);
          setFindingsLoading(false);
        }
      }).catch(() => {
        if (!cancelled) setFindingsLoading(false);
      });
    };
    poll();
    const interval = setInterval(poll, 5000); // refresh every 5s
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const pills = buildDockPills(panels, findingsCounts, findingsLoading);

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
      style={{
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 12,
        borderTop: `1px solid ${CANVAS.border}`,
        background: `${CANVAS.bg}cc`,
        backdropFilter: 'blur(8px)',
        height: DOCK_BAR_HEIGHT,
      }}
    >
      {/* Panel pills — horizontal scroll for overflow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', maxHeight: DOCK_BAR_HEIGHT - 8 }}>
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
