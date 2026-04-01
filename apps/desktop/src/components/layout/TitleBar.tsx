import { useEffect, useRef } from 'react';
import type { Window as TauriWindow } from '@tauri-apps/api/window';
import type { ThresholdStatus } from '../../lib/tauri';
import type { WorkspacePreset } from '../../window-manager/types';
import ContextMeter from '../status/ContextMeter';

interface TitleBarProps {
  contextStatus?: ThresholdStatus | null;
  isCompacting?: boolean;
  presets?: WorkspacePreset[];
  activePresetId?: string | null;
  onApplyPreset?: (presetId: string) => void;
}

export default function TitleBar({
  contextStatus,
  isCompacting,
  presets,
  activePresetId,
  onApplyPreset,
}: TitleBarProps) {
  const appWindow = useRef<TauriWindow | null>(null);

  useEffect(() => {
    if ('__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        appWindow.current = getCurrentWindow();
      });
    }
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-8 bg-bg-primary border-b border-border-subtle select-none"
    >
      {/* App name + Context meter */}
      <div data-tauri-drag-region className="flex items-center gap-2 pl-3">
        <span className="text-text-secondary text-xs font-semibold tracking-widest uppercase">
          Forge
        </span>
        <ContextMeter status={contextStatus ?? null} isCompacting={isCompacting ?? false} />
      </div>

      {/* Workspace mode switcher + Window controls */}
      <div className="flex items-center h-full">
        {/* Mode switcher — segmented control */}
        {presets && presets.length > 0 && onApplyPreset && (
          <div className="flex items-center gap-px mr-2 rounded-full bg-bg-elevated/60 border border-border-subtle/50 p-0.5">
            {presets.slice(0, 5).map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset.id)}
                className={`
                  px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase
                  transition-all duration-200
                  ${activePresetId === preset.id
                    ? 'bg-accent/25 text-accent shadow-[0_0_6px_rgba(99,102,241,0.25)]'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated/80'
                  }
                `}
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}

        {/* Window controls */}
        <button
          onClick={() => appWindow.current?.minimize()}
          className="inline-flex items-center justify-center w-11 h-full text-text-muted hover:bg-bg-elevated hover:text-text-secondary transition-colors"
          aria-label="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>
        <button
          onClick={() => appWindow.current?.toggleMaximize()}
          className="inline-flex items-center justify-center w-11 h-full text-text-muted hover:bg-bg-elevated hover:text-text-secondary transition-colors"
          aria-label="Maximize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        </button>
        <button
          onClick={() => appWindow.current?.close()}
          className="inline-flex items-center justify-center w-11 h-full text-text-muted hover:bg-danger hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
