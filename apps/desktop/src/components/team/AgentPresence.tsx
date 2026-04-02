import { useAgentDispatch } from '../../hooks/useAgentDispatch';
import { PersonaGlyph } from '@forge-os/canvas-components';
import type { GlyphState } from '@forge-os/canvas-components';
import { PERSONA_SHORT } from '@forge-os/shared';
import type { PersonaSlug } from '@forge-os/shared';

type PresenceStatus = 'active' | 'idle' | 'offline';

interface AgentPresenceItem {
  slug: string;
  status: PresenceStatus;
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

export default function AgentPresence() {
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
    <div className="flex flex-wrap gap-1.5">
      {presence.map((agent) => (
        <div
          key={agent.slug}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-tertiary/50"
          title={`${PERSONA_SHORT[agent.slug as PersonaSlug] ?? agent.slug}: ${STATUS_LABEL[agent.status]}`}
        >
          {PERSONA_SLUGS.has(agent.slug) ? (
            <PersonaGlyph
              size={14}
              persona={agent.slug as PersonaSlug}
              state={STATUS_TO_GLYPH[agent.status]}
            />
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 bg-text-muted`} />
          )}
          <span className="text-text-secondary text-[10px]">
            {PERSONA_SHORT[agent.slug as PersonaSlug] ?? agent.slug}
          </span>
        </div>
      ))}
    </div>
  );
}
