/**
 * finding-card-renderer.ts — Pure rendering logic for a single finding card.
 * No React. Takes a HudFinding + dimensions, returns computed styles and height.
 * Used by FindingsPanel for virtualized list.
 */

import { CANVAS, STATUS, GLOW, TINT, RADIUS, TIMING } from '@forge-os/canvas-components';
import { measureText } from '@forge-os/layout-engine';
import type { HudSeverity } from '../../../lib/tauri';

// ─── Severity Visual Config ────────────────────────────────────────────────

export interface SeverityVisual {
  fontSize: number;
  fontWeight: number;
  color: string;
  glowColor: string | null;
  label: string;
}

const SEVERITY_MAP: Record<HudSeverity, SeverityVisual> = {
  critical: {
    fontSize: 20,
    fontWeight: 700,
    color: STATUS.danger,
    glowColor: GLOW.danger,
    label: 'CRIT',
  },
  high: {
    fontSize: 16,
    fontWeight: 600,
    color: STATUS.critical,  // Orange — warm urgency, distinct from accent (indigo)
    glowColor: GLOW.accentSubtle,
    label: 'HIGH',
  },
  medium: {
    fontSize: 14,
    fontWeight: 500,
    color: STATUS.warning,
    glowColor: null,
    label: 'MED',
  },
  low: {
    fontSize: 12,
    fontWeight: 400,
    color: CANVAS.muted,
    glowColor: null,
    label: 'LOW',
  },
  info: {
    fontSize: 12,
    fontWeight: 400,
    color: CANVAS.label,
    glowColor: null,
    label: 'INFO',
  },
};

export function getSeverityVisual(severity: string): SeverityVisual {
  return SEVERITY_MAP[severity as HudSeverity] ?? SEVERITY_MAP.info;
}

// ─── Card Height Estimation ────────────────────────────────────────────────

const CARD_PADDING_Y = 10;
const TITLE_LINE_HEIGHT = 1.3;
const DESCRIPTION_LINE_HEIGHT = 1.4;
const DESCRIPTION_FONT_SIZE = 11;
const METADATA_HEIGHT = 16;
const GAP_BETWEEN_SECTIONS = 4;

const FONT_FAMILY = 'Inter, system-ui, sans-serif';

/**
 * Estimate card height for virtual scroll pre-computation.
 * Uses Pretext measureText() for accurate line-breaking (KEHINDE-MED-1).
 * prepare() result is cached in layout-engine LRU, so repeat calls are fast.
 */
export function estimateCardHeight(
  title: string,
  description: string,
  severity: string,
  containerWidth: number,
): number {
  const sv = getSeverityVisual(severity);
  const contentWidth = containerWidth - 24; // padding + glyph space

  // Title height via Pretext measurement
  const titleResult = measureText(title, contentWidth, {
    font: `${sv.fontWeight} ${sv.fontSize}px ${FONT_FAMILY}`,
  }, { lineHeight: TITLE_LINE_HEIGHT });

  // Description height via Pretext measurement (clamped to 3 lines)
  const descResult = measureText(description, contentWidth, {
    font: `${DESCRIPTION_FONT_SIZE}px ${FONT_FAMILY}`,
  }, { lineHeight: DESCRIPTION_LINE_HEIGHT });
  const descMaxHeight = 3 * DESCRIPTION_FONT_SIZE * DESCRIPTION_LINE_HEIGHT;
  const descHeight = Math.min(descResult.height, descMaxHeight);

  return CARD_PADDING_Y * 2 + titleResult.height + GAP_BETWEEN_SECTIONS + descHeight + GAP_BETWEEN_SECTIONS + METADATA_HEIGHT;
}

// ─── Card Style Builder ────────────────────────────────────────────────────

export interface FindingCardStyles {
  container: React.CSSProperties;
  severityBadge: React.CSSProperties;
  title: React.CSSProperties;
  description: React.CSSProperties;
  metadata: React.CSSProperties;
  personaName: React.CSSProperties;
  statusBadge: React.CSSProperties;
}

function getStatusBadgeColors(status: string): { background: string; color: string } {
  switch (status) {
    case 'resolved': return { background: TINT.success, color: STATUS.success };
    case 'acknowledged': return { background: TINT.warning, color: STATUS.warning };
    case 'deferred': return { background: TINT.neutral, color: CANVAS.muted };
    default: return { background: TINT.danger, color: STATUS.danger }; // open
  }
}

export function buildCardStyles(
  severity: string,
  status: string,
): FindingCardStyles {
  const sv = getSeverityVisual(severity);
  const isResolved = status === 'resolved';

  return {
    container: {
      padding: `${CARD_PADDING_Y}px 12px`,
      borderLeft: `3px solid ${isResolved ? CANVAS.border : sv.color}`,
      borderRadius: RADIUS.pill,
      background: CANVAS.bg,
      transition: `background ${TIMING.fast}`,
      opacity: isResolved ? 0.6 : 1,
      boxShadow: sv.glowColor && !isResolved ? `inset 4px 0 8px -4px ${sv.glowColor}` : 'none',
    },
    severityBadge: {
      fontSize: 9,
      fontWeight: 700,
      color: sv.color,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
    },
    title: {
      fontSize: sv.fontSize,
      fontWeight: sv.fontWeight,
      color: isResolved ? CANVAS.label : CANVAS.text,
      lineHeight: TITLE_LINE_HEIGHT,
      textDecoration: isResolved ? 'line-through' : 'none',
    },
    description: {
      fontSize: DESCRIPTION_FONT_SIZE,
      color: CANVAS.label,
      lineHeight: DESCRIPTION_LINE_HEIGHT,
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
    },
    metadata: {
      fontSize: 10,
      color: CANVAS.muted,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    personaName: {
      fontSize: 10,
      fontWeight: 500,
      color: CANVAS.label,
    },
    statusBadge: {
      fontSize: 9,
      fontWeight: 500,
      padding: '1px 5px',
      borderRadius: RADIUS.pill,
      ...getStatusBadgeColors(status),
      textTransform: 'uppercase' as const,
    },
  };
}
