// ── PanelLayout — Window Manager ──
// Every panel is independently sizable, movable, minimizable, and pop-outable.
// Preset switching in TitleBar (P4-I.1).

import { useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { PanelContainer } from '../../window-manager/panel';
import { DockBar } from '../../window-manager/dock';
import { DOCK_BAR_HEIGHT } from '../../window-manager/snapping';
import type { PanelType, PanelInstance, ResizeHandle } from '../../window-manager/types';
import ChatPanel from '../panels/ChatPanel';
import CanvasPanel from '../panels/CanvasPanel';
import PreviewPanel from '../panels/PreviewPanel';
import ConnectivityPanel from '../panels/ConnectivityPanel';
import TeamPanel from '../panels/TeamPanel';
import FindingsPanel from '../panels/FindingsPanel';
import AgentBoardPanel from '../panels/AgentBoardPanel';
import SessionTimelinePanel from '../panels/SessionTimelinePanel';
import VaultBrowserPanel from '../panels/VaultBrowserPanel';
import GraphViewerPanel from '../panels/GraphViewerPanel';
import ContextMeterPanel from '../panels/ContextMeterPanel';

interface PanelLayoutProps {
  panels: PanelInstance[];
  isReady: boolean;
  addPanel: (type: PanelType) => void;
  removePanel: (id: string) => void;
  minimizePanel: (id: string) => void;
  restorePanel: (id: string) => void;
  popOutPanel: (id: string) => void;
  focusPanel: (id: string) => void;
  handleDragStart: (panelId: string, e: MouseEvent) => void;
  handleResizeStart: (panelId: string, handle: ResizeHandle, e: MouseEvent) => void;
  applyPreset: (presetId: string) => void;
  setFrameSize: (width: number, height: number) => void;
}

/** Map panel type to its content component */
function PanelContent({ panel, onStageClick }: { panel: PanelInstance; onStageClick?: (stageId: string) => void }): ReactNode {
  switch (panel.type) {
    case 'chat':
      return <ChatPanel />;
    case 'canvas_hud':
      return <CanvasPanel onStageClick={onStageClick} />;
    case 'preview':
      return <PreviewPanel />;
    case 'connectivity':
      return <ConnectivityPanel />;
    case 'team':
      return <TeamPanel />;
    case 'findings':
      return <FindingsPanel />;
    case 'agent_board':
      return <AgentBoardPanel />;
    case 'session_timeline':
      return <SessionTimelinePanel />;
    case 'vault_browser':
      return <VaultBrowserPanel />;
    case 'graph_viewer':
      return <GraphViewerPanel />;
    case 'context_meter':
      return <ContextMeterPanel />;
    default:
      return null;
  }
}

export default function PanelLayout({
  panels,
  isReady,
  addPanel,
  removePanel,
  minimizePanel,
  restorePanel,
  popOutPanel,
  focusPanel,
  handleDragStart,
  handleResizeStart,
  setFrameSize,
}: PanelLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Pipeline stage click → open relevant panels
  // build stage → Canvas HUD (already visible in canvas, but ensure it's focused)
  // triad stage → Agent Board + Findings
  // scout/sentinel → Canvas HUD (info is in the HUD)
  const handleStageClick = useCallback((stageId: string) => {
    const stageMap: Record<string, PanelType[]> = {
      build: ['canvas_hud'],
      triad: ['agent_board', 'findings'],
      scout: ['canvas_hud'],
      sentinel: ['canvas_hud'],
    };
    const panelTypes = stageMap[stageId];
    if (!panelTypes) return;

    for (const type of panelTypes) {
      // addPanel handles single-instance enforcement — restores if minimized, focuses if visible
      addPanel(type);
    }
  }, [addPanel]);

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
            <ErrorBoundary panelType={panel.type}>
              <PanelContent panel={panel} onStageClick={handleStageClick} />
            </ErrorBoundary>
          </PanelContainer>
        ))}
      </div>

      {/* Dock bar — bottom of frame */}
      <div className="absolute bottom-0 left-0 right-0">
        <DockBar
          panels={panels}
          onRestore={restorePanel}
          onOpen={addPanel}
          onFocus={focusPanel}
        />
      </div>
    </div>
  );
}
