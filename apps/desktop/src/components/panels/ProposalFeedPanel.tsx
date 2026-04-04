// ── Proposal Feed Panel — P7-K ──
// Timeline layout: newest at top, scroll-to-load-more.
// Proposal cards with PersonaGlyph, status badges, severity badges.
// Evaluation threads: indented replies with vertical connector.
// Decision outcomes inline. Dismissal cards with distinct treatment.
// Filter bar: author persona (glyph pills), proposal type, status, source.

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  PersonaGlyph,
  StatusBadge,
  CANVAS,
  STATUS,
  RADIUS,
  BADGE_COLORS,
  CONTAINMENT,
  TINT,
  type BadgeStatus,
} from '@forge-os/canvas-components';
import { PERSONA_SHORT, isPersonaSlug, type PersonaSlug } from '@forge-os/shared';
import { useProposalFeed } from '../../hooks/useProposalFeed';
import type {
  FeedEntry,
  Proposal,
  ProposalResponse,
  Decision,
  DismissalRecord,
  ProposalFilter,
  ProposalStatus,
  ProposalSource,
  ProposalType as PType,
} from '../../lib/tauri';

// ─── Strings (M-LOW-2: centralized for i18n readiness) ──────────────────────

const STRINGS = {
  panelTitle: 'Agora',
  filterLabel: 'Feed filters',
  filterAllTypes: 'All types',
  filterAllStatuses: 'All statuses',
  filterAllSources: 'All sources',
  filterByType: 'Filter by proposal type',
  filterByStatus: 'Filter by status',
  filterBySource: 'Filter by source',
  filterAll: 'All',
  clearFilters: 'Clear filters',
  loadingProposals: 'Loading proposals',
  loadingMore: 'Loading more\u2026',
  endOfFeed: 'End of feed',
  emptyFiltered: 'No proposals match the current filters',
  emptyDefault: 'No proposals yet \u2014 personas will file proposals during builds',
  refreshFeed: 'Refresh feed',
  retry: 'Retry',
  evaluated: 'evaluated',
  accepted: 'Accepted',
  rejected: 'Rejected',
  dismissed: 'Dismissed',
  errorNetwork: 'Network error \u2014 check your connection.',
  errorTimeout: 'Request timed out.',
  errorGeneric: 'Something went wrong. Try again.',
  timeJustNow: 'just now',
  timeMinsAgo: (n: number) => `${n}m ago`,
  timeHoursAgo: (n: number) => `${n}h ago`,
  timeDaysAgo: (n: number) => `${n}d ago`,
  newEntries: (n: number) => `${n} new ${n === 1 ? 'entry' : 'entries'} in the feed`,
  entryCount: (n: number) => `${n} entries`,
  batch: (id: string) => `Batch: ${id}`,
} as const;

// ─── Constants ──────────────────────────────────────────────────────────────

const PROPOSAL_TYPE_OPTIONS = ['all', 'optimization', 'pattern', 'rule', 'architecture', 'skill', 'policy'] as const;
const STATUS_OPTIONS = ['all', 'open', 'evaluating', 'accepted', 'rejected'] as const;
const SOURCE_OPTIONS = ['all', 'persona', 'automated', 'consortium'] as const;

const SELECT_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  padding: '5px 8px',
  minHeight: 32,
  borderRadius: RADIUS.pill,
  background: CANVAS.bgElevated,
  color: CANVAS.text,
  border: `1px solid ${CANVAS.border}`,
  cursor: 'pointer',
};

// ─── Status / Severity Mapping ──────────────────────────────────────────────

function proposalStatusToBadge(status: ProposalStatus): BadgeStatus {
  switch (status) {
    case 'open': return 'active';
    case 'evaluating': return 'warning';
    case 'accepted': return 'success';
    case 'rejected': return 'danger';
  }
}

