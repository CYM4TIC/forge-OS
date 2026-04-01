/**
 * Animated expand/collapse — pre-computed target heights for CSS transitions.
 * No more `max-height: 9999px` hack. Know the exact pixel height before animating.
 *
 * Pretext gives us the collapsed (single-line or N-line preview) height and the
 * full expanded height without touching the DOM. CSS transitions animate to
 * the exact computed value.
 *
 * Inspired by: https://chenglou.me/pretext/accordion/
 */

import { layout as pretextLayout } from '@chenglou/pretext';
import type { PreparedText } from '@chenglou/pretext';
import { prepareSingle, type PrepareOptions } from './prepare.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AccordionHeights {
  /** Height when collapsed (preview lines only) */
  collapsed: number;
  /** Height when fully expanded (all text visible) */
  expanded: number;
  /** Total line count at full expansion */
  totalLines: number;
  /** Lines visible in collapsed state */
  collapsedLines: number;
  /** Delta (expanded - collapsed) — the animation distance */
  delta: number;
}

export interface AccordionOptions {
  /** Container width in px */
  width: number;
  /** Line height in px */
  lineHeight: number;
  /** Number of preview lines when collapsed. Default: 1 */
  collapsedLines?: number;
  /** Extra padding to add to both collapsed and expanded heights. Default: 0 */
  padding?: number;
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Compute collapsed and expanded heights for a text block.
 * Use with CSS `height` transitions for smooth, exact-pixel animations.
 *
 * ```tsx
 * const { collapsed, expanded } = computeAccordionHeights(prepared, opts);
 * <div style={{
 *   height: isOpen ? expanded : collapsed,
 *   transition: 'height 300ms ease-out',
 *   overflow: 'hidden'
 * }}>
 *   {text}
 * </div>
 * ```
 */
export function computeAccordionHeights(
  prepared: PreparedText,
  options: AccordionOptions,
): AccordionHeights {
  const {
    width,
    lineHeight,
    collapsedLines = 1,
    padding = 0,
  } = options;

  const result = pretextLayout(prepared, width, lineHeight);
  const totalLines = result.lineCount;
  const actualCollapsedLines = Math.min(collapsedLines, totalLines);

  const collapsed = actualCollapsedLines * lineHeight + padding;
  const expanded = result.height + padding;

  return {
    collapsed,
    expanded,
    totalLines,
    collapsedLines: actualCollapsedLines,
    delta: expanded - collapsed,
  };
}

/**
 * Compute from raw text (prepare + compute in one call).
 */
export function computeAccordionHeightsFromText(
  text: string,
  prepareOpts: PrepareOptions,
  accordionOpts: AccordionOptions,
): AccordionHeights {
  const prepared = prepareSingle(text, prepareOpts);
  return computeAccordionHeights(prepared, accordionOpts);
}

/**
 * Batch accordion heights — compute for a list of items.
 * Use for accordion lists, FAQ panels, expandable chat messages.
 */
export function batchAccordionHeights(
  items: Array<{ key: string; text: string }>,
  prepareOpts: PrepareOptions,
  accordionOpts: AccordionOptions,
): Map<string, AccordionHeights> {
  const results = new Map<string, AccordionHeights>();

  for (const item of items) {
    const prepared = prepareSingle(item.text, prepareOpts);
    results.set(item.key, computeAccordionHeights(prepared, accordionOpts));
  }

  return results;
}

/**
 * Reactive accordion — returns a function that recomputes heights
 * when container width changes. The prepared text is cached.
 */
export function createReactiveAccordion(
  text: string,
  prepareOpts: PrepareOptions,
  lineHeight: number,
  collapsedLines?: number,
  padding?: number,
): (width: number) => AccordionHeights {
  const prepared = prepareSingle(text, prepareOpts);

  return (width: number) => computeAccordionHeights(prepared, {
    width,
    lineHeight,
    collapsedLines,
    padding,
  });
}
