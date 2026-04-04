// ── ForgeWindowManager ──
// Panel instance registry, z-order stack, state transitions, position/size management.
// This is the core brain of the floating window system.

import type {
  PanelType,
  PanelInstance,
  PanelPosition,
  PanelSize,
  PanelTypeInfo,
  TabGroup,
  WorkspacePreset,
  PanelPresetEntry,
  WindowManagerEvent,
} from './types';

type EventListener = (event: WindowManagerEvent) => void;

// ── Panel Type Registry — what CAN exist ──

// Only register panel types that have actual component implementations.
// All 11 panel types are registered. document_gen will be added when its
// panel component is built. No placeholder pills in the dock bar.
const PANEL_TYPE_REGISTRY: Map<PanelType, PanelTypeInfo> = new Map([
  ['chat', {
    type: 'chat', label: 'Crucible', icon: '⚗️',
    defaultConstraints: { minWidth: 280, minHeight: 300 },
    allowMultiple: false,
    defaultSize: { width: 320, height: 600 },
  }],
  ['canvas_hud', {
    type: 'canvas_hud', label: 'Furnace', icon: '🔥',
    defaultConstraints: { minWidth: 400, minHeight: 300 },
    allowMultiple: false,
    defaultSize: { width: 640, height: 600 },
  }],
  ['team', {
    type: 'team', label: 'Magi', icon: '🧙',
    defaultConstraints: { minWidth: 260, minHeight: 200 },
    allowMultiple: false,
    defaultSize: { width: 300, height: 600 },
  }],
  ['preview', {
    type: 'preview', label: 'Orb', icon: '🔮',
    defaultConstraints: { minWidth: 320, minHeight: 200 },
    allowMultiple: true,
    defaultSize: { width: 640, height: 480 },
  }],
  ['connectivity', {
    type: 'connectivity', label: 'Scrying', icon: '👁️',
    defaultConstraints: { minWidth: 260, minHeight: 200 },
    allowMultiple: false,
    defaultSize: { width: 420, height: 360 },
  }],
  ['findings', {
    type: 'findings', label: 'Echoes', icon: '🌀',
    defaultConstraints: { minWidth: 300, minHeight: 250 },
    allowMultiple: false,
    defaultSize: { width: 420, height: 500 },
  }],
  ['agent_board', {
    type: 'agent_board', label: 'Grimoire', icon: '📜',
    defaultConstraints: { minWidth: 320, minHeight: 250 },
    allowMultiple: false,
    defaultSize: { width: 500, height: 400 },
  }],
  ['session_timeline', {
    type: 'session_timeline', label: 'Chronicle', icon: '⏳',
    defaultConstraints: { minWidth: 400, minHeight: 150 },
    allowMultiple: false,
    defaultSize: { width: 600, height: 200 },
  }],
  ['vault_browser', {
    type: 'vault_browser', label: 'Vault', icon: '🗝️',
    defaultConstraints: { minWidth: 300, minHeight: 300 },
    allowMultiple: false,
    defaultSize: { width: 500, height: 500 },
  }],
  ['graph_viewer', {
    type: 'graph_viewer', label: 'Ley Lines', icon: '✨',
    defaultConstraints: { minWidth: 400, minHeight: 300 },
    allowMultiple: false,
    defaultSize: { width: 600, height: 500 },
  }],
  ['context_meter', {
    type: 'context_meter', label: 'Vessel', icon: '🏺',
    defaultConstraints: { minWidth: 200, minHeight: 150 },
    allowMultiple: false,
    defaultSize: { width: 300, height: 200 },
  }],
  ['proposal_feed', {
    type: 'proposal_feed', label: 'Agora', icon: '🏛️',
    defaultConstraints: { minWidth: 300, minHeight: 250 },
    allowMultiple: false,
    defaultSize: { width: 420, height: 500 },
  }],
]);

// ── Built-in Workspace Presets ──

