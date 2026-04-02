// ── Window Manager Persistence ──
// Save/restore full layout state to SQLite via Tauri commands.
// Debounced saves on every change to prevent SQLite thrashing.

import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '../lib/tauri';
import type { ForgeWindowManager } from './manager';
import type { PanelInstance, TabGroup, WorkspacePreset, WorkspacePresetRow } from './types';

// ── Tauri command wrappers ──

export interface SaveLayoutRequest {
  panels_json: string;
  tab_groups_json: string;
  active_preset_id: string | null;
}

export function savePanelLayout(request: SaveLayoutRequest): Promise<void> {
  if (!isTauriRuntime) return Promise.resolve();
  return invoke('save_panel_layout', { request });
}

export function loadPanelLayout(): Promise<{
  panels_json: string;
  tab_groups_json: string;
  active_preset_id: string | null;
} | null> {
  if (!isTauriRuntime) return Promise.resolve(null);
  return invoke('load_panel_layout');
}

export function saveWorkspacePreset(request: {
  id: string;
  name: string;
  description: string;
  is_built_in: boolean;
  panels_json: string;
}): Promise<void> {
  if (!isTauriRuntime) return Promise.resolve();
  return invoke('save_workspace_preset', { request });
}

export function loadWorkspacePresets(): Promise<WorkspacePresetRow[]> {
  if (!isTauriRuntime) return Promise.resolve([]);
  return invoke('load_workspace_presets');
}

// ── Debounced Persistence Manager ──

export class LayoutPersistence {
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs = 500;

  /** Persist current layout state (debounced) */
  scheduleSave(manager: ForgeWindowManager): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveNow(manager);
    }, this.debounceMs);
  }

  /** Persist immediately (used on app close) */
  async saveNow(manager: ForgeWindowManager): Promise<void> {
    const state = manager.serialize();
    try {
      await savePanelLayout({
        panels_json: JSON.stringify(state.panels),
        tab_groups_json: JSON.stringify(state.tabGroups),
        active_preset_id: state.activePresetId,
      });
    } catch (err) {
      console.error('[LayoutPersistence] save failed:', err);
    }
  }

  /** Restore layout from SQLite into the manager */
  async restore(manager: ForgeWindowManager): Promise<boolean> {
    try {
      const saved = await loadPanelLayout();
      if (!saved || !saved.panels_json) return false;

      const panels: PanelInstance[] = JSON.parse(saved.panels_json);
      const tabGroups: TabGroup[] = saved.tab_groups_json
        ? JSON.parse(saved.tab_groups_json)
        : [];

      if (panels.length === 0) return false;

      manager.restore({
        panels,
        tabGroups,
        activePresetId: saved.active_preset_id,
      });

      return true;
    } catch (err) {
      console.error('[LayoutPersistence] restore failed:', err);
      return false;
    }
  }

  /** Save a custom workspace preset to SQLite */
  async persistPreset(preset: WorkspacePreset): Promise<void> {
    try {
      await saveWorkspacePreset({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        is_built_in: preset.isBuiltIn,
        panels_json: JSON.stringify(preset.panels),
      });
    } catch (err) {
      console.error('[LayoutPersistence] preset save failed:', err);
    }
  }

  /** Load all custom presets from SQLite */
  async loadPresets(): Promise<WorkspacePreset[]> {
    try {
      const rows = await loadWorkspacePresets();
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        isBuiltIn: row.is_built_in === 1,
        panels: JSON.parse(row.panels_json),
      }));
    } catch (err) {
      console.error('[LayoutPersistence] preset load failed:', err);
      return [];
    }
  }

  dispose(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
}
