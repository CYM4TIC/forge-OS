/**
 * Virtual list height pre-computation.
 * Pre-computes row heights for virtualized lists (react-window / react-virtuoso compatible).
 *
 * Flow: text[] → batchPrepare → layout at containerWidth → VirtualHeightMap
 * The VirtualHeightMap.itemSize function plugs directly into react-window's VariableSizeList.
 *
 * Recompute on container resize — all heights recalculated in one pass (<1ms for 1000 items).
 */

import { prepare as pretextPrepare, layout as pretextLayout } from '@chenglou/pretext';
import type { PreparedText } from '@chenglou/pretext';
import type { VirtualHeightMapOptions, VirtualHeightMap } from './types.js';

// ─── Create Height Map ───────────────────────────────────────────────────────

/**
 * Create a VirtualHeightMap from an array of text content.
 * Pre-computes row heights for a given container width.
 *
 * The `itemSize` function is directly compatible with react-window VariableSizeList:
 * ```tsx
 * const heightMap = createVirtualHeightMap(texts, 400, options);
 * <VariableSizeList itemSize={heightMap.itemSize} itemCount={heightMap.count} ... />
 * ```
 *
 * Call `heightMap.recompute(newWidth)` when the container resizes.
 */
export function createVirtualHeightMap(
  texts: string[],
  containerWidth: number,
  options: VirtualHeightMapOptions,
): VirtualHeightMap {
  const {
    font,
    lineHeight,
    rowPadding = 0,
    minRowHeight,
    whiteSpace = 'normal',
  } = options;

  const effectiveMinHeight = minRowHeight ?? lineHeight;

  // Prepare all texts (one-time cost)
  const preparedTexts: PreparedText[] = texts.map(text =>
    pretextPrepare(text, font, { whiteSpace }),
  );

  // Compute heights at initial width
  const heights = new Float64Array(texts.length);
  let totalHeight = 0;

  for (let i = 0; i < preparedTexts.length; i++) {
    const result = pretextLayout(preparedTexts[i], containerWidth, lineHeight);
    const h = Math.max(result.height + rowPadding * 2, effectiveMinHeight);
    heights[i] = h;
    totalHeight += h;
  }

  return {
    getHeight: (index: number) => {
      if (index < 0 || index >= heights.length) return effectiveMinHeight;
      return heights[index];
    },

    getTotalHeight: () => totalHeight,

    recompute: (newWidth: number) => {
      totalHeight = 0;
      for (let i = 0; i < preparedTexts.length; i++) {
        const result = pretextLayout(preparedTexts[i], newWidth, lineHeight);
        const h = Math.max(result.height + rowPadding * 2, effectiveMinHeight);
        heights[i] = h;
        totalHeight += h;
      }
    },

    count: texts.length,

    // Direct react-window VariableSizeList compatibility
    itemSize: (index: number) => {
      if (index < 0 || index >= heights.length) return effectiveMinHeight;
      return heights[index];
    },
  };
}

// ─── Incremental Height Map ──────────────────────────────────────────────────

/**
 * Create a height map that supports incremental updates.
 * Use when items are added/removed dynamically (chat messages, log entries).
 */
export function createIncrementalHeightMap(
  initialTexts: string[],
  containerWidth: number,
  options: VirtualHeightMapOptions,
): VirtualHeightMap & {
  /** Append new items to the end */
  append: (texts: string[]) => void;
  /** Update a specific row's text */
  update: (index: number, text: string) => void;
  /** Remove items by index range */
  remove: (startIndex: number, count: number) => void;
} {
  const {
    font,
    lineHeight,
    rowPadding = 0,
    minRowHeight,
    whiteSpace = 'normal',
  } = options;

  const effectiveMinHeight = minRowHeight ?? lineHeight;
  let currentWidth = containerWidth;

  const preparedList: PreparedText[] = [];
  const heightList: number[] = [];
  let totalHeight = 0;

  // Helper: compute height for a single prepared text
  function computeHeight(prepared: PreparedText): number {
    const result = pretextLayout(prepared, currentWidth, lineHeight);
    return Math.max(result.height + rowPadding * 2, effectiveMinHeight);
  }

  // Initialize
  for (const text of initialTexts) {
    const prepared = pretextPrepare(text, font, { whiteSpace });
    preparedList.push(prepared);
    const h = computeHeight(prepared);
    heightList.push(h);
    totalHeight += h;
  }

  return {
    getHeight: (index: number) => {
      if (index < 0 || index >= heightList.length) return effectiveMinHeight;
      return heightList[index];
    },

    getTotalHeight: () => totalHeight,

    recompute: (newWidth: number) => {
      currentWidth = newWidth;
      totalHeight = 0;
      for (let i = 0; i < preparedList.length; i++) {
        const h = computeHeight(preparedList[i]);
        heightList[i] = h;
        totalHeight += h;
      }
    },

    get count() {
      return preparedList.length;
    },

    itemSize: (index: number) => {
      if (index < 0 || index >= heightList.length) return effectiveMinHeight;
      return heightList[index];
    },

    append: (texts: string[]) => {
      for (const text of texts) {
        const prepared = pretextPrepare(text, font, { whiteSpace });
        preparedList.push(prepared);
        const h = computeHeight(prepared);
        heightList.push(h);
        totalHeight += h;
      }
    },

    update: (index: number, text: string) => {
      if (index < 0 || index >= preparedList.length) return;

      const oldHeight = heightList[index];
      const prepared = pretextPrepare(text, font, { whiteSpace });
      preparedList[index] = prepared;
      const newHeight = computeHeight(prepared);
      heightList[index] = newHeight;
      totalHeight += newHeight - oldHeight;
    },

    remove: (startIndex: number, count: number) => {
      if (startIndex < 0 || startIndex >= preparedList.length) return;
      const actualCount = Math.min(count, preparedList.length - startIndex);

      for (let i = startIndex; i < startIndex + actualCount; i++) {
        totalHeight -= heightList[i];
      }

      preparedList.splice(startIndex, actualCount);
      heightList.splice(startIndex, actualCount);
    },
  };
}
