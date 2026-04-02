/**
 * ContextMeterPanel — Standalone panel wrapping the text density visualization.
 * Registers as the `context_meter` panel type in the window manager.
 * Self-sizing via ResizeObserver. Feeds from useContextUsage hook.
 */

import { useRef, useEffect, useState } from 'react';
import { useContextUsage } from '../../hooks/useContextUsage';
import { ContextMeterViz } from './hud/ContextMeterViz';

export default function ContextMeterPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { status, isCompacting } = useContextUsage(null, '');

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

  const value = status?.usage_fraction ?? 0;

  return (
    <div
      ref={containerRef}
      className="h-full bg-bg-secondary rounded-lg border border-border-subtle overflow-hidden"
    >
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
  );
}
