/**
 * Canvas text renderer with styled spans.
 * Draws prepared text with line breaks, colors, alignment, and badges.
 *
 * Used for: StatCards, NodeCards, pipeline labels, context meters —
 * anywhere text is rendered to <canvas> instead of DOM.
 */

import {
  prepareWithSegments,
  layoutWithLines,
} from '@chenglou/pretext';
import type {
  StyledSpan,
  CanvasRenderOptions,
  CanvasRenderResult,
} from './types.js';

// ─── Plain Text Renderer ─────────────────────────────────────────────────────

/**
 * Render plain text to a canvas context.
 * Handles line breaking, alignment, vertical alignment, padding, overflow indicator.
 * DPR-aware for crisp rendering on HiDPI displays.
 */
export function renderText(
  ctx: CanvasRenderingContext2D,
  text: string,
  options: CanvasRenderOptions,
): CanvasRenderResult {
  const {
    width,
    height,
    font,
    lineHeight,
    color = '#ffffff',
    align = 'left',
    verticalAlign = 'top',
    padding = [0, 0, 0, 0],
    dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    overflow = '...',
  } = options;

  const [padTop, padRight, padBottom, padLeft] = padding;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  // Scale for HiDPI
  ctx.save();
  ctx.scale(dpr, dpr);

  // Layout text
  const prepared = prepareWithSegments(text, font);
  const layoutResult = layoutWithLines(prepared, innerWidth, lineHeight);
  const lines = layoutResult.lines;

  // Calculate visible lines
  const maxVisibleLines = Math.floor(innerHeight / lineHeight);
  const visibleLines = Math.min(lines.length, maxVisibleLines);
  const clipped = lines.length > maxVisibleLines;
  const renderedHeight = visibleLines * lineHeight;

  // Vertical offset
  let yOffset = padTop;
  if (verticalAlign === 'middle') {
    yOffset = padTop + (innerHeight - renderedHeight) / 2;
  } else if (verticalAlign === 'bottom') {
    yOffset = padTop + innerHeight - renderedHeight;
  }

  // Draw
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';

  for (let i = 0; i < visibleLines; i++) {
    const line = lines[i];
    let lineText = line.text;

    // Add overflow indicator on last visible line if clipped
    if (clipped && i === visibleLines - 1 && overflow !== false) {
      lineText = lineText.trimEnd() + overflow;
    }

    // Horizontal alignment
    let x = padLeft;
    if (align === 'center') {
      const textWidth = ctx.measureText(lineText).width;
      x = padLeft + (innerWidth - textWidth) / 2;
    } else if (align === 'right') {
      const textWidth = ctx.measureText(lineText).width;
      x = padLeft + innerWidth - textWidth;
    }

    const y = yOffset + i * lineHeight;
    ctx.fillText(lineText, x, y);
  }

  ctx.restore();

  return {
    clipped,
    visibleLines,
    totalLines: lines.length,
    renderedHeight,
  };
}

// ─── Styled Span Renderer ────────────────────────────────────────────────────

/**
 * Render styled spans to a canvas context.
 * Each span can have its own weight, color, fontSize, and background highlight.
 *
 * Spans are concatenated into a single text block for layout,
 * then rendered with per-span styling applied inline.
 */
