/**
 * Multi-column text flow — continuous text flowing across columns.
 * Uses layoutNextLine() to fill each column, then carries the cursor
 * to the next column when one fills up.
 *
 * Used for: PDF generation, editorial layouts, gate reports, documentation.
 *
 * Inspired by: https://chenglou.me/pretext/editorial-engine/
 */

import {
  prepareWithSegments,
  layoutNextLine,
} from '@chenglou/pretext';
import type {
  PreparedTextWithSegments,
  LayoutCursor,
  LayoutLine,
} from '@chenglou/pretext';
import { prepareSingleWithSegments, type PrepareOptions } from './prepare.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ColumnConfig {
  /** Number of columns. Default: 2 */
  columns?: number;
  /** Gap between columns in px. Default: 24 */
  columnGap?: number;
  /** Total container width in px */
  containerWidth: number;
  /** Maximum height per column in px. Text overflows to next column when reached.
   *  If not set, all text goes in as many lines as needed per column. */
  maxColumnHeight?: number;
  /** Line height in px */
  lineHeight: number;
}

export interface ColumnLine {
  /** The laid-out line */
  line: LayoutLine;
  /** Which column (0-indexed) */
  columnIndex: number;
  /** X offset of this line (column origin + any indentation) */
  x: number;
  /** Y offset within the column */
  y: number;
}

export interface MultiColumnResult {
  /** All lines with column assignment and position */
  lines: ColumnLine[];
  /** Per-column info */
  columns: ColumnInfo[];
  /** Total height (max column height across all used columns) */
  height: number;
  /** Total line count */
  lineCount: number;
  /** Whether text overflowed all columns (didn't fit) */
  overflow: boolean;
}

export interface ColumnInfo {
  /** Column index */
  index: number;
  /** X origin of this column */
  x: number;
  /** Column width */
  width: number;
  /** Number of lines in this column */
  lineCount: number;
  /** Actual height used in this column */
  height: number;
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Flow pre-prepared text across multiple columns.
 */
export function multiColumnLayout(
  prepared: PreparedTextWithSegments,
  config: ColumnConfig,
): MultiColumnResult {
  const {
    columns: numColumns = 2,
    columnGap = 24,
    containerWidth,
    maxColumnHeight,
    lineHeight,
  } = config;

  // Calculate column widths
  const totalGaps = (numColumns - 1) * columnGap;
  const columnWidth = (containerWidth - totalGaps) / numColumns;

  // Build column info
  const columnInfos: ColumnInfo[] = [];
  for (let i = 0; i < numColumns; i++) {
    columnInfos.push({
      index: i,
      x: i * (columnWidth + columnGap),
      width: columnWidth,
      lineCount: 0,
      height: 0,
    });
  }

  const allLines: ColumnLine[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let currentColumn = 0;
  let yInColumn = 0;
  let overflow = false;

  while (true) {
    if (currentColumn >= numColumns) {
      overflow = true;
      break;
    }

    const col = columnInfos[currentColumn];

    // Check if we've exceeded max column height
    if (maxColumnHeight && yInColumn + lineHeight > maxColumnHeight) {
      // Move to next column
      col.height = yInColumn;
      currentColumn++;
      yInColumn = 0;
      continue;
    }

    const line = layoutNextLine(prepared, cursor, columnWidth);
    if (!line) break; // All text consumed

    allLines.push({
      line,
      columnIndex: currentColumn,
      x: col.x,
      y: yInColumn,
    });

    col.lineCount++;
    cursor = line.end;
    yInColumn += lineHeight;
  }

  // Finalize current column height
  if (currentColumn < numColumns) {
    columnInfos[currentColumn].height = yInColumn;
  }

  // Total height = max column height
  const totalHeight = Math.max(...columnInfos.map(c => c.height));

  return {
    lines: allLines,
    columns: columnInfos,
    height: totalHeight,
    lineCount: allLines.length,
    overflow,
  };
}

/**
 * Multi-column from raw text (prepare + layout in one call).
 */
export function multiColumnText(
  text: string,
  prepareOpts: PrepareOptions,
  config: ColumnConfig,
): MultiColumnResult {
  const prepared = prepareSingleWithSegments(text, prepareOpts);
  return multiColumnLayout(prepared, config);
}

/**
 * Balanced multi-column — distributes text evenly across columns.
 * First computes total lines, then divides by column count to find
 * optimal max height, then re-lays out with that constraint.
 */
export function balancedMultiColumnText(
  text: string,
  prepareOpts: PrepareOptions,
  config: Omit<ColumnConfig, 'maxColumnHeight'>,
): MultiColumnResult {
  const prepared = prepareSingleWithSegments(text, prepareOpts);
  const numColumns = config.columns ?? 2;
  const totalGaps = (numColumns - 1) * (config.columnGap ?? 24);
  const columnWidth = (config.containerWidth - totalGaps) / numColumns;

  // First pass: count total lines at column width
  let totalLines = 0;
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  while (true) {
    const line = layoutNextLine(prepared, cursor, columnWidth);
    if (!line) break;
    totalLines++;
    cursor = line.end;
  }

  // Compute balanced height: divide lines evenly, round up
  const linesPerColumn = Math.ceil(totalLines / numColumns);
  const balancedHeight = linesPerColumn * config.lineHeight;

  // Second pass: lay out with balanced max height
  return multiColumnLayout(prepared, {
    ...config,
    maxColumnHeight: balancedHeight,
  });
}