const BUILT_IN_PRESETS: WorkspacePreset[] = [
  {
    id: 'build',
    name: 'Build Mode',
    description: 'Canvas big, chat + team docked',
    isBuiltIn: true,
    panels: [
      { type: 'chat', state: 'docked', position: { x: 0, y: 0 }, size: { width: 320, height: 600 }, tabGroupId: null, tabOrder: 0 },
      { type: 'canvas_hud', state: 'docked', position: { x: 320, y: 0 }, size: { width: 640, height: 600 }, tabGroupId: null, tabOrder: 0 },
      { type: 'team', state: 'docked', position: { x: 960, y: 0 }, size: { width: 320, height: 600 }, tabGroupId: null, tabOrder: 0 },
    ],
  },
  {
    id: 'review',
    name: 'Review Mode',
    description: 'Preview + chat big, canvas minimized',
    isBuiltIn: true,
    panels: [
      { type: 'chat', state: 'docked', position: { x: 0, y: 0 }, size: { width: 320, height: 600 }, tabGroupId: null, tabOrder: 0 },
      { type: 'preview', state: 'floating', position: { x: 340, y: 20 }, size: { width: 560, height: 550 }, tabGroupId: null, tabOrder: 0 },
      { type: 'canvas_hud', state: 'minimized', position: { x: 0, y: 0 }, size: { width: 640, height: 600 }, tabGroupId: null, tabOrder: 0 },
    ],
  },
  {
    id: 'focus',
    name: 'Focus Mode',
    description: 'Chat only, everything else minimized',
    isBuiltIn: true,
    panels: [
      { type: 'chat', state: 'floating', position: { x: 100, y: 20 }, size: { width: 500, height: 700 }, tabGroupId: null, tabOrder: 0 },
    ],
  },
  {
    id: 'gate_review',
    name: 'Gate Review',
    description: 'Agent Board + Findings + Timeline for gate sessions',
    isBuiltIn: true,
    panels: [
      { type: 'agent_board', state: 'docked', position: { x: 0, y: 0 }, size: { width: 500, height: 350 }, tabGroupId: null, tabOrder: 0 },
      { type: 'findings', state: 'docked', position: { x: 500, y: 0 }, size: { width: 420, height: 350 }, tabGroupId: null, tabOrder: 0 },
      { type: 'session_timeline', state: 'docked', position: { x: 0, y: 350 }, size: { width: 920, height: 250 }, tabGroupId: null, tabOrder: 0 },
    ],
  },
  {
    id: 'observatory',
    name: 'Observatory',
    description: 'Canvas HUD + Graph Viewer + Vault Browser for exploration',
    isBuiltIn: true,
    panels: [
      { type: 'canvas_hud', state: 'docked', position: { x: 0, y: 0 }, size: { width: 500, height: 600 }, tabGroupId: null, tabOrder: 0 },
      { type: 'graph_viewer', state: 'docked', position: { x: 500, y: 0 }, size: { width: 500, height: 300 }, tabGroupId: null, tabOrder: 0 },
      { type: 'vault_browser', state: 'docked', position: { x: 500, y: 300 }, size: { width: 500, height: 300 }, tabGroupId: null, tabOrder: 0 },
    ],
  },
  {
    id: 'dev',
    name: 'Dev Mode',
    description: 'Chat + Preview + Connectivity for active development',
    isBuiltIn: true,
    panels: [
      { type: 'chat', state: 'docked', position: { x: 0, y: 0 }, size: { width: 320, height: 600 }, tabGroupId: null, tabOrder: 0 },
      { type: 'preview', state: 'docked', position: { x: 320, y: 0 }, size: { width: 560, height: 360 }, tabGroupId: null, tabOrder: 0 },
      { type: 'connectivity', state: 'docked', position: { x: 320, y: 360 }, size: { width: 560, height: 240 }, tabGroupId: null, tabOrder: 0 },
    ],
  },
];

let instanceCounter = 0;
function generatePanelId(type: PanelType): string {
  return `${type}_${++instanceCounter}_${Date.now().toString(36)}`;
}

export class ForgeWindowManager {
  private panels: Map<string, PanelInstance> = new Map();
  private tabGroups: Map<string, TabGroup> = new Map();
  private presets: Map<string, WorkspacePreset> = new Map();
  private activePresetId: string | null = null;
  private nextZOrder = 1;
  private listeners: Set<EventListener> = new Set();

  constructor() {
    // Register built-in presets
    for (const preset of BUILT_IN_PRESETS) {
      this.presets.set(preset.id, preset);
    }
  }

  // ── Event System ──

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: WindowManagerEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  // ── Panel CRUD ──

