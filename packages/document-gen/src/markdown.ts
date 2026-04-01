/**
 * Markdown output generator — converts ContentBlock[] to clean markdown.
 *
 * The second half of OS-ADL-010 (dual output). Same content blocks that
 * produce editorial PDF also produce markdown that Claude can read and
 * reason about. No visual formatting — just structured text.
 */

import type {
  ContentBlock,
  FindingRow,
  StatItem,
  TimelineEntry,
} from './types.js';
import { SEVERITY_ORDER } from './types.js';
import { PERSONA_NAMES } from './persona-colors.js';
import type { PersonaSlug } from './persona-colors.js';

/**
 * Render content blocks to a markdown string.
 */
export function renderMarkdown(blocks: ContentBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    parts.push(renderBlockToMarkdown(block));
  }

  return parts.join('\n\n');
}

function renderBlockToMarkdown(block: ContentBlock): string {
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(block.level)} ${block.text}`;

    case 'paragraph':
      return block.text;

    case 'table':
      return renderTableMd(block.headers, block.rows);

    case 'findings_table':
      return renderFindingsTableMd(block.findings);

    case 'stat_grid':
      return renderStatGridMd(block.stats);

    case 'section_break':
      return '---';

    case 'page_break':
      return '\n---\n';

    case 'pull_quote':
      return `> "${block.text}"\n> — ${PERSONA_NAMES[block.attribution]}`;

    case 'persona_attribution':
      return `**${PERSONA_NAMES[block.persona]}:** ${block.text}`;

    case 'timeline':
      return renderTimelineMd(block.entries);

    case 'metric':
      return `**${block.label}:** ${block.value}${block.unit ?? ''} / ${block.max}${block.unit ?? ''}`;

    default:
      return '';
  }
}

function escapeMdCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function renderTableMd(headers: string[], rows: string[][]): string {
  const lines: string[] = [];

  // Header row
  lines.push(`| ${headers.map(escapeMdCell).join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);

  // Data rows
  for (const row of rows) {
    const cells = headers.map((_, i) => escapeMdCell(row[i] ?? ''));
    lines.push(`| ${cells.join(' | ')} |`);
  }

  return lines.join('\n');
}

function renderFindingsTableMd(findings: FindingRow[]): string {
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  const headers = ['Severity', 'Persona', 'Description', 'Status', 'Fix'];
  const rows = sorted.map(f => [
    f.severity,
    PERSONA_NAMES[f.persona],
    f.description,
    f.status,
    f.fix ?? '—',
  ]);

  return renderTableMd(headers, rows);
}

function renderStatGridMd(stats: StatItem[]): string {
  return stats.map(s => `- **${s.label}:** ${s.value}`).join('\n');
}

function renderTimelineMd(entries: TimelineEntry[]): string {
  return entries.map(e => {
    const persona = e.persona ? ` (${PERSONA_NAMES[e.persona]})` : '';
    const detail = e.detail ? ` — ${e.detail}` : '';
    return `- **${e.timestamp}** ${e.label}${persona}${detail}`;
  }).join('\n');
}
