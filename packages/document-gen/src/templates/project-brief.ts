/**
 * Project Brief Template — generated during /init or /link.
 *
 * Dual-output summary of project setup:
 *   - Project name + stack
 *   - Architecture decisions
 *   - Batch plan overview
 *   - Persona assignments (with glyph attribution)
 *   - Editorial two-column layout for narrative sections
 */

import type {
  ContentBlock,
  DocumentTemplate,
} from '../types.js';
import type { PersonaSlug } from '../persona-colors.js';

// ─── Template Data ──────────────────────────────────────────────────────────

export interface ProjectBriefData {
  /** Project name */
  projectName: string;
  /** Date generated */
  date: string;
  /** Stack summary (e.g., 'Tauri v2 + React + SQLite') */
  stack: string;
  /** Architecture decisions */
  decisions: Array<{ id: string; title: string; summary: string }>;
  /** Phase overview */
  phases: Array<{ number: number; name: string; sessions: number; status: string }>;
  /** Persona assignments */
  assignments: Array<{ persona: PersonaSlug; role: string; focus: string }>;
  /** Optional narrative description */
  description?: string;
}

// ─── Template ───────────────────────────────────────────────────────────────

export const projectBriefTemplate: DocumentTemplate<ProjectBriefData> = {
  name: 'project-brief',

  generate(data: ProjectBriefData): ContentBlock[] {
    const blocks: ContentBlock[] = [];

    // ── Title ──
    blocks.push({
      type: 'heading',
      level: 1,
      text: data.projectName,
    });

    blocks.push({
      type: 'paragraph',
      text: `Generated: ${data.date} | Stack: ${data.stack}`,
    });

    // ── Description (editorial two-column) ──
    if (data.description) {
      blocks.push({ type: 'section_break' });
      blocks.push({
        type: 'heading',
        level: 2,
        text: 'Overview',
      });
      blocks.push({
        type: 'paragraph',
        text: data.description,
        editorial: true,
        columns: 2,
      });
    }

    // ── Architecture Decisions ──
    blocks.push({ type: 'section_break' });
    blocks.push({
      type: 'heading',
      level: 2,
      text: 'Architecture Decisions',
    });

    blocks.push({
      type: 'table',
      headers: ['ID', 'Decision', 'Summary'],
      rows: data.decisions.map(d => [d.id, d.title, d.summary]),
      columnWidths: [0.12, 0.30, 0.58],
    });

    // ── Build Plan ──
    blocks.push({ type: 'section_break' });
    blocks.push({
      type: 'heading',
      level: 2,
      text: 'Build Plan',
    });

    blocks.push({
      type: 'table',
      headers: ['Phase', 'Name', 'Sessions', 'Status'],
      rows: data.phases.map(p => [String(p.number), p.name, String(p.sessions), p.status]),
      columnWidths: [0.10, 0.40, 0.15, 0.35],
    });

    // Metrics
    const totalSessions = data.phases.reduce((sum, p) => sum + p.sessions, 0);
    const completedPhases = data.phases.filter(p => p.status.toLowerCase().includes('complete')).length;

    blocks.push({
      type: 'stat_grid',
      stats: [
        { label: 'Phases', value: data.phases.length },
        { label: 'Total Sessions', value: totalSessions },
        { label: 'Phases Complete', value: completedPhases, color: '#10B981' },
        { label: 'Personas Assigned', value: data.assignments.length },
      ],
    });

    // ── Team Roster ──
    blocks.push({ type: 'section_break' });
    blocks.push({
      type: 'heading',
      level: 2,
      text: 'Team Roster',
    });

    for (const assignment of data.assignments) {
      blocks.push({
        type: 'persona_attribution',
        persona: assignment.persona,
        text: `${assignment.role} — ${assignment.focus}`,
      });
    }

    return blocks;
  },
};
