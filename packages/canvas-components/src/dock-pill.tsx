/**
 * DockPill — Canvas-rendered dock bar item.
 * Icon + label + badge count + activity pulse, all on canvas.
 *
 * This is the canvas-rendered alternative to the DOM DockPill in dock.tsx.
 * Use when embedding dock items inside canvas surfaces or when you need
 * pixel-perfect rendering without DOM layout overhead.
 */

import { useRef, useEffect, useCallback } from 'react';
import { setupCanvasForHiDPI } from '@forge-os/layout-engine';

import { DOCK, FONT } from './canvas-tokens';

const COLORS = DOCK;

export type DockPillVariant = 'active' | 'minimized' | 'closed';

export interface DockPillProps {
  /** Container width in px */
  width: number;
  /** Container height in px */
  height: number;
  /** Icon character (emoji or single char) */
  icon: string;
  /** Label text */
  label: string;
  /** Visual state */
  variant: DockPillVariant;
  /** Badge count (0 = hidden) */
  badgeCount?: number;
  /** Enable pulse animation for active state */
  pulse?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export function DockPill({
  width,
  height,
  icon,
  label,
  variant,
  badgeCount = 0,
  pulse = false,
  className,
  style: styleProp,
  onClick,
}: DockPillProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback((pulsePhase: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = setupCanvasForHiDPI(canvas, width, height, dpr);
    ctx.clearRect(0, 0, width * dpr, height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);

    const r = height / 2; // Full-round pill
    const isActive = variant === 'active';

    // Glow for active
    if (isActive && pulse) {
      const glowAlpha = 0.15 + 0.15 * Math.sin(pulsePhase * Math.PI * 2);
      ctx.shadowColor = COLORS.glow;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = glowAlpha + 0.85;
    }

    // Background
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, width - 1, height - 1, r);
    ctx.fillStyle = isActive ? COLORS.activeBg : COLORS.dimBg;
    ctx.fill();
    ctx.strokeStyle = isActive ? COLORS.activeBorder : COLORS.dimBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Icon
    const iconFontSize = Math.min(Math.floor(height * 0.5), 14);
    const pad = 8;
    ctx.font = `${iconFontSize}px ${FONT.system}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isActive ? COLORS.activeText : COLORS.dimText;
    ctx.fillText(icon, pad, height / 2);

    // Label
    const labelX = pad + iconFontSize + 4;
    const labelFontSize = Math.min(Math.floor(height * 0.38), 12);
    const maxLabelWidth = width - labelX - pad - (badgeCount > 0 ? 20 : 0);
    ctx.font = `500 ${labelFontSize}px ${FONT.system}`;
    ctx.fillStyle = isActive ? COLORS.activeText : COLORS.dimText;

    // Truncate label if needed
    let displayLabel = label;
    if (ctx.measureText(label).width > maxLabelWidth) {
      while (displayLabel.length > 1 && ctx.measureText(displayLabel + '...').width > maxLabelWidth) {
        displayLabel = displayLabel.slice(0, -1);
      }
      displayLabel += '...';
    }
    ctx.fillText(displayLabel, labelX, height / 2);

    // Badge
    if (badgeCount > 0) {
      const badgeText = badgeCount > 99 ? '99+' : badgeCount.toString();
      const badgeFontSize = 9;
      ctx.font = `bold ${badgeFontSize}px ${FONT.system}`;
      const badgeWidth = Math.max(ctx.measureText(badgeText).width + 6, 14);
      const badgeHeight = 14;
      const badgeX = width - pad - badgeWidth + badgeWidth / 2;
      const badgeY = height / 2;

      ctx.beginPath();
      ctx.roundRect(badgeX - badgeWidth / 2, badgeY - badgeHeight / 2, badgeWidth, badgeHeight, badgeHeight / 2);
      ctx.fillStyle = COLORS.badgeBg;
      ctx.fill();

      ctx.fillStyle = COLORS.badgeText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX, badgeY);
      ctx.textAlign = 'start'; // Reset
    }

    ctx.restore();
  }, [width, height, icon, label, variant, badgeCount, pulse]);

  useEffect(() => {
    if (!pulse || variant !== 'active') {
      draw(0);
      return;
    }

    const cycleDuration = 2000;
    function animate(now: number) {
      const phase = (now % cycleDuration) / cycleDuration;
      draw(phase);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [pulse, variant, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height, borderRadius: height / 2, ...styleProp }}
      onClick={onClick}
      role="img"
      aria-label={`${label} (${variant})${badgeCount > 0 ? ` — ${badgeCount} notifications` : ''}`}
    />
  );
}
