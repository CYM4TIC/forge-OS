// ── Dispatch Queue Panel — P7-L ──
// Queue view: pending, active (with duration timer), completed (last 10).
// 4-tier priority model: Critical/High/Normal/Low with colored badges.
// Gate status display: Build/Triad/Sentinel/Meridian per-batch.
// Checkpoint validation: progress recap, advance/re-gate/hold.
// Protocol enforcement: visual block when advancement is prevented.

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
import { isPersonaSlug } from '@forge-os/shared';
import { useDispatchQueue, type CheckpointAction } from '../../hooks/useDispatchQueue';
import type {
  DispatchQueueEntry,
  DispatchPriority,
  GateStatus,
  GateStage,
  AgentStatus,
} from '../../lib/tauri';

// ─── Strings (M-LOW-2: centralized for i18n readiness) ──────────────────────

const STRINGS = {
  panelTitle: 'Quorum',
  queueTab: 'Queue',
  gatesTab: 'Gates',
  loadingQueue: 'Loading dispatch queue',
  emptyDefault: 'The Crucible is silent \u2014 no dispatches in progress',
  emptyCompleted: 'No completed dispatches yet',
  refreshQueue: 'Refresh queue',
  retry: 'Retry',
  errorNetwork: 'Network error \u2014 check your connection.',
  errorTimeout: 'Request timed out.',
  errorGeneric: 'Something went wrong. Try again.',
  pendingSection: 'Pending',
  activeSection: 'Active',
  completedSection: 'Completed',
  gateStatusTitle: 'Gate Status',
  checkpointTitle: 'Batch Checkpoint',
  checkpointAdvance: 'Advance to next batch',
  checkpointRegate: 'Re-gate this batch',
  checkpointHold: 'Hold position',
  checkpointBlocked: 'Advancement blocked',
  concurrencyLimit: (n: number) => `Max ${n} concurrent`,
  findingsOpen: (n: number) => `${n} open finding${n === 1 ? '' : 's'}`,
  triadRequired: 'Build Triad must be dispatched',
  checkpointRequired: 'Checkpoint must be acknowledged',
  canAdvance: 'Ready to advance',
  sessionTimeline: 'Session Timeline',
  exportReport: 'Export Gate Report',
  activeCount: (n: number) => `${n} active dispatch${n === 1 ? '' : 'es'}`,
  queueCount: (n: number) => `${n} in queue`,
  parallelRunning: (n: number) => `${n} agent${n === 1 ? '' : 's'} running in parallel`,
  elapsed: (ms: number) => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  },
} as const;

// ─── Priority / Status Mapping ──────────────────────────────────────────────

function priorityToBadge(p: DispatchPriority): BadgeStatus {
  switch (p) {
    case 'critical': return 'danger';
    case 'high': return 'warning';
    case 'normal': return 'active';
    case 'low': return 'neutral';
  }
}

function priorityLabel(p: DispatchPriority): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function agentStatusToBadge(s: AgentStatus): BadgeStatus {
  switch (s) {
    case 'queued': return 'neutral';
    case 'running': return 'active';
    case 'complete': return 'success';
    case 'error': return 'danger';
    case 'timeout': return 'warning';
    case 'cancelled': return 'neutral';
  }
}