function proposalStatusLabel(status: ProposalStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function severityToBadge(severity: string): BadgeStatus {
  switch (severity) {
    case 'critical': return 'danger';
    case 'high': return 'danger';
    case 'medium': return 'warning';
    case 'low': return 'neutral';
    case 'info': return 'neutral';
    default: return 'neutral';
  }
}

function proposalTypeLabel(t: PType): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function friendlyError(raw: string): string {
  if (raw.includes('network') || raw.includes('fetch')) return STRINGS.errorNetwork;
  if (raw.includes('timeout')) return STRINGS.errorTimeout;
  return STRINGS.errorGeneric;
}

// ─── Filter Bar ─────────────────────────────────────────────────────────────

interface FilterBarProps {
  authorFilter: string;
  typeFilter: string;
  statusFilter: string;
  sourceFilter: string;
  onAuthorChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onSourceChange: (v: string) => void;
}

const PERSONA_SLUGS: PersonaSlug[] = [
  'nyx', 'pierce', 'mara', 'riven', 'kehinde',
  'tanaka', 'vane', 'voss', 'calloway', 'sable',
];

function FilterBar({
  authorFilter, typeFilter, statusFilter, sourceFilter,
  onAuthorChange, onTypeChange, onStatusChange, onSourceChange,
}: FilterBarProps) {
  return (
    <div
      role="group"
      aria-label={STRINGS.filterLabel}
      style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        padding: '6px 8px',
        borderBottom: `1px solid ${CANVAS.border}`,
      }}
    >
      {/* Author persona pills */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          onClick={() => onAuthorChange('all')}
          aria-pressed={authorFilter === 'all'}
          style={{
            ...SELECT_STYLE,
            fontSize: 10,
            padding: '3px 8px',
            minHeight: 32,
            background: authorFilter === 'all' ? TINT.subtle : CANVAS.bgElevated,
            border: authorFilter === 'all' ? `1px solid ${STATUS.accent}` : `1px solid ${CANVAS.border}`,
          }}
        >
          {STRINGS.filterAll}
        </button>
        {PERSONA_SLUGS.map((slug) => (
          <button
            key={slug}
            onClick={() => onAuthorChange(slug)}
            aria-pressed={authorFilter === slug}
            aria-label={PERSONA_SHORT[slug]}
            title={PERSONA_SHORT[slug]}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: RADIUS.pill,
              background: authorFilter === slug ? TINT.subtle : 'transparent',
              border: authorFilter === slug ? `1px solid ${STATUS.accent}` : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true"><PersonaGlyph persona={slug} size={20} /></span>
          </button>
        ))}
      </div>

      {/* Type filter */}
      <select
        value={typeFilter}
        onChange={(e) => onTypeChange(e.target.value)}
        aria-label={STRINGS.filterByType}
        style={SELECT_STYLE}
      >
        {PROPOSAL_TYPE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt === 'all' ? STRINGS.filterAllTypes : proposalTypeLabel(opt as PType)}
          </option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label={STRINGS.filterByStatus}
        style={SELECT_STYLE}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt === 'all' ? STRINGS.filterAllStatuses : proposalStatusLabel(opt as ProposalStatus)}
          </option>
        ))}
      </select>

      {/* Source filter */}
      <select
        value={sourceFilter}
        onChange={(e) => onSourceChange(e.target.value)}
        aria-label={STRINGS.filterBySource}
        style={SELECT_STYLE}
      >
        {SOURCE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt === 'all' ? STRINGS.filterAllSources : opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Feed Entry Cards ───────────────────────────────────────────────────────

const ProposalCard = memo(function ProposalCard({ proposal }: { proposal: Proposal }) {
  const authorSlug = isPersonaSlug(proposal.author) ? proposal.author : undefined;
  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`Proposal by ${authorSlug ? PERSONA_SHORT[authorSlug] : proposal.author}: ${proposal.title}`}
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 12px',
        borderRadius: RADIUS.card,
        background: CANVAS.bgElevated,
        border: `1px solid ${CANVAS.border}`,
      }}
    >
      {/* Glyph */}
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        {authorSlug ? (
          <PersonaGlyph persona={authorSlug} size={24} />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: CANVAS.trackBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: CANVAS.label,
            }}
          >
            ?
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row: title + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: CANVAS.text }}>
            {proposal.title}
          </span>
          <StatusBadge
            width={70}
            height={18}
            status={proposalStatusToBadge(proposal.status)}
            label={proposalStatusLabel(proposal.status)}
          />
          <StatusBadge
            width={60}
            height={18}
            status={severityToBadge(proposal.severity)}
            label={proposal.severity}
          />
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: RADIUS.pill,
              background: BADGE_COLORS.neutral.bg,
              color: BADGE_COLORS.neutral.text,
            }}
          >
            {proposalTypeLabel(proposal.proposal_type)}
          </span>
        </div>

        {/* Meta line */}
        <div style={{ fontSize: 11, color: CANVAS.label, marginTop: 3 }}>
          <span>{authorSlug ? PERSONA_SHORT[authorSlug] : proposal.author}</span>
          <span aria-hidden="true"> \u00b7 </span>
          <span>{proposal.source}</span>
          <span aria-hidden="true"> \u00b7 </span>
          <time dateTime={proposal.created_at}>{formatRelative(proposal.created_at)}</time>
          {proposal.evaluators.length > 0 && (
            <>
              <span aria-hidden="true"> \u00b7 </span>
              <span>Evaluators: {proposal.evaluators.join(', ')}</span>
            </>
          )}
        </div>

        {/* Body excerpt — CSS line-clamp for consistent visual height (M-LOW-1) */}
        <p style={{
          fontSize: 12, color: CANVAS.muted, margin: '4px 0 0', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
        }}>
          {proposal.body}
        </p>
      </div>
    </div>
  );
});

