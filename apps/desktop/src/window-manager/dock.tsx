// ── DockBar ──
// Horizontal bar at bottom of app frame. One pill per registered panel type.
// Active = lit with neon glow, minimized = dim with restore click, closed = dim.
// Scales to 20+ panel types. Rave aesthetic: pulsing jewels, not corporate tabs.

import { useCallback, useEffect, useState } from 'react';
import type { PanelInstance, PanelType } from './types';
import { ForgeWindowManager } from './manager';
import { DOCK_BAR_HEIGHT } from './snapping';
import { getFindingCounts, getServiceStatus } from '../lib/tauri';
import type { HudSeverityCounts, ServiceHealth } from '../lib/tauri';
import { CANVAS, TIMING, DOCK as DOCK_TOKENS, BADGE_COLORS } from '@forge-os/canvas-components';

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

type BadgePosition = 'top-right' | 'top-left';

interface DockPillData {
  type: PanelType;
  label: string;
  icon: string;
  state: DockPillState;
  panelId: string | null;
  badgeCount: number;
  badgeStyle: BadgeStyle | null;
  badgePosition: BadgePosition;
  badgeGlyph: string;
  isActive: boolean;
  tooltip: string | null;
}

/** Determine badge colors from severity counts. Uses unified BADGE_COLORS (R-DS-05). */
function findingsBadgeColors(counts: HudSeverityCounts | null): { bg: string; text: string } | null {
  if (!counts || counts.total === 0) return null;
  if (counts.critical > 0) return BADGE_COLORS.danger;
  if (counts.high > 0) return BADGE_COLORS.critical;
  return BADGE_COLORS.warning;
}

/** Compute aggregate connectivity status for the dock pill badge.
 *  Two-tier color model: danger (unreachable) or warning (degraded).
 *  No STATUS.critical — that's reserved for findings severity. */
/** Shape glyphs for colorblind accessibility (R-DS-03: WCAG 1.4.1).
 * Color alone must not be the sole indicator of status. */
const STATUS_SHAPE = {
  unreachable: '\u2715',  // ✕ (X mark)
  degraded: '\u26A0',     // ⚠ (warning triangle)
  healthy: '\u2713',      // ✓ (checkmark)
} as const;

function connectivityBadge(services: ServiceHealth[]): { count: number; style: BadgeStyle | null; tooltip: string; glyph: string } {
  const configured = services.filter((s) => s.status !== 'unconfigured');
  if (configured.length === 0) return { count: 0, style: null, tooltip: 'No services configured', glyph: '' };
  const unreachable = configured.filter((s) => s.status === 'unreachable');
  const degraded = configured.filter((s) => s.status === 'degraded');
  const unhealthyCount = unreachable.length + degraded.length;
  if (unhealthyCount === 0) return { count: 0, style: null, tooltip: 'All systems operational', glyph: STATUS_SHAPE.healthy };
  // R-DS-05: unified badge colors for WCAG contrast compliance.
  const style: BadgeStyle = unreachable.length > 0
    ? BADGE_COLORS.danger
    : BADGE_COLORS.warning;
  // R-DS-03: shape glyph alongside color for colorblind users
  const glyph = unreachable.length > 0 ? STATUS_SHAPE.unreachable : STATUS_SHAPE.degraded;
  const noun = unhealthyCount === 1 ? 'service' : 'services';
  return {
    count: unhealthyCount,
    style,
    tooltip: `${unhealthyCount} ${noun} unhealthy`,
    glyph,
  };
}

