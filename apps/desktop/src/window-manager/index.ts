// ── Window Manager — Public API ──

export { ForgeWindowManager } from './manager';
export { PanelContainer } from './panel';
export { DockBar } from './dock';
export { LayoutPersistence } from './persistence';
export { snapPosition, clampToFrame, DOCK_BAR_HEIGHT } from './snapping';
export type { SnapGuide, SnapResult } from './snapping';
export type * from './types';
