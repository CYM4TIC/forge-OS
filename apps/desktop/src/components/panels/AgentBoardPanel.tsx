// Agent Board — Phase 5.2 (P5-H)
// Canvas-rendered agent cards with responsive grid. Click to expand.

import { useState, useRef, useEffect, useCallback } from 'react';
import { PersonaGlyph, StatusBadge, CANVAS, STATUS } from '@forge-os/canvas-components';
import type { PersonaSlug, GlyphState, BadgeStatus } from '@forge-os/canvas-components';
import { useAgentBoard, type BoardAgent, type BoardAgentStatus } from '../../hooks/useAgentBoard';

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

const STATUS_LABELS: Record<BoardAgentStatus, string> = {
  idle: 'Idle',
  dispatched: 'Dispatched',
  running: 'Running',
  complete: 'Complete',
  error: 'Error',
};

// Known persona slugs for glyph rendering
const PERSONA_SLUGS: ReadonlySet<string> = new Set([
  'nyx', 'pierce', 'mara', 'riven', 'kehinde',
  'tanaka', 'vane', 'voss', 'calloway', 'sable',
]);

function isPersonaSlug(slug: string): slug is PersonaSlug {
  return PERSONA_SLUGS.has(slug);
}

// ─── Agent Card ─────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: BoardAgent;
  isExpanded: boolean;
  onToggle: () => void;
  cardWidth: number;
}

function AgentCard({ agent, isExpanded, onToggle, cardWidth }: AgentCardProps) {
  const glyphSize = cardWidth < 160 ? 28 : 36;
  const badgeW = cardWidth < 160 ? 60 : 80;
  const badgeH = 20;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      style={{
        background: isExpanded ? CANVAS.bgElevated : CANVAS.bg,
        border: `1px solid ${isExpanded ? STATUS.accent : CANVAS.border}`,
        borderRadius: 8,
        padding: cardWidth < 160 ? 8 : 12,
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        overflow: 'hidden',
      }}
    >
      {/* Card header: glyph + name + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isPersonaSlug(agent.slug) ? (
          <PersonaGlyph
            size={glyphSize}
            persona={agent.slug}
            state={STATUS_TO_GLYPH[agent.status]}
          />
        ) : (
          <div
            style={{
              width: glyphSize,
              height: glyphSize,
              borderRadius: '50%',
              background: CANVAS.border,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: glyphSize * 0.4,
              color: CANVAS.label,
              fontWeight: 600,
            }}
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: CANVAS.text,
              fontSize: cardWidth < 160 ? 12 : 14,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.2,
            }}
          >
            {agent.name}
          </div>
          <div
            style={{
              color: CANVAS.muted,
              fontSize: 10,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3,
              marginTop: 2,
            }}
          >
            {agent.slug}
          </div>
        </div>
        <StatusBadge
          width={badgeW}
          height={badgeH}
          status={STATUS_TO_BADGE[agent.status]}
          label={STATUS_LABELS[agent.status]}
        />
      </div>

      {/* Model tier + elapsed */}
      {(agent.modelTier || agent.elapsedMs !== null) && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {agent.modelTier && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: '1px 6px',
                borderRadius: 4,
                background: 'rgba(99, 102, 241, 0.15)',
                color: STATUS.accent,
                letterSpacing: '0.03em',
              }}
            >
              {agent.modelTier}
            </span>
          )}
          {agent.elapsedMs !== null && (
            <span
              style={{
                fontSize: 10,
                color: CANVAS.label,
              }}
            >
              {agent.elapsedMs < 1000
                ? `${agent.elapsedMs}ms`
                : `${(agent.elapsedMs / 1000).toFixed(1)}s`}
            </span>
          )}
        </div>
      )}

      {/* Expanded detail overlay */}
      {isExpanded && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: `1px solid ${CANVAS.border}`,
          }}
        >
          <div
            style={{
              color: CANVAS.label,
              fontSize: 11,
              lineHeight: 1.5,
              maxHeight: 80,
              overflow: 'auto',
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
}

// ─── Agent Board Panel ──────────────────────────────────────────────────────

export default function AgentBoardPanel() {
  const { agents, loading, error, expandedSlug, setExpandedSlug } = useAgentBoard();
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

  // Responsive columns: 1 at <400px, 2 at <700px, 3 at 700px+
  const columns = containerWidth < 400 ? 1 : containerWidth < 700 ? 2 : 3;
  const gap = 8;
  const cardWidth = (containerWidth - gap * (columns - 1)) / columns;

  const handleToggle = useCallback(
    (slug: string) => {
      setExpandedSlug(expandedSlug === slug ? null : slug);
    },
    [expandedSlug, setExpandedSlug],
  );

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: STATUS.danger,
          fontSize: 13,
          padding: 16,
          textAlign: 'center',
        }}
      >
        Agent board error: {error}
      </div>
    );
  }

  if (loading && agents.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: CANVAS.muted,
          fontSize: 13,
        }}
      >
        Loading agents...
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: CANVAS.muted,
          fontSize: 13,
        }}
      >
        No agents discovered.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflow: 'auto',
        padding: 8,
        background: CANVAS.bg,
      }}
    >
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
            onToggle={() => handleToggle(agent.slug)}
            cardWidth={cardWidth}
          />
        ))}
      </div>
    </div>
  );
}