function buildDockPills(panels: PanelInstance[], findingsCounts: HudSeverityCounts | null, findingsLoading: boolean, connectivityServices: ServiceHealth[]): DockPillData[] {
  const allTypes = ForgeWindowManager.getAllPanelTypes();
  const pills: DockPillData[] = [];

  for (const typeInfo of allTypes) {
    const instances = panels.filter((p) => p.type === typeInfo.type);

    // Badge overrides for special pill types
    const isFindings = typeInfo.type === 'findings';
    const fBadgeCount = isFindings && findingsCounts ? findingsCounts.total : 0;
    const fBadgeStyle = isFindings ? findingsBadgeColors(findingsCounts) : null;

    const isConnectivity = typeInfo.type === 'connectivity';
    const cBadge = isConnectivity ? connectivityBadge(connectivityServices) : null;

    if (instances.length === 0) {
      pills.push({
        type: typeInfo.type,
        label: typeInfo.label,
        icon: typeInfo.icon,
        state: 'closed',
        panelId: null,
        badgeCount: isFindings ? fBadgeCount : isConnectivity ? (cBadge?.count ?? 0) : 0,
        badgeStyle: isFindings ? fBadgeStyle : isConnectivity ? (cBadge?.style ?? null) : null,
        isActive: isFindings && findingsLoading ? true : false,
        badgePosition: isConnectivity ? 'top-left' : 'top-right',
        badgeGlyph: isConnectivity ? (cBadge?.glyph ?? '') : '',
        tooltip: isConnectivity ? (cBadge?.tooltip ?? null) : null,
      });
    } else {
      for (const inst of instances) {
        pills.push({
          type: inst.type,
          label: typeInfo.label,
          icon: typeInfo.icon,
          state: inst.state === 'minimized' ? 'minimized' : 'active',
          panelId: inst.id,
          badgeCount: isFindings ? fBadgeCount : isConnectivity ? (cBadge?.count ?? 0) : inst.badgeCount,
          badgeStyle: isFindings ? fBadgeStyle : isConnectivity ? (cBadge?.style ?? null) : null,
          isActive: inst.isActive,
          badgePosition: isConnectivity ? 'top-left' : 'top-right',
          badgeGlyph: isConnectivity ? (cBadge?.glyph ?? '') : '',
          tooltip: isConnectivity ? (cBadge?.tooltip ?? null) : null,
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
};

const PILL_STATES: Record<DockPillState, React.CSSProperties> = {
  active: {
    background: DOCK_TOKENS.activeBg,
    borderColor: DOCK_TOKENS.activeBorder,
    color: DOCK_TOKENS.activeText,
    boxShadow: `0 0 8px ${DOCK_TOKENS.glow}`,
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
      aria-pressed={pill.state === 'active'}
      aria-label={`${pill.label} — ${pill.state}${pill.badgeCount > 0 ? `, ${pill.badgeCount} ${pill.tooltip ?? 'items'}` : ''}`}
      style={{
        ...PILL_BASE,
        ...PILL_STATES[pill.state],
        ...(pill.isActive ? { animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : {}),
      }}
      title={pill.tooltip ?? `${pill.label} (${pill.state})`}
    >
      <span style={{ fontSize: 14 }} aria-hidden="true">{pill.icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 60 }}>{pill.label}</span>
      {pill.badgeCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            ...(pill.badgePosition === 'top-left' ? { left: -4 } : { right: -4 }),
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
            backgroundColor: pill.badgeStyle?.bg ?? DOCK_TOKENS.badgeBg,
            color: pill.badgeStyle?.text ?? DOCK_TOKENS.badgeText,
          }}
        >
          {pill.badgeGlyph && <span aria-hidden="true" style={{ marginRight: 1 }}>{pill.badgeGlyph}</span>}
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
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Poll service status for connectivity dock pill badge (10s — backend already polls, this reads cache)
  // Staggered 2.5s from findings poll to desync IPC bursts (P-QA-04)
  const [connectivityServices, setConnectivityServices] = useState<ServiceHealth[]>([]);
  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const poll = () => {
      getServiceStatus().then((services) => {
        if (!cancelled) setConnectivityServices(services);
      }).catch(() => {
        // Retain last-known services on error — don't reset to [] which gives false "all clear"
      });
    };
    const startId = setTimeout(() => {
      poll();
      intervalId = setInterval(poll, 10000);
    }, 2500);
    return () => { cancelled = true; clearTimeout(startId); if (intervalId) clearInterval(intervalId); };
  }, []);

  const pills = buildDockPills(panels, findingsCounts, findingsLoading, connectivityServices);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', maxHeight: DOCK_BAR_HEIGHT - 8 }}>
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
