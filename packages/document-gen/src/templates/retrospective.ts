/**
 * Retrospective Template — generated at phase/milestone boundaries.
 *
 * Structured reflection:
 *   - Timeline of key events
 *   - Learnings (persona-attributed)
 *   - Failure modes observed
 *   - Recommendations
 *   - Action items
 */

import type {
  ContentBlock,
  DocumentTemplate,
} from '../types.js';
import type { PersonaSlug } from '../persona-colors.js';

// ─── Template Data ──────────────────────────────────────────────────────────

export interface RetrospectiveData {
  /** Phase or milestone name (e.g., 'Phase 4: Pretext + Window Manager') */
  title: string;
  /** Date range */
  dateRange: string;
  /** Session count */
  sessionCount: number;
  /** Batch count */
  batchCount: number;
  /** Timeline of key events */
  timeline: Array<{
    timestamp: string;
    label: string;
    detail?: string;
    persona?: PersonaSlug;
  }>;
  /** Learnings — persona-attributed insights */
  learnings: Array<{
    persona: PersonaSlug;
    learning: string;
    category: 'pattern' | 'gotcha' | 'tool' | 'process' | 'architecture';
  }>;
  /** Failure modes observed (or defended against) */
  failureModes: Array<{
    id: string;
    name: string;
    observed: boolean;
    defended: boolean;
    notes?: string;
  }>;
  /** Forward-looking recommendations */
  recommendations: Array<{
    text: string;
    priority: 'high' | 'medium' | 'low';
    persona?: PersonaSlug;
  }>;
  /** Concrete action items */
  actionItems: Array<{
    text: string;
    owner?: PersonaSlug;
    dueBy?: string;
  }>;
  /** Optional summary narrative */
  summary?: string;
}

// ─── Template ───────────────────────────────────────────────────────────────

export const retrospectiveTemplate: DocumentTemplate<RetrospectiveData> = {
  name: 'retrospective',

  generate(data: RetrospectiveData): ContentBlock[] {
    const blocks: ContentBlock[] = [];

    // ── Title ──
    blocks.push({
      type: 'heading',
      level: 1,
      text: `Retrospective: ${data.title}`,
    });

    blocks.push({
      type: 'paragraph',
      text: `${data.dateRange} | ${data.sessionCount} sessions | ${data.batchCount} batches`,
    });

    // ── Summary (editorial two-column) ──
    if (data.summary) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'paragraph',
        text: data.summary,
        editorial: true,
        columns: 2,
      });
    }

    // ── Stats ──
    blocks.push({
      type: 'stat_grid',
      stats: [
        { label: 'Sessions', value: data.sessionCount },
        { label: 'Batches', value: data.batchCount },
        { label: 'Learnings', value: data.learnings.length },
        { label: 'Action Items', value: data.actionItems.length },
      ],
    });

    // ── Timeline ──
    if (data.timeline.length > 0) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'heading',
        level: 2,
        text: 'Timeline',
      });
      blocks.push({
        type: 'timeline',
        entries: data.timeline,
      });
    }

    // ── Learnings ──
    if (data.learnings.length > 0) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'heading',
        level: 2,
        text: 'Learnings',
      });

      // Group by category
      const categories = ['pattern', 'architecture', 'gotcha', 'tool', 'process'] as const;
      for (const cat of categories) {
        const items = data.learnings.filter(l => l.category === cat);
        if (items.length === 0) continue;

        blocks.push({
          type: 'heading',
          level: 3,
          text: cat.charAt(0).toUpperCase() + cat.slice(1) + 's',
        });

        for (const item of items) {
          blocks.push({
            type: 'persona_attribution',
            persona: item.persona,
            text: item.learning,
          });
        }
      }
    }

    // ── Failure Modes ──
    if (data.failureModes.length > 0) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'heading',
        level: 2,
        text: 'Failure Modes',
      });

      blocks.push({
        type: 'table',
        headers: ['ID', 'Name', 'Observed', 'Defended', 'Notes'],
        rows: data.failureModes.map(fm => [
          fm.id,
          fm.name,
          fm.observed ? 'YES' : '—',
          fm.defended ? 'YES' : '—',
          fm.notes ?? '',
        ]),
        columnWidths: [0.08, 0.22, 0.10, 0.10, 0.50],
      });
    }

    // ── Recommendations ──
    if (data.recommendations.length > 0) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'heading',
        level: 2,
        text: 'Recommendations',
      });

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const sorted = [...data.recommendations].sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
      );

      for (const rec of sorted) {
        if (rec.persona) {
          blocks.push({
            type: 'persona_attribution',
            persona: rec.persona,
            text: `[${rec.priority.toUpperCase()}] ${rec.text}`,
          });
        } else {
          blocks.push({
            type: 'paragraph',
            text: `**[${rec.priority.toUpperCase()}]** ${rec.text}`,
          });
        }
      }
    }

    // ── Action Items ──
    if (data.actionItems.length > 0) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'heading',
        level: 2,
        text: 'Action Items',
      });

      blocks.push({
        type: 'table',
        headers: ['Action', 'Owner', 'Due'],
        rows: data.actionItems.map(ai => [
          ai.text,
          ai.owner ?? '—',
          ai.dueBy ?? '—',
        ]),
        columnWidths: [0.60, 0.20, 0.20],
      });
    }

    return blocks;
  },
};
