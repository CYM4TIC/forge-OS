// ── PanelContainer ──
// Individual floating panel: drag handle, 8-edge resize, min/pop-out/close buttons.
// The content slot receives dynamic width/height — every child must be size-aware.

import { useCallback, useRef, type ReactNode, type MouseEvent } from 'react';
import type { PanelInstance, ResizeHandle, PanelPosition, PanelSize } from './types';

interface PanelContainerProps {
  panel: PanelInstance;
  onDragStart: (panelId: string, e: MouseEvent) => void;
  onFocus: (panelId: string) => void;
  onMinimize: (panelId: string) => void;
  onPopOut: (panelId: string) => void;
  onClose: (panelId: string) => void;
  onResizeStart: (panelId: string, handle: ResizeHandle, e: MouseEvent) => void;
  children: ReactNode;
}

const HANDLE_SIZE = 6;

const RESIZE_CURSORS: Record<ResizeHandle, string> = {
  n: 'cursor-n-resize',
  s: 'cursor-s-resize',
  e: 'cursor-e-resize',
  w: 'cursor-w-resize',
  ne: 'cursor-ne-resize',
  nw: 'cursor-nw-resize',
  se: 'cursor-se-resize',
  sw: 'cursor-sw-resize',
};

export function PanelContainer({
  panel,
  onDragStart,
  onFocus,
  onMinimize,
  onPopOut,
  onClose,
  onResizeStart,
  children,
}: PanelContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      onFocus(panel.id);
    },
    [panel.id, onFocus],
  );

  const handleTitleBarMouseDown = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      onDragStart(panel.id, e);
    },
    [panel.id, onDragStart],
  );

  const handleResizeMouseDown = useCallback(
    (handle: ResizeHandle) => (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onResizeStart(panel.id, handle, e);
    },
    [panel.id, onResizeStart],
  );

  if (!panel.visible) return null;

  // Content area dimensions (minus titlebar and borders)
  const titleBarHeight = 32;
  const contentWidth = panel.size.width - 2; // 1px border each side
  const contentHeight = panel.size.height - titleBarHeight - 2;

  return (
    <div
      ref={containerRef}
      className="absolute select-none"
      style={{
        left: panel.position.x,
        top: panel.position.y,
        width: panel.size.width,
        height: panel.size.height,
        zIndex: panel.zOrder,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Panel frame — glowing border on focus */}
      <div className="h-full w-full rounded-lg border border-border-subtle bg-bg-secondary overflow-hidden flex flex-col shadow-lg shadow-black/40">
        {/* Titlebar — drag region */}
        <div
          className="flex items-center justify-between px-2 h-8 min-h-[32px] bg-bg-elevated border-b border-border-subtle cursor-grab active:cursor-grabbing"
          onMouseDown={handleTitleBarMouseDown}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-text-muted truncate">{panel.title}</span>
            {panel.badgeCount > 0 && (
              <span className="flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-accent text-[10px] text-white font-medium">
                {panel.badgeCount > 99 ? '99+' : panel.badgeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={() => onMinimize(panel.id)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
              title="Minimize to dock"
            >
              <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor">
                <rect width="10" height="2" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => onPopOut(panel.id)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
              title="Pop out to window"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="3" width="6" height="6" rx="1" />
                <path d="M4 3V2a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H8" />
              </svg>
            </button>
            <button
              onClick={() => onClose(panel.id)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-danger/20 text-text-muted hover:text-danger transition-colors"
              title="Close"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l6 6M8 2l-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content area — passes dynamic dimensions to children */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div style={{ width: contentWidth, height: Math.max(contentHeight, 0) }}>
            {children}
          </div>
        </div>
      </div>

      {/* Resize handles — 8 edges/corners */}
      {/* North */}
      <div
        className={`absolute top-0 left-[${HANDLE_SIZE}px] right-[${HANDLE_SIZE}px] h-[${HANDLE_SIZE}px] ${RESIZE_CURSORS.n}`}
        style={{ top: 0, left: HANDLE_SIZE, right: HANDLE_SIZE, height: HANDLE_SIZE }}
        onMouseDown={handleResizeMouseDown('n')}
      />
      {/* South */}
      <div
        className={RESIZE_CURSORS.s}
        style={{ position: 'absolute', bottom: 0, left: HANDLE_SIZE, right: HANDLE_SIZE, height: HANDLE_SIZE }}
        onMouseDown={handleResizeMouseDown('s')}
      />
      {/* East */}
      <div
        className={RESIZE_CURSORS.e}
        style={{ position: 'absolute', top: HANDLE_SIZE, right: 0, bottom: HANDLE_SIZE, width: HANDLE_SIZE }}
        onMouseDown={handleResizeMouseDown('e')}
      />
      {/* West */}
      <div
        className={RESIZE_CURSORS.w}
        style={{ position: 'absolute', top: HANDLE_SIZE, left: 0, bottom: HANDLE_SIZE, width: HANDLE_SIZE }}
        onMouseDown={handleResizeMouseDown('w')}
      />
      {/* NE */}
      <div
        className={RESIZE_CURSORS.ne}
        style={{ position: 'absolute', top: 0, right: 0, width: HANDLE_SIZE * 2, height: HANDLE_SIZE * 2 }}
        onMouseDown={handleResizeMouseDown('ne')}
      />
      {/* NW */}
      <div
        className={RESIZE_CURSORS.nw}
        style={{ position: 'absolute', top: 0, left: 0, width: HANDLE_SIZE * 2, height: HANDLE_SIZE * 2 }}
        onMouseDown={handleResizeMouseDown('nw')}
      />
      {/* SE */}
      <div
        className={RESIZE_CURSORS.se}
        style={{ position: 'absolute', bottom: 0, right: 0, width: HANDLE_SIZE * 2, height: HANDLE_SIZE * 2 }}
        onMouseDown={handleResizeMouseDown('se')}
      />
      {/* SW */}
      <div
        className={RESIZE_CURSORS.sw}
        style={{ position: 'absolute', bottom: 0, left: 0, width: HANDLE_SIZE * 2, height: HANDLE_SIZE * 2 }}
        onMouseDown={handleResizeMouseDown('sw')}
      />
    </div>
  );
}
