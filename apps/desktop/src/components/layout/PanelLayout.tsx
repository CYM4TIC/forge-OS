import {
  Panel,
  Group,
  Separator,
} from 'react-resizable-panels';
import ChatPanel from '../panels/ChatPanel';
import CanvasPanel from '../panels/CanvasPanel';
import PreviewPanel from '../panels/PreviewPanel';
import ConnectivityPanel from '../panels/ConnectivityPanel';
import TeamPanel from '../panels/TeamPanel';

function ResizeHandle({ direction = 'horizontal' }: { direction?: 'horizontal' | 'vertical' }) {
  const isVertical = direction === 'vertical';
  return (
    <Separator
      className={`group flex items-center justify-center ${
        isVertical ? 'h-1.5 cursor-row-resize' : 'w-1.5 cursor-col-resize'
      }`}
    >
      <div
        className={`rounded-full bg-border transition-colors group-hover:bg-accent group-active:bg-accent ${
          isVertical ? 'h-0.5 w-8' : 'w-0.5 h-8'
        }`}
      />
    </Separator>
  );
}

export default function PanelLayout() {
  return (
    <div className="h-screen w-screen bg-bg-primary p-1.5">
      <Group direction="vertical" autoSaveId="forge-main-vertical">
        {/* Top row: Chat | Canvas | Preview */}
        <Panel defaultSize={60} minSize={30}>
          <Group direction="horizontal" autoSaveId="forge-top-row">
            <Panel defaultSize={30} minSize={15}>
              <ChatPanel />
            </Panel>
            <ResizeHandle />
            <Panel defaultSize={40} minSize={20}>
              <CanvasPanel />
            </Panel>
            <ResizeHandle />
            <Panel defaultSize={30} minSize={15}>
              <PreviewPanel />
            </Panel>
          </Group>
        </Panel>

        <ResizeHandle direction="vertical" />

        {/* Bottom row: Team | Connectivity | Timeline placeholder */}
        <Panel defaultSize={40} minSize={15}>
          <Group direction="horizontal" autoSaveId="forge-bottom-row">
            <Panel defaultSize={30} minSize={15}>
              <TeamPanel />
            </Panel>
            <ResizeHandle />
            <Panel defaultSize={40} minSize={15}>
              <ConnectivityPanel />
            </Panel>
            <ResizeHandle />
            <Panel defaultSize={30} minSize={15}>
              <div className="flex items-center justify-center h-full bg-bg-secondary rounded-lg border border-border-subtle">
                <span className="text-text-muted text-sm font-medium tracking-wide uppercase">
                  Timeline
                </span>
              </div>
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}
