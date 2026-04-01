/**
 * PDF Page Layout Engine — page-break calculator + jsPDF export.
 *
 * Two-phase pipeline:
 *   1. layoutPages() — compute page breaks from content blocks + dimensions
 *   2. renderPdf() — render content blocks to jsPDF pages
 *
 * Uses jsPDF for PDF generation. Pretext integration (via @forge-os/layout-engine)
 * planned for Phase 5+ when PDFs embed canvas components.
 */

import { jsPDF } from 'jspdf';
// NOTE: Pretext-powered editorial layout (multiColumnText, flowAroundObstacles,
// shrinkwrapText) will be wired in when PDFs embed canvas components (Phase 5+).
// Current renderers use jsPDF's native text wrapping which is sufficient for
// the content block types we have today.
import type {
  ContentBlock,
  PageDimensions,
  PageLayout,
  PageLayoutResult,
  PdfRenderOptions,
  FindingRow,
  StatItem,
  TimelineEntry,
} from './types.js';
import { SEVERITY_COLORS, SEVERITY_ORDER } from './types.js';
import { PERSONA_COLORS, PERSONA_NAMES } from './persona-colors.js';
import type { PersonaSlug } from './persona-colors.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_PAGE: PageDimensions = {
  width: 612,   // US Letter
  height: 792,
  margins: [72, 72, 72, 72], // 1 inch
};

const HEADING_SIZES: Record<number, number> = {
  1: 22,
  2: 16,
  3: 13,
};

const HEADING_SPACING: Record<number, number> = {
  1: 28,
  2: 12,
  3: 8,
};

// ─── Block Height Estimation ────────────────────────────────────────────────

/**
 * Estimate the height of a content block in pt.
 * Used for page-break calculation. Doesn't need pixel-perfect accuracy —
 * just close enough to assign blocks to pages correctly.
 */
function estimateBlockHeight(
  block: ContentBlock,
  contentWidth: number,
  baseFontSize: number,
  lineHeightRatio: number,
): number {
  const lineHeight = baseFontSize * lineHeightRatio;

  switch (block.type) {
    case 'heading': {
      const fontSize = HEADING_SIZES[block.level] ?? baseFontSize;
      const spacing = HEADING_SPACING[block.level] ?? 8;
      return fontSize * lineHeightRatio + spacing;
    }

    case 'paragraph': {
      // Rough estimate: chars per line ≈ contentWidth / (baseFontSize * 0.5)
      const charsPerLine = Math.floor(contentWidth / (baseFontSize * 0.5));
      const lineCount = Math.max(1, Math.ceil(block.text.length / charsPerLine));
      const height = lineCount * lineHeight;
      // Multi-column reduces height (text splits across columns)
      if (block.editorial) {
        const cols = block.columns ?? 2;
        return Math.ceil(height / cols) + 12; // 12pt column gap compensation
      }
      return height + 6; // 6pt paragraph spacing
    }

    case 'table': {
      const headerHeight = lineHeight + 8; // Header row + padding
      const rowHeight = lineHeight + 6;
      return headerHeight + block.rows.length * rowHeight + 4;
    }

    case 'findings_table': {
      const headerHeight = lineHeight + 8;
      // Each finding: severity badge + description + optional evidence/fix
      const rowHeight = lineHeight * 2.5;
      return headerHeight + block.findings.length * rowHeight + 4;
    }

    case 'stat_grid': {
      // 2-column grid, each stat ~40pt tall
      const rows = Math.ceil(block.stats.length / 2);
      return rows * 44 + 8;
    }

    case 'section_break':
      return 24;

    case 'page_break':
      return Infinity; // Forces new page

    case 'pull_quote':
      return lineHeight * 3 + 24; // Quote text + attribution + padding

    case 'persona_attribution':
      return lineHeight + 12;

    case 'timeline': {
      return block.entries.length * (lineHeight * 1.5 + 8) + 12;
    }

    case 'metric':
      return 36; // Label + bar + spacing

    default:
      return lineHeight;
  }
}

// ─── Page Layout Calculator ─────────────────────────────────────────────────

/**
 * Compute page breaks for an array of content blocks.
 * Returns per-page layouts with block assignments and Y offsets.
 */
