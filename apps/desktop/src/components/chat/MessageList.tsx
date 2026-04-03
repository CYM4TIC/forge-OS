// ── MessageList — Scrollable chat message container ─────────────────────────
// P7-H: Updated with role="log" (P-MED-5/M-H13), selectedPersona passthrough.
// M-H7: Dead empty state removed — ChatPanel handles empty state.
// Migrated from Tailwind to canvas-tokens.

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../hooks/useChat';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  /** Selected persona slug for user message glyph attribution. */
  selectedPersona?: string | null;
}

// ─── Static Styles (canvas-tokens, no Tailwind) ────────────────────────────

const CONTAINER: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '12px 16px',
};

export default function MessageList({ messages, isStreaming, selectedPersona }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    }
  }, [messages, isStreaming]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
      style={CONTAINER}
    >
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          selectedPersona={selectedPersona}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
