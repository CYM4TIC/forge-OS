/**
 * StatusBadge — Canvas-rendered green/amber/red status indicator with pulse animation.
 * Used for: agent status, service health, finding severity, build state.
 *
 * Accepts width + height props. Renders a filled circle with optional glow pulse.
 */

import { useRef, useEffect, useCallback } from 'react';
import { setupCanvasForHiDPI } from '@forge-os/layout-engine';
import { HIGHLIGHT } from './canvas-tokens.js';

import { CANVAS, STATUS, FONT } from './canvas-tokens';

const COLORS = {
  success: STATUS.success,
  warning: STATUS.warning,
  danger: STATUS.danger,
  neutral: STATUS.neutral,
  accent: STATUS.accent,
  text: CANVAS.text,
  label: CANVAS.label,
};

export type BadgeStatus = 'success' | 'warning' | 'danger' | 'neutral' | 'active';

export interface StatusBadgeProps {
  /** Container width in px */
  width: number;
  /** Container height in px */
  height: number;
  /** Status determines color */
  status: BadgeStatus;
  /** Optional label rendered next to the dot */
  label?: string;
  /** Enable pulse animation for active/danger states. Default: true for active/danger */
  pulse?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

function statusColor(status: BadgeStatus): string {
  switch (status) {
    case 'success': return COLORS.success;
    case 'warning': return COLORS.warning;
    case 'danger': return COLORS.danger;
    case 'active': return COLORS.accent;
    case 'neutral': return COLORS.neutral;
  }
}

export function StatusBadge({
  width,
  height,
  status,
  label,
  pulse,
  className,
  style: styleProp,
  onClick,
}: StatusBadgeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const shouldPulse = pulse ?? (status === 'active' || status === 'danger');
  const color = statusColor(status);

  const draw = useCallback((pulsePhase: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = setupCanvasForHiDPI(canvas, width, height, dpr);

    ctx.clearRect(0, 0, width * dpr, height * dpr);

    const dotRadius = Math.min(width, height) * 0.2 * dpr;
    const dotX = label ? dotRadius + 4 * dpr : (width / 2) * dpr;
    const dotY = (height / 2) * dpr;

    // Pulse glow ring
    if (shouldPulse && pulsePhase > 0) {
      const glowRadius = dotRadius * (1 + pulsePhase * 0.8);
      const alpha = 0.4 * (1 - pulsePhase);
      ctx.beginPath();
      ctx.arc(dotX, dotY, glowRadius, 0, Math.PI * 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Core dot
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Inner highlight
    ctx.beginPath();
    ctx.arc(dotX - dotRadius * 0.25, dotY - dotRadius * 0.25, dotRadius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = HIGHLIGHT.medium;
    ctx.fill();

    // Label text
    if (label) {
      const fontSize = Math.min(Math.floor(height * 0.35), 13) * dpr;
      ctx.font = `600 ${fontSize}px ${FONT.system}`;
      ctx.fillStyle = COLORS.label;
      ctx.textBaseline = 'middle';
      ctx.fillText(label, dotX + dotRadius + 6 * dpr, dotY);
    }
  }, [width, height, color, label, shouldPulse]);

  useEffect(() => {
    if (!shouldPulse) {
      draw(0);
      return;
    }

    let startTime = performance.now();
    const cycleDuration = 2000; // ms per pulse cycle

    function animate(now: number) {
      const elapsed = (now - startTime) % cycleDuration;
      const phase = elapsed / cycleDuration; // 0 → 1 repeating
      draw(phase);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [shouldPulse, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height, ...styleProp }}
      onClick={onClick}
      role="img"
      aria-label={`Status: ${status}${label ? ` — ${label}` : ''}`}
    />
  );
}
