/**
 * Bezier Path Computation for Flow Overlay trails.
 * Computes curved paths between pipeline node positions for particle animations.
 * Paths arc above the straight connection to avoid overlapping pipeline lines.
 * Multiple simultaneous trails are offset vertically to prevent z-fighting.
 */

import type { BezierPath } from '@forge-os/canvas-components';
import type { NodeRect } from './pipeline-layout';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Base vertical offset above pipeline connection line (px). */
const ARC_HEIGHT = 30;

/** Additional vertical offset per concurrent trail (px). */
const TRAIL_OFFSET_STEP = 12;

// ─── Path Computation ───────────────────────────────────────────────────────

/**
 * Compute a bezier path from a source node to a target node.
 * The path arcs above the direct line to separate from pipeline connections.
 *
 * @param source Source node rect (right edge anchor).
 * @param target Target node rect (left edge anchor).
 * @param trailIndex Index of this trail among concurrent trails (for offset).
 */
export function computeTrailPath(
  source: NodeRect,
  target: NodeRect,
  trailIndex: number = 0,
): BezierPath {
  // Anchor points: right edge of source → left edge of target
  const sameRow = Math.abs(source.cy - target.cy) < source.height;

  let fromX: number, fromY: number, toX: number, toY: number;

  if (sameRow) {
    fromX = source.x + source.width;
    fromY = source.cy;
    toX = target.x;
    toY = target.cy;
  } else {
    // Cross-row: bottom of source → top of target
    fromX = source.cx;
    fromY = source.y + source.height;
    toX = target.cx;
    toY = target.y;
  }

  // Arc offset: each concurrent trail gets a higher arc
  const offset = ARC_HEIGHT + trailIndex * TRAIL_OFFSET_STEP;
  const midX = (fromX + toX) / 2;

  // Control points arc upward (negative Y = up in screen coords)
  const arcY = sameRow
    ? Math.min(fromY, toY) - offset
    : (fromY + toY) / 2 - offset;

  return {
    start: { x: fromX, y: fromY },
    cp1: { x: midX - (toX - fromX) * 0.1, y: arcY },
    cp2: { x: midX + (toX - fromX) * 0.1, y: arcY },
    end: { x: toX, y: toY },
  };
}

/**
 * Given pipeline node rects and a source + target stage index,
 * compute the trail path. Handles multi-hop (source to non-adjacent target)
 * by computing a direct arc rather than following the pipeline path.
 */
export function computeDispatchPath(
  nodes: NodeRect[],
  sourceIndex: number,
  targetIndex: number,
  trailIndex: number = 0,
): BezierPath | null {
  const source = nodes[sourceIndex];
  const target = nodes[targetIndex];
  if (!source || !target) return null;
  return computeTrailPath(source, target, trailIndex);
}

// ─── Stage Resolution ───────────────────────────────────────────────────────

/** Map a persona/agent slug to a pipeline stage index. */
const STAGE_MAP: Record<string, number> = {
  // Pipeline stage order: 0=scout, 1=build, 2=triad, 3=sentinel
  nyx: 1,       // Nyx owns the build stage
  scout: 0,
  sentinel: 3,
  // Triad agents target the triad stage
  pierce: 2,
  mara: 2,
  riven: 2,
  // Other personas default to build stage
  kehinde: 2,
  tanaka: 2,
  vane: 2,
  voss: 2,
  calloway: 2,
  sable: 2,
};

/** Resolve a persona slug to a pipeline stage index. Falls back to build (1). */
export function resolveStageIndex(slug: string): number {
  return STAGE_MAP[slug.toLowerCase()] ?? 1;
}

/**
 * Evaluate a point on a cubic bezier curve at parameter t (0–1).
 * Used by the animation loop to position the particle.
 */
export function evalBezier(path: BezierPath, t: number): { x: number; y: number } {
  const { start, cp1, cp2, end } = path;
  const u = 1 - t;
  const u2 = u * u;
  const u3 = u2 * u;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: u3 * start.x + 3 * u2 * t * cp1.x + 3 * u * t2 * cp2.x + t3 * end.x,
    y: u3 * start.y + 3 * u2 * t * cp1.y + 3 * u * t2 * cp2.y + t3 * end.y,
  };
}
