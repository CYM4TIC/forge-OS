// ── Canvas HUD Panel — Living Canvas ──
// The primary build visualization panel. Renders pipeline topology, batch progress,
// token gauge, and context meter. All canvas-rendered via Pretext layout engine.
// Receives dimensions from PanelContainer and distributes to child components.

import { useRef, useEffect, useState, useMemo } from 'react';
import { useBuildState } from '../../hooks/useBuildState';
import { useContextUsage } from '../../hooks/useContextUsage';
import { PipelineCanvas } from './hud/PipelineCanvas';
import { FlowOverlay } from './hud/FlowOverlay';
import { BatchProgressGauge } from './hud/BatchProgressGauge';
import { TokenGaugeDisplay } from './hud/TokenGaugeDisplay';
import { TokenGauge, CANVAS, STATUS, RADIUS } from '@forge-os/canvas-components';
import { ContextMeterViz } from './hud/ContextMeterViz';
import { computePipelineLayout } from './hud/pipeline-layout';

// ─── Shared styles (RIVEN-HIGH-1: canvas-tokens, no Tailwind) ──────────────

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const PANEL_SHELL: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: CANVAS.bg,
  borderRadius: RADIUS.card,
  border: `1px solid ${CANVAS.border}`,
  overflow: 'hidden',
};

const CENTER_STATE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  background: CANVAS.bg,
  borderRadius: RADIUS.card,
  border: `1px solid ${CANVAS.border}`,
};

interface CanvasPanelProps {
  bootPath?: string;
  /** Called when user clicks an active pipeline stage. Payload is stage ID (scout/build/triad/sentinel). */
  onStageClick?: (stageId: string) => void;
}

export default function CanvasPanel({ bootPath, onStageClick }: CanvasPanelProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { snapshot, pipeline, loading, error } = useBuildState(bootPath ?? null);
  // Context usage requires a session ID and conversation content — pass empty defaults
  // until chat integration provides real values
  const { status: contextStatus, isCompacting } = useContextUsage(null, '');
  const [flowVisible, setFlowVisible] = useState(true);

  // Layout computations — must be before early returns (React hooks rule)
  const isNarrow = dimensions.width > 0 && dimensions.width < 400;
  const pipelineHeight = isNarrow
    ? Math.floor(dimensions.height * 0.5)
    : Math.floor(dimensions.height * 0.6);

  // Memoize pipeline node rects for FlowOverlay — same layout PipelineCanvas computes internally
  const pipelineNodes = useMemo(
    () => computePipelineLayout(dimensions.width, pipelineHeight, pipeline.length).nodes,
    [dimensions.width, pipelineHeight, pipeline.length],
  );

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
      <div style={CENTER_STATE}>
        <span style={{ color: CANVAS.muted, fontSize: 13 }}>Loading build state...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={CENTER_STATE}>
        <div style={{ textAlign: 'center', padding: '0 16px' }}>
          <span style={{ color: STATUS.danger, fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>HUD Error</span>
          <span style={{ color: CANVAS.muted, fontSize: 11 }}>{error}</span>
        </div>
      </div>
    );
  }

  // Empty state — no pipeline stages and no snapshot (no BOOT.md loaded)
  if (!pipeline.length && !snapshot && dimensions.width > 0) {
    return (
      <div style={CENTER_STATE}>
        <div style={{ textAlign: 'center', padding: '0 16px' }}>
          <span style={{ color: CANVAS.muted, fontSize: 13, display: 'block', marginBottom: 4 }}>No build state</span>
          <span style={{ color: CANVAS.muted, fontSize: 11, opacity: 0.7 }}>Load a BOOT.md to activate the pipeline</span>
        </div>
      </div>
    );
  }

  const gaugesHeight = dimensions.height - pipelineHeight;

  const GAUGE_CELL: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Build pipeline and gauges"
      tabIndex={0}
      style={PANEL_SHELL}
    >
      {/* Visually-hidden summary for screen readers (MARA-CRIT-1/2/5) */}
      <div style={SR_ONLY} aria-live="polite">
        Build pipeline: {pipeline.map(s => `${s.id}: ${s.status}`).join(', ')}.
        {snapshot && `Phase ${snapshot.phase}, batch ${snapshot.current_batch}, ${snapshot.batches_done} batches complete.`}
      </div>
      {/* Pipeline Canvas + Flow Overlay — top section */}
      <div
        style={{ position: 'relative', borderBottom: `1px solid ${CANVAS.border}`, height: pipelineHeight }}
      >
        <PipelineCanvas
          stages={pipeline}
          width={dimensions.width}
          height={pipelineHeight}
          onStageClick={onStageClick}
        />
        {/* Flow Overlay: z-order pipeline → flow overlay → gauges */}
        <FlowOverlay
          nodes={pipelineNodes}
          width={dimensions.width}
          height={pipelineHeight}
          visible={flowVisible}
          onToggle={() => setFlowVisible((v) => !v)}
        />
      </div>

      {/* Gauges Row — bottom section */}
      {dimensions.width > 0 && gaugesHeight > 16 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 8,
            overflow: 'hidden',
            height: gaugesHeight,
          }}
        >
          {/* Batch progress arc */}
          <div style={GAUGE_CELL}>
            <BatchProgressGauge
              snapshot={snapshot}
              width={Math.max(Math.min(gaugesHeight - 16, (dimensions.width - 32) / (isNarrow ? 2 : 4)), 32)}
              height={Math.max(gaugesHeight - 16, 32)}
            />
          </div>

          {/* Context window usage arc */}
          <div style={GAUGE_CELL}>
            <TokenGaugeDisplay
              status={contextStatus}
              isCompacting={isCompacting}
              width={Math.max(Math.min(gaugesHeight - 16, (dimensions.width - 32) / (isNarrow ? 2 : 4)), 32)}
              height={Math.max(gaugesHeight - 16, 32)}
            />
          </div>

          {/* Context density — text density visualization */}
          <div style={GAUGE_CELL}>
            <ContextMeterViz
              width={Math.max(Math.min(gaugesHeight - 16, (dimensions.width - 32) / (isNarrow ? 2 : 4)), 60)}
              height={Math.max(gaugesHeight - 16, 32)}
              value={contextStatus?.usage_fraction ?? 0}
              isCompacting={isCompacting}
              tokensUsed={contextStatus?.current_tokens}
              tokensTotal={contextStatus?.context_window_size}
            />
          </div>

          {/* Session + Commit counters — hidden on narrow panels */}
          {!isNarrow && (
            <div style={{ ...GAUGE_CELL, flexDirection: 'column', gap: 4 }}>
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
