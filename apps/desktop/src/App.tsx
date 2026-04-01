import TitleBar from './components/layout/TitleBar';
import PanelLayout from './components/layout/PanelLayout';
import { useWindowManager } from './hooks/useWindowManager';

function App() {
  const wm = useWindowManager();

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-primary">
      <TitleBar
        presets={wm.presets}
        activePresetId={wm.activePresetId}
        onApplyPreset={wm.applyPreset}
      />
      <div className="flex-1 min-h-0">
        <PanelLayout
          panels={wm.panels}
          isReady={wm.isReady}
          addPanel={wm.addPanel}
          removePanel={wm.removePanel}
          minimizePanel={wm.minimizePanel}
          restorePanel={wm.restorePanel}
          popOutPanel={wm.popOutPanel}
          focusPanel={wm.focusPanel}
          handleDragStart={wm.handleDragStart}
          handleResizeStart={wm.handleResizeStart}
          applyPreset={wm.applyPreset}
          setFrameSize={wm.setFrameSize}
        />
      </div>
    </div>
  );
}

export default App;
