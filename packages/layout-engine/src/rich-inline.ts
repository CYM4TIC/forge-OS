/**
 * Rich inline elements — text with atomic chips, pills, code spans, and badges.
 * Chips stay whole during wrapping (never split mid-element).
 *
 * Works by measuring each inline element's width via Pretext, then treating
 * the element as a single "character" in the layout stream. Text wraps
 * naturally around these atomic blocks.
 *
 * Inspired by: https://chenglou.me/pretext/rich-note/
 */

import {
  prepare as pretextPrepare,
  layout as pretextLayout,
  prepareWithSegments,
  layoutWithLines,
} from '@chenglou/pretext';
import type { PreparedText } from '@chenglou/pretext';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A run of plain text */
export interface TextRun {
  type: 'text';
  content: string;
}

/** An atomic inline element (chip, pill, badge, code span) that never splits */
export interface InlineChip {
  type: 'chip';
  /** Display text inside the chip */
  label: string;
  /** Additional horizontal padding around the label in px. Default: 8 */
  paddingX?: number;
  /** Chip style identifier (for rendering — not used in measurement) */
  variant?: 'default' | 'code' | 'status' | 'mention' | 'date' | 'priority';
  /** Any extra data the renderer needs */
  data?: Record<string, unknown>;
}

export type InlineElement = TextRun | InlineChip;

export interface RichLayoutLine {
  /** Elements on this line, in order */
  elements: PlacedInlineElement[];
  /** Total line width in px */
  width: number;
  /** Line Y position (top edge) in px */
  y: number;
}

export interface PlacedInlineElement {
  /** The original element */
  element: InlineElement;
  /** X position on the line */
  x: number;
  /** Measured width in px */
  width: number;
  /** For text runs: the actual substring on this line (may be split from original) */
  text?: string;
}

export interface RichLayoutResult {
  /** All laid-out lines */
  lines: RichLayoutLine[];
  /** Total height in px */
  height: number;
  /** Total line count */
  lineCount: number;
}

export interface RichLayoutOptions {
  /** Container width in px */
  maxWidth: number;
  /** Line height in px */
  lineHeight: number;
  /** CSS font shorthand for text runs */
  font: string;
  /** CSS font shorthand for chip labels (typically same family, may differ in size/weight) */
  chipFont?: string;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

/**
 * Lay out rich inline content with atomic chips.
 *
 * Strategy: flatten everything into a single text string with placeholder
 * characters for chips, measure via Pretext, then map positions back to
 * the original elements. Chips are measured individually and treated as
 * single wide "characters" that prevent line breaks inside them.
 */
export function layoutRichInline(
  elements: InlineElement[],
  options: RichLayoutOptions,
): RichLayoutResult {
  const { maxWidth, lineHeight, font, chipFont } = options;

  // Phase 1: measure all chip widths
  const chipWidths: number[] = [];
  const chipIndexMap: number[] = []; // maps chip occurrence to chipWidths index
  let chipIdx = 0;

  for (const el of elements) {
    if (el.type === 'chip') {
      const cf = chipFont ?? font;
      const padX = el.paddingX ?? 8;
      // Measure the chip label text
      const prepared = pretextPrepare(el.label, cf);
      const result = pretextLayout(prepared, maxWidth, lineHeight);
      // Chip width = text width + padding. For single-line chips, approximate
      // text width from the fact that it's 1 line at maxWidth.
      // More precise: use canvas measureText via prepare
      const labelPrepared = prepareWithSegments(el.label, cf);
      const labelLayout = layoutWithLines(labelPrepared, maxWidth, lineHeight);
      const textWidth = labelLayout.lines.length > 0 ? labelLayout.lines[0].width : 0;
      chipWidths.push(textWidth + padX * 2);
      chipIndexMap.push(chipIdx);
      chipIdx++;
    }
  }

  // Phase 2: build composite text with placeholder sequences for chips
  // Use a wide character (em space U+2003) repeated to approximate chip width
  const PLACEHOLDER_CHAR = '\u2003'; // em space
  let compositeText = '';
  const elementRanges: Array<{
    element: InlineElement;
    startIdx: number;
    endIdx: number;
    chipWidth?: number;
  }> = [];

  let charPos = 0;
  let ci = 0;

  for (const el of elements) {
    const startIdx = charPos;
    if (el.type === 'text') {
      compositeText += el.content;
      charPos += el.content.length;
    } else {
      // Insert placeholder chars that approximate the chip width
      // Each em space is ~fontSize wide. We need chipWidth / emSpaceWidth placeholders.
      const chipWidth = chipWidths[ci];
      // Rough: 1 em space ≈ font size. Extract from font string.
      const fontSize = extractFontSize(font);
      const numPlaceholders = Math.max(1, Math.ceil(chipWidth / fontSize));
      const placeholder = PLACEHOLDER_CHAR.repeat(numPlaceholders);
      compositeText += placeholder;
      charPos += numPlaceholders;
      elementRanges.push({ element: el, startIdx, endIdx: charPos, chipWidth });
      ci++;
      continue;
    }
    elementRanges.push({ element: el, startIdx, endIdx: charPos });
  }

  // Phase 3: lay out composite text via Pretext
  const prepared = prepareWithSegments(compositeText, font);
  const layout = layoutWithLines(prepared, maxWidth, lineHeight);

  // Phase 4: map Pretext lines back to rich elements
  const richLines: RichLayoutLine[] = [];
  let globalCharOffset = 0;

  for (let lineIdx = 0; lineIdx < layout.lines.length; lineIdx++) {
    const line = layout.lines[lineIdx];
    const lineStart = globalCharOffset;
    const lineEnd = lineStart + line.text.length;
    const placedElements: PlacedInlineElement[] = [];
    let x = 0;

    // Find all elements that overlap with this line's char range
    for (const range of elementRanges) {
      const overlapStart = Math.max(range.startIdx, lineStart);
      const overlapEnd = Math.min(range.endIdx, lineEnd);

      if (overlapStart >= overlapEnd) continue;

      if (range.element.type === 'text') {
        // Extract the substring of this text run that falls on this line
        const relStart = overlapStart - range.startIdx;
        const relEnd = overlapEnd - range.startIdx;
        const substr = range.element.content.slice(relStart, relEnd);
        if (substr.length === 0) continue;

        // Measure substring width
        const subPrepared = pretextPrepare(substr, font);
        const subLayout = pretextLayout(subPrepared, maxWidth, lineHeight);
        // Approximate width from single-line assumption
        const subWithLines = layoutWithLines(prepareWithSegments(substr, font), maxWidth, lineHeight);
        const subWidth = subWithLines.lines.length > 0 ? subWithLines.lines[0].width : 0;

        placedElements.push({
          element: range.element,
          x,
          width: subWidth,
          text: substr,
        });
        x += subWidth;
      } else {
        // Chip — place at current x with its measured width
        const chipWidth = range.chipWidth ?? 0;
        placedElements.push({
          element: range.element,
          x,
          width: chipWidth,
        });
        x += chipWidth;
      }
    }

    richLines.push({
      elements: placedElements,
      width: x,
      y: lineIdx * lineHeight,
    });

    globalCharOffset = lineEnd;
  }

  return {
    lines: richLines,
    height: layout.height,
    lineCount: layout.lineCount,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractFontSize(font: string): number {
  const match = font.match(/(\d+(?:\.\d+)?)px/);
  return match ? parseFloat(match[1]) : 16;
}
