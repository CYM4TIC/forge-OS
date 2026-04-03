// Agent Board — Phase 5.2 (P5-H)
// Canvas-rendered agent cards with responsive grid. Click to expand. Pop-out support.

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  PersonaGlyph, NodeCard, StatusBadge,
  CANVAS, STATUS, DOCK, RADIUS, TIMING, GLOW,
} from '@forge-os/canvas-components';
import type { GlyphState, BadgeStatus, NodeStatus } from '@forge-os/canvas-components';
import { isPersonaSlug } from '@forge-os/shared';
import { useAgentBoard, type BoardAgent, type BoardAgentStatus } from '../../hooks/useAgentBoard';
import { isTauriRuntime, createPanelWindow } from '../../lib/tauri';

// ─── Status Mapping ─────────────────────────────────────────────────────────

const STATUS_TO_GLYPH: Record<BoardAgentStatus, GlyphState> = {
  idle: 'idle',
  dispatched: 'thinking',
  running: 'speaking',
  complete: 'complete',
  error: 'error',
};

const STATUS_TO_BADGE: Record<BoardAgentStatus, BadgeStatus> = {
  idle: 'neutral',
  dispatched: 'active',
  running: 'active',
  complete: 'success',
  error: 'danger',
};

const STATUS_TO_NODE: Record<BoardAgentStatus, NodeStatus> = {
  idle: 'idle',
  dispatched: 'active',
  running: 'active',
  complete: 'complete',
  error: 'error',
};

const STATUS_LABELS: Record<BoardAgentStatus, string> = {
  idle: 'Idle',
  dispatched: 'Dispatched',
  running: 'Running',
  complete: 'Complete',
  error: 'Error',
};

// ─── Static Styles ──────────────────────────────────────────────────────────

const CARD_HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const NAME_CONTAINER_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  maxWidth: '100%', // MARA-MED-1: explicit truncation safeguard
};

const SLUG_STYLE: React.CSSProperties = {
  color: CANVAS.muted,
  fontSize: 10,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: 1.3,
  marginTop: 2,
};

const METADATA_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  marginTop: 6,
  flexWrap: 'wrap',
};

const TIER_BADGE_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  padding: '1px 6px',
  borderRadius: RADIUS.pill,
  background: DOCK.activeBg,
  color: STATUS.accent,
  letterSpacing: '0.03em',
};

const ELAPSED_STYLE: React.CSSProperties = {
  fontSize: 10,
  color: CANVAS.label,
};

const EXPAND_BORDER_STYLE: React.CSSProperties = {
  marginTop: 8,
  paddingTop: 8,
  borderTop: `1px solid ${CANVAS.border}`,
};

// ─── Sizing Constants ───────────────────────────────────────────────────────

const COMPACT_BREAKPOINT = 160;
const GLYPH_SIZE = { compact: 28, default: 36 } as const;
const BADGE_SIZE = { compact: { w: 60, h: 20 }, default: { w: 80, h: 20 } } as const;
// ─── Agent Card ─────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: BoardAgent;
  isExpanded: boolean;
  onToggle: (slug: string) => void;
  cardWidth: number;
}

