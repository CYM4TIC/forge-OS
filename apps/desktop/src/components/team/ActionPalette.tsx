// ── Action Palette — Contextual action browser based on persona selection ──
// P7-G: Shows orchestrators, commands, and sub-agents for selected personas.
// Renders as content of "Actions" tab in TeamPanel (Magi).

import { useState, useCallback } from 'react';
import type { PaletteAction, PaletteActionType } from '../../lib/tauri';
import type { UseActionPaletteReturn } from '../../hooks/useActionPalette';
import { PersonaGlyph, CANVAS, STATUS, RADIUS, TIMING, FONT, TINT } from '@forge-os/canvas-components';
import type { PersonaSlug } from '@forge-os/canvas-components';
import { isPersonaSlug } from '@forge-os/shared';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ActionPaletteProps {
  palette: UseActionPaletteReturn;
  selectedCount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Friendly error messages (mirrors TeamPanel M-MED-4). */
function friendlyError(raw: string): string {
  if (raw.includes('network') || raw.includes('fetch')) return 'Network error \u2014 check your connection.';
  if (raw.includes('timeout')) return 'Request timed out.';
  return 'Something went wrong.';
}

/** Section labels and icons for action types. */
const ACTION_SECTION: Record<PaletteActionType, { label: string; icon: string }> = {
  orchestrator: { label: 'Orchestrators', icon: '\u2697\uFE0F' },  // ⚗️
  command: { label: 'Commands', icon: '\u26A1' },                   // ⚡
  sub_agent: { label: 'Sub-Agents', icon: '\u{1F4DC}' },           // 📜
};

/** Extract parent persona slug from a sub-agent slug (e.g., "mara-accessibility" → "mara"). */
function parentSlug(slug: string): string | null {
  const dash = slug.indexOf('-');
  if (dash === -1) return null;
  const candidate = slug.slice(0, dash);
  return isPersonaSlug(candidate) ? candidate : null;
}

// ─── Keyframes (M-CRIT-1: must be injected, not assumed from globals) ───────

const KEYFRAMES = `
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
`;

// ─── Static Styles (canvas-tokens, no Tailwind) ─────────────────────────────

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const SCROLL_AREA: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
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

const ACTIONS_LIST: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '4px 10px 10px',
};

const ACTION_ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  background: CANVAS.bgElevated,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.card,
  cursor: 'pointer',
  transition: `border-color ${TIMING.fast}, box-shadow ${TIMING.fast}`,
  minHeight: 36,
  // M-CRIT-2: outline reset — focus-visible handled via CSS rule below
  outline: 'none',
};

const ACTION_NAME: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: CANVAS.text,
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const ACTION_DESC: React.CSSProperties = {
  fontSize: 11,
  color: CANVAS.muted,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '60%',
};

const ACTION_TYPE_BADGE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  fontFamily: FONT.mono,
  color: CANVAS.label,
  background: TINT.subtle,
  borderRadius: RADIUS.pill,
  padding: '2px 6px',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const EMPTY_STATE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  gap: 8,
  padding: 24,
  textAlign: 'center',
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

// M-CRIT-2: focus-visible CSS for keyboard users
// M-HIGH-1: reduced-motion overrides for animations
const FOCUS_AND_MOTION_STYLES = `
.action-palette-row:focus-visible {
  outline: 2px solid ${STATUS.accent};
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .action-palette-spinner { animation: none !important; opacity: 0.6; }
  .action-palette-skeleton { animation: none !important; opacity: 0.5; }
}
`;

// ─── Action Row Component ───────────────────────────────────────────────────