export function layoutPages(
  blocks: ContentBlock[],
  options?: Partial<PdfRenderOptions>,
): PageLayoutResult {
  const page = { ...DEFAULT_PAGE, ...options?.page };
  const baseFontSize = options?.baseFontSize ?? 10;
  const lineHeightRatio = options?.lineHeightRatio ?? 1.5;

  const [marginTop, marginRight, marginBottom, marginLeft] = page.margins;
  const contentWidth = page.width - marginLeft - marginRight;
  const contentHeight = page.height - marginTop - marginBottom;

  const pages: PageLayout[] = [];
  let currentPage: PageLayout = {
    blockIndices: [],
    blockOffsets: [],
    contentHeight: 0,
    pageNumber: 1,
  };
  let yOnPage = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Explicit page break
    if (block.type === 'page_break') {
      pages.push(currentPage);
      currentPage = {
        blockIndices: [],
        blockOffsets: [],
        contentHeight: 0,
        pageNumber: pages.length + 1,
      };
      yOnPage = 0;
      continue;
    }

    const blockHeight = estimateBlockHeight(block, contentWidth, baseFontSize, lineHeightRatio);

    // Does this block fit on the current page?
    if (yOnPage + blockHeight > contentHeight && currentPage.blockIndices.length > 0) {
      // Finalize current page
      currentPage.contentHeight = yOnPage;
      pages.push(currentPage);

      // Start new page
      currentPage = {
        blockIndices: [],
        blockOffsets: [],
        contentHeight: 0,
        pageNumber: pages.length + 1,
      };
      yOnPage = 0;
    }

    currentPage.blockIndices.push(i);
    currentPage.blockOffsets.push(yOnPage);
    yOnPage += blockHeight;
  }

  // Push final page if it has content
  if (currentPage.blockIndices.length > 0) {
    currentPage.contentHeight = yOnPage;
    pages.push(currentPage);
  }

  return {
    pages,
    pageCount: pages.length,
    contentWidth,
    contentHeight,
  };
}

// ─── PDF Renderer ───────────────────────────────────────────────────────────

/**
 * Render content blocks to a PDF via jsPDF.
 * Returns the PDF as Uint8Array.
 */
export function renderPdf(
  blocks: ContentBlock[],
  options?: Partial<PdfRenderOptions>,
): Uint8Array {
  const page = { ...DEFAULT_PAGE, ...options?.page };
  const fontFamily = options?.fontFamily ?? 'Helvetica';
  const baseFontSize = options?.baseFontSize ?? 10;
  const lineHeightRatio = options?.lineHeightRatio ?? 1.5;

  const [marginTop, marginRight, marginBottom, marginLeft] = page.margins;
  const contentWidth = page.width - marginLeft - marginRight;
  const contentHeight = page.height - marginTop - marginBottom;
  const lineHeight = baseFontSize * lineHeightRatio;

  const layout = layoutPages(blocks, options);
  const doc = new jsPDF({
    unit: 'pt',
    format: [page.width, page.height],
  });

  // Set metadata
  if (options?.title) doc.setProperties({ title: options.title });
  if (options?.author) doc.setProperties({ author: options.author });

  for (let pi = 0; pi < layout.pages.length; pi++) {
    const pageLayout = layout.pages[pi];

    if (pi > 0) doc.addPage([page.width, page.height]);

    for (let bi = 0; bi < pageLayout.blockIndices.length; bi++) {
      const blockIdx = pageLayout.blockIndices[bi];
      const yOffset = pageLayout.blockOffsets[bi];
      const block = blocks[blockIdx];
      const x = marginLeft;
      const y = marginTop + yOffset;

      renderBlock(doc, block, x, y, contentWidth, {
        fontFamily,
        baseFontSize,
        lineHeight,
        lineHeightRatio,
      });
    }

    // Page number footer
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `${pageLayout.pageNumber} / ${layout.pageCount}`,
      page.width / 2,
      page.height - marginBottom / 2,
      { align: 'center' },
    );
  }

  return doc.output('arraybuffer') as unknown as Uint8Array;
}

// ─── Block Renderer ─────────────────────────────────────────────────────────

interface RenderContext {
  fontFamily: string;
  baseFontSize: number;
  lineHeight: number;
  lineHeightRatio: number;
}

