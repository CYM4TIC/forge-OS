/**
 * StatCard — Canvas-rendered number display with label and trend indicator.
 * Pretext-measured text ensures zero layout shift when values change.
 *
 * Accepts width + height props — no assumptions about container size.
 * Used for: batch counts, token budgets, finding tallies, timing metrics.
 */

import { useRef, useEffect, useCallback } from 'react';
import { setupCanvasForHiDPI, renderText } from '@forge-os/layout-engine';

import { CANVAS, STATUS } from './canvas-tokens';

const COLORS = {
  bg: CANVAS.bg,
  text: CANVAS.text,
  label: CANVAS.muted,
  accent: STATUS.accent,
  trendUp: STATUS.success,
  trendDown: STATUS.danger,
  trendNeutral: CANVAS.muted,
};

export interface StatCardProps {
  /** Container width in px */
  width: number;
  /** Container height in px */
  height: number;
  /** Primary display value (e.g. "57", "$4.23", "89%") */
  value: string;
  /** Label below the value */
  label: string;
  /** Trend direction — shows colored arrow indicator */
  trend?: 'up' | 'down' | 'neutral';
  /** Trend delta text (e.g. "+3", "-12%") */
  trendText?: string;
  /** Override accent color for the value */
  valueColor?: string;
  /** Additional CSS class name */
  className?: string;
  /** Additional inline styles (merged with internal styles) */
  style?: React.CSSProperties;
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export function StatCard({
  width,
  height,
  value,
  label,
  trend,
  trendText,
  valueColor,
  className,
  style: styleProp,
  onClick,
}: StatCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = setupCanvasForHiDPI(canvas, width, height, dpr);

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, width * dpr, height * dpr, 8 * dpr);
    ctx.fill();

    // Layout zones: value takes top 55%, label takes next 25%, trend takes bottom 20%
    const valueZoneHeight = height * 0.55;
    const labelZoneTop = valueZoneHeight;
    const labelZoneHeight = height * 0.25;
    const trendZoneTop = labelZoneTop + labelZoneHeight;
    const trendZoneHeight = height * 0.2;

    // Value — large, centered, accent-colored (empty/undefined → dash placeholder)
    const displayValue = value || '—';
    const valueFontSize = Math.min(Math.floor(height * 0.3), 48);
    renderText(ctx, displayValue, {
      width, height: valueZoneHeight,
      font: `bold ${valueFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`,
      lineHeight: Math.ceil(valueFontSize * 1.2),
      color: valueColor ?? COLORS.accent,
      align: 'center',
      verticalAlign: 'middle',
      dpr,
    });

    // Label — smaller, muted, centered
    const labelFontSize = Math.min(Math.floor(height * 0.1), 13);
    ctx.save();
    ctx.translate(0, labelZoneTop * dpr);
    renderText(ctx, label.toUpperCase(), {
      width, height: labelZoneHeight,
      font: `600 ${labelFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`,
      lineHeight: Math.ceil(labelFontSize * 1.4),
      color: COLORS.label,
      align: 'center',
      verticalAlign: 'top',
      dpr,
    });
    ctx.restore();

    // Trend indicator
    if (trend && trendText) {
      const trendColor = trend === 'up' ? COLORS.trendUp : trend === 'down' ? COLORS.trendDown : COLORS.trendNeutral;
      const trendFontSize = Math.min(Math.floor(height * 0.09), 11);
      const arrow = trend === 'up' ? '▲ ' : trend === 'down' ? '▼ ' : '● ';

      ctx.save();
      ctx.translate(0, trendZoneTop * dpr);
      renderText(ctx, arrow + trendText, {
        width, height: trendZoneHeight,
        font: `600 ${trendFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`,
        lineHeight: Math.ceil(trendFontSize * 1.4),
        color: trendColor,
        align: 'center',
        verticalAlign: 'top',
        dpr,
      });
      ctx.restore();
    }
  }, [width, height, value, label, trend, trendText, valueColor]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height, borderRadius: 8, ...styleProp }}
      onClick={onClick}
      role="img"
      aria-label={`${label}: ${value}${trend ? ` (${trend}${trendText ? ' ' + trendText : ''})` : ''}`}
    />
  );
}
