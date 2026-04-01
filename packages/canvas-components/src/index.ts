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
