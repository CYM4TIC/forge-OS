/**
 * Obstacle-aware text flow — text routes around positioned elements.
 * Uses layoutNextLine() with per-line variable widths.
 *
 * Given a set of rectangular obstacles within a container, computes
 * available width for each line and flows text around them.
 * Text never overlaps obstacles.
 *
 * Inspired by: https://chenglou.me/pretext/editorial-engine/
 * and https://chenglou.me/pretext/dynamic-layout/
 */

import {
  layoutNextLine,
} from '@chenglou/pretext';
import type {
  PreparedTextWithSegments,
  LayoutCursor,
  LayoutLine,
} from '@chenglou/pretext';
import { prepareSingleWithSegments, type PrepareOptions } from './prepare.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Obstacle {
  /** Left edge in px (relative to container) */
  x: number;
  /** Top edge in px (relative to container) */
  y: number;
  /** Width in px */
  width: number;
  /** Height in px */
  height: number;
  /** Which side text flows on. 'left' = text goes left of obstacle, 'right' = text goes right.
   *  'both' = text flows on whichever side has more space. Default: 'both' */
  flowSide?: 'left' | 'right' | 'both';
}

export interface FlowLine {
  /** The laid-out line from Pretext */
  line: LayoutLine;
  /** X offset where this line starts (may be pushed right by an obstacle) */
  x: number;
  /** Y position of this line's top edge */
  y: number;
  /** Available width for this line (container width minus obstacle overlap) */
  availableWidth: number;
}

export interface ObstacleFlowResult {
  /** All lines with position and width info */
  lines: FlowLine[];
  /** Total height consumed */
  height: number;
  /** Total line count */
  lineCount: number;
}

export interface ObstacleFlowOptions {
  /** Container width in px */
  containerWidth: number;
  /** Line height in px */
  lineHeight: number;
  /** Left margin/padding in px. Default: 0 */
  marginLeft?: number;
  /** Right margin/padding in px. Default: 0 */
  marginRight?: number;
  /** Starting Y offset. Default: 0 */
  startY?: number;
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Flow pre-prepared text around obstacles.
 * Uses layoutNextLine() iterator to compute each line with the width
 * available at that line's Y position.
 */
export function flowAroundObstacles(
  prepared: PreparedTextWithSegments,
  obstacles: Obstacle[],
  options: ObstacleFlowOptions,
): ObstacleFlowResult {
  const {
    containerWidth,
    lineHeight,
    marginLeft = 0,
    marginRight = 0,
    startY = 0,
  } = options;

  const flowLines: FlowLine[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = startY;

  while (true) {
    // Compute available space at this Y position
    const { x: lineX, width: availWidth } = computeAvailableWidth(
      y, lineHeight, containerWidth, marginLeft, marginRight, obstacles,
    );

    // Skip line if no space available (fully blocked by obstacles)
    if (availWidth < 20) {
      y += lineHeight;
      // Safety: don't infinite-loop if obstacles cover entire container
      if (y > startY + 10000) break;
      continue;
    }

    const line = layoutNextLine(prepared, cursor, availWidth);
    if (!line) break;

    flowLines.push({
      line,
      x: lineX,
      y,
      availableWidth: availWidth,
    });

    cursor = line.end;
    y += lineHeight;
  }

  return {
    lines: flowLines,
    height: y - startY,
    lineCount: flowLines.length,
  };
}

/**
 * Flow raw text around obstacles (prepare + flow in one call).
 */
export function flowTextAroundObstacles(
  text: string,
  prepareOpts: PrepareOptions,
  obstacles: Obstacle[],
  flowOpts: ObstacleFlowOptions,
): ObstacleFlowResult {
  const prepared = prepareSingleWithSegments(text, prepareOpts);
  return flowAroundObstacles(prepared, obstacles, flowOpts);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * For a given Y range (line top → line bottom), find available horizontal space.
 * Returns the leftmost X where text can start and the available width.
 */
function computeAvailableWidth(
  lineY: number,
  lineHeight: number,
  containerWidth: number,
  marginLeft: number,
  marginRight: number,
  obstacles: Obstacle[],
): { x: number; width: number } {
  const lineTop = lineY;
  const lineBottom = lineY + lineHeight;

  // Find all obstacles that vertically overlap this line
  const overlapping = obstacles.filter(obs =>
    obs.y < lineBottom && obs.y + obs.height > lineTop,
  );

  if (overlapping.length === 0) {
    return { x: marginLeft, width: containerWidth - marginLeft - marginRight };
  }

  // For each overlapping obstacle, determine which side text flows on
  let leftEdge = marginLeft;
  let rightEdge = containerWidth - marginRight;

  for (const obs of overlapping) {
    const obsLeft = obs.x;
    const obsRight = obs.x + obs.width;
    const flowSide = obs.flowSide ?? 'both';

    if (flowSide === 'left') {
      // Text goes left of obstacle
      rightEdge = Math.min(rightEdge, obsLeft);
    } else if (flowSide === 'right') {
      // Text goes right of obstacle
      leftEdge = Math.max(leftEdge, obsRight);
    } else {
      // 'both' — pick the side with more space
      const spaceLeft = obsLeft - leftEdge;
      const spaceRight = rightEdge - obsRight;

      if (spaceLeft >= spaceRight && spaceLeft > 20) {
        rightEdge = Math.min(rightEdge, obsLeft);
      } else if (spaceRight > 20) {
        leftEdge = Math.max(leftEdge, obsRight);
      } else {
        // Neither side has enough space — skip this line
        return { x: leftEdge, width: 0 };
      }
    }
  }

  const width = Math.max(0, rightEdge - leftEdge);
  return { x: leftEdge, width };
}
