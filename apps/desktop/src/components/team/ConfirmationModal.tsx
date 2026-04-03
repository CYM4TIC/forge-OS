// ── Confirmation Modal — Operator approval gate for tool actions ─────────────
// P7-H: Renders when dispatch pipeline requires confirmation.
// Shows action detail, capability requirement, outcome buttons.
// Fixes: M-H1 (focus trap), M-H2 (focus restore), M-H3 (autoFocus safety),
// P-HIGH-1 (Edit button), M-H6 (aria-describedby), M-H8 (spinner),
// M-H9 (live region), M-H12 (overlay cursor), M-H14 (detail max-height),
// P-HIGH-3 (no raw #fff).

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ConfirmationRequest, ConfirmationOutcome } from '../../lib/tauri';
import { PersonaGlyph, CANVAS, STATUS, RADIUS, TIMING, FONT } from '@forge-os/canvas-components';
import type { PersonaSlug } from '@forge-os/canvas-components';
import { isPersonaSlug } from '@forge-os/shared';

interface ConfirmationModalProps {
  request: ConfirmationRequest;
  onRespond: (outcome: ConfirmationOutcome) => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    file_edit: 'File Edit',
    file_create: 'File Create',
    shell_exec: 'Shell Command',
    apply_patch: 'Apply Patch',
    mcp_tool: 'External Tool',
    ask_user: 'Question',
    exit_spec_mode: 'Mode Switch',
    propose_mission: 'Mission Proposal',
    start_mission_run: 'Mission Start',
  };
  return labels[type] ?? type;
}

function capabilityColor(cap: string): string {
  if (cap === 'destructive') return STATUS.danger;
  if (cap === 'external') return STATUS.warning;
  return STATUS.accent;
}

function actionDetail(ct: ConfirmationRequest['confirmation_type']): string {
  switch (ct.type) {
    case 'file_edit': return ct.path;
    case 'file_create': return ct.path;
    case 'shell_exec': return ct.command;
    case 'apply_patch': return `${ct.file_count} files \u2014 ${ct.summary}`;
    case 'mcp_tool': return `${ct.server}::${ct.tool_name}`;
    case 'ask_user': return ct.question;
    case 'exit_spec_mode': return 'Switch interaction mode';
    case 'propose_mission': return ct.title;
    case 'start_mission_run': return ct.mission_id;
  }
}

// ─── Static Styles ──────────────────────────────────────────────────────────

