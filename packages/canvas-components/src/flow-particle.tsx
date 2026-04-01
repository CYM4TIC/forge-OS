/**
 * FlowParticle — Animated dot traveling along a bezier path.
 * Used for: pipeline flow visualization, data transfer indicators, energy streams.
 *
 * Renders a glowing dot that moves along a cubic bezier curve with configurable
 * speed, color, and trail length. Multiple particles can share the same path.
 */

import { useRef, useEffect, useCallback } from 'react';
import { setupCanvasForHiDPI } from '@forge-os/layout-engine';

export interface BezierPath {
  /** Start point */
  start: { x: number; y: number };
  /** First control point */
  cp1: { x: number; y: number };
  /** Second control point */
  cp2: { x: number; y: number };
  /** End point */
  end: { x: number; y: number };
}

export interface FlowParticleProps {
  /** Container width in px */
  width: number;
  /** Container height in px */
  height: number;
  /** Bezier path for the particle to follow */
  path: BezierPath;
  /** Particle color. Default: '#6366f1' (accent) */
  color?: string;
  /** Particle radius in px. Default: 3 */
  radius?: number;
  /** Trail length as fraction of path (0-1). Default: 0.15 */
  trailLength?: number;
  /** Animation duration in ms for one full traversal. Default: 2000 */
  duration?: number;
  /** Whether to loop the animation. Default: true */
  loop?: boolean;
  /** Whether to draw the path line. Default: true */
  showPath?: boolean;
  /** Path line color. Default: '#1f1f2e' */
  pathColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

function bezierPoint(t: number, p: BezierPath): { x: number; y: number } {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p.start.x + 3 * uu * t * p.cp1.x + 3 * u * tt * p.cp2.x + ttt * p.end.x,
    y: uuu * p.start.y + 3 * uu * t * p.cp1.y + 3 * u * tt * p.cp2.y + ttt * p.end.y,
  };
}

export function FlowParticle({
  width,
  height,
  path,
  color = '#6366f1',
  radius = 3,
  trailLength = 0.15,
  duration = 2000,
  loop = true,
  showPath = true,
  pathColor = '#1f1f2e',
  className,
  style: styleProp,
}: FlowParticleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = setupCanvasForHiDPI(canvas, width, height, dpr);
    ctx.clearRect(0, 0, width * dpr, height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Draw path line
    if (showPath) {
      ctx.beginPath();
      ctx.moveTo(path.start.x, path.start.y);
      ctx.bezierCurveTo(path.cp1.x, path.cp1.y, path.cp2.x, path.cp2.y, path.end.x, path.end.y);
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw trail
    const trailSteps = 12;
    for (let i = trailSteps; i >= 0; i--) {
      const t = progress - (trailLength * i) / trailSteps;
      if (t < 0) continue;
      const pt = bezierPoint(t, path);
      const alpha = 1 - i / trailSteps;
      const r = radius * (0.4 + 0.6 * alpha);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Draw particle head
    const head = bezierPoint(progress, path);
    ctx.globalAlpha = 1;

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(head.x, head.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Bright center
    ctx.beginPath();
    ctx.arc(head.x, head.y, radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.fill();

    ctx.restore();
  }, [width, height, path, color, radius, trailLength, showPath, pathColor]);

  useEffect(() => {
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      let progress = (elapsed % duration) / duration;

      if (!loop && elapsed > duration) {
        cancelAnimationFrame(animFrameRef.current);
        draw(1);
        return;
      }

      draw(progress);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [duration, loop, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height, ...styleProp }}
      role="img"
      aria-label="Flow particle animation"
    />
  );
}
