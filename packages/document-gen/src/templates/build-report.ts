/**
 * Build Report Template — generated at session close.
 *
 * Progress snapshot:
 *   - Batch progress
 *   - Findings resolved
 *   - Risks carried forward
 *   - Token usage / context window
 *   - Session timeline
 */

import type {
  ContentBlock,
  DocumentTemplate,
  FindingRow,
} from '../types.js';
import type { PersonaSlug } from '../persona-colors.js';

// ─── Template Data ──────────────────────────────────────────────────────────

export interface BuildReportData {
  /** Session identifier (e.g., '4.4') */
  sessionId: string;
  /** Date */
  date: string;
  /** Batches completed this session */
  batchesCompleted: string[];
  /** Total batches done (cumulative) */
  totalBatchesDone: number;
  /** Total batches planned */
  totalBatchesPlanned: number;
  /** Findings resolved this session */
  findingsResolved: FindingRow[];
  /** Risks carried forward */
  risks: Array<{ description: string; severity: 'high' | 'medium' | 'low' }>;
  /** Token usage */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    contextWindowPercent: number;
  };
  /** Files created/modified */
  filesChanged: Array<{ path: string; action: 'created' | 'modified' | 'deleted' }>;
  /** Session timeline */
  timeline: Array<{ timestamp: string; label: string; persona?: PersonaSlug }>;
  /** Commits pushed */
  commits: Array<{ hash: string; message: string }>;
  /** Next batch recommendation */
  nextBatch?: string;
}

// ─── Template ───────────────────────────────────────────────────────────────

export const buildReportTemplate: DocumentTemplate<BuildReportData> = {
  name: 'build-report',

  generate(data: BuildReportData): ContentBlock[] {
    const blocks: ContentBlock[] = [];

    // ── Title ──
    blocks.push({
      type: 'heading',
      level: 1,
      text: `Build Report: Session ${data.sessionId}`,
    });

    blocks.push({
      type: 'paragraph',
      text: `Date: ${data.date} | Batches: ${data.batchesCompleted.join(', ')}`,
    });

    // ── Progress ──
    blocks.push({ type: 'section_break' });
    blocks.push({
      type: 'heading',
      level: 2,
      text: 'Progress',
    });

    blocks.push({
      type: 'metric',
      label: 'Batch Progress',
      value: data.totalBatchesDone,
      max: data.totalBatchesPlanned,
      color: '#6366F1',
    });

    blocks.push({
      type: 'stat_grid',
      stats: [
        { label: 'Batches This Session', value: data.batchesCompleted.length },
        { label: 'Cumulative', value: `${data.totalBatchesDone}/${data.totalBatchesPlanned}` },
        { label: 'Findings Resolved', value: data.findingsResolved.length, color: '#10B981' },
        { label: 'Risks Carried', value: data.risks.length, color: data.risks.length > 0 ? '#F59E0B' : '#10B981' },
      ],
    });

    // ── Token Usage ──
    if (data.tokenUsage) {
      blocks.push({
        type: 'metric',
        label: 'Context Window',
        value: data.tokenUsage.contextWindowPercent,
        max: 100,
        unit: '%',
        color: data.tokenUsage.contextWindowPercent > 70 ? '#EF4444' : '#6366F1',
      });
    }

    // ── Findings ──
    if (data.findingsResolved.length > 0) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'heading',
        level: 2,
        text: 'Findings Resolved',
      });
      blocks.push({
        type: 'findings_table',
        findings: data.findingsResolved,
      });
    }

    // ── Risks ──
    if (data.risks.length > 0) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'heading',
        level: 2,
        text: 'Risks Carried Forward',
      });
      blocks.push({
        type: 'table',
        headers: ['Risk', 'Severity'],
        rows: data.risks.map(r => [r.description, r.severity.toUpperCase()]),
        columnWidths: [0.80, 0.20],
      });
    }

    // ── Files Changed ──
    blocks.push({ type: 'section_break' });
    blocks.push({
      type: 'heading',
      level: 2,
      text: 'Files Changed',
    });

    blocks.push({
      type: 'table',
      headers: ['Path', 'Action'],
      rows: data.filesChanged.map(f => [f.path, f.action]),
      columnWidths: [0.80, 0.20],
    });

    // ── Commits ──
    if (data.commits.length > 0) {
      blocks.push({
        type: 'heading',
        level: 3,
        text: 'Commits',
      });
      blocks.push({
        type: 'table',
        headers: ['Hash', 'Message'],
        rows: data.commits.map(c => [c.hash.slice(0, 7), c.message]),
        columnWidths: [0.15, 0.85],
      });
    }

    // ── Timeline ──
    if (data.timeline.length > 0) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'heading',
        level: 2,
        text: 'Session Timeline',
      });
      blocks.push({
        type: 'timeline',
        entries: data.timeline,
      });
    }

    // ── Next ──
    if (data.nextBatch) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'heading',
        level: 2,
        text: 'Next',
      });
      blocks.push({
        type: 'paragraph',
        text: `Next batch: **${data.nextBatch}**`,
      });
    }

    return blocks;
  },
};