const OVERLAY: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const DIALOG: React.CSSProperties = {
  background: CANVAS.bgElevated,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.card,
  padding: 20,
  minWidth: 340,
  maxWidth: 480,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5)`,
};

const HEADER: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const TITLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: CANVAS.text,
  letterSpacing: '0.03em',
};

const DETAIL_BLOCK: React.CSSProperties = {
  background: CANVAS.bg,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.card,
  padding: '10px 12px',
  fontSize: 12,
  fontFamily: FONT.mono,
  color: CANVAS.text,
  wordBreak: 'break-all',
  lineHeight: '18px',
  // M-H14: cap detail height for long paths/commands
  maxHeight: 120,
  overflowY: 'auto',
};

const BADGE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 10,
  fontWeight: 600,
  fontFamily: FONT.mono,
  borderRadius: RADIUS.pill,
  padding: '2px 8px',
  whiteSpace: 'nowrap',
};

const ACTIONS_ROW: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
  paddingTop: 4,
  flexWrap: 'wrap',
};

const BTN_BASE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  borderRadius: RADIUS.pill,
  padding: '8px 16px',
  cursor: 'pointer',
  minHeight: 36,
  minWidth: 72,
  transition: `opacity ${TIMING.fast}`,
  border: 'none',
};

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ConfirmationModal({ request, onRespond }: ConfirmationModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // M-H2: Capture trigger element for focus restoration
  const previousFocusRef = useRef<HTMLElement | null>(
    document.activeElement as HTMLElement | null,
  );

  // M-H1: Focus trap — keep Tab/Shift+Tab within the dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableSelector = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        handleRespond('cancel');
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = dialog.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // M-H3: Focus Cancel for destructive, first button for normal
    const isDestructiveAction = request.capability_required === 'destructive';
    const buttons = dialog.querySelectorAll<HTMLElement>('button');
    if (buttons.length > 0) {
      // Cancel is first button; Approve is last
      (isDestructiveAction ? buttons[0] : buttons[buttons.length - 1]).focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // M-H2: Restore focus on unmount
      previousFocusRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRespond = useCallback(async (outcome: ConfirmationOutcome) => {
    setSubmitting(true);
    try {
      await onRespond(outcome);
    } finally {
      setSubmitting(false);
    }
  }, [onRespond]);

  const isDestructive = request.capability_required === 'destructive';
  const persona = request.requesting_persona;
  const detail = actionDetail(request.confirmation_type);
  const capColor = capabilityColor(request.capability_required);

  return (
    <div
      style={{
        ...OVERLAY,
        // M-H12: Block clicks during submission
        cursor: submitting ? 'not-allowed' : undefined,
      }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          handleRespond('cancel');
        }
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={`Confirm action: ${typeLabel(request.confirmation_type.type)}`}
        aria-describedby="confirmation-detail"
        style={DIALOG}
      >
        {/* Header: glyph + type label */}
        <div style={HEADER}>
          {persona && isPersonaSlug(persona) ? (
            <PersonaGlyph
              persona={persona as PersonaSlug}
              size={28}
              state="idle"
              aria-hidden="true"
            />
          ) : (
            <span style={{ fontSize: 22 }} aria-hidden="true">
              {isDestructive ? '\u26A0\uFE0F' : '\u2697\uFE0F'}
            </span>
          )}
          <div>
            <div style={TITLE}>
              {isDestructive ? 'Confirm Destructive Action' : 'Confirm Action'}
            </div>
            <div style={{ fontSize: 11, color: CANVAS.muted }}>
              {typeLabel(request.confirmation_type.type)}
              {persona ? ` \u2014 ${persona}` : ''}
            </div>
          </div>
        </div>

        {/* Action detail */}
        <div id="confirmation-detail" style={DETAIL_BLOCK}>{detail}</div>

        {/* Summary + capability badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: CANVAS.muted, flex: 1 }}>
            {request.arguments_summary}
          </span>
          <span style={{
            ...BADGE,
            background: `${capColor}18`,
            color: capColor,
          }}>
            {request.capability_required.replace('_', ' ')}
          </span>
        </div>

        {/* M-H9: Live region for submission state */}
        <span role="status" style={SR_ONLY} aria-live="polite">
          {submitting ? 'Processing confirmation\u2026' : ''}
        </span>

        {/* M-H6: Always button description (linked via aria-describedby on the button) */}
        <span id="always-desc" style={SR_ONLY}>
          Approve and whitelist this action type for the rest of the session.
        </span>

        {/* Action buttons */}
        <div style={ACTIONS_ROW}>
          <button
            style={{
              ...BTN_BASE,
              background: 'transparent',
              border: `1px solid ${CANVAS.border}`,
              color: CANVAS.text,
              opacity: submitting ? 0.5 : 1,
            }}
            onClick={() => handleRespond('cancel')}
            disabled={submitting}
          >
            Cancel
          </button>

          {/* P-HIGH-1: Edit button — modify action before execution */}
          <button
            style={{
              ...BTN_BASE,
              background: 'transparent',
              border: `1px solid ${CANVAS.border}`,
              color: CANVAS.text,
              opacity: submitting ? 0.5 : 1,
            }}
            onClick={() => handleRespond('proceed_edit')}
            disabled={submitting}
            title="Modify the action before execution"
          >
            Edit
          </button>

          <button
            style={{
              ...BTN_BASE,
              background: `${STATUS.accent}30`,
              color: STATUS.accent,
              opacity: submitting ? 0.5 : 1,
            }}
            onClick={() => handleRespond('proceed_always')}
            disabled={submitting}
            aria-describedby="always-desc"
          >
            Always
          </button>

          <button
            style={{
              ...BTN_BASE,
              // P-HIGH-3: No raw #fff — use CANVAS.text on dark accent
              background: isDestructive ? STATUS.danger : STATUS.accent,
              color: CANVAS.bg,
              opacity: submitting ? 0.5 : 1,
            }}
            onClick={() => handleRespond('proceed_once')}
            disabled={submitting}
          >
            {submitting ? 'Approving\u2026' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}
