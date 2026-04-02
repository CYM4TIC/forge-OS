/**
 * ContextMeterPanel — Standalone panel wrapping the text density visualization.
 * Registers as the `context_meter` panel type in the window manager.
 * Self-sizing via ResizeObserver. Feeds from useContextUsage hook.
 */

import { useRef, useEffect, useState } from 'react';
import { useContextUsage } from '../../hooks/useContextUsage';
import { ContextMeterViz } from './hud/ContextMeterViz';
import CompactionIndicator from '../status/CompactionIndicator';
import SummaryViewer from '../status/SummaryViewer';
import { CANVAS } from '@forge-os/canvas-components';

export default function ContextMeterPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { status, isCompacting, lastSummary } = useContextUsage(null, '');

  useEffect(() => {
    const el = canvasContainerRef.current;
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

  const value = status?.usage_fraction ?? 0;

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: CANVAS.bg,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Canvas visualization takes remaining space */}
      <div ref={canvasContainerRef} style={{ flex: 1, minHeight: 0 }}>
        {dimensions.width > 0 && dimensions.height > 0 && (
          <ContextMeterViz
            width={dimensions.width}
            height={dimensions.height}
            value={value}
            isCompacting={isCompacting}
            tokensUsed={status?.current_tokens}
            tokensTotal={status?.context_window_size}
          />
        )}
      </div>

      {/* Status overlays */}
      <div style={{ padding: '0 8px 8px' }}>
        <CompactionIndicator
          isCompacting={isCompacting}
          conversationTokens={status?.current_tokens}
        />
        <SummaryViewer summary={lastSummary} />
      </div>
    </div>
  );
}
