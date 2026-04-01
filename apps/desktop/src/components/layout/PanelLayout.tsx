// ── PanelLayout — Window Manager ──
// Replaced react-resizable-panels with floating window manager.
// Every panel is independently sizable, movable, minimizable, and pop-outable.

import { useEffect, useRef, type ReactNode } from 'react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { PanelContainer } from '../../window-manager/panel';
import { DockBar } from '../../window-manager/dock';
import { DOCK_BAR_HEIGHT } from '../../window-manager/snapping';
import type { PanelType, PanelInstance } from '../../window-manager/types';
import ChatPanel from '../panels/ChatPanel';
import CanvasPanel from '../panels/CanvasPanel';
import PreviewPanel from '../panels/PreviewPanel';
import ConnectivityPanel from '../panels/ConnectivityPanel';
import TeamPanel from '../panels/TeamPanel';

/** Map panel type to its content component */
function PanelContent({ panel }: { panel: PanelInstance }): ReactNode {
  switch (panel.type) {
    case 'chat':
      return <ChatPanel />;
    case 'canvas_hud':
      return <CanvasPanel />;
    case 'preview':
      return <PreviewPanel />;
    case 'connectivity':
      return <ConnectivityPanel />;
    case 'team':
      return <TeamPanel />;
    case 'findings':
    case 'agent_board':
    case 'vault_browser':
    case 'graph_viewer':
    case 'session_timeline':
    case 'context_meter':
    case 'document_gen':
      return (
        <div className="flex items-center justify-center h-full bg-bg-secondary">
          <span className="text-text-muted text-sm font-medium tracking-wide uppercase">
            {panel.title}
          </span>
        </div>
      );
    default:
      return null;
  }
}

export default function PanelLayout() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    panels,
    presets,
    activePresetId,
    isReady,
    addPanel,
    removePanel,
    minimizePanel,
    restorePanel,
    popOutPanel,
    focusPanel,
    handleDragStart,
    handleResizeStart,
    applyPreset,
    setFrameSize,
  } = useWindowManager();

  // Track container dimensions for snapping
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setFrameSize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [setFrameSize]);

  if (!isReady) {
    return (
      <div className="h-full w-full bg-bg-primary flex items-center justify-center">
        <div className="text-text-muted text-sm animate-pulse">Loading workspace...</div>
      </div>
    );
  }

  // Visible panels (not minimized, not popped out)
  const visiblePanels = panels
    .filter((p) => p.visible && p.state !== 'minimized' && p.state !== 'popped_out')
    .sort((a, b) => a.zOrder - b.zOrder);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-bg-primary overflow-hidden">
      {/* Panel canvas — absolute positioned panels */}
      <div
        className="absolute inset-0"
        style={{ bottom: DOCK_BAR_HEIGHT }}
      >
        {visiblePanels.map((panel) => (
          <PanelContainer
            key={panel.id}
            panel={panel}
            onDragStart={handleDragStart}
            onFocus={focusPanel}
            onMinimize={minimizePanel}
            onPopOut={popOutPanel}
            onClose={removePanel}
            onResizeStart={handleResizeStart}
          >
            <PanelContent panel={panel} />
          </PanelContainer>
        ))}
      </div>

      {/* Dock bar — bottom of frame */}
      <div className="absolute bottom-0 left-0 right-0">
        <DockBar
          panels={panels}
          presets={presets}
          activePresetId={activePresetId}
          onRestore={restorePanel}
          onOpen={addPanel}
          onFocus={focusPanel}
          onApplyPreset={applyPreset}
        />
      </div>
    </div>
  );
}
