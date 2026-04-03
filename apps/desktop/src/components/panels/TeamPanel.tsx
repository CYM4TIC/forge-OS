// ── Magi Panel — Team Management Hub ──
// P7-E rewrite: 3 tabs (Team, Dispatch, Actions).
// Team tab: grouped agent cards with PersonaGlyph + live working state.
// Dispatch tab: existing AgentStatusPanel + MessageFeed.
// Actions tab: ActionPalette (P7-G).

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import AgentStatusPanel from '../team/AgentStatusPanel';
import AgentPresence from '../team/AgentPresence';
import ActionPalette from '../team/ActionPalette';
import MessageFeed from '../team/MessageFeed';
import MailboxBadge from '../team/MailboxBadge';
import PermissionModal from '../team/PermissionModal';
import { useSwarmMessages } from '../../hooks/useSwarmMessages';
import { usePermissions } from '../../hooks/usePermissions';
import { useAgentRegistry } from '../../hooks/useAgentRegistry';
import { usePersonaSelection } from '../../hooks/usePersonaSelection';
import { useActionPalette } from '../../hooks/useActionPalette';
import type { RegistryEntry, AgentCategory } from '../../lib/tauri';
import type { AgentStateMap } from '../../hooks/useAgentRegistry';
import { PersonaGlyph, CANVAS, STATUS, RADIUS, TIMING, FONT, TINT, CONTAINMENT, StatusBadge } from '@forge-os/canvas-components';
import type { GlyphState, PersonaSlug, BadgeStatus } from '@forge-os/canvas-components';
import { isPersonaSlug, PERSONA_DOMAINS, PERSONA_COLORS } from '@forge-os/shared';

type Tab = 'team' | 'dispatch' | 'actions';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map backend AgentWorkingState to PersonaGlyph animation state.
 * M-HIGH-4: waiting_for_confirmation maps to 'finding' (alert state, not 'speaking')
 * because the agent is blocked waiting for user action, not actively communicating.
 * P7E-01: 'complete' and 'error' states ready for when dispatch lifecycle emits them.
 */
function workingStateToGlyph(state: string | undefined): GlyphState {
  switch (state) {
    case 'streaming':
    case 'executing_tool': return 'thinking';
    case 'waiting_for_confirmation': return 'finding';
    case 'compacting': return 'thinking';
    case 'complete': return 'complete';
    case 'error': return 'error';
    case 'idle':
    default: return 'idle';
  }
}

/** Map agent category to friendly section header. */
const CATEGORY_LABELS: Record<AgentCategory, string> = {
  persona: 'Personas',
  intelligence: 'Intelligences',
  orchestrator: 'Orchestrators',
  utility: 'Utilities',
  sub_agent: 'Sub-Agents',
  command: 'Commands',
};

/** Category emoji icons (alchemical aesthetic). */
const CATEGORY_ICONS: Record<AgentCategory, string> = {
  persona: '\u{1F9D9}',      // 🧙
  intelligence: '\u{1F52E}',  // 🔮
  orchestrator: '\u2697\uFE0F', // ⚗️
  utility: '\u2699\uFE0F',    // ⚙️
  sub_agent: '\u{1F4DC}',     // 📜
  command: '\u26A1',           // ⚡
};

/** Model class badge label. */
function modelClassLabel(mc: string): string {
  switch (mc) {
    case 'frontier': return 'Frontier';
    case 'standard': return 'Standard';
    case 'fast': return 'Fast';
    default: return mc;
  }
}

/** Model class badge status. */
function modelClassBadge(mc: string): BadgeStatus {
  switch (mc) {
    case 'frontier': return 'active';
    case 'standard': return 'success';
    case 'fast': return 'neutral';
    default: return 'neutral';
  }
}

/** Translate raw errors to friendly messages (M-MED-4). */
function friendlyError(raw: string): string {
  if (raw.includes('network') || raw.includes('fetch')) return 'Network error — check your connection.';
  if (raw.includes('timeout')) return 'Request timed out.';
  if (raw.includes('not found') || raw.includes('404')) return 'Agent registry not found — check project structure.';
  return 'Something went wrong. Try again.';
}

