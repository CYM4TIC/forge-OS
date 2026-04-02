/**
 * Shrinkwrap — find the tightest width that produces the same line count.
 * Zero wasted pixels in chat bubbles, NodeCards, tooltips, dock pills.
 *
 * Uses walkLineRanges() to binary-search for the minimum width that
 * doesn't increase line count. CSS `fit-content` can't do this —
 * it sizes to the widest wrapped line, leaving dead space on shorter lines.
 *
 * Inspired by: https://chenglou.me/pretext/bubbles/
 */

import {
  layout as pretextLayout,
  walkLineRanges,
} from '@chenglou/pretext';
import type { PreparedTextWithSegments } from '@chenglou/pretext';
import { prepareSingleWithSegments, type PrepareOptions } from './prepare.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShrinkwrapResult {
  /** Tightest width in px that keeps the same line count */
  width: number;
  /** Height at the shrinkwrapped width */
  height: number;
  /** Line count (same as at maxWidth) */
  lineCount: number;
  /** Pixels saved vs maxWidth */
  savedPixels: number;
  /** Binary search iterations used */
  iterations: number;
}

export interface ShrinkwrapOptions {
  /** Maximum width to start from. Text wraps at this width to establish baseline line count. */
  maxWidth: number;
  /** Line height in px */
  lineHeight: number;
  /** Minimum width to consider. Default: 40 */
  minWidth?: number;
  /** Convergence tolerance in px. Default: 1 */
  tolerance?: number;
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Find the tightest width for pre-prepared text.
 * Binary searches between minWidth and maxWidth for the narrowest width
 * that produces the same line count as maxWidth.
 */
export function shrinkwrap(
  prepared: PreparedTextWithSegments,
  options: ShrinkwrapOptions,
): ShrinkwrapResult {
  const {
    maxWidth,
    lineHeight,
    minWidth = 40,
    tolerance = 1,
  } = options;

  // Establish baseline line count at maxWidth
  const baselineLineCount = countLines(prepared, maxWidth);

  // Empty text — return zero dimensions
  if (baselineLineCount === 0) {
    return {
      width: 0,
      height: 0,
      lineCount: 0,
      savedPixels: maxWidth,
      iterations: 0,
    };
  }

  if (baselineLineCount <= 1) {
    // Single line — find exact text width using walkLineRanges
    let textWidth = 0;
    walkLineRanges(prepared, maxWidth, (line) => {
      textWidth = Math.max(textWidth, line.width);
    });
    const tightWidth = Math.ceil(textWidth);
    return {
      width: tightWidth,
      height: lineHeight,
      lineCount: 1,
      savedPixels: maxWidth - tightWidth,
      iterations: 0,
    };
  }

  // Binary search: find narrowest width that keeps baselineLineCount
  let lo = minWidth;
  let hi = maxWidth;
  let bestWidth = maxWidth;
  let iterations = 0;

  while (hi - lo > tolerance && iterations < 30) {
    iterations++;
    const mid = (lo + hi) / 2;
    const lines = countLines(prepared, mid);

    if (lines <= baselineLineCount) {
      // Still fits — try narrower
      bestWidth = mid;
      hi = mid;
    } else {
      // Overflows — need wider
      lo = mid;
    }
  }

  const finalWidth = Math.ceil(bestWidth);
  const result = pretextLayout(prepared, finalWidth, lineHeight);

  return {
    width: finalWidth,
    height: result.height,
    lineCount: result.lineCount,
    savedPixels: maxWidth - finalWidth,
    iterations,
  };
}

/**
 * Shrinkwrap from raw text (prepare + shrinkwrap in one call).
 */
export function shrinkwrapText(
  text: string,
  prepareOpts: PrepareOptions,
  shrinkwrapOpts: ShrinkwrapOptions,
): ShrinkwrapResult {
  const prepared = prepareSingleWithSegments(text, prepareOpts);
  return shrinkwrap(prepared, shrinkwrapOpts);
}

/**
 * Batch shrinkwrap — compute tightest widths for multiple texts.
 * Useful for chat bubble lists, card grids, tooltip sets.
 */
export function batchShrinkwrap(
  items: Array<{ key: string; text: string }>,
  prepareOpts: PrepareOptions,
  shrinkwrapOpts: ShrinkwrapOptions,
): Map<string, ShrinkwrapResult> {
  const results = new Map<string, ShrinkwrapResult>();

  for (const item of items) {
    const prepared = prepareSingleWithSegments(item.text, prepareOpts);
    results.set(item.key, shrinkwrap(prepared, shrinkwrapOpts));
  }

  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countLines(prepared: PreparedTextWithSegments, width: number): number {
  let count = 0;
  walkLineRanges(prepared, width, () => { count++; });
  return count;
}
