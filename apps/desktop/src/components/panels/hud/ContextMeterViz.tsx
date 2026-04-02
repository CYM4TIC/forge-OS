/**
 * ContextMeterViz — Text density visualization for context window fill.
 *
 * The idea: context usage is visualized as progressively denser typography.
 *   - Early context (0-40%): spacious text — wide lineHeight, light weight, generous maxWidth
 *   - Mid context (40-70%): medium density — tighter lineHeight, normal weight
 *   - High context (70-85%): compressed — tight lineHeight, bolder weight, narrow maxWidth
 *   - Critical (85%+): packed — minimal lineHeight, heavy weight, full-bleed
 *   - Compaction: text dissolves (opacity→0) and re-emerges at lower density
 *
 * Uses Pretext measure() for exact layout at each density level.
 * Canvas-rendered via renderStyledSpans for per-span weight/color transitions.
 * Animated transitions when context usage changes.
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  renderStyledSpans,
  setupCanvasForHiDPI,
} from '@forge-os/layout-engine';
import type { StyledSpan, CanvasRenderOptions } from '@forge-os/layout-engine';
import { CANVAS, getZoneColor, getZoneLabel } from '@forge-os/canvas-components';

// ─── Sample Text ────────────────────────────────────────────────────────────

/** Text samples that visualize "information density" — fragments of build context */
const DENSITY_SAMPLES = [
  'Phase 5 in progress. Build state topology rendered.',
  'Pipeline: Scout → Build → Triad → Sentinel.',
  'Canvas HUD panel active. All gauges nominal.',
  'Context window tracks token usage across sessions.',
  'Pretext measures text without touching the DOM.',
  'Batches verified. Findings resolved. Gates passed.',
  'Personas dispatched. Agents return structured findings.',
  'Architecture decisions logged. Build learnings propagated.',
];

const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, sans-serif';

// ─── Density Mapping ────────────────────────────────────────────────────────

interface DensityParams {
  lineHeightRatio: number;  // multiplier on font size
  fontWeight: string;
  fontSize: number;         // base font size in px
  maxWidthRatio: number;    // fraction of container width used for text
  opacity: number;          // text opacity
  letterSpacing: number;    // px of extra letter spacing (negative = tighter)
}