const AgentCard = memo(function AgentCard({ agent, isExpanded, onToggle, cardWidth }: AgentCardProps) {
  const [hovered, setHovered] = useState(false);
  const isCompact = cardWidth < COMPACT_BREAKPOINT;
  const glyphSize = isCompact ? GLYPH_SIZE.compact : GLYPH_SIZE.default;
  const badge = isCompact ? BADGE_SIZE.compact : BADGE_SIZE.default;
  const isActive = agent.status === 'running' || agent.status === 'dispatched';
  const isError = agent.status === 'error';

  const borderColor = isExpanded
    ? STATUS.accent
    : isError
      ? STATUS.danger
      : isActive
        ? STATUS.accent
        : hovered
          ? CANVAS.label
          : CANVAS.border;

  const boxShadow = isActive
    ? `0 0 8px ${GLOW.accent}`
    : isError
      ? `0 0 6px ${GLOW.dangerSubtle}`
      : 'none';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`${agent.name} — ${STATUS_LABELS[agent.status]}`}
      onClick={() => onToggle(agent.slug)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(agent.slug); } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isExpanded || hovered ? CANVAS.bgElevated : CANVAS.bg,
        border: `1px solid ${borderColor}`,
        borderRadius: RADIUS.card,
        padding: isCompact ? 8 : 12,
        cursor: 'pointer',
        transition: `border-color ${TIMING.fast}, background ${TIMING.fast}, box-shadow ${TIMING.fast}`,
        overflow: 'hidden',
        boxShadow,
      }}
    >
      {/* Card header: glyph + NodeCard name + status badge */}
      <div style={CARD_HEADER_STYLE}>
        {isPersonaSlug(agent.slug) ? (
          <PersonaGlyph
            size={glyphSize}
            persona={agent.slug}
            state={STATUS_TO_GLYPH[agent.status]}
          />
        ) : (
          <NodeCard
            width={glyphSize}
            height={glyphSize}
            label={agent.name.charAt(0).toUpperCase()}
            status={STATUS_TO_NODE[agent.status]}
          />
        )}
        <div style={NAME_CONTAINER_STYLE}>
          <div
            style={{
              color: CANVAS.text,
              fontSize: isCompact ? 12 : 14,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.2,
            }}
          >
            {agent.name}
          </div>
          <div style={SLUG_STYLE}>
            {agent.slug}
          </div>
        </div>
        <StatusBadge
          width={badge.w}
          height={badge.h}
          status={STATUS_TO_BADGE[agent.status]}
          label={STATUS_LABELS[agent.status]}
        />
        {/* MARA-MED-7: Disclosure indicator */}
        <span
          style={{
            color: CANVAS.muted,
            fontSize: 10,
            marginLeft: 2,
            transition: `transform ${TIMING.fast}`,
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            display: 'inline-block',
          }}
          aria-hidden="true"
        >
          &#x25B6;
        </span>
      </div>

      {/* Model tier + elapsed */}
      {(agent.modelTier || agent.elapsedMs != null) && (
        <div style={METADATA_ROW_STYLE}>
          {agent.modelTier && (
            <span style={TIER_BADGE_STYLE}>
              {agent.modelTier}
            </span>
          )}
          {agent.elapsedMs != null && (
            <span style={ELAPSED_STYLE}>
              {agent.elapsedMs < 1000
                ? `${agent.elapsedMs}ms`
                : `${(agent.elapsedMs / 1000).toFixed(1)}s`}
            </span>
          )}
        </div>
      )}

      {/* Expanded detail overlay */}
      {isExpanded && (
        <div style={EXPAND_BORDER_STYLE}>
          <div
            style={{
              color: CANVAS.label,
              fontSize: 11,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {agent.description || 'No description available.'}
          </div>
          {agent.lastError && (
            <div
              style={{
                marginTop: 6,
                color: STATUS.danger,
                fontSize: 11,
                lineHeight: 1.4,
              }}
            >
              {agent.lastError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.agent.slug === next.agent.slug &&
  prev.agent.status === next.agent.status &&
  prev.agent.modelTier === next.agent.modelTier &&
  prev.agent.elapsedMs === next.agent.elapsedMs &&
  prev.agent.lastError === next.agent.lastError &&
  prev.isExpanded === next.isExpanded &&
  prev.cardWidth === next.cardWidth
);

// ─── Skeleton Card (loading state) ─────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: CANVAS.bg,
        border: `1px solid ${CANVAS.border}`,
        borderRadius: RADIUS.card,
        padding: 12,
        height: 64,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: CANVAS.trackBg }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '60%', height: 12, background: CANVAS.trackBg, borderRadius: RADIUS.pill, marginBottom: 6 }} />
          <div style={{ width: '40%', height: 8, background: CANVAS.trackBg, borderRadius: RADIUS.pill }} />
        </div>
      </div>
    </div>
  );
}

// ─── Agent Board Panel ──────────────────────────────────────────────────────

export default function AgentBoardPanel() {
  const { agents, loading, error, refresh, expandedSlug, setExpandedSlug } = useAgentBoard();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);

  // ResizeObserver for responsive grid
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Responsive columns: 1 at <500px, 2 at <900px, 3 at 900px+
  const columns = containerWidth < 500 ? 1 : containerWidth < 900 ? 2 : 3;
  const gap = 8;
  const cardWidth = (containerWidth - gap * (columns - 1)) / columns;

  // Stable callback — no expandedSlug dependency (P-HIGH-3 fix)
  const handleToggle = useCallback(
    (slug: string) => {
      setExpandedSlug((prev: string | null) => prev === slug ? null : slug);
    },
    [setExpandedSlug],
  );

  const handlePopOut = useCallback(() => {
    if (!isTauriRuntime) return;
    createPanelWindow({
      panel_id: 'agent_board',
      panel_type: 'AgentBoardPanel',
      title: 'Grimoire',
      width: 600,
      height: 400,
    });
  }, []);

  // ─── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 12,
          padding: 16,
        }}
      >
        <div role="alert" aria-live="assertive">
          <div style={{ fontSize: 24, color: STATUS.danger }}>!</div>
          <div style={{ color: STATUS.danger, fontSize: 13, textAlign: 'center' }}>
            Failed to load agent board
          </div>
          <div style={{ color: CANVAS.muted, fontSize: 11, textAlign: 'center', maxWidth: 240 }}>
            {error}
          </div>
        </div>
        <button
          onClick={refresh}
          aria-label="Retry loading agents"
          style={{
            marginTop: 4,
            padding: '4px 12px',
            fontSize: 11,
            color: STATUS.accent,
            background: DOCK.activeBg,
            border: `1px solid ${DOCK.activeBorder}`,
            borderRadius: RADIUS.pill,
            cursor: 'pointer',
            minHeight: 32,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ─── Loading state (skeleton cards) ─────────────────────────────────────
  if (loading && agents.length === 0) {
    return (
      <div style={{ height: '100%', overflow: 'hidden', padding: 8, background: CANVAS.bg }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap,
          }}
        >
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────────────
  if (agents.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 8,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 20, color: CANVAS.muted }}>&#x25CB;</div>
        <div style={{ color: CANVAS.label, fontSize: 13, textAlign: 'center' }}>
          The Grimoire is empty
        </div>
        <div style={{ color: CANVAS.muted, fontSize: 11, textAlign: 'center', maxWidth: 220 }}>
          Begin a transmutation to summon your practitioners.
        </div>
      </div>
    );
  }

  // ─── Main grid ──────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflow: 'auto',
        background: CANVAS.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header bar with pop-out */}
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
        <span style={{ color: CANVAS.label, fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Grimoire
        </span>
        {isTauriRuntime && (
          <button
            onClick={handlePopOut}
            aria-label="Pop out grimoire"
            style={{
              background: 'transparent',
              border: 'none',
              color: CANVAS.muted,
              cursor: 'pointer',
              fontSize: 13,
              padding: '2px 4px',
              minWidth: 32,
              minHeight: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: RADIUS.pill,
              lineHeight: 1,
            }}
            title="Pop out"
          >
            &#x2197;
          </button>
        )}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap,
          }}
        >
          {agents.map((agent) => (
            <AgentCard
              key={agent.slug}
              agent={agent}
              isExpanded={expandedSlug === agent.slug}
              onToggle={handleToggle}
              cardWidth={cardWidth}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
