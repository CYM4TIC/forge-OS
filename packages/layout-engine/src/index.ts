/**
 * @forge-os/layout-engine
 *
 * DOM-free text measurement and layout engine built on @chenglou/pretext.
 * Zero-CLS text rendering for Forge OS canvas HUD, PDF generation, and virtualized lists.
 *
 * Two-phase architecture:
 *   1. prepare() — one-time text segmentation + canvas measurement (~19ms/500 texts)
 *   2. measure/layout/fit/render — pure arithmetic, <0.1ms per call
 */

// ─── Prepare (Phase 1 — cache this) ─────────────────────────────────────────
export {
  prepareSingle,
  prepareSingleWithSegments,
  batchPrepare,
  clearPrepareCache,
  setTextLocale,
  getCacheStats,
} from './prepare.js';

export type {
  PrepareOptions,
  BatchPrepareItem,
  BatchPrepareResult,
} from './prepare.js';

// ─── Measure (Phase 2 — call on resize) ─────────────────────────────────────
export {
  measure,
  measureText,
  measureAtBreakpoints,
  heightForWidth,
  batchHeightForWidth,
} from './measure.js';

export type {
  MeasureResult,
  MeasureOptions,
  BreakpointMeasurement,
  MultiBreakpointResult,
} from './measure.js';

// ─── Re-export Pretext types for consumers ───────────────────────────────────
export type { PreparedText, PreparedTextWithSegments } from '@chenglou/pretext';
