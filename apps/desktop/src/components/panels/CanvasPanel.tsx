// ── Canvas HUD Panel — Living Canvas ──
// The primary build visualization panel. Renders pipeline topology, batch progress,
// token gauge, and context meter. All canvas-rendered via Pretext layout engine.
// Receives dimensions from PanelContainer and distributes to child components.

import { useRef, useEffect, useState } from 'react';
import { useBuildState } from '../../hooks/useBuildState';
import type { PipelineStage, BuildStateSnapshot } from '../../lib/tauri';

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
        <PipelinePreview
          stages={pipeline}
          snapshot={snapshot}
          width={dimensions.width}
          height={pipelineHeight}
        />
      </div>

      {/* Gauges Row — bottom section */}
      <div
        className="flex gap-2 p-2 overflow-hidden"
        style={{ height: gaugesHeight }}
      >
        <GaugeCard label="Batch" value={snapshot ? `${snapshot.batches_done}/${snapshot.phases_total * 4}` : '--'} />
        <GaugeCard label="Phase" value={snapshot?.phase ?? '--'} />
        <GaugeCard label="Session" value={snapshot?.current_session ?? '--'} />
        <GaugeCard label="Commit" value={snapshot?.last_commit?.slice(0, 7) ?? '--'} />
      </div>
    </div>
  );
}

/** Temporary pipeline preview — will be replaced by PipelineCanvas in P5-D */
function PipelinePreview({
  stages,
  snapshot,
  width,
  height,
}: {
  stages: PipelineStage[];
  snapshot: BuildStateSnapshot | null;
  width: number;
  height: number;
}) {
  if (!stages.length || width === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted text-sm">No pipeline data</span>
      </div>
    );
  }

  const stageWidth = Math.floor((width - 32) / stages.length);

  return (
    <div className="flex items-center justify-center gap-2 h-full px-4">
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center gap-2">
          <div
            className={`
              flex flex-col items-center justify-center rounded-lg border px-3 py-2
              ${stage.status === 'active' ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.3)]' : ''}
              ${stage.status === 'complete' ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
              ${stage.status === 'idle' ? 'border-border-subtle bg-bg-tertiary/50' : ''}
              ${stage.status === 'error' ? 'border-red-500 bg-red-500/10' : ''}
              transition-all duration-300
            `}
            style={{ width: Math.min(stageWidth, 140), minHeight: 60 }}
          >
            <span className="text-xs font-semibold text-text-primary tracking-wide">
              {stage.label}
            </span>
            <span className="text-[10px] text-text-muted mt-0.5">
              {stage.status}
            </span>
          </div>
          {i < stages.length - 1 && (
            <span className="text-text-muted text-xs">→</span>
          )}
        </div>
      ))}
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
