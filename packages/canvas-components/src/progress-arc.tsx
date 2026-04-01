/**
 * ProgressArc — Canvas-rendered circular gauge with animated fill.
 * Used for: batch progress, phase completion, context window usage.
 *
 * Accepts width + height props. Arc fills clockwise from 12 o'clock.
 * Smooth animation via requestAnimationFrame interpolation.
 */

import { useRef, useEffect, useCallback } from 'react';
import { setupCanvasForHiDPI } from '@forge-os/layout-engine';

const COLORS = {
  bg: '#12121a',
  trackBg: '#1f1f2e',
  accent: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#e8e8ed',
  label: '#5a5a6e',
};

export interface ProgressArcProps {
  /** Container width in px (arc is square — uses min(width, height)) */
  width: number;
  /** Container height in px */
  height: number;
  /** Progress value 0-1 */
  value: number;
  /** Center label (e.g. "57/122", "89%") */
  centerText?: string;
  /** Sub-label below center text */
  subLabel?: string;
  /** Arc thickness as fraction of radius. Default: 0.12 */
  thickness?: number;
  /** Color mode: 'accent' uses accent color, 'zone' maps value to green/yellow/red */
  colorMode?: 'accent' | 'zone';
  /** Whether to animate value changes. Default: true */
  animated?: boolean;
  /** Override the default aria-label for accessibility */
  'aria-label'?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

// 4-zone model matching ContextMeterCanvas: green < 60%, yellow 60-80%, orange 80-85%, red 85%+
function getZoneColor(value: number): string {
  if (value < 0.6) return COLORS.success;
  if (value < 0.8) return COLORS.warning;
  if (value < 0.85) return '#f97316'; // orange — critical zone
  return COLORS.danger;
}

export function ProgressArc({
  width,
  height,
  value,
  centerText,
  subLabel,
  thickness = 0.12,
  colorMode = 'accent',
  animated = true,
  'aria-label': ariaLabelProp,
  className,
  style: styleProp,
  onClick,
}: ProgressArcProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedValue = useRef(0);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback((currentValue: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = setupCanvasForHiDPI(canvas, width, height, dpr);

    // Clear
    ctx.clearRect(0, 0, width * dpr, height * dpr);

    const size = Math.min(width, height);
    const cx = (width / 2) * dpr;
    const cy = (height / 2) * dpr;
    const radius = (size / 2 - 8) * dpr;
    const lineWidth = radius * thickness;

    const startAngle = -Math.PI / 2; // 12 o'clock
    const endAngle = startAngle + Math.PI * 2 * Math.max(0, Math.min(currentValue, 1));

    // Track background
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.trackBg;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Progress fill
    if (currentValue > 0) {
      const fillColor = colorMode === 'zone' ? getZoneColor(currentValue) : COLORS.accent;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = fillColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow effect
      ctx.shadowColor = fillColor;
      ctx.shadowBlur = 12 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, endAngle - 0.05, endAngle);
      ctx.strokeStyle = fillColor;
      ctx.lineWidth = lineWidth * 0.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Center text
    if (centerText) {
      const fontSize = Math.floor(size * 0.18) * dpr;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = subLabel ? 'bottom' : 'middle';
      const textY = subLabel ? cy - 2 * dpr : cy;
      ctx.fillText(centerText, cx, textY);
    }

    // Sub-label
    if (subLabel) {
      const subFontSize = Math.floor(size * 0.08) * dpr;
      ctx.font = `600 ${subFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = COLORS.label;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(subLabel.toUpperCase(), cx, cy + 4 * dpr);
    }
  }, [width, height, centerText, subLabel, thickness, colorMode]);

  useEffect(() => {
    if (!animated) {
      animatedValue.current = value;
      draw(value);
      return;
    }

    const target = value;
    const start = animatedValue.current;
    const duration = 400; // ms
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;

      animatedValue.current = current;
      draw(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [value, animated, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height, ...styleProp }}
      onClick={onClick}
      role="img"
      aria-label={ariaLabelProp ?? `Progress: ${Math.round(value * 100)}%${subLabel ? ` — ${subLabel}` : ''}`}
    />
  );
}
