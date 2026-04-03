/**
 * TokenGauge — Pre-measured number display that never shifts layout when values change.
 * Reserves space for the widest possible value via Pretext measurement.
 *
 * Used for: token costs ("$4.23"), batch counts ("57/122"), timing ("0.09ms").
 * The key trick: measure the WIDEST representation at init, then render all values
 * within that pre-allocated space. "$9.99" → "$10.00" = zero shift.
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { setupCanvasForHiDPI } from '@forge-os/layout-engine';

import { CANVAS, STATUS, FONT } from './canvas-tokens';

const COLORS = {
  text: CANVAS.text,
  label: CANVAS.muted,
  accent: STATUS.accent,
};

export interface TokenGaugeProps {
  /** Container width in px */
  width: number;
  /** Container height in px */
  height: number;
  /** Current display value (e.g. "$4.23", "57", "89%") */
  value: string;
  /** The widest possible value for space reservation (e.g. "$99.99", "999", "100%") */
  maxValue: string;
  /** Label below the value */
  label?: string;
  /** Value color. Default: accent */
  valueColor?: string;
  /** Font size in px. Default: auto-calculated from height */
  fontSize?: number;
  /** Text alignment. Default: 'center' */
  align?: 'left' | 'center' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export function TokenGauge({
  width,
  height,
  value,
  maxValue,
  label,
  valueColor = COLORS.accent,
  fontSize: fontSizeProp,
  align = 'center',
  className,
  style: styleProp,
}: TokenGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pre-measure widest value to reserve space
  const fontSize = fontSizeProp ?? Math.min(Math.floor(height * (label ? 0.4 : 0.5)), 36);
  const font = `bold ${fontSize}px ${FONT.system}`;

  const reservedWidth = useMemo(() => {
    // Reserve width for widest possible value to prevent layout shift.
    // Use character count estimate: fontSize * 0.6 per char (monospace-safe).
    return maxValue.length * fontSize * 0.6;
  }, [maxValue, fontSize]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = setupCanvasForHiDPI(canvas, width, height, dpr);
    ctx.clearRect(0, 0, width * dpr, height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);

    const labelFontSize = Math.min(Math.floor(fontSize * 0.55), 12);
    const valueZoneHeight = label ? height * 0.65 : height;

    // Value — rendered within reserved width
    ctx.font = font;
    ctx.fillStyle = valueColor;
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(value);
    const textWidth = textMetrics.width;

    // Position based on alignment, using reserved width as the layout box
    let x: number;
    const boxX = align === 'center' ? (width - reservedWidth) / 2
      : align === 'right' ? width - reservedWidth
      : 0;

    if (align === 'center') {
      x = boxX + (reservedWidth - textWidth) / 2;
    } else if (align === 'right') {
      x = boxX + reservedWidth - textWidth;
    } else {
      x = boxX;
    }

    ctx.fillText(value, x, valueZoneHeight / 2);

    // Label
    if (label) {
      ctx.font = `600 ${labelFontSize}px ${FONT.system}`;
      ctx.fillStyle = COLORS.label;
      ctx.textBaseline = 'top';

      if (align === 'center') {
        const labelWidth = ctx.measureText(label.toUpperCase()).width;
        ctx.fillText(label.toUpperCase(), (width - labelWidth) / 2, valueZoneHeight + 2);
      } else if (align === 'right') {
        const labelWidth = ctx.measureText(label.toUpperCase()).width;
        ctx.fillText(label.toUpperCase(), width - labelWidth, valueZoneHeight + 2);
      } else {
        ctx.fillText(label.toUpperCase(), 0, valueZoneHeight + 2);
      }
    }

    ctx.restore();
  }, [width, height, value, font, fontSize, valueColor, label, align, reservedWidth]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height, ...styleProp }}
      role="img"
      aria-label={`${label ? label + ': ' : ''}${value}`}
    />
  );
}
