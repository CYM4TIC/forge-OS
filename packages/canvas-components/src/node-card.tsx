/**
 * NodeCard — Canvas-rendered rounded rect with text, icon, and status indicator.
 * Used for: pipeline nodes, agent cards, batch labels, entity nodes in graph view.
 *
 * Dynamic font sizing via Pretext fitToContainer — text auto-sizes to fill the card.
 */

import { useRef, useEffect, useCallback } from 'react';
import { setupCanvasForHiDPI, fitToContainer } from '@forge-os/layout-engine';
import { CANVAS, STATUS, FONT } from './canvas-tokens';

const COLORS = {
  ...CANVAS,
  accent: STATUS.accent,
  success: STATUS.success,
  warning: STATUS.warning,
  danger: STATUS.danger,
};

export type NodeStatus = 'idle' | 'active' | 'complete' | 'error' | 'warning';

export interface NodeCardProps {
  /** Container width in px */
  width: number;
  /** Container height in px */
  height: number;
  /** Primary label text */
  label: string;
  /** Optional sub-label */
  subLabel?: string;
  /** Icon character (emoji or single char) */
  icon?: string;
  /** Node status — affects border color and status dot */
  status?: NodeStatus;
  /** Whether this node is currently selected/focused */
  selected?: boolean;
  /** Background color override */
  bgColor?: string;
  /** Border radius in px. Default: 8 */
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

function statusToColor(status: NodeStatus): string {
  switch (status) {
    case 'active': return COLORS.accent;
    case 'complete': return COLORS.success;
    case 'error': return COLORS.danger;
    case 'warning': return COLORS.warning;
    case 'idle': return COLORS.border;
  }
}

export function NodeCard({
  width,
  height,
  label,
  subLabel,
  icon,
  status = 'idle',
  selected = false,
  bgColor,
  borderRadius = 8,
  className,
  style: styleProp,
  onClick,
}: NodeCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = setupCanvasForHiDPI(canvas, width, height, dpr);
    ctx.clearRect(0, 0, width * dpr, height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);

    const r = borderRadius;
    const borderColor = selected ? COLORS.accent : statusToColor(status);

    // Background
    ctx.beginPath();
    ctx.roundRect(1, 1, width - 2, height - 2, r);
    ctx.fillStyle = bgColor ?? COLORS.bgElevated;
    ctx.fill();

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();

    // Selected glow
    if (selected) {
      ctx.shadowColor = COLORS.accent;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Layout: icon left, text center-right, status dot top-right
    const pad = 8;
    const iconSize = icon ? Math.min(height * 0.4, 24) : 0;
    const iconX = pad;
    const textX = icon ? iconX + iconSize + 6 : pad;
    const textWidth = width - textX - pad - (status !== 'idle' ? 14 : 0);

    // Icon
    if (icon) {
      const iconFontSize = Math.floor(iconSize * 0.85);
      ctx.font = `${iconFontSize}px ${FONT.system}`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(icon, iconX, height / 2);
    }

    // Label — auto-sized to fit
    if (textWidth > 20) {
      const fit = fitToContainer(label, textWidth, {
        fontFamily: FONT.system,
        minFont: 8,
        maxFont: Math.min(height * 0.35, 18),
        maxLines: subLabel ? 1 : 2,
      });

      const labelY = subLabel ? height * 0.32 : height / 2;
      ctx.font = fit.font;
      ctx.fillStyle = COLORS.text;
      ctx.textBaseline = 'middle';
      ctx.fillText(label, textX, labelY, textWidth);

      // Sub-label
      if (subLabel) {
        const subFontSize = Math.min(fit.fontSize * 0.7, 11);
        ctx.font = `500 ${subFontSize}px ${FONT.system}`;
        ctx.fillStyle = COLORS.muted;
        ctx.fillText(subLabel, textX, height * 0.65, textWidth);
      }
    }

    // Status dot — top right
    if (status !== 'idle') {
      const dotRadius = 4;
      const dotX = width - pad - dotRadius;
      const dotY = pad + dotRadius;
      const dotColor = statusToColor(status);

      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();

      // Pulse ring for active
      if (status === 'active') {
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotRadius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = dotColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  }, [width, height, label, subLabel, icon, status, selected, bgColor, borderRadius]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height, borderRadius, ...styleProp }}
      onClick={onClick}
      role="img"
      aria-label={`${label}${subLabel ? ` — ${subLabel}` : ''} (${status})`}
    />
  );
}
