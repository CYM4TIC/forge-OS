/**
 * ConnectionLine — Animated bezier connection between two points.
 * Used for: pipeline connections, dependency arrows, agent communication lines.
 *
 * Renders a bezier curve with animated dash pattern and optional directional arrow.
 */

import { useRef, useEffect, useCallback } from 'react';
import { setupCanvasForHiDPI } from '@forge-os/layout-engine';

export interface ConnectionLineProps {
  /** Container width in px */
  width: number;
  /** Container height in px */
  height: number;
  /** Start point (relative to container) */
  from: { x: number; y: number };
  /** End point (relative to container) */
  to: { x: number; y: number };
  /** Line color. Default: '#2a2a3a' (border) */
  color?: string;
  /** Line width in px. Default: 1.5 */
  lineWidth?: number;
  /** Animate the dash pattern. Default: true */
  animated?: boolean;
  /** Dash pattern [dash, gap]. Default: [6, 4] */
  dashPattern?: [number, number];
  /** Animation speed (px/s). Default: 30 */
  speed?: number;
  /** Show directional arrow at end. Default: true */
  showArrow?: boolean;
  /** Arrow size in px. Default: 8 */
  arrowSize?: number;
  /** Curvature factor (0 = straight, 1 = full curve). Default: 0.3 */
  curvature?: number;
}

export function ConnectionLine({
  width,
  height,
  from,
  to,
  color = '#2a2a3a',
  lineWidth = 1.5,
  animated = true,
  dashPattern = [6, 4],
  speed = 30,
  showArrow = true,
  arrowSize = 8,
  curvature = 0.3,
}: ConnectionLineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback((dashOffset: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = setupCanvasForHiDPI(canvas, width, height, dpr);
    ctx.clearRect(0, 0, width * dpr, height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Compute control points for curvature
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    // Perpendicular offset for curve
    const perpX = -dy * curvature;
    const perpY = dx * curvature;

    const cp1 = { x: midX + perpX * 0.5, y: midY + perpY * 0.5 };
    const cp2 = { x: midX + perpX * 0.5, y: midY + perpY * 0.5 };

    // Draw bezier
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dashPattern);
    ctx.lineDashOffset = -dashOffset;
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow at end
    if (showArrow) {
      // Tangent at end point (derivative of bezier at t=1)
      const t = 0.98;
      const u = 1 - t;
      const tangentX = 3 * u * u * (cp1.x - from.x) + 6 * u * t * (cp2.x - cp1.x) + 3 * t * t * (to.x - cp2.x);
      const tangentY = 3 * u * u * (cp1.y - from.y) + 6 * u * t * (cp2.y - cp1.y) + 3 * t * t * (to.y - cp2.y);
      const angle = Math.atan2(tangentY, tangentX);

      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(
        to.x - arrowSize * Math.cos(angle - Math.PI / 6),
        to.y - arrowSize * Math.sin(angle - Math.PI / 6),
      );
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(
        to.x - arrowSize * Math.cos(angle + Math.PI / 6),
        to.y - arrowSize * Math.sin(angle + Math.PI / 6),
      );
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * 1.2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.restore();
  }, [width, height, from, to, color, lineWidth, dashPattern, showArrow, arrowSize, curvature]);

  useEffect(() => {
    if (!animated) {
      draw(0);
      return;
    }

    const startTime = performance.now();
    const totalDash = dashPattern[0] + dashPattern[1];

    function animate(now: number) {
      const elapsed = (now - startTime) / 1000; // seconds
      const offset = (elapsed * speed) % totalDash;
      draw(offset);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animated, speed, dashPattern, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
    />
  );
}