function renderBlock(
  doc: jsPDF,
  block: ContentBlock,
  x: number,
  y: number,
  width: number,
  ctx: RenderContext,
): void {
  switch (block.type) {
    case 'heading':
      renderHeading(doc, block.text, block.level, x, y, width, ctx);
      break;

    case 'paragraph':
      renderParagraph(doc, block.text, x, y, width, ctx, block.editorial, block.columns);
      break;

    case 'table':
      renderTable(doc, block.headers, block.rows, x, y, width, ctx, block.columnWidths);
      break;

    case 'findings_table':
      renderFindingsTable(doc, block.findings, x, y, width, ctx);
      break;

    case 'stat_grid':
      renderStatGrid(doc, block.stats, x, y, width, ctx);
      break;

    case 'section_break':
      renderSectionBreak(doc, x, y, width);
      break;

    case 'pull_quote':
      renderPullQuote(doc, block.text, block.attribution, x, y, width, ctx);
      break;

    case 'persona_attribution':
      renderPersonaAttribution(doc, block.persona, block.text, x, y, ctx);
      break;

    case 'timeline':
      renderTimeline(doc, block.entries, x, y, width, ctx);
      break;

    case 'metric':
      renderMetric(doc, block.label, block.value, block.max, x, y, width, ctx, block.unit, block.color);
      break;

    // page_break handled at layout level
  }
}

// ─── Individual Renderers ───────────────────────────────────────────────────

function renderHeading(
  doc: jsPDF,
  text: string,
  level: number,
  x: number,
  y: number,
  _width: number,
  ctx: RenderContext,
): void {
  const fontSize = HEADING_SIZES[level] ?? ctx.baseFontSize;
  doc.setFont(ctx.fontFamily, 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(230, 230, 237); // Light on dark aesthetic
  doc.text(text, x, y + fontSize);
}

function renderParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  ctx: RenderContext,
  editorial?: boolean,
  columns?: number,
): void {
  doc.setFont(ctx.fontFamily, 'normal');
  doc.setFontSize(ctx.baseFontSize);
  doc.setTextColor(200, 200, 210);

  if (editorial) {
    // Multi-column: split text into columns manually
    const numCols = columns ?? 2;
    const gap = 18; // pt
    const colWidth = (width - (numCols - 1) * gap) / numCols;

    const lines = doc.splitTextToSize(text, colWidth);
    const linesPerCol = Math.ceil(lines.length / numCols);

    for (let col = 0; col < numCols; col++) {
      const colX = x + col * (colWidth + gap);
      const colLines = lines.slice(col * linesPerCol, (col + 1) * linesPerCol);
      doc.text(colLines, colX, y + ctx.lineHeight);
    }
  } else {
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, x, y + ctx.lineHeight);
  }
}

function renderTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  x: number,
  y: number,
  width: number,
  ctx: RenderContext,
  columnWidths?: number[],
): void {
  const colCount = headers.length;
  const widths = columnWidths
    ? columnWidths.map(w => w * width)
    : Array(colCount).fill(width / colCount);

  const rowHeight = ctx.lineHeight + 6;
  let currentY = y;

  // Header row
  doc.setFont(ctx.fontFamily, 'bold');
  doc.setFontSize(ctx.baseFontSize - 1);
  doc.setTextColor(180, 180, 195);

  // Header background
  doc.setFillColor(30, 30, 40);
  doc.rect(x, currentY, width, rowHeight, 'F');

  let colX = x;
  for (let c = 0; c < colCount; c++) {
    doc.text(headers[c], colX + 4, currentY + ctx.lineHeight);
    colX += widths[c];
  }
  currentY += rowHeight;

  // Data rows
  doc.setFont(ctx.fontFamily, 'normal');
  doc.setTextColor(200, 200, 210);

  for (let r = 0; r < rows.length; r++) {
    // Alternating row background
    if (r % 2 === 0) {
      doc.setFillColor(22, 22, 30);
      doc.rect(x, currentY, width, rowHeight, 'F');
    }

    colX = x;
    for (let c = 0; c < colCount; c++) {
      const cellText = rows[r][c] ?? '';
      const truncated = doc.splitTextToSize(cellText, widths[c] - 8);
      doc.text(truncated[0] ?? '', colX + 4, currentY + ctx.lineHeight);
      colX += widths[c];
    }
    currentY += rowHeight;
  }
}

