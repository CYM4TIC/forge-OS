import TitleBar from './components/layout/TitleBar';
import PanelLayout from './components/layout/PanelLayout';

function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-bg-primary">
      <TitleBar />
      <div className="flex-1 min-h-0">
        <PanelLayout />
      </div>
    </div>
  );
}

export default App;
