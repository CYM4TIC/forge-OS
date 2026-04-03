/**
 * Canvas Tokens — Shared color palette for all canvas-rendered components.
 * Single source of truth. Every canvas component imports from here.
 *
 * Matches the dark void + neon energy aesthetic from DESIGN-INTELLIGENCE.md.
 *
 * SYNC NOTE (MERIDIAN-MED-15): These tokens are manually synchronized with
 * apps/desktop/src/styles/globals.css @theme block. Canvas components use
 * these tokens. DOM components use the Tailwind classes derived from the
 * CSS custom properties. Keep both in sync when changing colors.
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

/** Font stacks */
export const FONT = {
  mono: 'monospace',
  system: '-apple-system, BlinkMacSystemFont, sans-serif',
} as const;

/** Containment field — subtle inner glow on panel shells (Alchemical Forge directive). */
export const CONTAINMENT = {
  glow: 'inset 0 0 12px rgba(99, 102, 241, 0.06)',
  glowActive: 'inset 0 0 16px rgba(99, 102, 241, 0.1)',
} as const;

/** Border radii */
export const RADIUS = {
  card: 8,
  pill: 4,
} as const;

/** Transition timing (for DOM-based components) */
export const TIMING = {
  fast: '0.2s ease',
} as const;

/** Glow and tint variants (alpha-channel derivatives of STATUS colors) */
export const GLOW = {
  accent: 'rgba(99, 102, 241, 0.3)',
  accentSubtle: 'rgba(99, 102, 241, 0.2)',
  danger: 'rgba(239, 68, 68, 0.3)',
  dangerSubtle: 'rgba(239, 68, 68, 0.2)',
  success: 'rgba(34, 197, 94, 0.15)',
  warning: 'rgba(245, 158, 11, 0.15)',
} as const;

/** Background tints for badges and pills */
export const TINT = {
  danger: 'rgba(239, 68, 68, 0.15)',
  success: 'rgba(34, 197, 94, 0.15)',
  accent: 'rgba(99, 102, 241, 0.15)',
  warning: 'rgba(245, 158, 11, 0.15)',
  neutral: 'rgba(90, 90, 110, 0.15)',
} as const;

/** Unified badge colors — single source for all severity/status badge rendering.
 * R-DS-05: Replaces divergent badge color definitions across dock, panels, and canvas.
 * bg = fill color, text = foreground for WCAG contrast (4.5:1 min on text, 3:1 non-text).
 * Rule: dark text on amber/warning (white on #f59e0b is only 2.1:1). */
export const BADGE_COLORS = {
  success:  { bg: STATUS.success,  text: '#ffffff' },
  warning:  { bg: STATUS.warning,  text: CANVAS.bg },      // dark text — WCAG contrast
  danger:   { bg: STATUS.danger,   text: '#ffffff' },
  critical: { bg: STATUS.critical, text: CANVAS.bg },    // dark text — white on #f97316 is only 3.2:1
  neutral:  { bg: STATUS.neutral,  text: '#ffffff' },
  accent:   { bg: STATUS.accent,   text: '#ffffff' },
  info:     { bg: STATUS.accent,   text: '#ffffff' },
} as const;

/** Pipeline stage colors (Hyperdrive build loop) */
export const PIPELINE = {
  scout: STATUS.accent,    // indigo — Nyx dispatches
  build: STATUS.success,   // green — active construction
  triad: '#ec4899',        // pink — review (unique, not in STATUS)
  sentinel: STATUS.warning, // amber — regression watch
  inactive: CANVAS.border,  // dim track for inactive connections
} as const;

/** Get pipeline stage color by stage key */
export function getPipelineColor(key: string): string {
  return (PIPELINE as Record<string, string>)[key] ?? PIPELINE.scout;
}

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

/** White overlay highlights for canvas shine/pulse effects (dark-mode-only) */
export const HIGHLIGHT = {
  subtle: 'rgba(255, 255, 255, 0.15)',
  medium: 'rgba(255, 255, 255, 0.25)',
  strong: 'rgba(255, 255, 255, 0.4)',
} as const;
