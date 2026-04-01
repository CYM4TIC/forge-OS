/**
 * Pipeline Layout — Pure math for positioning pipeline stage nodes.
 * No DOM, no React. Given container dimensions + stage count, returns node rects + connection paths.
 *
 * Horizontal flow by default. Wraps to 2 rows when container is too narrow.
 * Connection lines follow bezier paths between node edges.
 */

import type { BezierPath } from '@forge-os/canvas-components';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Center point for connection anchors */
  cx: number;
  cy: number;
}

export interface ConnectionPath {
  from: { x: number; y: number };
  to: { x: number; y: number };
  bezier: BezierPath;
}

export interface PipelineLayout {
  nodes: NodeRect[];
  connections: ConnectionPath[];
  /** Space available for persona glyph inside each node */
  glyphSize: number;
  /** Computed font size for labels */
  labelFontSize: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_NODE_WIDTH = 80;
const MAX_NODE_WIDTH = 160;
const MIN_NODE_HEIGHT = 50;
const NODE_ASPECT = 1.6; // width:height ratio
const NODE_GAP = 16;
const PADDING = 12;
const WRAP_THRESHOLD_PER_NODE = 120; // below this px per node, wrap to 2 rows
const MIN_GLYPH_SIZE = 16;
const MAX_GLYPH_SIZE = 32;

// ─── Layout Engine ──────────────────────────────────────────────────────────

export function computePipelineLayout(
  containerWidth: number,
  containerHeight: number,
  nodeCount: number,
): PipelineLayout {
  if (nodeCount === 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { nodes: [], connections: [], glyphSize: 0, labelFontSize: 10 };
  }

  const availW = containerWidth - PADDING * 2;
  const availH = containerHeight - PADDING * 2;
  const pxPerNode = availW / nodeCount;

  // Decide layout mode: single row or wrapped
  const wrapped = pxPerNode < WRAP_THRESHOLD_PER_NODE && nodeCount > 2;

  if (wrapped) {
    return layoutWrapped(availW, availH, nodeCount);
  }
  return layoutSingleRow(availW, availH, nodeCount);
}

function layoutSingleRow(
  availW: number,
  availH: number,
  count: number,
): PipelineLayout {
  const totalGap = NODE_GAP * (count - 1);
  const nodeW = Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, (availW - totalGap) / count));
  const nodeH = Math.min(availH * 0.7, Math.max(MIN_NODE_HEIGHT, nodeW / NODE_ASPECT));

  // Center vertically
  const yOffset = PADDING + (availH - nodeH) / 2;
  const totalRowW = nodeW * count + totalGap;
  const xStart = PADDING + (availW - totalRowW) / 2;

  const nodes: NodeRect[] = [];
  for (let i = 0; i < count; i++) {
    const x = xStart + i * (nodeW + NODE_GAP);
    nodes.push({
      x,
      y: yOffset,
      width: nodeW,
      height: nodeH,
      cx: x + nodeW / 2,
      cy: yOffset + nodeH / 2,
    });
  }

  const connections = computeConnections(nodes);
  const glyphSize = clamp(nodeH * 0.4, MIN_GLYPH_SIZE, MAX_GLYPH_SIZE);
  const labelFontSize = clamp(nodeW * 0.1, 9, 14);

  return { nodes, connections, glyphSize, labelFontSize };
}

function layoutWrapped(
  availW: number,
  availH: number,
  count: number,
): PipelineLayout {
  // Split into 2 rows
  const topCount = Math.ceil(count / 2);
  const botCount = count - topCount;
  const rowGap = NODE_GAP * 2;

  const maxPerRow = Math.max(topCount, botCount);
  const totalGap = NODE_GAP * (maxPerRow - 1);
  const nodeW = Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, (availW - totalGap) / maxPerRow));
  const nodeH = Math.min((availH - rowGap) / 2 * 0.7, Math.max(MIN_NODE_HEIGHT, nodeW / NODE_ASPECT));

  const topY = PADDING + ((availH - rowGap) / 2 - nodeH) / 2;
  const botY = PADDING + (availH + rowGap) / 2 - nodeH - ((availH - rowGap) / 2 - nodeH) / 2;

  const nodes: NodeRect[] = [];

  // Top row — left to right
  const topTotalW = nodeW * topCount + NODE_GAP * (topCount - 1);
  const topXStart = PADDING + (availW - topTotalW) / 2;
  for (let i = 0; i < topCount; i++) {
    const x = topXStart + i * (nodeW + NODE_GAP);
    nodes.push({
      x,
      y: topY,
      width: nodeW,
      height: nodeH,
      cx: x + nodeW / 2,
      cy: topY + nodeH / 2,
    });
  }

  // Bottom row — left to right (continues the sequence)
  const botTotalW = nodeW * botCount + NODE_GAP * Math.max(0, botCount - 1);
  const botXStart = PADDING + (availW - botTotalW) / 2;
  for (let i = 0; i < botCount; i++) {
    const x = botXStart + i * (nodeW + NODE_GAP);
    nodes.push({
      x,
      y: botY,
      width: nodeW,
      height: nodeH,
      cx: x + nodeW / 2,
      cy: botY + nodeH / 2,
    });
  }

  const connections = computeConnections(nodes);
  const glyphSize = clamp(nodeH * 0.4, MIN_GLYPH_SIZE, MAX_GLYPH_SIZE);
  const labelFontSize = clamp(nodeW * 0.1, 9, 14);

  return { nodes, connections, glyphSize, labelFontSize };
}

// ─── Connection Paths ───────────────────────────────────────────────────────

function computeConnections(nodes: NodeRect[]): ConnectionPath[] {
  const connections: ConnectionPath[] = [];

  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];

    // Determine if same row (horizontal) or cross-row (vertical)
    const sameRow = Math.abs(a.cy - b.cy) < a.height;

    let from: { x: number; y: number };
    let to: { x: number; y: number };

    if (sameRow) {
      // Right edge of A → left edge of B
      from = { x: a.x + a.width, y: a.cy };
      to = { x: b.x, y: b.cy };
    } else {
      // Bottom of A → top of B (wrap connection)
      from = { x: a.cx, y: a.y + a.height };
      to = { x: b.cx, y: b.y };
    }

    // Bezier control points: gentle curve
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const curveStrength = sameRow ? 0.3 : 0.5;

    const bezier: BezierPath = {
      start: from,
      cp1: {
        x: from.x + dx * curveStrength,
        y: from.y + dy * 0.1,
      },
      cp2: {
        x: to.x - dx * curveStrength,
        y: to.y - dy * 0.1,
      },
      end: to,
    };

    connections.push({ from, to, bezier });
  }

  return connections;
}

// ─── Utility ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