function agentStatusLabel(s: AgentStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function gateStageToBadge(g: GateStage): BadgeStatus {
  switch (g) {
    case 'not_started': return 'neutral';
    case 'in_progress': return 'active';
    case 'pass': return 'success';
    case 'fail': return 'danger';
    case 'pending': return 'warning';
  }
}

function gateStageLabel(g: GateStage): string {
  switch (g) {
    case 'not_started': return 'Not Started';
    case 'in_progress': return 'In Progress';
    case 'pass': return 'Pass';
    case 'fail': return 'Fail';
    case 'pending': return 'Pending';
  }
}

function friendlyError(raw: string): string {
  if (raw.includes('network') || raw.includes('fetch')) return STRINGS.errorNetwork;
  if (raw.includes('timeout')) return STRINGS.errorTimeout;
  return STRINGS.errorGeneric;
}

function formatAgentName(slug: string): string {
  return slug.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── Dispatch Entry Card ────────────────────────────────────────────────────

interface DispatchCardProps {
  entry: DispatchQueueEntry;
  /** K-L-011: parent-level tick counter for shared timer. */
  tick: number;
}

const DispatchCard = memo(function DispatchCard({ entry, tick }: DispatchCardProps) {
  const isActive = entry.status === 'running' || entry.status === 'queued';
  const isError = entry.status === 'error' || entry.status === 'timeout';
  const persona = isPersonaSlug(entry.agent_slug) ? entry.agent_slug : null;

  // K-L-011: derive elapsed from parent tick counter instead of per-card interval
  const elapsed = entry.status === 'running' && entry.started_at
    ? Date.now() - entry.started_at
    : entry.elapsed_ms;
  // Use tick to force re-render from parent — suppress unused var warning
  void tick;

  return (
    <div
      role="listitem"
      tabIndex={0}
      aria-label={`${formatAgentName(entry.agent_slug)}, ${agentStatusLabel(entry.status)}, priority ${priorityLabel(entry.priority)}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        padding: '8px 12px',
        borderRadius: RADIUS.card,
        background: CANVAS.bgElevated,
        border: `1px solid ${isError ? BADGE_COLORS.danger.bg : CANVAS.border}`,
      }}
    >
      {/* Agent glyph */}
      <span aria-hidden="true">
        {persona ? (
          <PersonaGlyph persona={persona} size={24} />
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: CANVAS.trackBg,
              fontSize: 12,
              color: CANVAS.muted,
            }}
          >
            ⚙
          </span>
        )}
      </span>

      {/* Name + slug */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: CANVAS.text,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {formatAgentName(entry.agent_slug)}
        </div>
        <div style={{ fontSize: 10, color: CANVAS.muted }} aria-hidden="true">
          {entry.dispatch_id.slice(0, 8)}
        </div>
      </div>

      {/* Priority badge */}
      <StatusBadge
        width={60}
        height={18}
        status={priorityToBadge(entry.priority)}
        label={priorityLabel(entry.priority)}
      />

      {/* Status badge */}
      <StatusBadge
        width={64}
        height={18}
        status={agentStatusToBadge(entry.status)}
        label={agentStatusLabel(entry.status)}
      />

      {/* Duration timer */}
      <span
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono, monospace)',
          color: isActive ? STATUS.accent : CANVAS.muted,
          minWidth: 48,
          textAlign: 'right',
        }}
      >
        {STRINGS.elapsed(elapsed)}
      </span>
    </div>
  );
});

// ─��─ Gate Status Row ────────────────────────────────────────────────────────

interface GateRowProps {
  label: string;
  stage: GateStage;
}

const GateRow = memo(function GateRow({ label, stage }: GateRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        borderRadius: RADIUS.card,
        background: CANVAS.bgElevated,
        border: `1px solid ${CANVAS.border}`,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: CANVAS.text, letterSpacing: '0.05em' }}>
        {label}
      </span>
      <StatusBadge
        width={80}
        height={18}
        status={gateStageToBadge(stage)}
        label={gateStageLabel(stage)}
      />
    </div>
  );
});

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <h4
      style={{
        margin: 0,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: CANVAS.label,
        padding: '8px 12px 4px',
      }}
    >
      {title} ({count})
    </h4>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function Header({
  onRefresh,
  activeCount,
}: {
  onRefresh: () => void;
  activeCount: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: `1px solid ${CANVAS.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: CANVAS.text,
            letterSpacing: '0.05em',
          }}
        >
          {STRINGS.panelTitle}
        </span>
        {activeCount > 0 && (
          <span
            role="status"
            aria-live="polite"
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: STATUS.accent,
            }}
          >
            {STRINGS.parallelRunning(activeCount)}
          </span>
        )}
      </div>
      <button
        onClick={onRefresh}
        aria-label={STRINGS.refreshQueue}
        style={{
          padding: '4px 8px',
          fontSize: 11,
          minWidth: 32,
          minHeight: 32,
          borderRadius: RADIUS.pill,
          background: CANVAS.bgElevated,
          color: CANVAS.muted,
          border: `1px solid ${CANVAS.border}`,
          cursor: 'pointer',
        }}
      >
        &#x21bb;
      </button>
    </div>
  );
}

// ─── Checkpoint Card ────────────────────────────────────────────────────────

interface CheckpointCardProps {
  gateStatus: GateStatus;
  canAdvance: boolean;
  acknowledged: boolean;
  onAction: (action: CheckpointAction) => void;
}

const CHECKPOINT_BTN: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 600,
  borderRadius: RADIUS.pill,
  border: `1px solid ${CANVAS.border}`,
  cursor: 'pointer',
  minHeight: 32,
};