function ActionRow({ action, onDispatch, isDispatching, reducedMotion }: {
  action: PaletteAction;
  onDispatch: (action: PaletteAction) => void;
  isDispatching: boolean;
  reducedMotion: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const parent = action.action_type === 'sub_agent' ? parentSlug(action.slug) : null;

  const spinnerStyle: React.CSSProperties = {
    width: 14,
    height: 14,
    border: `2px solid ${CANVAS.border}`,
    borderTopColor: STATUS.accent,
    borderRadius: '50%',
    animation: reducedMotion ? 'none' : 'spin 0.6s linear infinite',
    opacity: reducedMotion ? 0.6 : 1,
    flexShrink: 0,
  };

  return (
    <button
      className="action-palette-row"
      style={{
        ...ACTION_ROW,
        borderColor: hovered ? STATUS.accent : CANVAS.border,
        boxShadow: hovered ? `0 0 0 1px ${STATUS.accent}40` : 'none',
        opacity: isDispatching ? 0.6 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isDispatching && onDispatch(action)}
      disabled={isDispatching}
      // M-MED-1: include description in aria-label for screen readers
      aria-label={`Dispatch ${action.name}. ${action.description}`}
      title={action.description}
    >
      {/* Persona glyph attribution for sub-agents */}
      {parent && isPersonaSlug(parent) && (
        <PersonaGlyph
          persona={parent as PersonaSlug}
          size={20}
          state="idle"
          aria-hidden="true"
        />
      )}

      {/* Orchestrator icon */}
      {action.action_type === 'orchestrator' && (
        <span style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true">{'\u2697\uFE0F'}</span>
      )}

      {/* Command icon */}
      {action.action_type === 'command' && (
        <span style={{ fontSize: 14, flexShrink: 0, fontFamily: FONT.mono, color: STATUS.accent }}>/</span>
      )}

      <span style={ACTION_NAME}>{action.name}</span>
      <span style={ACTION_DESC}>{action.description}</span>

      {isDispatching ? (
        // M-MED-4: role="status" so screen readers announce dispatching state
        <span className="action-palette-spinner" style={spinnerStyle} role="status" aria-label="Dispatching" />
      ) : (
        <span style={ACTION_TYPE_BADGE}>{action.action_type.replace('_', '-')}</span>
      )}
    </button>
  );
}

// ─── Section Component ──────────────────────────────────────────────────────

function ActionSection({ type, actions, onDispatch, dispatchingSlug, reducedMotion }: {
  type: PaletteActionType;
  actions: PaletteAction[];
  onDispatch: (action: PaletteAction) => void;
  dispatchingSlug: string | null;
  reducedMotion: boolean;
}) {
  if (actions.length === 0) return null;

  const section = ACTION_SECTION[type];
  return (
    <div role="group" aria-label={section.label}>
      <div style={SECTION_HEADER}>
        <span aria-hidden="true">{section.icon}</span>
        <span>{section.label}</span>
        <span style={{ color: CANVAS.muted, fontWeight: 400, fontSize: 10 }}>({actions.length})</span>
      </div>
      <div style={ACTIONS_LIST}>
        {actions.map((action) => (
          <ActionRow
            key={action.slug}
            action={action}
            onDispatch={onDispatch}
            isDispatching={dispatchingSlug === action.slug}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ActionPalette({ palette, selectedCount }: ActionPaletteProps) {
  const { actions, loading, error, dispatch, dispatchingSlug, underspecified, clearUnderspecified, refresh } = palette;
  const reducedMotion = useReducedMotion();

  const handleDispatch = useCallback((action: PaletteAction) => {
    dispatch(action).catch((err) => {
      console.error('[ActionPalette] dispatch failed:', err);
    });
  }, [dispatch]);

  // Skeleton style (M-HIGH-1: respect reduced motion)
  const skeletonStyle: React.CSSProperties = {
    height: 40,
    background: CANVAS.bgElevated,
    border: `1px solid ${CANVAS.border}`,
    borderRadius: RADIUS.card,
    animation: reducedMotion ? 'none' : 'pulse 1.5s ease-in-out infinite',
    opacity: reducedMotion ? 0.5 : undefined,
  };

  // ── Empty state: nothing selected ──
  if (selectedCount === 0) {
    return (
      <div style={EMPTY_STATE}>
        <style>{KEYFRAMES}{FOCUS_AND_MOTION_STYLES}</style>
        <span style={{ fontSize: 32 }} aria-hidden="true">{'\u2697\uFE0F'}</span>
        <span style={{ color: CANVAS.text, fontSize: 13, fontWeight: 600 }}>
          Invocation Palette
        </span>
        <span style={{ color: CANVAS.muted, fontSize: 11, lineHeight: '16px' }}>
          Select personas above to browse actions.
        </span>
      </div>
    );
  }

  // ── Loading state: skeleton rows ──
  if (loading && actions.individual_actions.length === 0 && actions.orchestrator_actions.length === 0) {
    return (
      <div style={SCROLL_AREA} aria-busy="true">
        <style>{KEYFRAMES}{FOCUS_AND_MOTION_STYLES}</style>
        <span role="status" style={SR_ONLY}>Loading actions\u2026</span>
        <div style={{ ...ACTIONS_LIST, padding: 10 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="action-palette-skeleton" style={skeletonStyle} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state (with no cached data) — M-HIGH-2: includes retry button ──
  if (error && actions.individual_actions.length === 0 && actions.orchestrator_actions.length === 0) {
    return (
      <div style={EMPTY_STATE} role="alert">
        <style>{KEYFRAMES}{FOCUS_AND_MOTION_STYLES}</style>
        <span style={{ fontSize: 24 }} aria-hidden="true">{'\u{1F525}'}</span>
        <span style={{ color: CANVAS.text, fontSize: 13, fontWeight: 600 }}>
          {friendlyError(error)}
        </span>
        <button style={BTN} onClick={refresh}>Retry</button>
      </div>
    );
  }

  // ── Group individual actions by type ──
  const commands = actions.individual_actions.filter((a) => a.action_type === 'command');
  const subAgents = actions.individual_actions.filter((a) => a.action_type === 'sub_agent');
  const otherIndividual = actions.individual_actions.filter(
    (a) => a.action_type !== 'command' && a.action_type !== 'sub_agent'
  );

  const orchCount = actions.orchestrator_actions.length;
  const cmdCount = commands.length;
  const subCount = subAgents.length + otherIndividual.length;
  const totalActions = orchCount + actions.individual_actions.length;

  // ── No actions available for selection ──
  if (totalActions === 0 && !loading) {
    return (
      <div style={EMPTY_STATE}>
        <style>{KEYFRAMES}{FOCUS_AND_MOTION_STYLES}</style>
        <span style={{ fontSize: 24 }} aria-hidden="true">{'\u{1F50D}'}</span>
        <span style={{ color: CANVAS.text, fontSize: 13, fontWeight: 600 }}>
          No actions found
        </span>
        <span style={{ color: CANVAS.muted, fontSize: 11, lineHeight: '16px' }}>
          Selected personas have no dispatchable actions. Try selecting different personas.
        </span>
      </div>
    );
  }

  // M-MED-3: section breakdown in live region for screen readers
  const sectionBreakdown = [
    orchCount > 0 ? `${orchCount} orchestrator${orchCount === 1 ? '' : 's'}` : '',
    cmdCount > 0 ? `${cmdCount} command${cmdCount === 1 ? '' : 's'}` : '',
    subCount > 0 ? `${subCount} sub-agent${subCount === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(', ');

  return (
    <div style={SCROLL_AREA}>
      {/* M-CRIT-1: keyframes + M-CRIT-2: focus-visible + M-HIGH-1: reduced motion */}
      <style>{KEYFRAMES}{FOCUS_AND_MOTION_STYLES}</style>

      {/* Status line when loading with cached data */}
      {loading && (
        <div style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="action-palette-spinner"
            style={{
              width: 14, height: 14,
              border: `2px solid ${CANVAS.border}`,
              borderTopColor: STATUS.accent,
              borderRadius: '50%',
              animation: reducedMotion ? 'none' : 'spin 0.6s linear infinite',
              flexShrink: 0,
            }}
          />
          <span role="status" style={{ fontSize: 11, color: CANVAS.muted }}>Updating actions\u2026</span>
        </div>
      )}

      {/* Non-fatal error banner above results */}
      {error && totalActions > 0 && (
        <div
          role="alert"
          style={{
            margin: '4px 10px',
            padding: '6px 10px',
            background: TINT.danger,
            borderRadius: RADIUS.pill,
            fontSize: 11,
            color: CANVAS.text,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ flex: 1 }}>{friendlyError(error)}</span>
          <button style={{ ...BTN, padding: '2px 8px', fontSize: 11, minHeight: 24 }} onClick={refresh}>Retry</button>
        </div>
      )}

      {/* Underspecification gating prompt (P7-G) — M-LOW-2: role="status" not "alert" */}
      {underspecified && (
        <div
          role="status"
          aria-live="polite"
          style={{
            margin: '4px 10px',
            padding: '8px 12px',
            background: TINT.warning,
            borderRadius: RADIUS.card,
            fontSize: 12,
            color: CANVAS.text,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ flex: 1 }}>{underspecified}</span>
          {/* M-HIGH-3: 32px minimum touch target */}
          <button
            onClick={clearUnderspecified}
            style={{
              background: 'transparent',
              border: 'none',
              color: CANVAS.muted,
              cursor: 'pointer',
              fontSize: 14,
              padding: '6px 8px',
              minWidth: 32,
              minHeight: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Dismiss suggestion"
          >
            {'\u2715'}
          </button>
        </div>
      )}

      {/* M-MED-3: live region with section breakdown */}
      <span role="status" style={SR_ONLY} aria-live="polite">
        {totalActions} action{totalActions === 1 ? '' : 's'} available: {sectionBreakdown}.
      </span>

      {/* Orchestrators section (highest priority — matched combos) */}
      <ActionSection
        type="orchestrator"
        actions={actions.orchestrator_actions}
        onDispatch={handleDispatch}
        dispatchingSlug={dispatchingSlug}
        reducedMotion={reducedMotion}
      />

      {/* Commands section */}
      <ActionSection
        type="command"
        actions={commands}
        onDispatch={handleDispatch}
        dispatchingSlug={dispatchingSlug}
        reducedMotion={reducedMotion}
      />

      {/* Sub-Agents section */}
      <ActionSection
        type="sub_agent"
        actions={[...subAgents, ...otherIndividual]}
        onDispatch={handleDispatch}
        dispatchingSlug={dispatchingSlug}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
