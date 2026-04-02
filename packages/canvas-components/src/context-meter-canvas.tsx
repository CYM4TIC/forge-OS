/**
 * ContextMeterCanvas — Canvas-rendered context window fill gauge.
 * Per-session context usage with animated fill and 4-zone color system.
 *
 * Different from the DOM ContextMeter in TitleBar — this is the canvas version
 * for embedding in the Canvas HUD panel or any canvas-rendered surface.
 *
 * Zones: Comfortable (0-60% green) → Warning (60-80% yellow) → Critical (80-85% orange) → Compacting (85%+ red)
 */

import { useRef, useEffect, useCallback } from 'react';
import { setupCanvasForHiDPI } from '@forge-os/layout-engine';

import { CANVAS, HIGHLIGHT, getZoneColor, getZoneLabel } from './canvas-tokens';

const COLORS = {
  bg: CANVAS.bg,
  trackBg: CANVAS.trackBg,
  text: CANVAS.text,
  label: CANVAS.muted,
};

export interface ContextMeterCanvasProps {
  /** Container width in px */
  width: number;
  /** Container height in px */
  height: number;
  /** Fill value 0-1 */
  value: number;
  /** Tokens used (for display) */
  tokensUsed?: number;
  /** Total tokens (for display) */
  tokensTotal?: number;
  /** Whether compaction is currently running */
  isCompacting?: boolean;
  /** Orientation: horizontal bar or vertical bar. Default: 'horizontal' */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
}

export function ContextMeterCanvas({
  width,
  height,
  value,
  tokensUsed,
  tokensTotal,
  isCompacting = false,
  orientation = 'horizontal',
  className,
  style: styleProp,
}: ContextMeterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const animatedValue = useRef(0);

  const draw = useCallback((currentValue: number, pulsePhase: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = setupCanvasForHiDPI(canvas, width, height, dpr);
    ctx.clearRect(0, 0, width * dpr, height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);

    const pad = 4;
    const fillColor = getZoneColor(currentValue);
    const isHorizontal = orientation === 'horizontal';

    // Track background
    const trackX = pad;
    const trackY = isHorizontal ? height * 0.35 : pad;
    const trackW = isHorizontal ? width - pad * 2 : width - pad * 2;
    const trackH = isHorizontal ? height * 0.25 : height - pad * 2 - (tokensUsed != null ? 24 : 0);
    const trackR = Math.min(trackH / 2, 4);

    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackW, trackH, trackR);
    ctx.fillStyle = COLORS.trackBg;
    ctx.fill();

    // Fill bar
    const clampedValue = Math.min(currentValue, 1);
    const fillW = isHorizontal ? trackW * clampedValue : trackW;
    const fillH = isHorizontal ? trackH : trackH * clampedValue;
    const fillY = isHorizontal ? trackY : trackY + trackH - fillH;

    if (clampedValue > 0) {
      ctx.beginPath();
      ctx.roundRect(trackX, fillY, fillW, fillH, trackR);
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Glow on tip
      if (isHorizontal && fillW > 4) {
        ctx.shadowColor = fillColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(trackX + fillW - 4, trackY, 4, trackH, [0, trackR, trackR, 0]);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Compacting pulse overlay
      if (isCompacting) {
        const pulseAlpha = 0.15 + 0.15 * Math.sin(pulsePhase * Math.PI * 2);
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = HIGHLIGHT.medium;
        ctx.beginPath();
        ctx.roundRect(trackX, fillY, fillW, fillH, trackR);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Zone label — above bar
    if (isHorizontal) {
      const zoneFontSize = Math.min(Math.floor(height * 0.16), 10);
      ctx.font = `700 ${zoneFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = fillColor;
      ctx.textBaseline = 'top';
      ctx.fillText(getZoneLabel(currentValue), pad, 2);
    }

    // Token count — below bar
    if (tokensUsed != null && tokensTotal != null && isHorizontal) {
      const countFontSize = Math.min(Math.floor(height * 0.16), 10);
      ctx.font = `500 ${countFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = COLORS.label;
      ctx.textBaseline = 'bottom';
      const countText = `${formatTokens(tokensUsed)} / ${formatTokens(tokensTotal)}`;
      ctx.fillText(countText, pad, height - 2);

      // Percentage — right aligned
      const pctText = `${Math.round(currentValue * 100)}%`;
      const pctWidth = ctx.measureText(pctText).width;
      ctx.fillStyle = fillColor;
      ctx.font = `700 ${countFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(pctText, width - pad - pctWidth, height - 2);
    }

    ctx.restore();
  }, [width, height, orientation, tokensUsed, tokensTotal, isCompacting]);

  useEffect(() => {
    const target = value;
    const start = animatedValue.current;
    const startTime = performance.now();
    const duration = 300;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      animatedValue.current = current;

      const pulsePhase = isCompacting ? ((now % 1500) / 1500) : 0;
      draw(current, pulsePhase);

      if (progress < 1 || isCompacting) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [value, isCompacting, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height, ...styleProp }}
      role="img"
      aria-label={`Context window: ${Math.round(value * 100)}%${isCompacting ? ' (compacting)' : ''}`}
    />
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}
