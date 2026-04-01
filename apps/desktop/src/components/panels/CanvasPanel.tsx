// ── Canvas HUD Panel — Living Canvas ──
// The primary build visualization panel. Renders pipeline topology, batch progress,
// token gauge, and context meter. All canvas-rendered via Pretext layout engine.
// Receives dimensions from PanelContainer and distributes to child components.

import { useRef, useEffect, useState } from 'react';
import { useBuildState } from '../../hooks/useBuildState';
import type { BuildStateSnapshot } from '../../lib/tauri';
import { PipelineCanvas } from './hud/PipelineCanvas';

interface CanvasPanelProps {
  bootPath?: string;
}

export default function CanvasPanel({ bootPath }: CanvasPanelProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { snapshot, pipeline, loading, error } = useBuildState(bootPath ?? null);

  // Track container dimensions for responsive layout
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-secondary rounded-lg border border-border-subtle">
        <span className="text-text-muted text-sm animate-pulse">Loading build state...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-secondary rounded-lg border border-border-subtle">
        <div className="text-center px-4">
          <span className="text-red-400 text-sm font-medium block mb-1">HUD Error</span>
          <span className="text-text-muted text-xs">{error}</span>
        </div>
      </div>
    );
  }

  // Layout split: pipeline top 60%, gauges bottom 40%
  // Adjusts for narrow panels: stack vertically at < 400px width
  const isNarrow = dimensions.width > 0 && dimensions.width < 400;
  const pipelineHeight = isNarrow
    ? Math.floor(dimensions.height * 0.5)
    : Math.floor(dimensions.height * 0.6);
  const gaugesHeight = dimensions.height - pipelineHeight;

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-bg-secondary rounded-lg border border-border-subtle overflow-hidden"
    >
      {/* Pipeline Canvas — top section */}
      <div
        className="relative border-b border-border-subtle"
        style={{ height: pipelineHeight }}
      >
        <PipelineCanvas
          stages={pipeline}
          width={dimensions.width}
          height={pipelineHeight}
        />
      </div>

      {/* Gauges Row — bottom section */}
      <div
        className="flex gap-2 p-2 overflow-hidden"
        style={{ height: gaugesHeight }}
      >
        <GaugeCard label="Batch" value={snapshot ? `${snapshot.batches_done}` : '--'} />
        <GaugeCard label="Phase" value={snapshot?.phase ?? '--'} />
        <GaugeCard label="Session" value={snapshot?.current_session ?? '--'} />
        <GaugeCard label="Commit" value={snapshot?.last_commit?.slice(0, 7) ?? '--'} />
      </div>
    </div>
  );
}

/** Simple gauge card — will be replaced by canvas gauges in P5-E */
function GaugeCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center rounded-lg bg-bg-tertiary/50 border border-border-subtle p-2 min-w-0">
      <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
      <span className="text-sm font-mono text-text-primary truncate max-w-full">{value}</span>
    </div>
  );
}
