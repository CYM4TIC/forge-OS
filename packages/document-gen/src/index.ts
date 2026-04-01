/**
 * @forge-os/document-gen
 *
 * Dual-output document generation engine. Same content blocks produce:
 *   1. Editorial-quality PDF (via jsPDF with Pretext measurement)
 *   2. Clean markdown (for Claude consumption)
 *
 * OS-ADL-010: Dual-output document generation.
 */

// ─── Core Pipeline ──────────────────────────────────────────────────────────
export { layoutPages, renderPdf } from './pdf.js';
export { renderMarkdown } from './markdown.js';

// ─── Templates ──────────────────────────────────────────────────────────────
export { gateReportTemplate } from './templates/gate-report.js';
export type { GateReportData } from './templates/gate-report.js';
export { projectBriefTemplate } from './templates/project-brief.js';
export type { ProjectBriefData } from './templates/project-brief.js';
export { buildReportTemplate } from './templates/build-report.js';
export type { BuildReportData } from './templates/build-report.js';
export { retrospectiveTemplate } from './templates/retrospective.js';
export type { RetrospectiveData } from './templates/retrospective.js';

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  ContentBlock,
  HeadingBlock,
  ParagraphBlock,
  TableBlock,
  FindingsTableBlock,
  FindingRow,
  StatGridBlock,
  StatItem,
  SectionBreakBlock,
  PageBreakBlock,
  PullQuoteBlock,
  PersonaAttributionBlock,
  TimelineBlock,
  TimelineEntry,
  MetricBlock,
  PageDimensions,
  PageLayout,
  PageLayoutResult,
  PdfRenderOptions,
  DocumentOutput,
  DocumentTemplate,
} from './types.js';

export { SEVERITY_COLORS, SEVERITY_ORDER } from './types.js';

// ─── Persona Registry ───────────────────────────────────────────────────────
export { PERSONA_COLORS, PERSONA_NAMES, PERSONA_GLYPHS } from './persona-colors.js';
export type { PersonaSlug } from './persona-colors.js';