function CheckpointCard({ gateStatus, canAdvance, acknowledged, onAction }: CheckpointCardProps) {
  const blockers: string[] = [];
  if (gateStatus.triad !== 'pass') blockers.push(STRINGS.triadRequired);
  if (gateStatus.open_findings > 0) blockers.push(STRINGS.findingsOpen(gateStatus.open_findings));
  if (!acknowledged) blockers.push(STRINGS.checkpointRequired);

  const ready = gateStatus.triad === 'pass' && gateStatus.open_findings === 0;

  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: RADIUS.card,
        background: canAdvance
          ? `${BADGE_COLORS.success.bg}22`
          : `${BADGE_COLORS.warning.bg}22`,
        border: `1px solid ${canAdvance ? BADGE_COLORS.success.bg : BADGE_COLORS.warning.bg}`,
      }}
    >
      <h4
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 700,
          color: CANVAS.text,
          letterSpacing: '0.05em',
          marginBottom: 6,
        }}
      >
        {STRINGS.checkpointTitle}
      </h4>

      {canAdvance ? (
        <div style={{ fontSize: 11, color: BADGE_COLORS.success.text }}>
          {STRINGS.canAdvance}
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: BADGE_COLORS.warning.text,
              marginBottom: 4,
            }}
          >
            {STRINGS.checkpointBlocked}
          </div>
          <ul
            style={{
              margin: 0,
              padding: '0 0 0 16px',
              fontSize: 11,
              color: CANVAS.muted,
            }}
          >
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </>
      )}

      {/* PL-005: 3 checkpoint actions — advance, re-gate, hold */}
      {ready && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => onAction('advance')}
            style={{ ...CHECKPOINT_BTN, background: STATUS.accent, color: CANVAS.bg, borderColor: STATUS.accent }}
          >
            {STRINGS.checkpointAdvance}
          </button>
          <button
            onClick={() => onAction('re-gate')}
            style={{ ...CHECKPOINT_BTN, background: CANVAS.bgElevated, color: CANVAS.text }}
          >
            {STRINGS.checkpointRegate}
          </button>
          <button
            onClick={() => onAction('hold')}
            style={{ ...CHECKPOINT_BTN, background: CANVAS.bgElevated, color: CANVAS.muted }}
          >
            {STRINGS.checkpointHold}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonCard({ reduced }: { reduced: boolean }) {
  const shimmer = reduced ? 'none' : 'dispatch-shimmer 1.5s infinite ease-in-out';
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '8px 12px',
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
            width: '50%',
            height: 14,
            borderRadius: RADIUS.pill,
            background: CANVAS.trackBg,
            marginBottom: 6,
            animation: shimmer,
          }}
        />
        <div
          style={{
            width: '30%',
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

const SHIMMER_KEYFRAME = `@keyframes dispatch-shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }`;

// ─── Main Panel ─────────────────────────────────────────────────────────────

export default function DispatchQueuePanel() {
  const [activeTab, setActiveTab] = useState<'queue' | 'gates'>('queue');
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  // K-L-011: single shared interval for all dispatch card timers
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const {
    queue,
    gateStatus,
    canAdvance,
    checkpoint,
    setCheckpointAction,
    maxConcurrent,
    loading,
    error,
    refresh,
  } = useDispatchQueue();

  // Partition entries
  const pending = queue.filter((e) => e.status === 'queued');
  const active = queue.filter((e) => e.status === 'running');
  const completed = queue.filter(
    (e) => e.status === 'complete' || e.status === 'error' || e.status === 'timeout' || e.status === 'cancelled',
  );

  // Tab switching with keyboard (WAI-ARIA Tabs)
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveTab((prev) => (prev === 'queue' ? 'gates' : 'queue'));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveTab('queue');
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveTab('gates');
    }
  }, []);

  // ── Loading ──
  if (loading && queue.length === 0) {
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
        <style>{SHIMMER_KEYFRAME}</style>
        <Header onRefresh={refresh} activeCount={0} />
        <div role="status" aria-label={STRINGS.loadingQueue} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} reduced={reducedMotion} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error (no data) ──
  if (error && queue.length === 0) {
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
        <Header onRefresh={refresh} activeCount={0} />
        <div
          role="alert"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 24,
          }}
        >
          <span style={{ fontSize: 24 }} aria-hidden="true">⚠</span>
          <span style={{ fontSize: 12, color: CANVAS.muted, textAlign: 'center' }}>
            {friendlyError(error)}
          </span>
          <button
            onClick={refresh}
            autoFocus
            style={{
              padding: '6px 16px',
              fontSize: 11,
              borderRadius: RADIUS.pill,
              background: CANVAS.bgElevated,
              color: CANVAS.text,
              border: `1px solid ${CANVAS.border}`,
              cursor: 'pointer',
            }}
          >
            {STRINGS.retry}
          </button>
        </div>
      </div>
    );
  }

  // ── Data ready ──
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
      <style>{SHIMMER_KEYFRAME}</style>
      <Header onRefresh={refresh} activeCount={active.length} />

      {/* Non-fatal error banner */}
      {error && queue.length > 0 && (
        <div
          role="alert"
          style={{
            padding: '6px 12px',
            fontSize: 11,
            color: BADGE_COLORS.warning.text,
            background: `${BADGE_COLORS.warning.bg}22`,
            borderBottom: `1px solid ${BADGE_COLORS.warning.bg}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{friendlyError(error)}</span>
          <button
            onClick={refresh}
            style={{
              fontSize: 10,
              padding: '2px 8px',
              minHeight: 32,
              borderRadius: RADIUS.pill,
              background: CANVAS.bgElevated,
              color: CANVAS.text,
              border: `1px solid ${CANVAS.border}`,
              cursor: 'pointer',
            }}
          >
            {STRINGS.retry}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Dispatch queue views"
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: `1px solid ${CANVAS.border}`,
        }}
      >
        {(['queue', 'gates'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            id={`dispatch-tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls={`dispatch-panel-${tab}`}
            tabIndex={activeTab === tab ? 0 : -1}
            onKeyDown={handleTabKeyDown}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: activeTab === tab ? STATUS.accent : CANVAS.muted,
              background: activeTab === tab ? TINT.subtle : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? `2px solid ${STATUS.accent}` : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {tab === 'queue' ? STRINGS.queueTab : STRINGS.gatesTab}
          </button>
        ))}
      </div>

      {/* Queue tab */}
      {activeTab === 'queue' && (
      <div
        id="dispatch-panel-queue"
        role="tabpanel"
        aria-labelledby="dispatch-tab-queue"
        tabIndex={0}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
      >
        {queue.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: 24,
            }}
          >
            <span style={{ fontSize: 28, opacity: 0.4 }} aria-hidden="true">⚙️</span>
            <span style={{ fontSize: 12, color: CANVAS.muted, textAlign: 'center' }}>
              {STRINGS.emptyDefault}
            </span>
          </div>
        ) : (
          <div
            ref={scrollRef}
            role="log"
            tabIndex={0}
            aria-label="Dispatch queue"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0 0 8px',
            }}
          >
            {/* Pending section */}
            {pending.length > 0 && (
              <>
                <SectionHeader title={STRINGS.pendingSection} count={pending.length} />
                <div role="list" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px' }}>
                  {pending.map((e) => <DispatchCard key={e.dispatch_id} entry={e} tick={tick} />)}
                </div>
              </>
            )}

            {/* Active section */}
            {active.length > 0 && (
              <>
                <SectionHeader title={STRINGS.activeSection} count={active.length} />
                <div role="list" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px' }}>
                  {active.map((e) => <DispatchCard key={e.dispatch_id} entry={e} tick={tick} />)}
                </div>
              </>
            )}

            {/* Completed section */}
            {completed.length > 0 ? (
              <>
                <SectionHeader title={STRINGS.completedSection} count={completed.length} />
                <div role="list" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px' }}>
                  {completed.map((e) => <DispatchCard key={e.dispatch_id} entry={e} tick={tick} />)}
                </div>
              </>
            ) : (pending.length > 0 || active.length > 0) ? (
              <div style={{ padding: '8px 12px', fontSize: 11, color: CANVAS.muted }}>
                {STRINGS.emptyCompleted}
              </div>
            ) : null}
          </div>
        )}
      </div>
      )}

      {/* Gates tab */}
      {activeTab === 'gates' && (
      <div
        id="dispatch-panel-gates"
        role="tabpanel"
        aria-labelledby="dispatch-tab-gates"
        tabIndex={0}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: CANVAS.label,
              padding: '0 0 4px',
            }}
          >
            {STRINGS.gateStatusTitle}
          </h4>

          <div role="list" aria-label={STRINGS.gateStatusTitle}>
            <div role="listitem"><GateRow label="Build" stage={gateStatus.build} /></div>
            <div role="listitem"><GateRow label="Build Triad" stage={gateStatus.triad} /></div>
            <div role="listitem"><GateRow label="Sentinel" stage={gateStatus.sentinel} /></div>
            <div role="listitem"><GateRow label="Meridian" stage={gateStatus.meridian} /></div>
          </div>

          {/* Checkpoint */}
          <div style={{ marginTop: 8 }}>
            <CheckpointCard
              gateStatus={gateStatus}
              canAdvance={canAdvance}
              acknowledged={checkpoint.acknowledged}
              onAction={setCheckpointAction}
            />
          </div>

          {/* Session timeline — horizontal bar of completed dispatches */}
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: CANVAS.label,
                marginBottom: 6,
              }}
            >
              {STRINGS.sessionTimeline}
            </div>
            <div
              role="img"
              aria-label={`${completed.length} completed dispatches this session`}
              style={{
                display: 'flex',
                gap: 2,
                height: 20,
                borderRadius: RADIUS.pill,
                overflow: 'hidden',
                background: CANVAS.trackBg,
              }}
            >
              {completed.length === 0 ? (
                <div style={{ flex: 1 }} />
              ) : (
                completed.map((e) => (
                  <div
                    key={e.dispatch_id}
                    role="img"
                    aria-label={`${formatAgentName(e.agent_slug)} — ${agentStatusLabel(e.status)}`}
                    style={{
                      flex: 1,
                      background: e.status === 'complete' ? BADGE_COLORS.success.bg
                        : e.status === 'error' ? BADGE_COLORS.danger.bg
                        : BADGE_COLORS.neutral.bg,
                      minWidth: 4,
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Export report button — wired when doc gen engine ships (Phase 8+) */}
          <button
            disabled
            aria-disabled="true"
            title="Gate report export available when document generation engine ships"
            style={{
              marginTop: 12,
              padding: '8px 16px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: RADIUS.pill,
              background: CANVAS.bgElevated,
              color: CANVAS.muted,
              border: `1px solid ${CANVAS.border}`,
              cursor: 'not-allowed',
              width: '100%',
              opacity: 0.5,
            }}
          >
            {STRINGS.exportReport}
          </button>
        </div>
      </div>
      )}

      {/* SR live region for queue state announcements (M-MED-2) */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
        }}
      >
        {active.length > 0 ? STRINGS.activeCount(active.length) + '. ' : ''}
        {completed.filter((e) => e.status === 'error').length > 0
          ? `${completed.filter((e) => e.status === 'error').length} dispatch error${completed.filter((e) => e.status === 'error').length === 1 ? '' : 's'}. `
          : ''}
        {completed.length > 0 ? `${completed.length} completed. ` : ''}
        {STRINGS.concurrencyLimit(maxConcurrent)}
      </div>
    </div>
  );
}
