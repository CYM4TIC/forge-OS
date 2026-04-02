// ── Window Manager Types ──
// Every panel in Forge OS is independently sizable, movable, and detachable.

export type PanelType =
  | 'chat'
  | 'canvas_hud'
  | 'team'
  | 'preview'
  | 'connectivity'
  | 'findings'
  | 'agent_board'
  | 'vault_browser'
  | 'graph_viewer'
  | 'session_timeline'
  | 'context_meter';

export type PanelState = 'docked' | 'floating' | 'minimized' | 'popped_out';

export interface PanelPosition {
  x: number;
  y: number;
}

export interface PanelSize {
  width: number;
  height: number;
}

/** Constraints for panel minimum/maximum dimensions */
export interface PanelConstraints {
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
}

/** Unique instance of a panel — multiple panels of the same type allowed */
export interface PanelInstance {
  id: string;
  type: PanelType;
  state: PanelState;
  position: PanelPosition;
  size: PanelSize;
  constraints: PanelConstraints;
  zOrder: number;
  monitor: number;
  tabGroupId: string | null;
  tabOrder: number;
  title: string;
  visible: boolean;
  /** Badge count for dock pill (unread findings, messages, etc.) */
  badgeCount: number;
  /** Whether this panel is currently "active" (pulsing in dock) */
  isActive: boolean;
}

/** A group of tabbed panels — drag one onto another to create */
export interface TabGroup {
  id: string;
  panelIds: string[];
  activeTabId: string;
  position: PanelPosition;
  size: PanelSize;
}

/** Dock bar item representation */
export interface DockItem {
  panelType: PanelType;
  instanceId: string | null;
  label: string;
  icon: string;
  state: 'active' | 'minimized' | 'closed';
  badgeCount: number;
  isActive: boolean;
}

/** Named workspace preset — layout snapshot */
export interface WorkspacePreset {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  panels: PanelPresetEntry[];
}

export interface PanelPresetEntry {
  type: PanelType;
  state: PanelState;
  position: PanelPosition;
  size: PanelSize;
  tabGroupId: string | null;
  tabOrder: number;
}

/** Registry of available panel types — what CAN exist */
export interface PanelTypeInfo {
  type: PanelType;
  label: string;
  icon: string;
  defaultConstraints: PanelConstraints;
  allowMultiple: boolean;
  defaultSize: PanelSize;
}

/** SQLite row shape for panel_layouts_v2 table */
export interface PanelLayoutRow {
  panel_id: string;
  panel_type: string;
  state: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z_order: number;
  monitor: number;
  tab_group_id: string | null;
  tab_order: number;
  workspace_preset: string;
  title: string;
}

/** SQLite row shape for workspace_presets table */
export interface WorkspacePresetRow {
  id: string;
  name: string;
  description: string;
  is_built_in: number;
  panels_json: string;
  created_at: string;
}

/** Snap target for edge-snapping */
export interface SnapTarget {
  edge: 'left' | 'right' | 'top' | 'bottom';
  position: number;
  source: 'frame' | 'panel' | 'dock';
}

/** Drag state for panel being moved */
export interface DragState {
  panelId: string;
  startPosition: PanelPosition;
  startMousePosition: PanelPosition;
  isDragging: boolean;
}

/** Resize state for panel being resized */
export interface ResizeState {
  panelId: string;
  handle: ResizeHandle;
  startPosition: PanelPosition;
  startSize: PanelSize;
  startMousePosition: PanelPosition;
  isResizing: boolean;
}

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** Window manager event types emitted to React */
export type WindowManagerEvent =
  | { type: 'panel_added'; panel: PanelInstance }
  | { type: 'panel_removed'; panelId: string }
  | { type: 'panel_moved'; panelId: string; position: PanelPosition }
  | { type: 'panel_resized'; panelId: string; size: PanelSize }
  | { type: 'panel_state_changed'; panelId: string; state: PanelState }
  | { type: 'panel_focused'; panelId: string }
  | { type: 'tab_group_created'; group: TabGroup }
  | { type: 'tab_group_dissolved'; groupId: string }
  | { type: 'preset_applied'; presetId: string }
  | { type: 'layout_restored' };
