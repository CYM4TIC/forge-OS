/**
 * graph-layout — Simple force-directed layout for the Graph Viewer Panel.
 *
 * Pure math. No DOM, no React, no external dependency.
 * Repulsion between all nodes, attraction along edges, gravity toward center.
 * Stabilizes after ~100 iterations. Runs on requestAnimationFrame.
 */

import type { GraphNode, GraphEdge } from '../../../hooks/useGraphData';

/* ── Types ─────────────────────────────────────────────────────── */

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Radius for collision/rendering */
  radius: number;
  /** Reference to source data */
  data: GraphNode;
}

export interface LayoutEdge {
  source: LayoutNode;
  target: LayoutNode;
  data: GraphEdge;
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  /** True when velocity has dropped below threshold */
  stabilized: boolean;
  /** Number of ticks completed */
  tickCount: number;
}

/* ── Constants ─────────────────────────────────────────────────── */

const REPULSION_STRENGTH = 4000;
const ATTRACTION_STRENGTH = 0.003;
const EDGE_REST_LENGTH = 120;       // edges target this distance, not zero
const GRAVITY_STRENGTH = 0.008;
const DAMPING = 0.85;
const MIN_DISTANCE = 50;
const VELOCITY_THRESHOLD = 0.1;
const MAX_VELOCITY = 15;
const STABILIZE_AFTER = 150;

const NODE_RADIUS_PERSONA = 24;
const NODE_RADIUS_CONCEPT = 18;
const NODE_RADIUS_SYSTEM = 20;
const NODE_RADIUS_PHASE = 16;

/* ── Init ──────────────────────────────────────────────────────── */

function nodeRadius(type: GraphNode['type']): number {
  switch (type) {
    case 'persona': return NODE_RADIUS_PERSONA;
    case 'system': return NODE_RADIUS_SYSTEM;
    case 'concept': return NODE_RADIUS_CONCEPT;
    case 'phase': return NODE_RADIUS_PHASE;
  }
}

/**
 * Initialize layout from graph data.
 * Nodes are placed in a circle to give the simulation a reasonable starting state.
 */
export function initLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
): GraphLayout {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.35;

  const layoutNodes: LayoutNode[] = nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    return {
      id: node.id,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
      radius: nodeRadius(node.type),
      data: node,
    };
  });

  const nodeMap = new Map(layoutNodes.map((n) => [n.id, n]));
  const layoutEdges: LayoutEdge[] = edges
    .map((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return null;
      return { source, target, data: edge };
    })
    .filter((e): e is LayoutEdge => e !== null);

  return { nodes: layoutNodes, edges: layoutEdges, stabilized: false, tickCount: 0 };
}

/* ── Simulation Tick ───────────────────────────────────────────── */

/**
 * Advance the simulation by one tick.
 * Mutates node positions in place for performance.
 * Returns whether the layout has stabilized.
 */
export function tickLayout(
  layout: GraphLayout,
  width: number,
  height: number,
): boolean {
  if (layout.stabilized) return true;

  const { nodes, edges } = layout;
  const cx = width / 2;
  const cy = height / 2;

  // Reset forces
  for (const node of nodes) {
    node.vx *= DAMPING;
    node.vy *= DAMPING;
  }

  // Repulsion: every pair
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MIN_DISTANCE) dist = MIN_DISTANCE;

      const force = REPULSION_STRENGTH / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }
  }

  // Attraction: along edges with rest length
  // Positive displacement = attract (too far), negative = repel (too close)
  for (const edge of edges) {
    const dx = edge.target.x - edge.source.x;
    const dy = edge.target.y - edge.source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) continue;

    const displacement = dist - EDGE_REST_LENGTH;
    const force = displacement * ATTRACTION_STRENGTH * edge.data.weight;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    edge.source.vx += fx;
    edge.source.vy += fy;
    edge.target.vx -= fx;
    edge.target.vy -= fy;
  }

  // Gravity: pull toward center
  for (const node of nodes) {
    const dx = cx - node.x;
    const dy = cy - node.y;
    node.vx += dx * GRAVITY_STRENGTH;
    node.vy += dy * GRAVITY_STRENGTH;
  }

  // Apply velocities, clamp to bounds
  let totalVelocity = 0;
  const pad = 40;
  for (const node of nodes) {
    // Clamp velocity
    const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
    if (speed > MAX_VELOCITY) {
      node.vx = (node.vx / speed) * MAX_VELOCITY;
      node.vy = (node.vy / speed) * MAX_VELOCITY;
    }

    node.x += node.vx;
    node.y += node.vy;

    // Keep in bounds
    node.x = Math.max(pad, Math.min(width - pad, node.x));
    node.y = Math.max(pad, Math.min(height - pad, node.y));

    totalVelocity += Math.abs(node.vx) + Math.abs(node.vy);
  }

  layout.tickCount++;

  // Check stabilization
  const avgVelocity = nodes.length > 0 ? totalVelocity / nodes.length : 0;
  if (avgVelocity < VELOCITY_THRESHOLD || layout.tickCount >= STABILIZE_AFTER) {
    layout.stabilized = true;
  }

  return layout.stabilized;
}

/* ── Queries ───────────────────────────────────────────────────── */

/** Find the node at a given point (for hit testing on click). */
export function nodeAtPoint(
  layout: GraphLayout,
  px: number,
  py: number,
): LayoutNode | null {
  // Check in reverse order so topmost drawn node wins
  for (let i = layout.nodes.length - 1; i >= 0; i--) {
    const node = layout.nodes[i];
    const dx = px - node.x;
    const dy = py - node.y;
    // Use generous hit area (1.5x radius)
    if (dx * dx + dy * dy <= (node.radius * 1.5) ** 2) {
      return node;
    }
  }
  return null;
}
