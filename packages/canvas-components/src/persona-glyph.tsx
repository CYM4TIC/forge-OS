/**
 * PersonaGlyph — Canvas-rendered persona visual identity.
 * Each of the 10 personas chose their own glyph. This component renders any of them
 * at any size with full animation state support.
 *
 * See docs/PERSONA-GLYPHS.md for the design registry.
 */

import { useRef, useEffect, useCallback } from 'react';
import { setupCanvasForHiDPI } from '@forge-os/layout-engine';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PersonaSlug =
  | 'nyx' | 'pierce' | 'mara' | 'riven' | 'kehinde'
  | 'tanaka' | 'vane' | 'voss' | 'calloway' | 'sable';

export type GlyphState = 'idle' | 'thinking' | 'speaking' | 'finding' | 'complete' | 'error';

export interface PersonaGlyphProps {
  /** Container size in px (glyphs are square) */
  size: number;
  /** Which persona */
  persona: PersonaSlug;
  /** Animation state */
  state?: GlyphState;
  /** Override color (defaults to persona's signature color) */
  color?: string;
  /** Severity color for 'finding' state */
  severityColor?: string;
  /** Glow intensity multiplier. Default: 1 */
  glowIntensity?: number;
}

// ─── Persona Registry ────────────────────────────────────────────────────────

interface PersonaVisual {
  color: string;
  draw: (ctx: CanvasRenderingContext2D, size: number, color: string, phase: number, state: GlyphState) => void;
}