const ResponseCard = memo(function ResponseCard({ response }: { response: ProposalResponse }) {
  const authorSlug = isPersonaSlug(response.author) ? response.author : undefined;
  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`Evaluation by ${authorSlug ? PERSONA_SHORT[authorSlug] : response.author}`}
      style={{
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        marginLeft: 34,
        borderLeft: `2px solid ${CANVAS.border}`,
        background: 'transparent',
      }}
    >
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        {authorSlug ? (
          <PersonaGlyph persona={authorSlug} size={20} />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: CANVAS.trackBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: CANVAS.label,
            }}
          >
            ?
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: CANVAS.label }}>
          <span style={{ fontWeight: 700 }}>
            {authorSlug ? PERSONA_SHORT[authorSlug] : response.author}
          </span>
          <span> {STRINGS.evaluated}</span>
          <span aria-hidden="true"> \u00b7 </span>
          <time dateTime={response.created_at}>{formatRelative(response.created_at)}</time>
        </div>
        <p style={{
          fontSize: 12, color: CANVAS.muted, margin: '3px 0 0', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
        }}>
          {response.body}
        </p>
      </div>
    </div>
  );
});

const DecisionCard = memo(function DecisionCard({ decision }: { decision: Decision }) {
  const isAccepted = decision.resolution === 'accepted';
  const borderColor = isAccepted ? STATUS.success : STATUS.danger;
  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`Decision: ${isAccepted ? 'accepted' : 'rejected'}`}
      style={{
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        marginLeft: 34,
        borderLeft: `2px solid ${borderColor}`,
        background: 'transparent',
      }}
    >
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <span aria-hidden="true" style={{ fontSize: 16 }}>{isAccepted ? '\u2713' : '\u2715'}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: CANVAS.label }}>
          <span style={{ fontWeight: 700, color: borderColor }}>
            {isAccepted ? STRINGS.accepted : STRINGS.rejected}
          </span>
          {decision.outcome && (
            <>
              <span aria-hidden="true"> \u00b7 </span>
              <StatusBadge
                width={56}
                height={16}
                status={decision.outcome === 'success' ? 'success' : decision.outcome === 'partial' ? 'warning' : 'danger'}
                label={decision.outcome}
              />
            </>
          )}
          <span aria-hidden="true"> \u00b7 </span>
          <time dateTime={decision.created_at}>{formatRelative(decision.created_at)}</time>
        </div>
        <p style={{ fontSize: 12, color: CANVAS.muted, margin: '3px 0 0', lineHeight: 1.4 }}>
          {decision.rationale}
        </p>
        {decision.implementing_batch && (
          <span style={{ fontSize: 10, color: CANVAS.label, marginTop: 2, display: 'inline-block' }}>
            {STRINGS.batch(decision.implementing_batch)}
          </span>
        )}
      </div>
    </div>
  );
});

const DismissalCard = memo(function DismissalCard({ dismissal }: { dismissal: DismissalRecord }) {
  const typeLabel = dismissal.dismissal_type.replace(/_/g, ' ');
  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`Dismissed: ${dismissal.summary}`}
      style={{
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        marginLeft: 34,
        borderLeft: `2px solid ${STATUS.neutral}`,
        background: 'transparent',
        opacity: 0.75,
      }}
    >
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <span aria-hidden="true" style={{ fontSize: 14, color: STATUS.neutral }}>\u2014</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: CANVAS.label }}>
          <span style={{ fontWeight: 700 }}>{STRINGS.dismissed}</span>
          <span aria-hidden="true"> \u00b7 </span>
          <span style={{ fontStyle: 'italic' }}>{typeLabel}</span>
          <span aria-hidden="true"> \u00b7 </span>
          <time dateTime={dismissal.created_at}>{formatRelative(dismissal.created_at)}</time>
        </div>
        <p style={{ fontSize: 12, color: CANVAS.muted, margin: '3px 0 0', lineHeight: 1.4 }}>
          <strong>{dismissal.summary}</strong> \u2014 {dismissal.justification}
        </p>
      </div>
    </div>
  );
});

