/**
 * Fit-to-container solver.
 * Binary search over pretext layout() to find optimal font size
 * that fills a container width without overflow. Target: <1ms.
 *
 * Used for: agent labels at any zoom, stat cards, node titles,
 * and any text that must fill its container responsively.
 */

import { prepare as pretextPrepare, layout as pretextLayout } from '@chenglou/pretext';
import type { FitOptions, FitResult } from './types.js';

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_MIN_FONT = 8;
const DEFAULT_MAX_FONT = 72;
const DEFAULT_LINE_HEIGHT_RATIO = 1.4;
const DEFAULT_TOLERANCE = 0.5;
const MAX_ITERATIONS = 20; // log2(72 - 8) / 0.5 ≈ 7, so 20 is generous

// ─── Core Solver ─────────────────────────────────────────────────────────────

/**
 * Find the largest font size where text fits within containerWidth.
 * Binary search over layout() — pure arithmetic, no DOM.
 *
 * "Fits" means: all text renders within containerWidth without exceeding maxLines
 * (if specified) or without wrapping beyond what the container can show.
 *
 * Performance: <1ms for typical text (7-15 binary search iterations).
 */
export function fitToContainer(
  text: string,
  containerWidth: number,
  options: FitOptions,
): FitResult {
  const minFont = options.minFont ?? DEFAULT_MIN_FONT;
  const maxFont = options.maxFont ?? DEFAULT_MAX_FONT;
  const lineHeightRatio = options.lineHeightRatio ?? DEFAULT_LINE_HEIGHT_RATIO;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const ws = options.whiteSpace ?? 'normal';

  let lo = minFont;
  let hi = maxFont;
  let iterations = 0;
  let bestSize = minFont;
  let bestHeight = 0;
  let bestLineCount = 0;

  while (hi - lo > tolerance && iterations < MAX_ITERATIONS) {
    iterations++;
    const mid = (lo + hi) / 2;
    const font = buildFont(mid, options.fontFamily);
    const lineHeight = Math.ceil(mid * lineHeightRatio);

    const prepared = pretextPrepare(text, font, { whiteSpace: ws });
    const result = pretextLayout(prepared, containerWidth, lineHeight);

    const fits = options.maxLines
      ? result.lineCount <= options.maxLines
      : result.lineCount <= 1; // Default: single line

    if (fits) {
      // Text fits — try larger
      bestSize = mid;
      bestHeight = result.height;
      bestLineCount = result.lineCount;
      lo = mid;
    } else {
      // Text overflows — try smaller
      hi = mid;
    }
  }

  const finalFont = buildFont(bestSize, options.fontFamily);
  const finalLineHeight = Math.ceil(bestSize * lineHeightRatio);

  return {
    fontSize: Math.round(bestSize * 10) / 10, // Round to 0.1px
    font: finalFont,
    height: bestHeight,
    lineCount: bestLineCount,
    lineHeight: finalLineHeight,
    iterations,
  };
}

/**
 * Fit text to fill a container's full height.
 * Finds the largest font size where text height <= containerHeight.
 *
 * Use for: filling a card area, maximizing readability within a box.
 */
export function fitToBox(
  text: string,
  containerWidth: number,
  containerHeight: number,
  options: FitOptions,
): FitResult {
  const minFont = options.minFont ?? DEFAULT_MIN_FONT;
  const maxFont = options.maxFont ?? DEFAULT_MAX_FONT;
  const lineHeightRatio = options.lineHeightRatio ?? DEFAULT_LINE_HEIGHT_RATIO;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const ws = options.whiteSpace ?? 'normal';

  let lo = minFont;
  let hi = maxFont;
  let iterations = 0;
  let bestSize = minFont;
  let bestHeight = 0;
  let bestLineCount = 0;

  while (hi - lo > tolerance && iterations < MAX_ITERATIONS) {
    iterations++;
    const mid = (lo + hi) / 2;
    const font = buildFont(mid, options.fontFamily);
    const lineHeight = Math.ceil(mid * lineHeightRatio);

    const prepared = pretextPrepare(text, font, { whiteSpace: ws });
    const result = pretextLayout(prepared, containerWidth, lineHeight);

    const fitsHeight = result.height <= containerHeight;
    const fitsLines = options.maxLines ? result.lineCount <= options.maxLines : true;

    if (fitsHeight && fitsLines) {
      bestSize = mid;
      bestHeight = result.height;
      bestLineCount = result.lineCount;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const finalFont = buildFont(bestSize, options.fontFamily);
  const finalLineHeight = Math.ceil(bestSize * lineHeightRatio);

  return {
    fontSize: Math.round(bestSize * 10) / 10,
    font: finalFont,
    height: bestHeight,
    lineCount: bestLineCount,
    lineHeight: finalLineHeight,
    iterations,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFont(size: number, family: string): string {
  // Handle weight/style prefix: "bold Inter" → "bold 16px Inter"
  const parts = family.split(/\s+/);
  const weightOrStyle = ['bold', 'italic', 'light', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
  const prefixes: string[] = [];
  let familyName = family;

  for (const part of parts) {
    if (weightOrStyle.includes(part.toLowerCase())) {
      prefixes.push(part);
    } else {
      familyName = parts.slice(parts.indexOf(part)).join(' ');
      break;
    }
  }

  const prefix = prefixes.length > 0 ? prefixes.join(' ') + ' ' : '';
  return `${prefix}${Math.round(size * 10) / 10}px ${familyName}`;
}
