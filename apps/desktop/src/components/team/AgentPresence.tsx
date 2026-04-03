import { useAgentDispatch } from '../../hooks/useAgentDispatch';
import { PersonaGlyph, CANVAS, RADIUS, TIMING } from '@forge-os/canvas-components';
import type { GlyphState } from '@forge-os/canvas-components';
import { PERSONA_SHORT, PERSONA_COLORS } from '@forge-os/shared';
import type { PersonaSlug } from '@forge-os/shared';

type PresenceStatus = 'active' | 'idle' | 'offline';

interface AgentPresenceItem {
  slug: string;
  status: PresenceStatus;
}

interface AgentPresenceProps {
  /** Callback when a persona pill is clicked (P7-F selection). */
  onToggle?: (slug: string) => void;
  /** Check if a slug is currently selected. */
  isSelected?: (slug: string) => boolean;
}

const STATUS_LABEL: Record<PresenceStatus, string> = {
  active: 'Active',
  idle: 'Idle',
  offline: 'Offline',
};

const STATUS_TO_GLYPH: Record<PresenceStatus, GlyphState> = {
  active: 'speaking',
  idle: 'idle',
  offline: 'idle',
};

const PERSONA_SLUGS: ReadonlySet<string> = new Set(Object.keys(PERSONA_SHORT));

// ─── Static styles (canvas-tokens — migrating from Tailwind, P7-F) ─────────

const PILL_BAR: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
};

const PILL_BASE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 6px',
  borderRadius: RADIUS.pill,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid transparent',
  cursor: 'pointer',
  transition: `border-color ${TIMING.fast}, box-shadow ${TIMING.fast}`,
  minHeight: 24,
};

const PILL_LABEL: React.CSSProperties = {
  fontSize: 10,
  color: CANVAS.label,
};

export default function AgentPresence({ onToggle, isSelected }: AgentPresenceProps = {}) {
  const { activeAgents } = useAgentDispatch();

  // Derive presence from dispatch state
  const activeSet = new Set(activeAgents.map((a) => a.agent_slug));

  // Core personas — always shown
  const coreAgents: string[] = [
    'nyx', 'pierce', 'mara', 'riven', 'kehinde',
    'tanaka', 'vane', 'voss', 'calloway', 'sable',
  ];

  const presence: AgentPresenceItem[] = coreAgents.map((slug) => ({
    slug,
    status: activeSet.has(slug) ? 'active' : 'idle',
  }));

  return (
    <div style={PILL_BAR} role="group" aria-label="Persona selection">
      {presence.map((agent) => {
        const selected = isSelected?.(agent.slug) ?? false;
        const personaColor = PERSONA_COLORS[agent.slug as PersonaSlug] ?? CANVAS.label;
        const pillStyle: React.CSSProperties = {
          ...PILL_BASE,
          ...(selected ? {
            borderColor: personaColor,
            boxShadow: `0 0 0 1px ${personaColor}`,
          } : {}),
        };

        return (
          <button
            key={agent.slug}
            type="button"
            style={pillStyle}
            onClick={() => onToggle?.(agent.slug)}
            aria-pressed={selected}
            aria-label={`${PERSONA_SHORT[agent.slug as PersonaSlug] ?? agent.slug}: ${STATUS_LABEL[agent.status]}${selected ? ' (selected)' : ''}`}
          >
            {PERSONA_SLUGS.has(agent.slug) ? (
              <PersonaGlyph
                size={14}
                persona={agent.slug as PersonaSlug}
                state={STATUS_TO_GLYPH[agent.status]}
                glowIntensity={selected ? 1.5 : 0.6}
              />
            ) : (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: CANVAS.muted, flexShrink: 0 }} />
            )}
            <span style={{ ...PILL_LABEL, color: selected ? personaColor : CANVAS.label }}>
              {PERSONA_SHORT[agent.slug as PersonaSlug] ?? agent.slug}
            </span>
          </button>
        );
      })}
    </div>
  );
}
