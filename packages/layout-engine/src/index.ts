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

// ─── Fit (binary search solver) ──────────────────────────────────────────────
export { fitToContainer, fitToBox } from './fit.js';

// ─── Canvas Render ───────────────────────────────────────────────────────────
export {
  renderText,
  renderStyledSpans,
  setupCanvasForHiDPI,
} from './canvas.js';

// ─── Virtual List Heights ────────────────────────────────────────────────────
export {
  createVirtualHeightMap,
  createIncrementalHeightMap,
} from './virtual.js';

// ─── Shrinkwrap (zero wasted pixels) ─────────────────────────────────────────
export { shrinkwrap, shrinkwrapText, batchShrinkwrap } from './shrinkwrap.js';
export type { ShrinkwrapResult, ShrinkwrapOptions } from './shrinkwrap.js';

// ─── Rich Inline (atomic chips + text flow) ──────────────────────────────────
export { layoutRichInline } from './rich-inline.js';
export type {
  TextRun,
  InlineChip,
  InlineElement,
  RichLayoutLine,
  PlacedInlineElement,
  RichLayoutResult,
  RichLayoutOptions,
} from './rich-inline.js';

// ─── Obstacle-Aware Flow (text around elements) ─────────────────────────────
export { flowAroundObstacles, flowTextAroundObstacles } from './obstacle-flow.js';
export type {
  Obstacle,
  FlowLine,
  ObstacleFlowResult,
  ObstacleFlowOptions,
} from './obstacle-flow.js';

// ─── Multi-Column Flow ───────────────────────────────────────────────────────
export { multiColumnLayout, multiColumnText, balancedMultiColumnText } from './multicolumn.js';
export type {
  ColumnConfig,
  ColumnLine,
  MultiColumnResult,
  ColumnInfo,
} from './multicolumn.js';

// ─── Accordion (pre-computed expand/collapse) ────────────────────────────────
export {
  computeAccordionHeights,
  computeAccordionHeightsFromText,
  batchAccordionHeights,
  createReactiveAccordion,
} from './accordion.js';
export type { AccordionHeights, AccordionOptions } from './accordion.js';

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  LayoutResult,
  FitOptions,
  FitResult,
  StyledSpan,
  CanvasRenderOptions,
  CanvasRenderResult,
  VirtualHeightMapOptions,
  VirtualHeightMap,
} from './types.js';

// ─── Re-export Pretext types for consumers ───────────────────────────────────
export type { PreparedText, PreparedTextWithSegments } from '@chenglou/pretext';
