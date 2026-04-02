// Findings Feed — Phase 5.2 (P5-I)
// Severity-as-typography findings list. Persona glyph attribution. Filters + real-time updates.
// TODO: Wire virtual scroll (createIncrementalHeightMap + estimateCardHeight) when list > ~100.

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { PersonaGlyph, CANVAS, STATUS, DOCK, RADIUS } from '@forge-os/canvas-components';
import { PERSONA_LABELS, PERSONA_SHORT, isPersonaSlug } from '@forge-os/shared';
import {
  isTauriRuntime,
  createPanelWindow,
  listHudFindings,
  getFindingCounts,
  onFindingAdded,
  onFindingResolved,
  type HudFinding,
  type FindingsFilter,
  type HudSeverityCounts,
  type FindingResolvedEvent,
} from '../../lib/tauri';
import {
  getSeverityVisual,
  buildCardStyles,
} from './hud/finding-card-renderer';

// ─── Constants ──────────────────────────────────────────────────────────────

const SEVERITY_OPTIONS = ['all', 'critical', 'high', 'medium', 'low', 'info'] as const;
// Backend currently supports 'open' and 'resolved'. Add 'acknowledged'/'deferred' when backend supports them.
const STATUS_OPTIONS = ['all', 'open', 'resolved'] as const;
const CARD_GAP = 4;

// ─── Filter Bar ─────────────────────────────────────────────────────────────

interface FilterBarProps {
  severityFilter: string;
  statusFilter: string;
  personaFilter: string;
  onSeverityChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onPersonaChange: (v: string) => void;
  counts: HudSeverityCounts;
}

const SELECT_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  padding: '5px 8px',
  minHeight: 32,
  borderRadius: RADIUS.pill,
  background: CANVAS.bgElevated,
  color: CANVAS.text,
  border: `1px solid ${CANVAS.border}`,
  outline: 'none',
  cursor: 'pointer',
};

