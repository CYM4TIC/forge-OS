/**
 * @forge-os/document-gen — Type definitions
 *
 * Dual-output document generation: same content blocks produce both
 * editorial-quality PDF (via Pretext + jsPDF) and clean markdown (for Claude).
 *
 * OS-ADL-010: Dual-output document generation.
 */

import type { PersonaSlug } from './persona-colors.js';

// ─── Content Blocks ─────────────────────────────────────────────────────────
// The universal content model. Templates produce arrays of ContentBlock.
// Renderers (pdf.ts, markdown.ts) consume them.

export type ContentBlock =
  | HeadingBlock
  | ParagraphBlock
  | TableBlock
  | FindingsTableBlock
  | StatGridBlock
  | SectionBreakBlock
  | PageBreakBlock
  | PullQuoteBlock
  | PersonaAttributionBlock
  | TimelineBlock
  | MetricBlock;

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
}

export interface ParagraphBlock {
  type: 'paragraph';
  text: string;
  /** If true, render as multi-column editorial flow */
  editorial?: boolean;
  /** Number of columns for editorial mode. Default: 2 */
  columns?: number;
}

export interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
  /** Column widths as fractions (must sum to 1). Auto-distributed if not set. */
  columnWidths?: number[];
}

export interface FindingsTableBlock {
  type: 'findings_table';
  findings: FindingRow[];
}

export interface FindingRow {
  severity: 'P-CRIT' | 'P-HIGH' | 'P-MED' | 'P-LOW';
  persona: PersonaSlug;
  description: string;
  evidence?: string;
  fix?: string;
  status: 'resolved' | 'open' | 'deferred';
}

export interface StatGridBlock {
  type: 'stat_grid';
  stats: StatItem[];
}

export interface StatItem {
  label: string;
  value: string | number;
  /** Optional color override for the value */
  color?: string;
}

export interface SectionBreakBlock {
  type: 'section_break';
}

export interface PageBreakBlock {
  type: 'page_break';
}

export interface PullQuoteBlock {
  type: 'pull_quote';
  text: string;
  attribution: PersonaSlug;
}

export interface PersonaAttributionBlock {
  type: 'persona_attribution';
  persona: PersonaSlug;
  text: string;
}

export interface TimelineBlock {
  type: 'timeline';
  entries: TimelineEntry[];
}

export interface TimelineEntry {
  timestamp: string;
  label: string;
  detail?: string;
  persona?: PersonaSlug;
}

export interface MetricBlock {
  type: 'metric';
  label: string;
  value: number;
  max: number;
  unit?: string;
  /** Color for the metric bar. Default: '#6366F1' (nyx indigo) */
  color?: string;
}

// ─── Page Layout ────────────────────────────────────────────────────────────

export interface PageDimensions {
  /** Page width in pt. Default: 612 (US Letter) */
  width: number;
  /** Page height in pt. Default: 792 (US Letter) */
  height: number;
  /** Margins in pt [top, right, bottom, left]. Default: [72, 72, 72, 72] (1 inch) */
  margins: [number, number, number, number];
}

export interface PageLayout {
  /** Which content blocks land on this page */
  blockIndices: number[];
  /** Per-block Y offset within the page content area */
  blockOffsets: number[];
  /** Total content height consumed on this page */
  contentHeight: number;
  /** Page number (1-indexed) */
  pageNumber: number;
}

export interface PageLayoutResult {
  /** Per-page layout */
  pages: PageLayout[];
  /** Total page count */
  pageCount: number;
  /** Content area width (page width minus left+right margins) */
  contentWidth: number;
  /** Content area height (page height minus top+bottom margins) */
  contentHeight: number;
}

// ─── Render Options ─────────────────────────────────────────────────────────

export interface PdfRenderOptions {
  /** Page dimensions. Default: US Letter with 1-inch margins */
  page?: Partial<PageDimensions>;
  /** Base font family. Default: 'Helvetica' */
  fontFamily?: string;
  /** Base font size in pt. Default: 10 */
  baseFontSize?: number;
  /** Line height multiplier. Default: 1.5 */
  lineHeightRatio?: number;
  /** Title for the PDF metadata */
  title?: string;
  /** Author for the PDF metadata */
  author?: string;
}

export interface DocumentOutput {
  /** PDF as Uint8Array */
  pdf: Uint8Array;
  /** Markdown string */
  markdown: string;
}

// ─── Template Interface ─────────────────────────────────────────────────────

export interface DocumentTemplate<TData> {
  /** Template name (e.g., 'gate-report', 'project-brief') */
  name: string;
  /** Generate content blocks from template data */
  generate: (data: TData) => ContentBlock[];
}

// ─── Severity Colors ────────────────────────────────────────────────────────

export const SEVERITY_COLORS: Record<FindingRow['severity'], string> = {
  'P-CRIT': '#EF4444',
  'P-HIGH': '#F97316',
  'P-MED': '#EAB308',
  'P-LOW': '#3B82F6',
};

export const SEVERITY_ORDER: FindingRow['severity'][] = ['P-CRIT', 'P-HIGH', 'P-MED', 'P-LOW'];
