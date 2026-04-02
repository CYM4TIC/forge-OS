// ── Canvas HUD Panel — Living Canvas ──
// The primary build visualization panel. Renders pipeline topology, batch progress,
// token gauge, and context meter. All canvas-rendered via Pretext layout engine.
// Receives dimensions from PanelContainer and distributes to child components.

import { useRef, useEffect, useState } from 'react';
import { useBuildState } from '../../hooks/useBuildState';
import { useContextUsage } from '../../hooks/useContextUsage';
import { PipelineCanvas } from './hud/PipelineCanvas';
import { BatchProgressGauge } from './hud/BatchProgressGauge';
import { TokenGaugeDisplay } from './hud/TokenGaugeDisplay';
import { TokenGauge } from '@forge-os/canvas-components';
import { ContextMeterViz } from './hud/ContextMeterViz';

interface CanvasPanelProps {
  bootPath?: string;
}

export default function CanvasPanel({ bootPath }: CanvasPanelProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { snapshot, pipeline, loading, error } = useBuildState(bootPath ?? null);
  // Context usage requires a session ID and conversation content — pass empty defaults
  // until chat integration provides real values
  const { status: contextStatus, isCompacting } = useContextUsage(null, '');

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
      {dimensions.width > 0 && gaugesHeight > 16 && (
        <div
          className="flex items-center justify-center gap-2 p-2 overflow-hidden"
          style={{ height: gaugesHeight }}
        >
          {/* Batch progress arc */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <BatchProgressGauge
              snapshot={snapshot}
              width={Math.max(Math.min(gaugesHeight - 16, (dimensions.width - 32) / (isNarrow ? 2 : 4)), 32)}
              height={Math.max(gaugesHeight - 16, 32)}
            />
          </div>

          {/* Context window usage arc */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <TokenGaugeDisplay
              status={contextStatus}
              isCompacting={isCompacting}
              width={Math.max(Math.min(gaugesHeight - 16, (dimensions.width - 32) / (isNarrow ? 2 : 4)), 32)}
              height={Math.max(gaugesHeight - 16, 32)}
            />
          </div>

          {/* Context density — text density visualization */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <ContextMeterViz
              width={Math.max(Math.min(gaugesHeight - 16, (dimensions.width - 32) / (isNarrow ? 2 : 4)), 60)}
              height={Math.max(gaugesHeight - 16, 32)}
              value={contextStatus?.usage_percent != null ? contextStatus.usage_percent / 100 : 0}
              isCompacting={isCompacting}
              tokensUsed={contextStatus?.current_tokens}
              tokensTotal={contextStatus?.context_window_size}
            />
          </div>

          {/* Session + Commit counters — hidden on narrow panels */}
          {!isNarrow && (
            <div className="flex-1 flex flex-col items-center justify-center gap-1 min-w-0">
              <TokenGauge
                width={Math.max((dimensions.width - 32) / 4, 60)}
                height={Math.max(Math.floor((gaugesHeight - 24) / 2), 24)}
                value={snapshot?.current_session ?? '--'}
                maxValue="99"
                label="Session"
              />
              <TokenGauge
                width={Math.max((dimensions.width - 32) / 4, 60)}
                height={Math.max(Math.floor((gaugesHeight - 24) / 2), 24)}
                value={snapshot?.last_commit?.slice(0, 7) ?? '--'}
                maxValue="0000000"
                label="Commit"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