export function renderStyledSpans(
  ctx: CanvasRenderingContext2D,
  spans: StyledSpan[],
  options: CanvasRenderOptions,
): CanvasRenderResult {
  const {
    width,
    height,
    font,
    lineHeight,
    color = '#ffffff',
    align = 'left',
    verticalAlign = 'top',
    padding = [0, 0, 0, 0],
    dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    overflow = '...',
  } = options;

  const [padTop, padRight, padBottom, padLeft] = padding;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  // Concatenate all span text for layout
  const fullText = spans.map(s => s.text).join('');

  ctx.save();
  ctx.scale(dpr, dpr);

  // Layout the concatenated text
  const prepared = prepareWithSegments(fullText, font);
  const layoutResult = layoutWithLines(prepared, innerWidth, lineHeight);
  const lines = layoutResult.lines;

  const maxVisibleLines = Math.floor(innerHeight / lineHeight);
  const visibleLines = Math.min(lines.length, maxVisibleLines);
  const clipped = lines.length > maxVisibleLines;
  const renderedHeight = visibleLines * lineHeight;

  let yOffset = padTop;
  if (verticalAlign === 'middle') {
    yOffset = padTop + (innerHeight - renderedHeight) / 2;
  } else if (verticalAlign === 'bottom') {
    yOffset = padTop + innerHeight - renderedHeight;
  }

  // Build a char-to-span mapping
  const charSpanMap: number[] = new Array(fullText.length);
  let charIdx = 0;
  for (let si = 0; si < spans.length; si++) {
    for (let ci = 0; ci < spans[si].text.length; ci++) {
      charSpanMap[charIdx++] = si;
    }
  }

  // Render each line with span-aware styling
  let globalCharOffset = 0;
  ctx.textBaseline = 'top';

  for (let i = 0; i < visibleLines; i++) {
    const line = lines[i];
    let lineText = line.text;

    if (clipped && i === visibleLines - 1 && overflow !== false) {
      lineText = lineText.trimEnd() + overflow;
    }

    // Calculate line start X for alignment
    ctx.font = font;
    const fullLineWidth = ctx.measureText(lineText).width;
    let startX = padLeft;
    if (align === 'center') {
      startX = padLeft + (innerWidth - fullLineWidth) / 2;
    } else if (align === 'right') {
      startX = padLeft + innerWidth - fullLineWidth;
    }

    const y = yOffset + i * lineHeight;

    // Walk through line chars, grouping by span
    let x = startX;
    let runStart = 0;

    while (runStart < line.text.length) {
      const spanIdx = charSpanMap[globalCharOffset + runStart];
      if (spanIdx === undefined) break;

      // Find run end (contiguous chars from same span)
      let runEnd = runStart + 1;
      while (
        runEnd < line.text.length &&
        charSpanMap[globalCharOffset + runEnd] === spanIdx
      ) {
        runEnd++;
      }

      const span = spans[spanIdx];
      const runText = line.text.slice(runStart, runEnd);

      // Build span font
      const spanFont = buildSpanFont(font, span);
      ctx.font = spanFont;

      const runWidth = ctx.measureText(runText).width;

      // Draw background if present
      if (span.backgroundColor) {
        const bgPad = span.backgroundPadding ?? 2;
        const bgRadius = span.backgroundRadius ?? 3;
        ctx.fillStyle = span.backgroundColor;
        roundRect(ctx, x - bgPad, y - 1, runWidth + bgPad * 2, lineHeight + 2, bgRadius);
        ctx.fill();
      }

      // Draw text
      ctx.fillStyle = span.color ?? color;
      ctx.fillText(runText, x, y);

      x += runWidth;
      runStart = runEnd;
    }

    globalCharOffset += line.text.length;
  }

  ctx.restore();

  return {
    clipped,
    visibleLines,
    totalLines: lines.length,
    renderedHeight,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSpanFont(baseFont: string, span: StyledSpan): string {
  if (!span.fontWeight && !span.fontSize) return baseFont;

  // Parse base font: "16px Inter" or "bold 16px Inter"
  const match = baseFont.match(/^((?:(?:bold|italic|light|\d{3})\s+)*)(\d+(?:\.\d+)?)px\s+(.+)$/i);
  if (!match) return baseFont;

  const weight = span.fontWeight ?? match[1].trim();
  const size = span.fontSize ?? parseFloat(match[2]);
  const family = match[3];

  return `${weight ? weight + ' ' : ''}${size}px ${family}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Canvas Setup Utility ────────────────────────────────────────────────────

/**
 * Set up a canvas element for crisp HiDPI rendering.
 * Sets canvas dimensions to logical size × DPR, then scales CSS to logical size.
 */
export function setupCanvasForHiDPI(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
  dpr?: number,
): CanvasRenderingContext2D {
  const ratio = dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  canvas.width = logicalWidth * ratio;
  canvas.height = logicalHeight * ratio;
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;

  const ctx = canvas.getContext('2d')!;
  // Note: don't scale here — renderText/renderStyledSpans handle their own DPR scaling
  return ctx;
}
