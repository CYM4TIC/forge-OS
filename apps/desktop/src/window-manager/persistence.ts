// ── Window Manager Persistence ──
// Save/restore full layout state to SQLite via Tauri commands.
// Debounced saves on every change to prevent SQLite thrashing.

import {
  isTauriRuntime,
  savePanelLayout,
  loadPanelLayout,
  saveWorkspacePreset,
  loadWorkspacePresets,
} from '../lib/tauri';
import { ForgeWindowManager } from './manager';
import type { PanelInstance, TabGroup, WorkspacePreset } from './types';

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
    if (!isTauriRuntime) return;
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
    if (!isTauriRuntime) return false;
    try {
      const saved = await loadPanelLayout();
      if (!saved || !saved.panels_json) {
        // First run — seed built-in presets to SQLite
        await this.seedBuiltInPresets();
        return false;
      }

      const panels: PanelInstance[] = JSON.parse(saved.panels_json);
      // Refresh panel titles from registry — persisted titles may be stale after renames
      for (const panel of panels) {
        const typeInfo = ForgeWindowManager.getPanelTypeInfo(panel.type);
        if (typeInfo) panel.title = typeInfo.label;
      }
      const tabGroups: TabGroup[] = saved.tab_groups_json
        ? JSON.parse(saved.tab_groups_json)
        : [];

      if (panels.length === 0) {
        await this.seedBuiltInPresets();
        return false;
      }

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

  /** Seed all built-in workspace presets to SQLite on first run. */
  private async seedBuiltInPresets(): Promise<void> {
    if (!isTauriRuntime) return;
    const builtIn = ForgeWindowManager.getBuiltInPresets();
    for (const preset of builtIn) {
      try {
        await saveWorkspacePreset({
          id: preset.id,
          name: preset.name,
          description: preset.description,
          is_built_in: true,
          panels_json: JSON.stringify(preset.panels),
        });
      } catch (err) {
        console.error(`[LayoutPersistence] seed preset '${preset.id}' failed:`, err);
      }
    }
  }

  /** Save a custom workspace preset to SQLite */
  async persistPreset(preset: WorkspacePreset): Promise<void> {
    if (!isTauriRuntime) return;
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
    if (!isTauriRuntime) return [];
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