const PERSONA_VISUALS: Record<PersonaSlug, PersonaVisual> = {
  nyx: { color: '#6366F1', draw: drawLightningBolt },
  pierce: { color: '#EF4444', draw: drawCrosshair },
  mara: { color: '#EC4899', draw: drawEye },
  riven: { color: '#8B5CF6', draw: drawGrid },
  kehinde: { color: '#3B82F6', draw: drawBrackets },
  tanaka: { color: '#F59E0B', draw: drawHexShield },
  vane: { color: '#10B981', draw: drawLedgerMark },
  voss: { color: '#6B7280', draw: drawPilcrow },
  calloway: { color: '#F97316', draw: drawWave },
  sable: { color: '#14B8A6', draw: drawCursor },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function PersonaGlyph({
  size,
  persona,
  state = 'idle',
  color: colorOverride,
  severityColor,
  glowIntensity = 1,
}: PersonaGlyphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const visual = PERSONA_VISUALS[persona];
  const color = colorOverride ?? visual.color;

  const render = useCallback((phase: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = setupCanvasForHiDPI(canvas, size, size, dpr);
    ctx.clearRect(0, 0, size * dpr, size * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Error state: shake offset
    if (state === 'error') {
      const shake = Math.sin(phase * Math.PI * 8) * 2;
      ctx.translate(shake, 0);
    }

    // Finding state: use severity color
    const drawColor = state === 'finding' ? (severityColor ?? '#EF4444')
      : state === 'error' ? '#EF4444'
      : color;

    // Glow effect for active states
    if (state !== 'idle' || glowIntensity > 0.5) {
      const glowAlpha = state === 'idle' ? 0.15 : state === 'complete' ? 0.5 : 0.3;
      ctx.shadowColor = drawColor;
      ctx.shadowBlur = (state === 'complete' ? 16 : 10) * glowIntensity;
    }

    visual.draw(ctx, size, drawColor, phase, state);

    ctx.restore();
  }, [size, color, state, severityColor, glowIntensity, visual]);

  useEffect(() => {
    // Complete state: single flare then settle
    if (state === 'complete') {
      const startTime = performance.now();
      const duration = 600;
      function animate(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        render(1 - progress); // Flare decays
        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      }
      animFrameRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animFrameRef.current);
    }

    // Error state: rapid shake
    if (state === 'error') {
      const startTime = performance.now();
      function animate(now: number) {
        const elapsed = (now - startTime) / 150;
        render(elapsed);
        animFrameRef.current = requestAnimationFrame(animate);
      }
      animFrameRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animFrameRef.current);
    }

    // All other states: continuous animation
    const cycleDuration =
      state === 'idle' ? 3500 :
      state === 'thinking' ? 2000 :
      state === 'speaking' ? 1200 :
      state === 'finding' ? 800 : 2000;

    function animate(now: number) {
      const phase = (now % cycleDuration) / cycleDuration;
      render(phase);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [state, render]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      title={persona}
    />
  );
}

// ─── Glyph Draw Functions ────────────────────────────────────────────────────
// Each persona's glyph, drawn to a square canvas of `size` px.
// `phase` is 0-1 animation cycle. `state` drives behavior.

function drawLightningBolt(ctx: CanvasRenderingContext2D, s: number, color: string, phase: number, state: GlyphState) {
  const cx = s / 2;
  const pad = s * 0.15;
  const top = pad;
  const bot = s - pad;
  const mid = s * 0.45;

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(s * 0.06, 1.5);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Bolt path: top-center → left-mid → right-mid → bottom-center
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.05, top);
  ctx.lineTo(cx - s * 0.15, mid);
  ctx.lineTo(cx + s * 0.1, mid - s * 0.02);
  ctx.lineTo(cx - s * 0.05, bot);
  ctx.stroke();

  // Idle: ember pulse along edges
  if (state === 'idle') {
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(phase * Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Building: illuminate segments progressively
  if (state === 'speaking' || state === 'thinking') {
    const segProgress = phase;
    const gradient = ctx.createLinearGradient(cx, top, cx, bot);
    gradient.addColorStop(0, color);
    gradient.addColorStop(Math.min(segProgress, 1), color);
    gradient.addColorStop(Math.min(segProgress + 0.01, 1), 'transparent');
    gradient.addColorStop(1, 'transparent');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(s * 0.08, 2);
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.05, top);
    ctx.lineTo(cx - s * 0.15, mid);
    ctx.lineTo(cx + s * 0.1, mid - s * 0.02);
    ctx.lineTo(cx - s * 0.05, bot);
    ctx.stroke();
  }
}

function drawCrosshair(ctx: CanvasRenderingContext2D, s: number, color: string, phase: number, state: GlyphState) {
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.35;
  const hashLen = s * 0.06;

  // Rotate when verifying
  const rotation = state === 'thinking' ? phase * Math.PI * 2 : 0;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(s * 0.04, 1);
  ctx.lineCap = 'round';

  // ALL PASS: contract to dot
  if (state === 'complete') {
    const dotR = r * (1 - phase) * 0.15 + s * 0.04;
    ctx.beginPath();
    ctx.arc(0, 0, dotR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    return;
  }

  // Four arms
  const arms = [
    [0, -r * 0.3, 0, -r],    // top
    [0, r * 0.3, 0, r],       // bottom
    [-r * 0.3, 0, -r, 0],     // left
    [r * 0.3, 0, r, 0],       // right
  ];

  // Finding pulse: expand arms
  const expand = state === 'finding' ? Math.sin(phase * Math.PI) * s * 0.08 : 0;

  for (const [x1, y1, x2, y2] of arms) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 + Math.sign(x2) * expand, y2 + Math.sign(y2) * expand);
    ctx.stroke();

    // Hash marks
    const hx = x2 * 0.7;
    const hy = y2 * 0.7;
    if (x2 === 0) {
      ctx.beginPath();
      ctx.moveTo(-hashLen, hy);
      ctx.lineTo(hashLen, hy);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(hx, -hashLen);
      ctx.lineTo(hx, hashLen);
      ctx.stroke();
    }
  }

  // Center dot
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.025, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}

function drawEye(ctx: CanvasRenderingContext2D, s: number, color: string, phase: number, state: GlyphState) {
  const cx = s / 2;
  const cy = s / 2;
  const eyeW = s * 0.38;
  const eyeH = s * 0.18;

  // Narrow on finding
  const squeeze = state === 'finding' ? 0.5 + 0.5 * Math.cos(phase * Math.PI * 2) : 1;
  // Wide on complete
  const openness = state === 'complete' ? 1.3 : squeeze;
  const actualH = eyeH * openness;

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(s * 0.04, 1.2);

  // Almond shape (two bezier curves)
  ctx.beginPath();
  ctx.moveTo(cx - eyeW, cy);
  ctx.bezierCurveTo(cx - eyeW * 0.5, cy - actualH, cx + eyeW * 0.5, cy - actualH, cx + eyeW, cy);
  ctx.bezierCurveTo(cx + eyeW * 0.5, cy + actualH, cx - eyeW * 0.5, cy + actualH, cx - eyeW, cy);
  ctx.stroke();

  // Pupil — offset and drifting
  const pupilR = s * 0.07;
  const driftX = Math.sin(phase * Math.PI * 2) * eyeW * 0.2;
  const driftY = Math.cos(phase * Math.PI * 2 * 0.7) * actualH * 0.15;

  ctx.beginPath();
  ctx.arc(cx + driftX, cy + driftY, pupilR, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Inner highlight
  ctx.beginPath();
  ctx.arc(cx + driftX - pupilR * 0.3, cy + driftY - pupilR * 0.3, pupilR * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
}

function drawGrid(ctx: CanvasRenderingContext2D, s: number, color: string, phase: number, state: GlyphState) {
  const pad = s * 0.2;
  const inner = s - pad * 2;
  const third = inner / 3;

  ctx.strokeStyle = color;
  ctx.lineCap = 'round';

  // Breathing: line width oscillates
  const breathe = state === 'idle' ? 0.8 + 0.4 * Math.sin(phase * Math.PI * 2) : 1;

  for (let i = 1; i <= 2; i++) {
    const lineW = Math.max(s * 0.035 * breathe, 1);

    // Token violation: one line flashes brighter
    const isViolation = state === 'finding' && i === 1;
    ctx.lineWidth = isViolation ? lineW * 2 : lineW;
    ctx.globalAlpha = isViolation ? 1 : (state === 'idle' ? 0.6 + 0.3 * Math.sin(phase * Math.PI * 2 + i) : 0.9);

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(pad, pad + third * i);
    ctx.lineTo(s - pad, pad + third * i);
    ctx.stroke();

    // Vertical
    ctx.beginPath();
    ctx.moveTo(pad + third * i, pad);
    ctx.lineTo(pad + third * i, s - pad);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  // Coherent: all cells pulse sync
  if (state === 'complete') {
    ctx.globalAlpha = 0.15 + 0.15 * Math.sin(phase * Math.PI * 2);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = color;
        ctx.fillRect(pad + third * c + 2, pad + third * r + 2, third - 4, third - 4);
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawBrackets(ctx: CanvasRenderingContext2D, s: number, color: string, phase: number, state: GlyphState) {
  const cx = s / 2;
  const cy = s / 2;
  const outerH = s * 0.35;
  const innerH = s * 0.22;
  const outerW = s * 0.12;
  const innerW = s * 0.08;
  const gap = s * 0.06;

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(s * 0.045, 1.2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Tracing: outer pulses, inner dims
  const outerAlpha = state === 'thinking' ? 0.5 + 0.5 * Math.sin(phase * Math.PI * 2) : 1;
  const innerAlpha = state === 'thinking' ? 1 - outerAlpha * 0.5 : 1;

  // Failure: inner flashes red
  const innerColor = state === 'finding' ? '#EF4444' : color;

  // Outer left [
  ctx.globalAlpha = outerAlpha;
  ctx.beginPath();
  ctx.moveTo(cx - gap - innerW - outerW, cy - outerH);
  ctx.lineTo(cx - gap - innerW - outerW - outerW, cy - outerH);
  ctx.lineTo(cx - gap - innerW - outerW - outerW, cy + outerH);
  ctx.lineTo(cx - gap - innerW - outerW, cy + outerH);
  ctx.stroke();

  // Inner left [
  ctx.globalAlpha = innerAlpha;
  ctx.strokeStyle = innerColor;
  ctx.beginPath();
  ctx.moveTo(cx - gap, cy - innerH);
  ctx.lineTo(cx - gap - innerW, cy - innerH);
  ctx.lineTo(cx - gap - innerW, cy + innerH);
  ctx.lineTo(cx - gap, cy + innerH);
  ctx.stroke();

  // Inner right ]
  ctx.beginPath();
  ctx.moveTo(cx + gap, cy - innerH);
  ctx.lineTo(cx + gap + innerW, cy - innerH);
  ctx.lineTo(cx + gap + innerW, cy + innerH);
  ctx.lineTo(cx + gap, cy + innerH);
  ctx.stroke();

  // Outer right ]
  ctx.globalAlpha = outerAlpha;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx + gap + innerW + outerW, cy - outerH);
  ctx.lineTo(cx + gap + innerW + outerW + outerW, cy - outerH);
  ctx.lineTo(cx + gap + innerW + outerW + outerW, cy + outerH);
  ctx.lineTo(cx + gap + innerW + outerW, cy + outerH);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

function drawHexShield(ctx: CanvasRenderingContext2D, s: number, color: string, phase: number, state: GlyphState) {
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.35;

  // 6 vertices
  const vertices: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    vertices.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }

  ctx.lineWidth = Math.max(s * 0.045, 1.2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw each edge with individual alpha (for scanning sweep)
  for (let i = 0; i < 6; i++) {
    const [x1, y1] = vertices[i];
    const [x2, y2] = vertices[(i + 1) % 6];

    let edgeAlpha = 1;
    let edgeColor = color;

    if (state === 'thinking') {
      // Perimeter sweep: one edge bright at a time
      const activeEdge = Math.floor(phase * 6) % 6;
      edgeAlpha = i === activeEdge ? 1 : 0.3;
    } else if (state === 'finding') {
      // Breach: one edge red
      edgeColor = i === 0 ? '#EF4444' : color;
      edgeAlpha = i === 0 ? 1 : 0.5;
    } else if (state === 'idle') {
      // Steady glow — no pulse. A closed door doesn't breathe.
      edgeAlpha = 0.8;
    }

    ctx.globalAlpha = edgeAlpha;
    ctx.strokeStyle = edgeColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawLedgerMark(ctx: CanvasRenderingContext2D, s: number, color: string, phase: number, state: GlyphState) {
  const cx = s / 2;
  const cy = s / 2;
  const lineW = s * 0.3;
  const lineGap = s * 0.08;

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(s * 0.045, 1.2);
  ctx.lineCap = 'round';

  // Discrepancy: lines separate
  const separation = state === 'finding' ? lineGap + s * 0.06 * Math.sin(phase * Math.PI * 2) : lineGap;

  // Balanced/complete: compress to single stroke
  const compress = state === 'complete' ? phase : 0;
  const actualSep = separation * (1 - compress);

  // Two horizontal lines
  ctx.beginPath();
  ctx.moveTo(cx - lineW, cy - actualSep);
  ctx.lineTo(cx + lineW, cy - actualSep);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - lineW, cy + actualSep);
  ctx.lineTo(cx + lineW, cy + actualSep);
  ctx.stroke();

  // Vertical crossing line
  const vTop = cy - s * 0.25;
  const vBot = cy + s * 0.25;

  // Auditing: tick animation
  const tickOffset = state === 'thinking' ? Math.sin(phase * Math.PI * 2) * s * 0.05 : 0;

  ctx.beginPath();
  ctx.moveTo(cx, vTop + tickOffset);
  ctx.lineTo(cx, vBot + tickOffset);
  ctx.stroke();
}

function drawPilcrow(ctx: CanvasRenderingContext2D, s: number, color: string, phase: number, state: GlyphState) {
  const cx = s / 2;
  const cy = s / 2;
  const scale = s / 64; // Normalize to 64px design

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2.5 * scale, 1);
  ctx.lineCap = 'round';

  // Risk flagged: gray → white
  const alpha = state === 'finding' ? 1 : state === 'idle' ? 0.6 : 0.85;
  const drawColor = state === 'finding' ? '#E8E8ED' : color;
  ctx.strokeStyle = drawColor;
  ctx.fillStyle = drawColor;
  ctx.globalAlpha = alpha;

  // Reviewing: slow rotation
  if (state === 'thinking') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(phase * Math.PI * 0.5 - Math.PI * 0.25);
    ctx.translate(-cx, -cy);
  }

  // Pilcrow ¶ — semicircle head + two vertical strokes
  const headR = 10 * scale;
  const headCx = cx - 2 * scale;
  const headCy = cy - 6 * scale;

  // Semicircle (left half)
  ctx.beginPath();
  ctx.arc(headCx, headCy, headR, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();

  // Right vertical stroke
  ctx.beginPath();
  ctx.moveTo(headCx + 4 * scale, headCy - headR);
  ctx.lineTo(headCx + 4 * scale, cy + 16 * scale);
  ctx.stroke();

  // Left vertical stroke (from bottom of semicircle)
  ctx.beginPath();
  ctx.moveTo(headCx, headCy + headR);
  ctx.lineTo(headCx, cy + 16 * scale);
  ctx.stroke();

  if (state === 'thinking') ctx.restore();
  ctx.globalAlpha = 1;
}

function drawWave(ctx: CanvasRenderingContext2D, s: number, color: string, phase: number, state: GlyphState) {
  const pad = s * 0.12;
  const waveW = s - pad * 2;
  const cy = s * 0.55;
  const amplitude = s * 0.25;

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(s * 0.05, 1.5);
  ctx.lineCap = 'round';

  // Animate: wave builds and breaks
  const buildPhase = state === 'thinking' || state === 'speaking' ? phase : 0.5;

  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = pad + t * waveW;

    // Asymmetric wave: rises steep, curls at peak
    const waveShape = Math.sin(t * Math.PI * 1.2 - 0.3) * amplitude;
    // The curl: sharper falloff after peak
    const curl = t > 0.6 ? (t - 0.6) * amplitude * 1.5 * buildPhase : 0;
    const y = cy - waveShape * (0.5 + buildPhase * 0.5) + curl;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Crest glow on opportunity
  if (state === 'finding' || state === 'speaking') {
    const peakX = pad + waveW * 0.5;
    const peakY = cy - amplitude * (0.5 + buildPhase * 0.5);
    ctx.beginPath();
    ctx.arc(peakX, peakY, s * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function drawCursor(ctx: CanvasRenderingContext2D, s: number, color: string, phase: number, state: GlyphState) {
  const cx = s / 2;
  const pad = s * 0.18;
  const cursorH = s - pad * 2;
  const cursorW = Math.max(s * 0.06, 2);

  // Classic blink
  const blinkOn = state === 'idle'
    ? Math.sin(phase * Math.PI * 2) > 0  // Blink rhythm
    : state === 'complete'
    ? true  // Steady when voice is right
    : true; // Always on when active

  if (!blinkOn) return;

  // Voice violation: widen to highlight
  const width = state === 'finding'
    ? cursorW + s * 0.2 * Math.sin(phase * Math.PI * 2)
    : cursorW;

  ctx.fillStyle = color;
  ctx.globalAlpha = state === 'idle' ? 0.8 : 1;

  // The cursor line
  ctx.beginPath();
  ctx.roundRect(cx - width / 2, pad, width, cursorH, width / 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}