  addPanel(type: PanelType, overrides?: Partial<PanelInstance>): PanelInstance {
    const typeInfo = PANEL_TYPE_REGISTRY.get(type);
    if (!typeInfo) throw new Error(`Unknown panel type: ${type}`);

    // Enforce single-instance for non-multiple panel types
    if (!typeInfo.allowMultiple) {
      const existing = this.getPanelsByType(type);
      if (existing.length > 0) {
        // Restore if minimized, otherwise focus
        const panel = existing[0];
        if (panel.state === 'minimized') {
          this.restorePanel(panel.id);
        } else {
          this.focusPanel(panel.id);
        }
        return panel;
      }
    }

    const id = overrides?.id ?? generatePanelId(type);
    const panel: PanelInstance = {
      id,
      type,
      state: 'docked',
      position: { x: 0, y: 0 },
      size: { ...typeInfo.defaultSize },
      constraints: { ...typeInfo.defaultConstraints },
      zOrder: this.nextZOrder++,
      monitor: 0,
      tabGroupId: null,
      tabOrder: 0,
      title: typeInfo.label,
      visible: true,
      badgeCount: 0,
      isActive: false,
      ...overrides,
    };

    this.panels.set(id, panel);
    this.emit({ type: 'panel_added', panel });
    return panel;
  }

  removePanel(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    // Remove from tab group if tabbed
    if (panel.tabGroupId) {
      this.removeFromTabGroup(panelId);
    }

    this.panels.delete(panelId);
    this.emit({ type: 'panel_removed', panelId });
  }

  getPanel(panelId: string): PanelInstance | undefined {
    return this.panels.get(panelId);
  }

  getAllPanels(): PanelInstance[] {
    return Array.from(this.panels.values());
  }

  getPanelsByType(type: PanelType): PanelInstance[] {
    return this.getAllPanels().filter((p) => p.type === type);
  }

  getVisiblePanels(): PanelInstance[] {
    return this.getAllPanels()
      .filter((p) => p.visible && p.state !== 'minimized' && p.state !== 'popped_out')
      .sort((a, b) => a.zOrder - b.zOrder);
  }

  // ── Position & Size ──

  movePanel(panelId: string, position: PanelPosition): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    // If docked, undock to floating on move
    if (panel.state === 'docked') {
      panel.state = 'floating';
      this.emit({ type: 'panel_state_changed', panelId, state: 'floating' });
    }

