/**
 * Gate Report Template — structured output from Build Triad + persona gates.
 *
 * Generates content blocks from gate review data:
 *   - Title + batch ID + date
 *   - Summary stats (findings by severity, by persona)
 *   - Findings table (severity-colored, persona-attributed)
 *   - Pull quotes from key findings
 *   - Resolution status
 */

import type {
  ContentBlock,
  DocumentTemplate,
  FindingRow,
} from '../types.js';
import { SEVERITY_ORDER } from '../types.js';
import type { PersonaSlug } from '../persona-colors.js';
import { PERSONA_NAMES } from '../persona-colors.js';

// ─── Template Data ──────────────────────────────────────────────────────────

export interface GateReportData {
  /** Batch ID (e.g., 'P4-Q') */
  batchId: string;
  /** Surface name (e.g., 'PDF Page Layout Engine') */
  surfaceName: string;
  /** ISO date string */
  date: string;
  /** Findings from all personas */
  findings: FindingRow[];
  /** Which triads/agents were dispatched */
  agentsDispatched: string[];
  /** Optional pull quotes from notable findings */
  pullQuotes?: Array<{ text: string; persona: PersonaSlug }>;
  /** Overall gate verdict */
  verdict: 'pass' | 'fail' | 'conditional';
  /** Optional notes */
  notes?: string;
}

// ─── Template ───────────────────────────────────────────────────────────────

export const gateReportTemplate: DocumentTemplate<GateReportData> = {
  name: 'gate-report',

  generate(data: GateReportData): ContentBlock[] {
    const blocks: ContentBlock[] = [];

    // ── Title ──
    blocks.push({
      type: 'heading',
      level: 1,
      text: `Gate Report: ${data.batchId}`,
    });

    blocks.push({
      type: 'heading',
      level: 2,
      text: data.surfaceName,
    });

    blocks.push({
      type: 'paragraph',
      text: `Date: ${data.date} | Agents: ${data.agentsDispatched.join(', ')} | Verdict: ${data.verdict.toUpperCase()}`,
    });

    blocks.push({ type: 'section_break' });

    // ── Summary Stats ──
    blocks.push({
      type: 'heading',
      level: 2,
      text: 'Summary',
    });

    // Counts by severity
    const bySeverity = countBy(data.findings, f => f.severity);
    const byPersona = countBy(data.findings, f => f.persona);
    const resolved = data.findings.filter(f => f.status === 'resolved').length;

    blocks.push({
      type: 'stat_grid',
      stats: [
        { label: 'Total Findings', value: data.findings.length },
        { label: 'Resolved', value: `${resolved}/${data.findings.length}`, color: resolved === data.findings.length ? '#10B981' : '#F59E0B' },
        ...SEVERITY_ORDER.map(sev => ({
          label: sev,
          value: bySeverity[sev] ?? 0,
          color: sev === 'P-CRIT' ? '#EF4444' : sev === 'P-HIGH' ? '#F97316' : sev === 'P-MED' ? '#EAB308' : '#3B82F6',
        })),
      ],
    });

    // Counts by persona
    const personaStats = Object.entries(byPersona).map(([persona, count]) => ({
      label: PERSONA_NAMES[persona as PersonaSlug] ?? persona,
      value: count,
    }));

    if (personaStats.length > 0) {
      blocks.push({
        type: 'stat_grid',
        stats: personaStats,
      });
    }

    blocks.push({ type: 'section_break' });

    // ── Findings Table ──
    blocks.push({
      type: 'heading',
      level: 2,
      text: 'Findings',
    });

    blocks.push({
      type: 'findings_table',
      findings: data.findings,
    });

    // ── Pull Quotes ──
    if (data.pullQuotes && data.pullQuotes.length > 0) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'heading',
        level: 2,
        text: 'Notable Observations',
      });

      for (const quote of data.pullQuotes) {
        blocks.push({
          type: 'pull_quote',
          text: quote.text,
          attribution: quote.persona,
        });
      }
    }

    // ── Notes ──
    if (data.notes) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'heading',
        level: 2,
        text: 'Notes',
      });
      blocks.push({
        type: 'paragraph',
        text: data.notes,
        editorial: true,
      });
    }

    return blocks;
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function countBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of arr) {
    const k = key(item);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}