function FilterBar({
  severityFilter, statusFilter, personaFilter,
  onSeverityChange, onStatusChange, onPersonaChange,
  counts,
}: FilterBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        flexWrap: 'wrap',
      }}
    >
      {/* Severity filter */}
      <select
        value={severityFilter}
        onChange={(e) => onSeverityChange(e.target.value)}
        style={SELECT_STYLE}
        aria-label="Filter by severity"
      >
        {SEVERITY_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s === 'all' ? `All (${counts.total})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s as keyof Omit<HudSeverityCounts, 'total'>]})`}
          </option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        style={SELECT_STYLE}
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>

      {/* Persona filter */}
      <select
        value={personaFilter}
        onChange={(e) => onPersonaChange(e.target.value)}
        style={SELECT_STYLE}
        aria-label="Filter by persona"
      >
        <option value="all">All personas</option>
        {Object.entries(PERSONA_LABELS).map(([slug, label]) => (
          <option key={slug} value={slug}>{label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Finding Card ───────────────────────────────────────────────────────────

interface FindingCardProps {
  finding: HudFinding;
}

const FindingCard = memo(function FindingCard({ finding }: FindingCardProps) {
  const [hovered, setHovered] = useState(false);
  const styles = useMemo(() => buildCardStyles(finding.severity, finding.status), [finding.severity, finding.status]);
  const sv = getSeverityVisual(finding.severity);
  const personaDisplayName = PERSONA_SHORT[finding.persona as keyof typeof PERSONA_SHORT] ?? finding.persona;

  const containerStyle: React.CSSProperties = {
    ...styles.container,
    background: hovered ? CANVAS.bgElevated : styles.container.background,
  };

  return (
    <div
      role="listitem"
      tabIndex={0}
      aria-label={`${sv.label} — ${finding.title} — ${finding.status}`}
      style={containerStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header: severity badge + title */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
        <span style={styles.severityBadge}>{sv.label}</span>
        <div style={styles.title}>{finding.title}</div>
      </div>

      {/* Description */}
      {finding.description && (
        <div style={{ ...styles.description, marginTop: 2 }}>
          {finding.description}
        </div>
      )}

      {/* Metadata row: persona glyph + name + file path + status */}
      <div style={{ ...styles.metadata, marginTop: 4 }}>
        {isPersonaSlug(finding.persona) && (
          <PersonaGlyph size={14} persona={finding.persona} state="idle" />
        )}
        <span style={styles.personaName}>{personaDisplayName}</span>

        {finding.file_path && (
          <span style={{ color: CANVAS.muted, fontSize: 10 }}>
            {finding.file_path}{finding.line_number != null ? `:${finding.line_number}` : ''}
          </span>
        )}

        <span style={{ marginLeft: 'auto', ...styles.statusBadge }}>
          {finding.status}
        </span>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.finding.id === next.finding.id &&
  prev.finding.status === next.finding.status &&
  prev.finding.resolved_at === next.finding.resolved_at
);

// ─── Findings Panel ─────────────────────────────────────────────────────────

export default function FindingsPanel() {
  const [findings, setFindings] = useState<HudFinding[]>([]);
  const [counts, setCounts] = useState<HudSeverityCounts>({ critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [personaFilter, setPersonaFilter] = useState('all');

  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Data fetching ──────────────────────────────────────────────────────
  const fetchFindings = useCallback(async () => {
    try {
      const filter: FindingsFilter = {};
      if (severityFilter !== 'all') filter.severity = severityFilter;
      if (statusFilter !== 'all') filter.status = statusFilter;
      if (personaFilter !== 'all') filter.persona = personaFilter;

      const [list, countData] = await Promise.all([
        listHudFindings(Object.keys(filter).length > 0 ? filter : undefined),
        getFindingCounts(),
      ]);
      setFindings(list);
      setCounts(countData);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter, personaFilter]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  // ─── Real-time event listeners ──────────────────────────────────────────
  useEffect(() => {
    let unlistenAdd: (() => void) | null = null;
    let unlistenResolve: (() => void) | null = null;
    let mounted = true;

    onFindingAdded((finding: HudFinding) => {
      setFindings((prev) => [finding, ...prev]);
      // Re-fetch accurate counts from server (real-time additions may not match active filters)
      getFindingCounts().then(setCounts).catch(() => {});
    }).then((fn) => {
      if (mounted) unlistenAdd = fn;
      else fn();
    });

    onFindingResolved((event: FindingResolvedEvent) => {
      setFindings((prev) =>
        prev.map((f) =>
          f.id === event.finding_id
            ? { ...f, status: 'resolved', resolved_at: event.resolved_at }
            : f
        )
      );
      getFindingCounts().then(setCounts).catch(() => {});
    }).then((fn) => {
      if (mounted) unlistenResolve = fn;
      else fn();
    });

    return () => {
      mounted = false;
      unlistenAdd?.();
      unlistenResolve?.();
    };
  }, []);

  // ─── Filtered + sorted findings ─────────────────────────────────────────
  const filteredFindings = useMemo(() => {
    let result = findings;

    // Client-side filtering (supplements server-side filter for real-time additions)
    if (severityFilter !== 'all') {
      result = result.filter((f) => f.severity === severityFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((f) => f.status === statusFilter);
    }
    if (personaFilter !== 'all') {
      result = result.filter((f) => f.persona === personaFilter);
    }

    // Sort: severity weight desc (CRIT first), then newest first
    const severityWeight: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    return [...result].sort((a, b) => {
      const wDiff = (severityWeight[b.severity] ?? 0) - (severityWeight[a.severity] ?? 0);
      if (wDiff !== 0) return wDiff;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [findings, severityFilter, statusFilter, personaFilter]);

  // ─── Pop-out ────────────────────────────────────────────────────────────
  const handlePopOut = useCallback(() => {
    if (!isTauriRuntime) return;
    createPanelWindow({
      panel_id: 'findings',
      panel_type: 'FindingsPanel',
      title: 'Findings Feed',
      width: 500,
      height: 600,
    });
  }, []);

  // ─── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 16 }}>
        <div style={{ fontSize: 24, color: STATUS.danger }}>!</div>
        <div style={{ color: STATUS.danger, fontSize: 13, textAlign: 'center' }}>Failed to load findings</div>
        <div style={{ color: CANVAS.muted, fontSize: 11, textAlign: 'center', maxWidth: 240 }}>{error}</div>
        <button
          onClick={fetchFindings}
          aria-label="Retry loading findings"
          style={{ marginTop: 4, padding: '4px 12px', fontSize: 11, minHeight: 32, color: STATUS.accent, background: DOCK.activeBg, border: `1px solid ${DOCK.activeBorder}`, borderRadius: RADIUS.pill, cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading && findings.length === 0) {
    return (
      <div style={{ height: '100%', padding: 8, background: CANVAS.bg }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: CARD_GAP }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: 60, background: CANVAS.trackBg, borderRadius: RADIUS.pill, borderLeft: `3px solid ${CANVAS.border}` }} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Main layout ────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        background: CANVAS.bg,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          borderBottom: `1px solid ${CANVAS.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: CANVAS.label, fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Findings
          </span>
          {counts.total > 0 && (
            <span style={{ fontSize: 10, color: CANVAS.muted }}>
              {counts.total} total
              {counts.critical > 0 && <span style={{ color: STATUS.danger, marginLeft: 4 }}>{counts.critical} crit</span>}
              {counts.high > 0 && <span style={{ color: STATUS.accent, marginLeft: 4 }}>{counts.high} high</span>}
            </span>
          )}
        </div>
        {isTauriRuntime && (
          <button
            onClick={handlePopOut}
            aria-label="Pop out findings feed"
            style={{ background: 'transparent', border: 'none', color: CANVAS.muted, cursor: 'pointer', fontSize: 13, padding: '2px 4px', borderRadius: RADIUS.pill, lineHeight: 1, minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Pop out"
          >
            &#x2197;
          </button>
        )}
      </div>

      {/* Filter bar */}
      <FilterBar
        severityFilter={severityFilter}
        statusFilter={statusFilter}
        personaFilter={personaFilter}
        onSeverityChange={setSeverityFilter}
        onStatusChange={setStatusFilter}
        onPersonaChange={setPersonaFilter}
        counts={counts}
      />

      {/* Findings list — native scroll for now. TODO: Wire createIncrementalHeightMap
          + estimateCardHeight from layout-engine when list exceeds ~100 findings for
          windowed rendering. See layout-engine/virtual.ts. */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px 8px' }}>
        {filteredFindings.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, padding: 16 }}>
            <div style={{ fontSize: 20, color: CANVAS.muted }}>&#x2713;</div>
            <div style={{ color: CANVAS.label, fontSize: 13, textAlign: 'center' }}>
              {findings.length === 0 ? 'No findings yet' : 'No findings match filters'}
            </div>
            <div style={{ color: CANVAS.muted, fontSize: 11, textAlign: 'center', maxWidth: 220 }}>
              {findings.length === 0
                ? 'Run a gate review to see findings here.'
                : 'Try adjusting your filters.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: CARD_GAP }}>
            {filteredFindings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
