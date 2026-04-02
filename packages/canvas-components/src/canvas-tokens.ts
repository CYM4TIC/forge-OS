/**
 * Canvas Tokens — Shared color palette for all canvas-rendered components.
 * Single source of truth. Every canvas component imports from here.
 *
 * Matches the dark void + neon energy aesthetic from DESIGN-INTELLIGENCE.md.
 */

/** Core surface and text colors */
export const CANVAS = {
  bg: '#12121a',
  bgElevated: '#1a1a25',
  border: '#2a2a3a',
  trackBg: '#1f1f2e',
  text: '#e8e8ed',
  label: '#8b8b9e',
  muted: '#5a5a6e',
} as const;

/** Accent and semantic status colors */
export const STATUS = {
  accent: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  critical: '#f97316',
  danger: '#ef4444',
  neutral: '#5a5a6e',
} as const;

/** 4-zone context usage model (matches ContextMeterCanvas + ProgressArc) */
export const ZONES = {
  comfortable: STATUS.success,   // 0-60%
  warning: STATUS.warning,       // 60-80%
  critical: STATUS.critical,     // 80-85%
  compacting: STATUS.danger,     // 85%+
} as const;

/** Get zone color for a 0-1 value */
export function getZoneColor(value: number): string {
  if (value < 0.6) return ZONES.comfortable;
  if (value < 0.8) return ZONES.warning;
  if (value < 0.85) return ZONES.critical;
  return ZONES.compacting;
}

/** Get zone label for a 0-1 value */
export function getZoneLabel(value: number): string {
  if (value < 0.6) return 'COMFORTABLE';
  if (value < 0.8) return 'WARNING';
  if (value < 0.85) return 'CRITICAL';
  return 'COMPACTING';
}

/** Border radii */
export const RADIUS = {
  card: 8,
  pill: 4,
} as const;

/** Transition timing (for DOM-based components) */
export const TIMING = {
  fast: '0.2s ease',
} as const;

/** Dock pill colors (derived from base tokens) */
export const DOCK = {
  activeBg: 'rgba(99, 102, 241, 0.2)',
  activeBorder: 'rgba(99, 102, 241, 0.4)',
  activeText: STATUS.accent,
  dimBg: 'rgba(26, 26, 37, 0.6)',
  dimBorder: 'rgba(31, 31, 46, 1)',
  dimText: CANVAS.muted,
  badgeBg: STATUS.danger,
  badgeText: '#ffffff',
  glow: 'rgba(99, 102, 241, 0.3)',
} as const;
