/**
 * @forge-os/canvas-components
 *
 * Reusable canvas-rendered UI primitives for Forge OS.
 * Every component accepts width + height props — no container size assumptions.
 * Built on @forge-os/layout-engine for Pretext-measured text rendering.
 */

// ─── Core Gauges (P4-M) ─────────────────────────────────────────────────────
export { StatCard } from './stat-card.js';
export type { StatCardProps } from './stat-card.js';

export { ProgressArc } from './progress-arc.js';
export type { ProgressArcProps } from './progress-arc.js';

export { StatusBadge } from './status-badge.js';
export type { StatusBadgeProps, BadgeStatus } from './status-badge.js';

// ─── Flow Components (P4-N) ─────────────────────────────────────────────────
export { FlowParticle } from './flow-particle.js';
export type { FlowParticleProps, BezierPath } from './flow-particle.js';

export { ConnectionLine } from './connection-line.js';
export type { ConnectionLineProps } from './connection-line.js';

export { NodeCard } from './node-card.js';
export type { NodeCardProps, NodeStatus } from './node-card.js';