/** Render a single feed entry by type. */
const FeedEntryCard = memo(function FeedEntryCard({ entry }: { entry: FeedEntry }) {
  switch (entry.entry_type) {
    case 'proposal_filed':
      return <ProposalCard proposal={entry.proposal} />;
    case 'response_added':
      return <ResponseCard response={entry.response} />;
    case 'decision_made':
      return <DecisionCard decision={entry.decision} />;
    case 'proposal_dismissed':
      return <DismissalCard dismissal={entry.dismissal} />;
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
});

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function SkeletonCard({ reduced }: { reduced: boolean }) {
  const shimmer = reduced ? 'none' : 'proposal-shimmer 1.5s infinite ease-in-out';
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 12px',
        borderRadius: RADIUS.card,
        background: CANVAS.bgElevated,
        border: `1px solid ${CANVAS.border}`,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: CANVAS.trackBg,
          animation: shimmer,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            width: '60%',
            height: 14,
            borderRadius: RADIUS.pill,
            background: CANVAS.trackBg,
            marginBottom: 6,
            animation: shimmer,
          }}
        />
        <div
          style={{
            width: '40%',
            height: 10,
            borderRadius: RADIUS.pill,
            background: CANVAS.trackBg,
            animation: shimmer,
          }}
        />
      </div>
    </div>
  );
}

const SHIMMER_KEYFRAME = `@keyframes proposal-shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }`;

// ─── Main Panel ─────────────────────────────────────────────────────────────

