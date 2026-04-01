/**
 * Shared types for the layout engine.
 * PreparedText and PreparedTextWithSegments are re-exported from @chenglou/pretext.
 */

import type { PreparedText, PreparedTextWithSegments } from '@chenglou/pretext';

// ─── Layout Types ────────────────────────────────────────────────────────────

export interface LayoutResult {
  /** Total height in px */
  height: number;
  /** Number of lines */
  lineCount: number;
}

// ─── Fit Types ───────────────────────────────────────────────────────────────

export interface FitOptions {
  /** Minimum font size in px. Default: 8 */
  minFont?: number;
  /** Maximum font size in px. Default: 72 */
  maxFont?: number;
  /** Target max lines. If set, solver reduces font to stay within line count. */
  maxLines?: number;
  /** Font family (without size). e.g. "Inter", "bold Inter" */
  fontFamily: string;
  /** Line height multiplier relative to font size. Default: 1.4 */
  lineHeightRatio?: number;
  /** White-space handling. Default: 'normal' */
  whiteSpace?: 'normal' | 'pre-wrap';
  /** Convergence tolerance in px. Solver stops when range < tolerance. Default: 0.5 */
  tolerance?: number;
}

export interface FitResult {
  /** Optimal font size in px */
  fontSize: number;
  /** CSS font shorthand for the fitted size */
  font: string;
  /** Total height at fitted size */
  height: number;
  /** Line count at fitted size */
  lineCount: number;
  /** Line height in px at fitted size */
  lineHeight: number;
  /** Number of binary search iterations */
  iterations: number;
}

// ─── Canvas Render Types ─────────────────────────────────────────────────────

export interface StyledSpan {
  /** Text content of this span */
  text: string;
  /** Override font weight. e.g. "bold", "600" */
  fontWeight?: string;
  /** Override color. CSS color string. */
  color?: string;
  /** Override font size in px (rare — usually use container-level font) */
  fontSize?: number;
  /** Background color for badge-style highlight */
  backgroundColor?: string;
  /** Border radius for background highlight in px */
  backgroundRadius?: number;
  /** Horizontal padding for background highlight in px */
  backgroundPadding?: number;
}

export interface CanvasRenderOptions {
  /** Container width in px */
  width: number;
  /** Container height in px (clips overflow) */
  height: number;
  /** CSS font shorthand — e.g. "16px Inter" */
  font: string;
  /** Line height in px */
  lineHeight: number;
  /** Text color. Default: '#ffffff' */
  color?: string;
  /** Text alignment. Default: 'left' */
  align?: 'left' | 'center' | 'right';
  /** Vertical alignment. Default: 'top' */
  verticalAlign?: 'top' | 'middle' | 'bottom';
  /** Padding in px [top, right, bottom, left]. Default: [0, 0, 0, 0] */
  padding?: [number, number, number, number];
  /** Device pixel ratio for crisp rendering. Default: window.devicePixelRatio || 1 */
  dpr?: number;
  /** Overflow indicator when text is clipped. Default: '...' */
  overflow?: string | false;
}

export interface CanvasRenderResult {
  /** Whether text was clipped (overflowed container) */
  clipped: boolean;
  /** Number of visible lines */
  visibleLines: number;
  /** Total lines (including clipped) */
  totalLines: number;
  /** Actual rendered height (may be less than container) */
  renderedHeight: number;
}

// ─── Virtual List Types ──────────────────────────────────────────────────────

export interface VirtualHeightMapOptions {
  /** CSS font shorthand */
  font: string;
  /** Line height in px */
  lineHeight: number;
  /** Vertical padding per row in px. Default: 0 */
  rowPadding?: number;
  /** Minimum row height in px. Default: lineHeight */
  minRowHeight?: number;
  /** White-space handling. Default: 'normal' */
  whiteSpace?: 'normal' | 'pre-wrap';
}

export interface VirtualHeightMap {
  /** Get height for a specific row index */
  getHeight: (index: number) => number;
  /** Get total height of all rows */
  getTotalHeight: () => number;
  /** Recompute all heights at a new container width */
  recompute: (containerWidth: number) => void;
  /** Number of rows */
  count: number;
  /** itemSize function compatible with react-window VariableSizeList */
  itemSize: (index: number) => number;
}

// Re-export pretext types
export type { PreparedText, PreparedTextWithSegments };
