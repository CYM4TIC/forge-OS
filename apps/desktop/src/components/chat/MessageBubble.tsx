// ── MessageBubble — Chat message with persona glyph avatar ──────────────────
// P7-H: Migrated from Tailwind to canvas-tokens. Added PersonaGlyph rendering.

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../hooks/useChat';
import { PersonaGlyph, CANVAS, STATUS, RADIUS } from '@forge-os/canvas-components';
import type { PersonaSlug } from '@forge-os/canvas-components';
import { isPersonaSlug } from '@forge-os/shared';
import { shrinkwrapText } from '@forge-os/layout-engine';

interface MessageBubbleProps {
  message: ChatMessage;
  /** Persona slug selected in the chat session (for user message attribution). */
  selectedPersona?: string | null;
}

// ─── Static Styles (canvas-tokens, no Tailwind — RIVEN-HIGH-2) ─────────────

const ROW_USER: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'flex-start',
  gap: 8,
  marginBottom: 12,
};

const ROW_ASSISTANT: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'flex-start',
  gap: 8,
  marginBottom: 12,
};

const BUBBLE_USER: React.CSSProperties = {
  maxWidth: '80%',
  borderRadius: RADIUS.card,
  borderBottomRightRadius: 4,
  padding: '10px 14px',
  fontSize: 13,
  lineHeight: '20px',
  background: STATUS.accent,
  // P-HIGH-3: no raw #fff — dark bg token as inverse text on accent
  color: CANVAS.bg,
  whiteSpace: 'pre-wrap',
};

const BUBBLE_ASSISTANT: React.CSSProperties = {
  maxWidth: '80%',
  borderRadius: RADIUS.card,
  borderBottomLeftRadius: 4,
  padding: '10px 14px',
  fontSize: 13,
  lineHeight: '20px',
  background: CANVAS.bgElevated,
  color: CANVAS.text,
};

const META_ROW: React.CSSProperties = {
  marginTop: 6,
  paddingTop: 4,
  borderTop: `1px solid ${CANVAS.border}`,
  color: CANVAS.muted,
  fontSize: 11,
  display: 'flex',
  gap: 12,
};

const GLYPH_WRAPPER: React.CSSProperties = {
  flexShrink: 0,
  marginTop: 2,
};

// M-H10: Visually hidden label for persona attribution (screen readers)
const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

// M-H4: Keyframes + reduced motion for streaming cursor
const CURSOR_STYLES = `
@keyframes msg-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .msg-streaming-cursor { animation: none !important; opacity: 0.6; }
}
`;

// ─── Component ──────────────────────────────────────────────────────────────

// Shrinkwrap constants — user bubble font matches BUBBLE_USER (13px system font)
const SHRINKWRAP_FONT = '13px system-ui, -apple-system, sans-serif';
const SHRINKWRAP_MAX = 500; // px — upper bound for shrinkwrap search
const SHRINKWRAP_LINE_HEIGHT = 20; // px — matches lineHeight in BUBBLE_USER

export default function MessageBubble({ message, selectedPersona }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';

  // P7-H: shrinkwrap user messages — zero-waste bubble widths.
  // Only for user messages (plain text). Assistant messages render markdown
  // which requires DOM measurement, so they keep max-width: 80%.
  const userBubbleWidth = useMemo(() => {
    if (!isUser || !message.content) return undefined;
    try {
      const result = shrinkwrapText(
        message.content,
        { font: SHRINKWRAP_FONT, whiteSpace: 'pre-wrap' },
        { maxWidth: SHRINKWRAP_MAX, lineHeight: SHRINKWRAP_LINE_HEIGHT },
      );
      // Add padding (14px * 2 = 28px) to the text width
      return result.width > 0 ? result.width + 28 : undefined;
    } catch {
      return undefined;
    }
  }, [isUser, message.content]);

  // Determine glyph: assistant messages use message's persona_slug,
  // user messages use the session's selected persona (if any).
  const glyphSlug = isUser ? selectedPersona : message.persona_slug;
  const showGlyph = glyphSlug && isPersonaSlug(glyphSlug);

  // M-H10: Persona name for screen reader attribution
  const personaLabel = showGlyph ? (glyphSlug as string) : null;

  return (
    <div style={isUser ? ROW_USER : ROW_ASSISTANT}>
      {/* M-H4: Inject cursor keyframes + reduced motion */}
      <style>{CURSOR_STYLES}</style>

      {/* Assistant glyph (left side) */}
      {!isUser && showGlyph && (
        <div style={GLYPH_WRAPPER}>
          <PersonaGlyph
            persona={glyphSlug as PersonaSlug}
            size={24}
            state={isStreaming ? 'thinking' : 'idle'}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Bubble — shrinkwrapped width for user messages */}
      <div style={{
        ...(isUser ? BUBBLE_USER : BUBBLE_ASSISTANT),
        ...(userBubbleWidth ? { maxWidth: userBubbleWidth, width: 'fit-content' } : {}),
      }}>
        {/* M-H10: SR-only persona attribution */}
        {personaLabel && !isUser && (
          <span style={SR_ONLY}>{personaLabel} says:</span>
        )}
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <div aria-label="Assistant message">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span
                className="msg-streaming-cursor"
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 16,
                  background: STATUS.accent,
                  marginLeft: 2,
                  verticalAlign: 'text-bottom',
                  animation: 'msg-pulse 1s ease-in-out infinite',
                }}
              />
            )}
          </div>
        )}
        {!isUser && message.status === 'complete' && message.model && (
          <div style={META_ROW}>
            <span>{message.model}</span>
            {message.tokens_in != null && message.tokens_out != null && (
              <span>
                {message.tokens_in}\u2193 {message.tokens_out}\u2191
              </span>
            )}
          </div>
        )}
      </div>

      {/* User glyph (right side) */}
      {isUser && showGlyph && (
        <div style={GLYPH_WRAPPER}>
          <PersonaGlyph
            persona={glyphSlug as PersonaSlug}
            size={24}
            state="idle"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