function renderFindingsTable(
  doc: jsPDF,
  findings: FindingRow[],
  x: number,
  y: number,
  width: number,
  ctx: RenderContext,
): void {
  let currentY = y;
  const rowHeight = ctx.lineHeight * 2.5;

  // Header
  doc.setFont(ctx.fontFamily, 'bold');
  doc.setFontSize(ctx.baseFontSize - 1);
  doc.setFillColor(30, 30, 40);
  doc.rect(x, currentY, width, ctx.lineHeight + 6, 'F');
  doc.setTextColor(180, 180, 195);

  const cols = [
    { label: 'Sev', width: width * 0.08 },
    { label: 'Persona', width: width * 0.12 },
    { label: 'Description', width: width * 0.45 },
    { label: 'Status', width: width * 0.10 },
    { label: 'Fix', width: width * 0.25 },
  ];

  let colX = x;
  for (const col of cols) {
    doc.text(col.label, colX + 3, currentY + ctx.lineHeight);
    colX += col.width;
  }
  currentY += ctx.lineHeight + 6;

  // Sort by severity
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  doc.setFont(ctx.fontFamily, 'normal');
  doc.setFontSize(ctx.baseFontSize - 1);

  for (const finding of sorted) {
    // Row background
    doc.setFillColor(22, 22, 30);
    doc.rect(x, currentY, width, rowHeight, 'F');

    colX = x;

    // Severity badge
    const sevColor = SEVERITY_COLORS[finding.severity];
    const [sr, sg, sb] = hexToRgb(sevColor);
    doc.setFillColor(sr, sg, sb);
    doc.roundedRect(colX + 2, currentY + 3, cols[0].width - 6, ctx.lineHeight, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text(finding.severity, colX + 4, currentY + ctx.lineHeight);
    colX += cols[0].width;

    // Persona
    doc.setFontSize(ctx.baseFontSize - 1);
    const personaColor = PERSONA_COLORS[finding.persona];
    const [pr, pg, pb] = hexToRgb(personaColor);
    doc.setTextColor(pr, pg, pb);
    doc.text(PERSONA_NAMES[finding.persona], colX + 3, currentY + ctx.lineHeight);
    colX += cols[1].width;

    // Description
    doc.setTextColor(200, 200, 210);
    const descLines = doc.splitTextToSize(finding.description, cols[2].width - 6);
    doc.text(descLines.slice(0, 2), colX + 3, currentY + ctx.lineHeight);
    colX += cols[2].width;

    // Status
    const statusColor = finding.status === 'resolved' ? [16, 185, 129] : finding.status === 'open' ? [239, 68, 68] : [128, 128, 128];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(finding.status, colX + 3, currentY + ctx.lineHeight);
    colX += cols[3].width;

    // Fix
    doc.setTextColor(200, 200, 210);
    if (finding.fix) {
      const fixLines = doc.splitTextToSize(finding.fix, cols[4].width - 6);
      doc.text(fixLines.slice(0, 2), colX + 3, currentY + ctx.lineHeight);
    }

    currentY += rowHeight;
  }
}

function renderStatGrid(
  doc: jsPDF,
  stats: StatItem[],
  x: number,
  y: number,
  width: number,
  ctx: RenderContext,
): void {
  const colWidth = width / 2;
  const cellHeight = 40;

  for (let i = 0; i < stats.length; i++) {
    const stat = stats[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cellX = x + col * colWidth;
    const cellY = y + row * cellHeight;

    // Value (large)
    doc.setFont(ctx.fontFamily, 'bold');
    doc.setFontSize(18);
    if (stat.color) {
      const [r, g, b] = hexToRgb(stat.color);
      doc.setTextColor(r, g, b);
    } else {
      doc.setTextColor(230, 230, 237);
    }
    doc.text(String(stat.value), cellX, cellY + 20);

    // Label (small, dim)
    doc.setFont(ctx.fontFamily, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 145);
    doc.text(stat.label, cellX, cellY + 32);
  }
}

function renderSectionBreak(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
): void {
  doc.setDrawColor(60, 60, 75);
  doc.setLineWidth(0.5);
  doc.line(x, y + 12, x + width, y + 12);
}

function renderPullQuote(
  doc: jsPDF,
  text: string,
  attribution: PersonaSlug,
  x: number,
  y: number,
  width: number,
  ctx: RenderContext,
): void {
  const indent = 24;
  const quoteWidth = width - indent * 2;

  // Left accent bar
  const [ar, ag, ab] = hexToRgb(PERSONA_COLORS[attribution]);
  doc.setFillColor(ar, ag, ab);
  doc.rect(x + indent - 6, y + 4, 2, ctx.lineHeight * 2 + 12, 'F');

  // Quote text
  doc.setFont(ctx.fontFamily, 'italic');
  doc.setFontSize(ctx.baseFontSize + 1);
  doc.setTextColor(220, 220, 230);
  const lines = doc.splitTextToSize(`"${text}"`, quoteWidth);
  doc.text(lines, x + indent, y + ctx.lineHeight + 4);

  // Attribution
  doc.setFont(ctx.fontFamily, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(ar, ag, ab);
  const attrY = y + ctx.lineHeight * (lines.length + 1) + 8;
  doc.text(`— ${PERSONA_NAMES[attribution]}`, x + indent, attrY);
}

function renderPersonaAttribution(
  doc: jsPDF,
  persona: PersonaSlug,
  text: string,
  x: number,
  y: number,
  ctx: RenderContext,
): void {
  const [pr, pg, pb] = hexToRgb(PERSONA_COLORS[persona]);

  // Small persona color dot
  doc.setFillColor(pr, pg, pb);
  doc.circle(x + 4, y + ctx.lineHeight - 3, 3, 'F');

  // Name in persona color
  doc.setFont(ctx.fontFamily, 'bold');
  doc.setFontSize(ctx.baseFontSize - 1);
  doc.setTextColor(pr, pg, pb);
  doc.text(PERSONA_NAMES[persona], x + 12, y + ctx.lineHeight);

  // Text in neutral
  doc.setFont(ctx.fontFamily, 'normal');
  doc.setTextColor(200, 200, 210);
  const nameWidth = doc.getTextWidth(PERSONA_NAMES[persona]);
  doc.text(` ${text}`, x + 12 + nameWidth, y + ctx.lineHeight);
}

function renderTimeline(
  doc: jsPDF,
  entries: TimelineEntry[],
  x: number,
  y: number,
  _width: number,
  ctx: RenderContext,
): void {
  const entryHeight = ctx.lineHeight * 1.5 + 8;
  let currentY = y;

  // Vertical line
  doc.setDrawColor(50, 50, 65);
  doc.setLineWidth(1);
  doc.line(x + 6, y, x + 6, y + entries.length * entryHeight);

  for (const entry of entries) {
    // Dot
    if (entry.persona) {
      const [pr, pg, pb] = hexToRgb(PERSONA_COLORS[entry.persona]);
      doc.setFillColor(pr, pg, pb);
    } else {
      doc.setFillColor(99, 102, 241); // nyx indigo
    }
    doc.circle(x + 6, currentY + ctx.lineHeight / 2, 3, 'F');

    // Timestamp
    doc.setFont(ctx.fontFamily, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 145);
    doc.text(entry.timestamp, x + 16, currentY + 8);

    // Label
    doc.setFontSize(ctx.baseFontSize - 1);
    doc.setTextColor(220, 220, 230);
    doc.text(entry.label, x + 16, currentY + ctx.lineHeight);

    // Detail
    if (entry.detail) {
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 175);
      doc.text(entry.detail, x + 16, currentY + ctx.lineHeight + 10);
    }

    currentY += entryHeight;
  }
}

function renderMetric(
  doc: jsPDF,
  label: string,
  value: number,
  max: number,
  x: number,
  y: number,
  width: number,
  ctx: RenderContext,
  unit?: string,
  color?: string,
): void {
  const barHeight = 8;
  const barWidth = width * 0.6;
  const fraction = Math.min(value / max, 1);
  const fillColor = color ?? '#6366F1';

  // Label
  doc.setFont(ctx.fontFamily, 'normal');
  doc.setFontSize(ctx.baseFontSize - 1);
  doc.setTextColor(180, 180, 195);
  doc.text(label, x, y + ctx.lineHeight);

  // Value text
  doc.setFont(ctx.fontFamily, 'bold');
  doc.setTextColor(230, 230, 237);
  const valueText = unit ? `${value}${unit}` : String(value);
  doc.text(valueText, x + barWidth + 12, y + ctx.lineHeight + barHeight + 2);

  // Bar background
  doc.setFillColor(30, 30, 40);
  doc.roundedRect(x, y + ctx.lineHeight + 2, barWidth, barHeight, 2, 2, 'F');

  // Bar fill
  const [fr, fg, fb] = hexToRgb(fillColor);
  doc.setFillColor(fr, fg, fb);
  doc.roundedRect(x, y + ctx.lineHeight + 2, barWidth * fraction, barHeight, 2, 2, 'F');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}