    panel.position = { ...position };
    this.emit({ type: 'panel_moved', panelId, position });
  }

  resizePanel(panelId: string, size: PanelSize): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    // Clamp to constraints
    const clamped: PanelSize = {
      width: Math.max(panel.constraints.minWidth, panel.constraints.maxWidth ? Math.min(size.width, panel.constraints.maxWidth) : size.width),
      height: Math.max(panel.constraints.minHeight, panel.constraints.maxHeight ? Math.min(size.height, panel.constraints.maxHeight) : size.height),
    };

    panel.size = clamped;
    this.emit({ type: 'panel_resized', panelId, size: clamped });
  }

  // ── State Transitions ──

  minimizePanel(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel || panel.state === 'minimized') return;

    panel.state = 'minimized';
    panel.visible = false;
    this.emit({ type: 'panel_state_changed', panelId, state: 'minimized' });
  }

  restorePanel(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel || panel.state !== 'minimized') return;

    panel.state = 'floating';
    panel.visible = true;
    panel.zOrder = this.nextZOrder++;
    this.emit({ type: 'panel_state_changed', panelId, state: 'floating' });
  }

  floatPanel(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    panel.state = 'floating';
    panel.visible = true;
    panel.zOrder = this.nextZOrder++;
    this.emit({ type: 'panel_state_changed', panelId, state: 'floating' });
  }

  dockPanel(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    panel.state = 'docked';
    panel.visible = true;
    this.emit({ type: 'panel_state_changed', panelId, state: 'docked' });
  }

  popOutPanel(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    panel.state = 'popped_out';
    this.emit({ type: 'panel_state_changed', panelId, state: 'popped_out' });
  }

  returnFromPopOut(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel || panel.state !== 'popped_out') return;

    panel.state = 'floating';
    panel.visible = true;
    panel.zOrder = this.nextZOrder++;
    this.emit({ type: 'panel_state_changed', panelId, state: 'floating' });
  }

  // ── Z-Order (click-to-raise) ──

  focusPanel(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    panel.zOrder = this.nextZOrder++;
    this.emit({ type: 'panel_focused', panelId });

    // Normalize z-indices when they get too high (prevent CSS z-index overflow)
    if (this.nextZOrder > 1000) {
      this.normalizeZOrder();
    }
  }

  /** Compact z-indices to contiguous values (1, 2, 3...) */
  private normalizeZOrder(): void {
    const sorted = Array.from(this.panels.values()).sort((a, b) => a.zOrder - b.zOrder);
    sorted.forEach((panel, i) => {
      panel.zOrder = i + 1;
    });
    this.nextZOrder = sorted.length + 1;
  }

  // ── Tab Groups ──

  createTabGroup(panelIds: string[]): TabGroup | null {
    if (panelIds.length < 2) return null;

    const panels = panelIds.map((id) => this.panels.get(id)).filter(Boolean) as PanelInstance[];
    if (panels.length < 2) return null;

    const groupId = `tabgroup_${Date.now().toString(36)}`;
    const firstPanel = panels[0];

    const group: TabGroup = {
      id: groupId,
      panelIds: [...panelIds],
      activeTabId: panelIds[0],
      position: { ...firstPanel.position },
      size: { ...firstPanel.size },
    };

    this.tabGroups.set(groupId, group);

    // Update all panels in the group
    panels.forEach((panel, i) => {
      panel.tabGroupId = groupId;
      panel.tabOrder = i;
      panel.position = { ...group.position };
      panel.size = { ...group.size };
      panel.visible = i === 0; // Only active tab visible
    });

    this.emit({ type: 'tab_group_created', group });
    return group;
  }

  addToTabGroup(groupId: string, panelId: string): void {
    const group = this.tabGroups.get(groupId);
    const panel = this.panels.get(panelId);
    if (!group || !panel) return;

    group.panelIds.push(panelId);
    panel.tabGroupId = groupId;
    panel.tabOrder = group.panelIds.length - 1;
    panel.position = { ...group.position };
    panel.size = { ...group.size };
    panel.visible = false; // New tab starts hidden
  }

  removeFromTabGroup(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel || !panel.tabGroupId) return;

    const group = this.tabGroups.get(panel.tabGroupId);
    if (!group) return;

    group.panelIds = group.panelIds.filter((id) => id !== panelId);
    panel.tabGroupId = null;
    panel.tabOrder = 0;
    panel.visible = true;

    // If group has < 2 panels, dissolve it
    if (group.panelIds.length < 2) {
      const remaining = group.panelIds[0];
      if (remaining) {
        const rPanel = this.panels.get(remaining);
        if (rPanel) {
          rPanel.tabGroupId = null;
          rPanel.tabOrder = 0;
          rPanel.visible = true;
        }
      }
      this.tabGroups.delete(group.id);
      this.emit({ type: 'tab_group_dissolved', groupId: group.id });
    } else if (group.activeTabId === panelId) {
      // Switch to first remaining tab
      group.activeTabId = group.panelIds[0];
      const newActive = this.panels.get(group.activeTabId);
      if (newActive) newActive.visible = true;
    }
  }

  switchTab(groupId: string, panelId: string): void {
    const group = this.tabGroups.get(groupId);
    if (!group || !group.panelIds.includes(panelId)) return;

    // Hide previous active
    const prev = this.panels.get(group.activeTabId);
    if (prev) prev.visible = false;

    // Show new active
    group.activeTabId = panelId;
    const next = this.panels.get(panelId);
    if (next) next.visible = true;
  }

  getTabGroup(groupId: string): TabGroup | undefined {
    return this.tabGroups.get(groupId);
  }

  getAllTabGroups(): TabGroup[] {
    return Array.from(this.tabGroups.values());
  }

  // ── Badges & Activity ──

  setBadgeCount(panelId: string, count: number): void {
    const panel = this.panels.get(panelId);
    if (panel) panel.badgeCount = count;
  }

  setActive(panelId: string, active: boolean): void {
    const panel = this.panels.get(panelId);
    if (panel) panel.isActive = active;
  }

  // ── Workspace Presets ──

  getPresets(): WorkspacePreset[] {
    return Array.from(this.presets.values());
  }

  getActivePresetId(): string | null {
    return this.activePresetId;
  }

  applyPreset(presetId: string): void {
    const preset = this.presets.get(presetId);
    if (!preset) return;

    // Minimize all current panels
    for (const panel of this.panels.values()) {
      panel.state = 'minimized';
      panel.visible = false;
    }

    // Apply preset entries
    for (const entry of preset.panels) {
      const existing = this.getPanelsByType(entry.type);
      if (existing.length > 0) {
        const panel = existing[0];
        panel.state = entry.state;
        panel.position = { ...entry.position };
        panel.size = { ...entry.size };
        panel.visible = entry.state !== 'minimized';
        panel.zOrder = this.nextZOrder++;
      } else {
        this.addPanel(entry.type, {
          state: entry.state,
          position: { ...entry.position },
          size: { ...entry.size },
          visible: entry.state !== 'minimized',
        });
      }
    }

    this.activePresetId = presetId;
    this.emit({ type: 'preset_applied', presetId });
  }

  savePreset(name: string, description: string): WorkspacePreset {
    const id = `custom_${Date.now().toString(36)}`;
    const panels: PanelPresetEntry[] = this.getAllPanels().map((p) => ({
      type: p.type,
      state: p.state,
      position: { ...p.position },
      size: { ...p.size },
      tabGroupId: p.tabGroupId,
      tabOrder: p.tabOrder,
    }));

    const preset: WorkspacePreset = {
      id,
      name,
      description,
      isBuiltIn: false,
      panels,
    };

    this.presets.set(id, preset);
    return preset;
  }

  deletePreset(presetId: string): boolean {
    const preset = this.presets.get(presetId);
    if (!preset || preset.isBuiltIn) return false;
    this.presets.delete(presetId);
    return true;
  }

  // ── Serialization (for persistence layer) ──

  serialize(): { panels: PanelInstance[]; tabGroups: TabGroup[]; activePresetId: string | null } {
    return {
      panels: this.getAllPanels(),
      tabGroups: this.getAllTabGroups(),
      activePresetId: this.activePresetId,
    };
  }

  restore(data: { panels: PanelInstance[]; tabGroups: TabGroup[]; activePresetId: string | null }): void {
    this.panels.clear();
    this.tabGroups.clear();

    for (const panel of data.panels) {
      this.panels.set(panel.id, panel);
      if (panel.zOrder >= this.nextZOrder) {
        this.nextZOrder = panel.zOrder + 1;
      }
    }

    for (const group of data.tabGroups) {
      this.tabGroups.set(group.id, group);
    }

    this.activePresetId = data.activePresetId;
    this.emit({ type: 'layout_restored' });
  }

  // ── Default Layout (first launch) ──

  applyDefaultLayout(containerWidth: number, containerHeight: number): void {
    const chatWidth = 320;
    const teamWidth = 300;
    const canvasWidth = containerWidth - chatWidth - teamWidth;

    this.addPanel('chat', {
      state: 'docked',
      position: { x: 0, y: 0 },
      size: { width: chatWidth, height: containerHeight },
    });

    this.addPanel('canvas_hud', {
      state: 'docked',
      position: { x: chatWidth, y: 0 },
      size: { width: Math.max(canvasWidth, 400), height: containerHeight },
    });

    this.addPanel('team', {
      state: 'docked',
      position: { x: chatWidth + Math.max(canvasWidth, 400), y: 0 },
      size: { width: teamWidth, height: containerHeight },
    });

    // Preview and connectivity start minimized to dock
    this.addPanel('preview', { state: 'minimized', visible: false });
    this.addPanel('connectivity', { state: 'minimized', visible: false });
  }

  // ── Static helpers ──

  static getPanelTypeInfo(type: PanelType): PanelTypeInfo | undefined {
    return PANEL_TYPE_REGISTRY.get(type);
  }

  static getAllPanelTypes(): PanelTypeInfo[] {
    return Array.from(PANEL_TYPE_REGISTRY.values());
  }

  /** Get all built-in workspace presets (for SQLite seeding on first run). */
  static getBuiltInPresets(): WorkspacePreset[] {
    return [...BUILT_IN_PRESETS];
  }
}
