// ── DockBar ──
// Horizontal bar at bottom of app frame. One pill per registered panel type.
// Active = lit with neon glow, minimized = dim with restore click, closed = dim.
// Scales to 20+ panel types. Rave aesthetic: pulsing jewels, not corporate tabs.

import { useCallback } from 'react';
import type { PanelInstance, PanelType, WorkspacePreset } from './types';
import { ForgeWindowManager } from './manager';
import { DOCK_BAR_HEIGHT } from './snapping';

interface DockBarProps {
  panels: PanelInstance[];
  presets: WorkspacePreset[];
  activePresetId: string | null;
  onRestore: (panelId: string) => void;
  onOpen: (type: PanelType) => void;
  onFocus: (panelId: string) => void;
  onApplyPreset: (presetId: string) => void;
}

type DockPillState = 'active' | 'minimized' | 'closed';

interface DockPillData {
  type: PanelType;
  label: string;
  icon: string;
  state: DockPillState;
  panelId: string | null;
  badgeCount: number;
  isActive: boolean;
}

function buildDockPills(panels: PanelInstance[]): DockPillData[] {
  const allTypes = ForgeWindowManager.getAllPanelTypes();
  const pills: DockPillData[] = [];

  for (const typeInfo of allTypes) {
    const instances = panels.filter((p) => p.type === typeInfo.type);
    if (instances.length === 0) {
      // No instance — show as closed
      pills.push({
        type: typeInfo.type,
        label: typeInfo.label,
        icon: typeInfo.icon,
        state: 'closed',
        panelId: null,
        badgeCount: 0,
        isActive: false,
      });
    } else {
      for (const inst of instances) {
        pills.push({
          type: inst.type,
          label: inst.title,
          icon: typeInfo.icon,
          state: inst.state === 'minimized' ? 'minimized' : 'active',
          panelId: inst.id,
          badgeCount: inst.badgeCount,
          isActive: inst.isActive,
        });
      }
    }
  }

  return pills;
}

function DockPill({
  pill,
  onClick,
}: {
  pill: DockPillData;
  onClick: () => void;
}) {
  const stateClasses: Record<DockPillState, string> = {
    active: 'bg-accent/20 border-accent/40 text-accent shadow-[0_0_8px_rgba(99,102,241,0.3)]',
    minimized: 'bg-bg-elevated/60 border-border-subtle text-text-muted hover:bg-bg-elevated hover:border-accent/30 hover:text-text-secondary',
    closed: 'bg-bg-primary/40 border-border-subtle/50 text-text-muted/50 hover:bg-bg-elevated/40 hover:text-text-muted',
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-1.5 px-2.5 py-1 rounded-full border
        text-xs font-medium transition-all duration-200
        ${stateClasses[pill.state]}
        ${pill.isActive ? 'animate-pulse' : ''}
      `}
      title={`${pill.label} (${pill.state})`}
    >
      <span className="text-sm">{pill.icon}</span>
      <span className="truncate max-w-[60px]">{pill.label}</span>
      {pill.badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center h-3.5 min-w-[14px] px-0.5 rounded-full bg-danger text-[9px] text-white font-bold">
          {pill.badgeCount > 99 ? '99+' : pill.badgeCount}
        </span>
      )}
    </button>
  );
}

export function DockBar({
  panels,
  presets,
  activePresetId,
  onRestore,
  onOpen,
  onFocus,
  onApplyPreset,
}: DockBarProps) {
  const pills = buildDockPills(panels);

  const handlePillClick = useCallback(
    (pill: DockPillData) => {
      if (pill.state === 'minimized' && pill.panelId) {
        onRestore(pill.panelId);
      } else if (pill.state === 'closed') {
        onOpen(pill.type);
      } else if (pill.panelId) {
        onFocus(pill.panelId);
      }
    },
    [onRestore, onOpen, onFocus],
  );

  return (
    <div
      className="flex items-center justify-between px-3 border-t border-border-subtle bg-bg-primary/80 backdrop-blur-sm"
      style={{ height: DOCK_BAR_HEIGHT }}
    >
      {/* Panel pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {pills.map((pill, i) => (
          <DockPill
            key={pill.panelId ?? `${pill.type}-${i}`}
            pill={pill}
            onClick={() => handlePillClick(pill)}
          />
        ))}
      </div>

      {/* Workspace preset switcher */}
      <div className="flex items-center gap-1 ml-3 shrink-0">
        {presets.slice(0, 5).map((preset) => (
          <button
            key={preset.id}
            onClick={() => onApplyPreset(preset.id)}
            className={`
              px-2 py-0.5 rounded text-[10px] font-medium border transition-all duration-200
              ${activePresetId === preset.id
                ? 'bg-accent/20 border-accent/40 text-accent'
                : 'bg-bg-elevated/40 border-border-subtle/50 text-text-muted hover:bg-bg-elevated hover:text-text-secondary'
              }
            `}
            title={preset.description}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export { DOCK_BAR_HEIGHT };