// ─── Static Styles (canvas-tokens, no Tailwind — RIVEN-HIGH-3) ─────────────

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const PANEL_SHELL: React.CSSProperties = {
  height: '100%',
  background: CANVAS.bg,
  borderRadius: RADIUS.card,
  border: `1px solid ${CANVAS.border}`,
  boxShadow: CONTAINMENT.glow,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const CENTER_STATE: React.CSSProperties = {
  height: '100%',
  background: CANVAS.bg,
  borderRadius: RADIUS.card,
  border: `1px solid ${CANVAS.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: 12,
};

const HEADER: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  borderBottom: `1px solid ${CANVAS.border}`,
  background: CANVAS.bgElevated,
  minHeight: 36,
  flexShrink: 0,
};

const CARDS_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
  gap: '8px',
  padding: '10px',
};

const CARD: React.CSSProperties = {
  background: CANVAS.bgElevated,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.card,
  padding: '10px 12px',
  cursor: 'pointer',
  transition: `border-color ${TIMING.fast}, box-shadow ${TIMING.fast}`,
  minHeight: 36,
};

const CARD_HEADER: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const CARD_NAME: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: CANVAS.text,
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const CARD_DOMAIN: React.CSSProperties = {
  fontSize: 11,
  color: CANVAS.label,
  fontFamily: FONT.mono,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 80,
};

const CARD_DESC: React.CSSProperties = {
  fontSize: 11,
  color: CANVAS.muted,
  marginTop: 6,
  lineHeight: '15px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
};

const DETAIL_SECTION: React.CSSProperties = {
  marginTop: 10,
  paddingTop: 8,
  borderTop: `1px solid ${CANVAS.border}`,
  overflow: 'hidden',
};

const SECTION_HEADER: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: CANVAS.label,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  padding: '10px 10px 4px',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const SKELETON_CARD: React.CSSProperties = {
  background: CANVAS.bgElevated,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.card,
  height: 60,
  animation: 'pulse 1.5s ease-in-out infinite',
};

const BTN: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.pill,
  color: CANVAS.text,
  fontSize: 12,
  fontWeight: 500,
  padding: '6px 12px',
  cursor: 'pointer',
  lineHeight: '18px',
  minHeight: 32,
};

const DL_ROW: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '3px 0',
  fontSize: 11,
};

// ─── Tab Button ─────────────────────────────────────────────────────────────

/**
 * TabButton with roving tabindex (M-CRIT-1: WAI-ARIA Tabs pattern).
 * Only the active tab is in the tab order (tabIndex=0). Inactive tabs have tabIndex=-1.
 * Arrow keys handled at the tablist level to navigate between tabs.
 */
function TabButton({ active, onClick, children, id, controls, buttonRef }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  id?: string;
  controls?: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      ref={buttonRef}
      role="tab"
      aria-selected={active}
      aria-controls={active ? controls : undefined}
      id={id}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        padding: '6px 12px',
        minHeight: 32,
        fontSize: 11,
        fontWeight: 500,
        background: 'transparent',
        border: 'none',
        borderBottom: active ? `2px solid ${STATUS.accent}` : '2px solid transparent',
        color: active ? STATUS.accent : hovered ? CANVAS.label : CANVAS.muted,
        cursor: 'pointer',
        transition: `color ${TIMING.fast}, border-color ${TIMING.fast}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

// ─── Agent Card ─────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: RegistryEntry;
  workingState: string | undefined;
  expanded: boolean;
  onToggle: () => void;
}

function AgentCard({ agent, workingState, expanded, onToggle }: AgentCardProps) {
  const isPersona = isPersonaSlug(agent.slug);
  const glyphState = workingStateToGlyph(workingState);
  const isActive = workingState && workingState !== 'idle';

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
    if (e.key === 'Escape' && expanded) {
      e.preventDefault();
      onToggle();
    }
  }, [expanded, onToggle]);

  const cardStyle: React.CSSProperties = {
    ...CARD,
    ...(isActive ? { borderColor: isPersona ? PERSONA_COLORS[agent.slug as PersonaSlug] : STATUS.accent } : {}),
  };

  return (
    <div
      style={cardStyle}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={`${agent.name}: ${isActive ? workingState : 'idle'}`}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
    >
      <div style={CARD_HEADER}>
        {/* Glyph: PersonaGlyph for personas, category icon for others */}
        {isPersona ? (
          <PersonaGlyph
            size={24}
            persona={agent.slug as PersonaSlug}
            state={glyphState}
            glowIntensity={isActive ? 1.5 : 0.6}
          />
        ) : (
          <span style={{ fontSize: 18, lineHeight: 1, width: 24, textAlign: 'center' }} aria-hidden="true">
            {CATEGORY_ICONS[agent.category] ?? '\u2699\uFE0F'}
          </span>
        )}
        <span style={CARD_NAME}>{agent.name}</span>
        {isPersona && (
          <span style={CARD_DOMAIN}>{PERSONA_DOMAINS[agent.slug as PersonaSlug]}</span>
        )}
        <StatusBadge
          width={20}
          height={20}
          status={modelClassBadge(agent.model_class)}
          glyph={modelClassLabel(agent.model_class).charAt(0)}
        />
      </div>

      {/* Description (truncated) */}
      <div style={CARD_DESC}>{agent.description}</div>

      {/* Expand-to-detail */}
      {expanded && (
        <div style={DETAIL_SECTION}>
          <dl style={{ margin: 0 }}>
            <div style={DL_ROW}>
              <dt style={{ color: CANVAS.label, fontWeight: 500 }}>Status</dt>
              <dd style={{ color: CANVAS.text, fontFamily: FONT.mono, margin: 0 }}>
                {isActive ? (workingState ?? 'idle').replace(/_/g, ' ') : 'Idle'}
              </dd>
            </div>
            <div style={DL_ROW}>
              <dt style={{ color: CANVAS.label, fontWeight: 500 }}>Category</dt>
              <dd style={{ color: CANVAS.text, fontFamily: FONT.mono, margin: 0 }}>
                {CATEGORY_LABELS[agent.category]}
              </dd>
            </div>
            <div style={DL_ROW}>
              <dt style={{ color: CANVAS.label, fontWeight: 500 }}>Model</dt>
              <dd style={{ color: CANVAS.text, fontFamily: FONT.mono, margin: 0 }}>
                {agent.model ?? 'default'}
              </dd>
            </div>
            <div style={DL_ROW}>
              <dt style={{ color: CANVAS.label, fontWeight: 500 }}>Reasoning</dt>
              <dd style={{ color: CANVAS.text, fontFamily: FONT.mono, margin: 0 }}>
                {agent.reasoning_effort}
              </dd>
            </div>
            <div style={DL_ROW}>
              <dt style={{ color: CANVAS.label, fontWeight: 500 }}>Role</dt>
              <dd style={{ color: CANVAS.text, fontFamily: FONT.mono, margin: 0 }}>
                {agent.routing_role}
              </dd>
            </div>
            {agent.tools.length > 0 && (
              <div style={DL_ROW}>
                <dt style={{ color: CANVAS.label, fontWeight: 500 }}>Tools</dt>
                <dd style={{ color: CANVAS.text, fontFamily: FONT.mono, margin: 0, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={agent.tools.join(', ')}>
                  {agent.tools.length} registered
                </dd>
              </div>
            )}
            {agent.parent_agent && (
              <div style={DL_ROW}>
                <dt style={{ color: CANVAS.label, fontWeight: 500 }}>Parent</dt>
                <dd style={{ color: CANVAS.text, fontFamily: FONT.mono, margin: 0 }}>
                  {agent.parent_agent}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

// ─── Team Tab Content ───────────────────────────────────────────────────────

/** Categories to render in the Team tab (excludes commands — those are in Actions). */
const TEAM_CATEGORIES: AgentCategory[] = ['persona', 'intelligence', 'orchestrator', 'utility'];

interface TeamTabProps {
  grouped: ReturnType<typeof useAgentRegistry>['grouped'];
  agentStates: AgentStateMap;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function TeamTabContent({ grouped, agentStates, loading, error, refresh }: TeamTabProps) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const toggleCard = useCallback((slug: string) => {
    setExpandedSlug((prev) => (prev === slug ? null : slug));
  }, []);

  const totalAgents = useMemo(
    () => TEAM_CATEGORIES.reduce((sum, cat) => sum + grouped[cat].length, 0),
    [grouped],
  );

  const activeCount = useMemo(
    () => Object.values(agentStates).filter((s) => s !== 'idle').length,
    [agentStates],
  );

  // Loading skeleton (M-HIGH-1: role="status" for SR announcement)
  if (loading && totalAgents === 0) {
    return (
      <div style={{ flex: 1, overflowY: 'auto' }} aria-busy="true">
        <span role="status" style={SR_ONLY}>Loading agent registry…</span>
        <div style={CARDS_GRID}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} style={SKELETON_CARD} aria-hidden="true" />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }`}</style>
      </div>
    );
  }

  // Error state (M-HIGH-2: role="alert" for SR announcement)
  if (error && totalAgents === 0) {
    return (
      <div style={{ ...CENTER_STATE, height: 'auto', flex: 1 }} role="alert">
        <span style={{ fontSize: 24 }} aria-hidden="true">{'\u26A0'}</span>
        <span style={{ color: STATUS.danger, fontSize: 13, fontWeight: 600 }}>
          Failed to load agent registry
        </span>
        <span style={{ color: CANVAS.label, fontSize: 11, maxWidth: 260, textAlign: 'center' }}>
          {friendlyError(error)}
        </span>
        <button type="button" style={BTN} onClick={refresh} autoFocus>Retry</button>
      </div>
    );
  }

  // Empty state
  if (totalAgents === 0) {
    return (
      <div style={{ ...CENTER_STATE, height: 'auto', flex: 1 }}>
        <span style={{ fontSize: 28 }} aria-hidden="true">{'\u{1F9D9}'}</span>
        <span style={{ color: CANVAS.text, fontSize: 13, fontWeight: 600 }}>
          The Grimoire is empty
        </span>
        <span style={{ color: CANVAS.label, fontSize: 11, maxWidth: 280, textAlign: 'center', lineHeight: '16px' }}>
          No agents registered. Check that the agents/ directory exists in the project root.
        </span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      {/* Summary header */}
      <div style={HEADER}>
        <span style={{ fontSize: 13, fontWeight: 600, color: CANVAS.text, flex: 1 }}>
          {totalAgents} agents
        </span>
        {activeCount > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: STATUS.accent }}>
            {activeCount} active
          </span>
        )}
        <button
          type="button"
          style={BTN}
          onClick={refresh}
          disabled={loading}
          aria-label={loading ? 'Refreshing agent registry…' : 'Refresh agent registry'}
        >
          {loading ? '\u231B' : '\u21BB'}
        </button>
      </div>

      {/* Error banner (non-fatal) */}
      {error && totalAgents > 0 && (
        <div style={{ padding: '6px 12px', background: TINT.danger, borderBottom: `1px solid ${CANVAS.border}`, fontSize: 11, color: STATUS.danger, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} role="alert">
          <span aria-hidden="true">{'\u26A0'}</span>
          <span style={{ flex: 1 }}>Refresh failed. Showing cached data.</span>
        </div>
      )}

      {/* Grouped sections */}
      {TEAM_CATEGORIES.map((cat) => {
        const agents = grouped[cat];
        if (agents.length === 0) return null;
        return (
          <div key={cat} role="group" aria-label={CATEGORY_LABELS[cat]}>
            <div style={SECTION_HEADER}>
              <span aria-hidden="true">{CATEGORY_ICONS[cat]}</span>
              {CATEGORY_LABELS[cat]}
              <span style={{ fontSize: 10, fontWeight: 400, color: CANVAS.muted, marginLeft: 2 }}>
                ({agents.length})
              </span>
            </div>
            <div style={CARDS_GRID}>
              {agents.map((agent) => (
                <AgentCard
                  key={agent.slug}
                  agent={agent}
                  workingState={agentStates[agent.slug]}
                  expanded={expandedSlug === agent.slug}
                  onToggle={() => toggleCard(agent.slug)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

const TABS: Tab[] = ['team', 'dispatch', 'actions'];

export default function TeamPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('team');
  const { messages, unreadCount, markRead } = useSwarmMessages('nyx');
  const { pending, approve, deny } = usePermissions('nyx');
  const { grouped, agentStates, loading: regLoading, error: regError, refresh } = useAgentRegistry();
  const { toggle, isSelected, selectedCount, selectedArray } = usePersonaSelection();
  const palette = useActionPalette(selectedArray);

  // Refs for roving tabindex (M-CRIT-1)
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ team: null, dispatch: null, actions: null });

  // M-HIGH-3: aria-live region for agent state transitions
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const prevActiveCountRef = useRef(0);
  const activeCount = useMemo(
    () => Object.values(agentStates).filter((s) => s !== 'idle').length,
    [agentStates],
  );
  useEffect(() => {
    if (activeCount !== prevActiveCountRef.current && liveRegionRef.current) {
      liveRegionRef.current.textContent = activeCount > 0
        ? `${activeCount} agent${activeCount === 1 ? '' : 's'} active`
        : 'All agents idle';
      prevActiveCountRef.current = activeCount;
    }
  }, [activeCount]);

  // M-CRIT-1: Arrow key navigation for roving tabindex
  const handleTablistKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = TABS.indexOf(activeTab);
    let nextIdx = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = (idx + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = (idx - 1 + TABS.length) % TABS.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIdx = TABS.length - 1;
    }
    if (nextIdx >= 0) {
      const nextTab = TABS[nextIdx];
      setActiveTab(nextTab);
      tabRefs.current[nextTab]?.focus();
    }
  }, [activeTab]);

  return (
    <div role="region" aria-label="Magi" style={PANEL_SHELL}>
      {/* M-HIGH-3: live region for SR agent state announcements */}
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" style={SR_ONLY} />

      {/* Presence bar — P7-F: pills are clickable toggles */}
      <div style={{ padding: '8px 12px 4px', flexShrink: 0 }}>
        <AgentPresence onToggle={toggle} isSelected={isSelected} />
      </div>

      {/* Permission requests (always visible when pending) */}
      {pending.length > 0 && (
        <div style={{ padding: '4px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pending.map((p) => (
            <PermissionModal
              key={p.message.id}
              permission={p}
              onApprove={approve}
              onDeny={deny}
            />
          ))}
        </div>
      )}

      {/* Tab bar — ARIA tab pattern (MARA-CRIT-4, M-CRIT-1 roving tabindex) */}
      <div
        role="tablist"
        aria-label="Magi panel tabs"
        onKeyDown={handleTablistKeyDown}
        style={{ display: 'flex', borderBottom: `1px solid ${CANVAS.border}`, flexShrink: 0 }}
      >
        <TabButton
          active={activeTab === 'team'}
          onClick={() => setActiveTab('team')}
          id="tab-team"
          controls="panel-team"
          buttonRef={(el) => { tabRefs.current.team = el; }}
        >
          <span aria-hidden="true">{'\u{1F9D9}'}</span> Team
        </TabButton>
        <TabButton
          active={activeTab === 'dispatch'}
          onClick={() => setActiveTab('dispatch')}
          id="tab-dispatch"
          controls="panel-dispatch"
          buttonRef={(el) => { tabRefs.current.dispatch = el; }}
        >
          Dispatch
          <MailboxBadge count={unreadCount} />
        </TabButton>
        <TabButton
          active={activeTab === 'actions'}
          onClick={() => setActiveTab('actions')}
          id="tab-actions"
          controls="panel-actions"
          buttonRef={(el) => { tabRefs.current.actions = el; }}
        >
          <span aria-hidden="true">{'\u26A1'}</span> Actions
          {selectedCount > 0 && (
            <span aria-label={`${selectedCount} persona${selectedCount === 1 ? '' : 's'} selected`}>
              <MailboxBadge count={selectedCount} />
            </span>
          )}
        </TabButton>
      </div>

      {/* Tab content — M-CRIT-2: all panels rendered, inactive hidden with display:none */}
      <div
        role="tabpanel"
        id="panel-team"
        aria-labelledby="tab-team"
        style={{ flex: 1, minHeight: 0, display: activeTab === 'team' ? 'flex' : 'none', flexDirection: 'column' }}
      >
        <TeamTabContent
          grouped={grouped}
          agentStates={agentStates}
          loading={regLoading}
          error={regError}
          refresh={refresh}
        />
      </div>

      <div
        role="tabpanel"
        id="panel-dispatch"
        aria-labelledby="tab-dispatch"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: activeTab === 'dispatch' ? 'block' : 'none' }}
      >
        <AgentStatusPanel />
        <div style={{ padding: 8 }}>
          <MessageFeed messages={messages} onMarkRead={markRead} />
        </div>
      </div>

      <div
        role="tabpanel"
        id="panel-actions"
        aria-labelledby="tab-actions"
        style={{ flex: 1, minHeight: 0, display: activeTab === 'actions' ? 'flex' : 'none', flexDirection: 'column' }}
      >
        <ActionPalette palette={palette} selectedCount={selectedCount} />
      </div>
    </div>
  );
}