/** Map a 0-1 fill value to density parameters */
function getDensityParams(value: number): DensityParams {
  // Smooth interpolation across the fill range
  if (value < 0.4) {
    // Spacious — breathing room
    return {
      lineHeightRatio: 2.0 - value * 1.0,  // 2.0 → 1.6
      fontWeight: '300',
      fontSize: 11,
      maxWidthRatio: 0.7 + value * 0.2,     // 70% → 78%
      opacity: 0.5 + value * 0.4,           // 0.5 → 0.66
      letterSpacing: 0.5 - value * 0.5,     // 0.5 → 0.3
    };
  }
  if (value < 0.7) {
    // Medium — readable but filling
    const t = (value - 0.4) / 0.3; // 0→1 within this band
    return {
      lineHeightRatio: 1.6 - t * 0.3,      // 1.6 → 1.3
      fontWeight: '400',
      fontSize: 11 + t * 1,                 // 11 → 12
      maxWidthRatio: 0.78 + t * 0.12,       // 78% → 90%
      opacity: 0.66 + t * 0.14,             // 0.66 → 0.80
      letterSpacing: 0.3 - t * 0.5,         // 0.3 → -0.2
    };
  }
  if (value < 0.85) {
    // Compressed — tight
    const t = (value - 0.7) / 0.15; // 0→1 within this band
    return {
      lineHeightRatio: 1.3 - t * 0.2,      // 1.3 → 1.1
      fontWeight: '600',
      fontSize: 12 + t * 1,                 // 12 → 13
      maxWidthRatio: 0.90 + t * 0.08,       // 90% → 98%
      opacity: 0.80 + t * 0.15,             // 0.80 → 0.95
      letterSpacing: -0.2 - t * 0.3,        // -0.2 → -0.5
    };
  }
  // Critical — packed
  const t = Math.min((value - 0.85) / 0.15, 1); // 0→1 within this band
  return {
    lineHeightRatio: 1.1 - t * 0.05,       // 1.1 → 1.05
    fontWeight: '700',
    fontSize: 13 + t * 1,                   // 13 → 14
    maxWidthRatio: 0.98 + t * 0.02,         // 98% → 100%
    opacity: 0.95 + t * 0.05,              // 0.95 → 1.0
    letterSpacing: -0.5 - t * 0.3,          // -0.5 → -0.8
  };
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ContextMeterVizProps {
  /** Container width in px */
  width: number;
  /** Container height in px */
  height: number;
  /** Fill value 0-1 */
  value: number;
  /** Whether compaction is currently running */
  isCompacting?: boolean;
  /** Tokens used (for label) */
  tokensUsed?: number;
  /** Total tokens (for label) */
  tokensTotal?: number;
  className?: string;
  style?: React.CSSProperties;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ContextMeterViz({
  width,
  height,
  value,
  isCompacting = false,
  tokensUsed,
  tokensTotal,
  className,
  style: styleProp,
}: ContextMeterVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const animatedValue = useRef(0);
  const compactPhaseRef = useRef(0); // 0-1 for dissolve/re-emerge

  // Select which sample lines to show based on available height
  const sampleText = useMemo(() => {
    // Use enough lines to fill the container (with some margin)
    const approxLinesNeeded = Math.max(2, Math.ceil(height / 16));
    const lines: string[] = [];
    for (let i = 0; lines.length < approxLinesNeeded; i++) {
      lines.push(DENSITY_SAMPLES[i % DENSITY_SAMPLES.length]);
    }
    return lines.join(' ');
  }, [height]);

  const draw = useCallback((currentValue: number, compactAlpha: number) => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = setupCanvasForHiDPI(canvas, width, height, dpr);
    ctx.clearRect(0, 0, width * dpr, height * dpr);

    const density = getDensityParams(currentValue);
    const zoneColor = getZoneColor(currentValue);

    // Header: zone label + percentage
    const headerH = 18;
    const textAreaY = headerH;
    const textAreaH = height - headerH - (tokensUsed != null ? 16 : 0);

    ctx.save();
    ctx.scale(dpr, dpr);

    // ─── Zone label (top left) ──────────────────────────
    const labelSize = Math.min(9, Math.floor(height * 0.08));
    ctx.font = `700 ${labelSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = zoneColor;
    ctx.textBaseline = 'top';
    ctx.fillText(getZoneLabel(currentValue), 4, 3);

    // Percentage (top right)
    const pctText = `${Math.round(currentValue * 100)}%`;
    const pctW = ctx.measureText(pctText).width;
    ctx.fillText(pctText, width - 4 - pctW, 3);

    // ─── Thin progress bar below header ─────────────────
    const barY = headerH - 4;
    const barH = 2;
    ctx.fillStyle = CANVAS.trackBg;
    ctx.fillRect(4, barY, width - 8, barH);
    ctx.fillStyle = zoneColor;
    ctx.fillRect(4, barY, (width - 8) * Math.min(currentValue, 1), barH);

    ctx.restore();

    // ─── Text density body ──────────────────────────────
    if (textAreaH <= 0) return;

    // Compute effective opacity (dissolve during compaction)
    const textOpacity = isCompacting
      ? density.opacity * (1 - compactAlpha * 0.7)
      : density.opacity;

    const textWidth = Math.floor(width * density.maxWidthRatio);
    const leftPad = Math.floor((width - textWidth) / 2);
    const lineHeight = Math.ceil(density.fontSize * density.lineHeightRatio);

    // Build styled spans — alternate color intensity to create visual rhythm
    const words = sampleText.split(' ');
    const spans: StyledSpan[] = words.map((word, i) => ({
      text: i > 0 ? ` ${word}` : word,
      fontWeight: density.fontWeight,
      color: i % 3 === 0
        ? zoneColor
        : `rgba(232, 232, 237, ${textOpacity.toFixed(2)})`,
    }));

    const font = `${density.fontWeight} ${density.fontSize}px ${FONT_FAMILY}`;
    const renderOpts: CanvasRenderOptions = {
      width: textWidth,
      height: textAreaH,
      font,
      lineHeight,
      color: `rgba(232, 232, 237, ${textOpacity.toFixed(2)})`,
      align: 'left',
      verticalAlign: 'top',
      padding: [4, 0, 4, 0],
      dpr,
    };

    // Offset canvas context for text area positioning
    const offscreen = document.createElement('canvas');
    offscreen.width = textWidth * dpr;
    offscreen.height = textAreaH * dpr;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    renderStyledSpans(offCtx, spans, renderOpts);

    // Composite onto main canvas
    const mainCtx = canvas.getContext('2d');
    if (!mainCtx) return;
    mainCtx.drawImage(offscreen, leftPad * dpr, textAreaY * dpr);

    // ─── Compaction shimmer overlay ─────────────────────
    if (isCompacting && compactAlpha > 0) {
      mainCtx.save();
      mainCtx.scale(dpr, dpr);
      // Horizontal scan line effect
      const scanY = textAreaY + (textAreaH * ((Date.now() % 2000) / 2000));
      mainCtx.globalAlpha = compactAlpha * 0.3;
      mainCtx.fillStyle = zoneColor;
      mainCtx.fillRect(leftPad, scanY, textWidth, 2);
      mainCtx.restore();
    }

    // ─── Token count footer ─────────────────────────────
    if (tokensUsed != null && tokensTotal != null) {
      mainCtx.save();
      mainCtx.scale(dpr, dpr);
      const footerSize = Math.min(8, Math.floor(height * 0.06));
      mainCtx.font = `500 ${footerSize}px ${FONT_FAMILY}`;
      mainCtx.fillStyle = CANVAS.muted;
      mainCtx.textBaseline = 'bottom';
      mainCtx.fillText(
        `${formatTokens(tokensUsed)} / ${formatTokens(tokensTotal)}`,
        4,
        height - 2,
      );
      mainCtx.restore();
    }
  }, [width, height, sampleText, isCompacting, tokensUsed, tokensTotal]);

  // Animation loop
  useEffect(() => {
    const target = value;
    const start = animatedValue.current;
    const startTime = performance.now();
    const duration = 400; // slightly longer for density transitions

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      animatedValue.current = current;

      // Compaction dissolve phase
      if (isCompacting) {
        compactPhaseRef.current = Math.min(compactPhaseRef.current + 0.02, 1);
      } else {
        compactPhaseRef.current = Math.max(compactPhaseRef.current - 0.04, 0);
      }

      draw(current, compactPhaseRef.current);

      if (progress < 1 || isCompacting || compactPhaseRef.current > 0) {
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
      aria-label={`Context density: ${Math.round(value * 100)}% — ${getZoneLabel(value).toLowerCase()}${isCompacting ? ' (compacting)' : ''}`}
    />
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}