export default function ProposalFeedPanel() {
  // ── Filter state ──
  const [authorFilter, setAuthorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const reducedMotion = useReducedMotion();

  const hasActiveFilter = authorFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || sourceFilter !== 'all';

  const filter: ProposalFilter = {
    author: authorFilter === 'all' ? undefined : authorFilter,
    proposal_type: typeFilter === 'all' ? undefined : typeFilter as PType,
    status: statusFilter === 'all' ? undefined : statusFilter as ProposalStatus,
    source: sourceFilter === 'all' ? undefined : sourceFilter as ProposalSource,
  };

  const clearFilters = useCallback(() => {
    setAuthorFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setSourceFilter('all');
  }, []);

  const { entries, loading, error, hasMore, loadMore, refresh } = useProposalFeed(filter);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRafRef = useRef(0);

  // ── Scroll-to-load-more (rAF throttled — P-LOW-2 fix) ──
  const handleScroll = useCallback(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      const el = scrollRef.current;
      if (!el || !hasMore || loadingMore) return;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
        setLoadingMore(true);
        loadMore().finally(() => setLoadingMore(false));
      }
    });
  }, [hasMore, loadingMore, loadMore]);

  // ── Live region: announce entry count changes ──
  const [liveMessage, setLiveMessage] = useState('');
  const prevCount = useRef(0);
  useEffect(() => {
    if (entries.length > prevCount.current && prevCount.current > 0) {
      const diff = entries.length - prevCount.current;
      setLiveMessage(STRINGS.newEntries(diff));
    }
    prevCount.current = entries.length;
  }, [entries.length]);

  // ── Render ──

  // Loading state
  if (loading && entries.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: CANVAS.bg,
          boxShadow: CONTAINMENT.glow,
        }}
      >
        <Header onRefresh={refresh} />
        <FilterBar
          authorFilter={authorFilter}
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          sourceFilter={sourceFilter}
          onAuthorChange={setAuthorFilter}
          onTypeChange={setTypeFilter}
          onStatusChange={setStatusFilter}
          onSourceChange={setSourceFilter}
        />
        <style>{SHIMMER_KEYFRAME}</style>
        <div
          role="status"
          aria-label={STRINGS.loadingProposals}
          style={{ padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} reduced={reducedMotion} />
          ))}
        </div>
      </div>
    );
  }

  // Error state (no data)
  if (error && entries.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: CANVAS.bg,
          boxShadow: CONTAINMENT.glow,
        }}
      >
        <Header onRefresh={refresh} />
        <div
          role="alert"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 16,
          }}
        >
          <span style={{ fontSize: 13, color: STATUS.danger }}>{friendlyError(error)}</span>
          <button
            onClick={refresh}
            autoFocus
            style={{
              ...SELECT_STYLE,
              background: CANVAS.bgElevated,
              cursor: 'pointer',
            }}
          >
            {STRINGS.retry}
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && entries.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: CANVAS.bg,
          boxShadow: CONTAINMENT.glow,
        }}
      >
        <Header onRefresh={refresh} />
        <FilterBar
          authorFilter={authorFilter}
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          sourceFilter={sourceFilter}
          onAuthorChange={setAuthorFilter}
          onTypeChange={setTypeFilter}
          onStatusChange={setStatusFilter}
          onSourceChange={setSourceFilter}
        />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: 16,
            color: CANVAS.label,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 28, opacity: 0.4 }}>{'\uD83D\uDD2E'}</span>
          <span style={{ fontSize: 13, textAlign: 'center' }}>
            {hasActiveFilter ? STRINGS.emptyFiltered : STRINGS.emptyDefault}
          </span>
          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              style={{
                ...SELECT_STYLE,
                marginTop: 4,
                background: CANVAS.bgElevated,
                cursor: 'pointer',
              }}
            >
              {STRINGS.clearFilters}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Normal: feed entries
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: CANVAS.bg,
        boxShadow: CONTAINMENT.glow,
      }}
    >
      <Header onRefresh={refresh} entryCount={entries.length} />

      {/* Non-fatal error banner */}
      {error && entries.length > 0 && (
        <div
          role="alert"
          style={{
            padding: '4px 8px',
            background: BADGE_COLORS.warning.bg,
            color: BADGE_COLORS.warning.text,
            fontSize: 11,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span>{friendlyError(error)}</span>
          <button
            onClick={refresh}
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: RADIUS.pill,
              background: 'rgba(0,0,0,0.2)',
              color: 'inherit',
              border: 'none',
              cursor: 'pointer',
              minHeight: 32,
            }}
          >
            {STRINGS.retry}
          </button>
        </div>
      )}

      <FilterBar
        authorFilter={authorFilter}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        sourceFilter={sourceFilter}
        onAuthorChange={setAuthorFilter}
        onTypeChange={setTypeFilter}
        onStatusChange={setStatusFilter}
        onSourceChange={setSourceFilter}
      />

      {/* Live region for screen readers — update-only, not initial */}
      <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: 0, padding: 0, margin: -1 }}>
        {liveMessage}
      </div>

      {/* Feed timeline */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        tabIndex={0}
        role="log"
        aria-label={STRINGS.panelTitle}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {entries.map((entry) => (
          <FeedEntryCard key={feedEntryKey(entry)} entry={entry} />
        ))}
        {loadingMore && (
          <div role="status" aria-label={STRINGS.loadingMore} style={{ padding: 8, textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: CANVAS.label }}>{STRINGS.loadingMore}</span>
          </div>
        )}
        {!hasMore && entries.length > 0 && (
          <div style={{ padding: 8, textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: CANVAS.label }}>{STRINGS.endOfFeed}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function Header({ onRefresh, entryCount }: { onRefresh: () => void; entryCount?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        borderBottom: `1px solid ${CANVAS.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.05em',
            color: CANVAS.text,
          }}
        >
          {STRINGS.panelTitle}
        </span>
        {entryCount !== undefined && entryCount > 0 && (
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: RADIUS.pill,
              background: BADGE_COLORS.accent.bg,
              color: BADGE_COLORS.accent.text,
            }}
            aria-label={STRINGS.entryCount(entryCount)}
          >
            {entryCount}
          </span>
        )}
      </div>
      <button
        onClick={onRefresh}
        aria-label={STRINGS.refreshFeed}
        title={STRINGS.refreshFeed}
        style={{
          background: 'transparent',
          border: 'none',
          color: CANVAS.label,
          cursor: 'pointer',
          fontSize: 14,
          padding: '4px 6px',
          borderRadius: RADIUS.pill,
          minWidth: 32,
          minHeight: 32,
        }}
      >
        {'\u21BB'}
      </button>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function feedEntryKey(entry: FeedEntry): string {
  switch (entry.entry_type) {
    case 'proposal_filed': return `p-${entry.proposal.id}`;
    case 'response_added': return `r-${entry.response.id}`;
    case 'decision_made': return `d-${entry.decision.id}`;
    case 'proposal_dismissed': return `dm-${entry.dismissal.id}`;
  }
}

function formatRelative(iso: string): string {
  try {
    const date = new Date(iso);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return STRINGS.timeJustNow;
    if (diffMin < 60) return STRINGS.timeMinsAgo(diffMin);
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return STRINGS.timeHoursAgo(diffHr);
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return STRINGS.timeDaysAgo(diffDay);
    return date.toLocaleDateString();
  } catch {
    return iso;
  }
}
