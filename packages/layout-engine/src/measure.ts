/**
 * Text measurement functions: single-width, multi-breakpoint, height-for-width.
 * All measurement is DOM-free via @chenglou/pretext layout().
 *
 * Breakpoint convention: 375 (mobile), 768 (tablet), 1280 (desktop).
 */

import { layout as pretextLayout } from '@chenglou/pretext';
import type { PreparedText } from '@chenglou/pretext';
import { prepareSingle, type PrepareOptions } from './prepare.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MeasureResult {
  /** Total height in px */
  height: number;
  /** Number of lines */
  lineCount: number;
}

export interface MeasureOptions {
  /** Line height in px. Defaults to font size × 1.4 (extracted from font string). */
  lineHeight?: number;
}

export interface BreakpointMeasurement {
  width: number;
  height: number;
  lineCount: number;
}

export interface MultiBreakpointResult {
  /** Measurements at each breakpoint, ordered by width ascending */
  breakpoints: BreakpointMeasurement[];
  /** Max height across all breakpoints (worst-case for allocation) */
  maxHeight: number;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_BREAKPOINTS = [375, 768, 1280];

/**
 * Extract font size from CSS font shorthand.
 * "16px Inter" → 16, "bold 14px Arial" → 14, "italic bold 20px/1.5 Serif" → 20
 */
function extractFontSize(font: string): number {
  const match = font.match(/(\d+(?:\.\d+)?)px/);
  return match ? parseFloat(match[1]) : 16;
}

function defaultLineHeight(font: string): number {
  return Math.ceil(extractFontSize(font) * 1.4);
}

// ─── Single Measurement ──────────────────────────────────────────────────────

/**
 * Measure text height at a given container width.
 * Uses cached PreparedText from prepare module.
 */
export function measure(
  prepared: PreparedText,
  maxWidth: number,
  options?: MeasureOptions & { font?: string },
): MeasureResult {
  const lineHeight = options?.lineHeight ?? (options?.font ? defaultLineHeight(options.font) : 20);
  const result = pretextLayout(prepared, maxWidth, lineHeight);
  return { height: result.height, lineCount: result.lineCount };
}

/**
 * Prepare + measure in one call. Convenience for one-off measurements.
 */
export function measureText(
  text: string,
  maxWidth: number,
  prepareOpts: PrepareOptions,
  measureOpts?: MeasureOptions,
): MeasureResult {
  const prepared = prepareSingle(text, prepareOpts);
  const lineHeight = measureOpts?.lineHeight ?? defaultLineHeight(prepareOpts.font);
  const result = pretextLayout(prepared, maxWidth, lineHeight);
  return { height: result.height, lineCount: result.lineCount };
}

// ─── Multi-Breakpoint Measurement ────────────────────────────────────────────

/**
 * Measure text at multiple container widths (responsive breakpoints).
 * Returns height at each breakpoint + worst-case max height.
 *
 * Default breakpoints: 375 (mobile), 768 (tablet), 1280 (desktop).
 */
export function measureAtBreakpoints(
  prepared: PreparedText,
  prepareOpts: PrepareOptions,
  breakpoints?: number[],
  measureOpts?: MeasureOptions,
): MultiBreakpointResult {
  const widths = breakpoints ?? DEFAULT_BREAKPOINTS;
  const lineHeight = measureOpts?.lineHeight ?? defaultLineHeight(prepareOpts.font);

  const results: BreakpointMeasurement[] = [];
  let maxHeight = 0;

  for (const width of widths) {
    const { height, lineCount } = pretextLayout(prepared, width, lineHeight);
    results.push({ width, height, lineCount });
    if (height > maxHeight) maxHeight = height;
  }

  return { breakpoints: results, maxHeight };
}

// ─── Height-for-Width ────────────────────────────────────────────────────────

/**
 * Height-for-width function: given text + font, returns a function
 * that computes height for any container width. The prepare step
 * runs once; the returned function is <0.1ms per call.
 *
 * Use for resize handlers, virtualized list row height calculators,
 * and responsive layout pre-computation.
 */
export function heightForWidth(
  text: string,
  prepareOpts: PrepareOptions,
  measureOpts?: MeasureOptions,
): (width: number) => MeasureResult {
  const prepared = prepareSingle(text, prepareOpts);
  const lineHeight = measureOpts?.lineHeight ?? defaultLineHeight(prepareOpts.font);

  return (width: number) => {
    const result = pretextLayout(prepared, width, lineHeight);
    return { height: result.height, lineCount: result.lineCount };
  };
}

/**
 * Batch height-for-width: prepare all texts upfront, return a lookup function.
 * Key → (width → height). For virtualized lists with known content.
 */
export function batchHeightForWidth(
  items: Array<{ key: string; text: string }>,
  prepareOpts: PrepareOptions,
  measureOpts?: MeasureOptions,
): (key: string, width: number) => MeasureResult | null {
  const lineHeight = measureOpts?.lineHeight ?? defaultLineHeight(prepareOpts.font);
  const cache = new Map<string, PreparedText>();

  for (const item of items) {
    cache.set(item.key, prepareSingle(item.text, prepareOpts));
  }

  return (key: string, width: number) => {
    const prepared = cache.get(key);
    if (!prepared) return null;
    const result = pretextLayout(prepared, width, lineHeight);
    return { height: result.height, lineCount: result.lineCount };
  };
}
