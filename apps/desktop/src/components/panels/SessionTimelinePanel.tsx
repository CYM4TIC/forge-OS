// Session Timeline — Phase 5.2 (P5-J)
// Flowing text river of commits, findings, gate verdicts.
// Canvas-rendered via Pretext. Horizontal scroll, time-proportional density.
// Gate fixes: MARA-CRIT-1 (a11y), MARA-HIGH-2/3 (touch targets), RIVEN-HIGH-1/2/3/4 (tokens/consistency).

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { CANVAS, STATUS, TINT, RADIUS } from '@forge-os/canvas-components';
import type { PersonaSlug } from '@forge-os/shared';
import { PERSONA_NAMES } from '@forge-os/shared';
import { setupCanvasForHiDPI } from '@forge-os/layout-engine';
import { getSeverityVisual } from './hud/finding-card-renderer';
import { useSessionTimeline, type TimelineEvent, type TimelineEventKind } from '../../hooks/useSessionTimeline';
import { isTauriRuntime, createPanelWindow } from '../../lib/tauri';

// ─── Constants ──────────────────────────────────────────────────────────────

const ROW_HEIGHT = 32;
const EVENT_MIN_WIDTH = 120;
const EVENT_MAX_WIDTH = 280;
const EVENT_GAP = 6;
const PADDING_X = 12;
const PADDING_Y = 8;
const HEADER_HEIGHT = 36;
const FONT_FAMILY = 'Inter, system-ui, sans-serif';
const FONT = `12px ${FONT_FAMILY}`;

const PERSONA_SLUG_SET: ReadonlySet<string> = new Set(Object.keys(PERSONA_NAMES));
function isPersonaSlug(slug: string): slug is PersonaSlug {
  return PERSONA_SLUG_SET.has(slug);
}

// ─── Visually Hidden Style (MARA-CRIT-1: screen reader access) ─────────────

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

// ─── Event Visual Config ────────────────────────────────────────────────────

const KIND_COLORS: Record<TimelineEventKind, string> = {
  commit: STATUS.accent,
  finding_added: STATUS.danger,
  finding_resolved: STATUS.success,
  gate_verdict: STATUS.warning,
  batch_complete: STATUS.accent,
};

// RIVEN-HIGH-1: Use TINT tokens instead of hardcoded rgba
const KIND_BG: Record<TimelineEventKind, string> = {
  commit: TINT.accent,
  finding_added: TINT.danger,
  finding_resolved: TINT.success,
  gate_verdict: TINT.warning,
  batch_complete: TINT.neutral,
};

const KIND_LABELS: Record<TimelineEventKind, string> = {
  commit: 'COMMIT',
  finding_added: 'FINDING',
  finding_resolved: 'RESOLVED',
  gate_verdict: 'GATE',
  batch_complete: 'BATCH',
};

// ─── Time Formatting (MARA-MED-6: include date when not today) ──────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    if (isToday) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── Canvas Drawing ─────────────────────────────────────────────────────────

function drawTimeline(
  ctx: CanvasRenderingContext2D,
  events: TimelineEvent[],
  scrollLeft: number,
  containerWidth: number,
  containerHeight: number,
  focusedIndex: number,
): void {
  if (events.length === 0 || containerWidth <= 0 || containerHeight <= 0) return;

  // Clear
  ctx.save();
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, containerWidth, containerHeight);

  // Background
  ctx.fillStyle = CANVAS.bg;
  ctx.fillRect(0, 0, containerWidth, containerHeight);

  // Time axis line
  const axisY = PADDING_Y;
  ctx.strokeStyle = CANVAS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, axisY);
  ctx.lineTo(containerWidth, axisY);
  ctx.stroke();

  // Calculate event positions — proportional to time
  const timestamps = events.map((e) => new Date(e.timestamp).getTime());
  const minT = Math.min(...timestamps);
  const maxT = Math.max(...timestamps);
  const timeSpan = maxT - minT || 1;

  const totalWidth = Math.max(
    containerWidth,
    events.length * (EVENT_MIN_WIDTH + EVENT_GAP) + PADDING_X * 2,
  );

  const eventY = axisY + 8;

  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    const t = timestamps[i];

    const timeFraction = (t - minT) / timeSpan;
    const proportionalX = PADDING_X + timeFraction * (totalWidth - PADDING_X * 2 - EVENT_MIN_WIDTH);
    const minX = i === 0 ? PADDING_X : PADDING_X + i * (EVENT_MIN_WIDTH + EVENT_GAP);
    const x = Math.max(proportionalX, minX) - scrollLeft;

    if (x + EVENT_MAX_WIDTH < 0 || x > containerWidth) continue;

    const kindColor = KIND_COLORS[evt.kind];
    const bgColor = KIND_BG[evt.kind];

    // Event card background
    ctx.fillStyle = bgColor;
    roundRect(ctx, x, eventY, EVENT_MIN_WIDTH, ROW_HEIGHT * 2, RADIUS.card);
    ctx.fill();

    // Focus ring (MARA-MED-4: visible focus indicator)
    if (i === focusedIndex) {
      ctx.strokeStyle = STATUS.accent;
      ctx.lineWidth = 2;
      roundRect(ctx, x - 1, eventY - 1, EVENT_MIN_WIDTH + 2, ROW_HEIGHT * 2 + 2, RADIUS.card + 1);
      ctx.stroke();
    }

    // Left accent bar
    ctx.fillStyle = kindColor;
    roundRect(ctx, x, eventY, 3, ROW_HEIGHT * 2, 2);
    ctx.fill();

    // Kind label
    ctx.font = `600 9px ${FONT_FAMILY}`;
    ctx.fillStyle = kindColor;
    ctx.textBaseline = 'top';
    ctx.fillText(KIND_LABELS[evt.kind], x + 10, eventY + 4);

    // Time
    ctx.font = `10px ${FONT_FAMILY}`;
    ctx.fillStyle = CANVAS.muted;
    const timeStr = formatTime(evt.timestamp);
    const timeWidth = ctx.measureText(timeStr).width;
    ctx.fillText(timeStr, x + EVENT_MIN_WIDTH - timeWidth - 6, eventY + 4);

    // Title (truncated)
    ctx.font = FONT;
    ctx.fillStyle = CANVAS.text;
    const titleMaxW = EVENT_MIN_WIDTH - 16;
    let title = evt.title;
    if (ctx.measureText(title).width > titleMaxW) {
      while (title.length > 3 && ctx.measureText(title + '...').width > titleMaxW) {
        title = title.slice(0, -1);
      }
      title += '...';
    }
    ctx.fillText(title, x + 10, eventY + 20);

    // Severity indicator for findings (RIVEN-HIGH-2: use getSeverityVisual)
    if (evt.severity) {
      const sev = getSeverityVisual(evt.severity);
      ctx.fillStyle = sev.color;
      ctx.beginPath();
      ctx.arc(x + EVENT_MIN_WIDTH - 10, eventY + ROW_HEIGHT * 2 - 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Persona indicator
    if (evt.persona && isPersonaSlug(evt.persona)) {
      ctx.fillStyle = STATUS.accent;
      ctx.beginPath();
      ctx.arc(x + EVENT_MIN_WIDTH - 20, eventY + ROW_HEIGHT * 2 - 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tick mark on axis
    ctx.strokeStyle = kindColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + EVENT_MIN_WIDTH / 2, axisY - 3);
    ctx.lineTo(x + EVENT_MIN_WIDTH / 2, axisY + 3);
    ctx.stroke();
  }

  // Scroll indicator
  if (totalWidth > containerWidth) {
    const scrollFraction = scrollLeft / (totalWidth - containerWidth);
    const indicatorWidth = Math.max(40, (containerWidth / totalWidth) * containerWidth);
    const indicatorX = scrollFraction * (containerWidth - indicatorWidth);

    ctx.fillStyle = CANVAS.border;
    roundRect(ctx, indicatorX, containerHeight - 4, indicatorWidth, 3, 2);
    ctx.fill();
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Panel ──────────────────────────────────────────────────────────────────

function SessionTimelinePanel() {
  const { events, loading, error, refresh } = useSessionTimeline();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollLeftRef = useRef(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef = useRef<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);

  // Track container size
  const sizeRef = useRef({ width: 0, height: 0 });

  const paint = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    drawTimeline(
      ctx,
      events,
      scrollLeftRef.current,
      sizeRef.current.width,
      sizeRef.current.height,
      isFocused ? focusedIndex : -1,
    );
  }, [events, focusedIndex, isFocused]);

  // RIVEN-MED-7: Setup canvas in resize observer, not in draw
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          sizeRef.current = { width, height };
          const dpr = window.devicePixelRatio || 1;
          ctxRef.current = setupCanvasForHiDPI(canvas, width, height, dpr);
          paint();
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [paint]);

  // Repaint when events change
  useEffect(() => {
    paint();
  }, [paint]);

  // Horizontal scroll handler
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const totalWidth = Math.max(
        sizeRef.current.width,
        events.length * (EVENT_MIN_WIDTH + EVENT_GAP) + PADDING_X * 2,
      );
      const maxScroll = Math.max(0, totalWidth - sizeRef.current.width);

      scrollLeftRef.current = Math.max(0, Math.min(maxScroll, scrollLeftRef.current + delta));

      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(paint);
    },
    [events, paint],
  );

  // MARA-MED-5: Keyboard event navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, events.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setFocusedIndex(events.length - 1);
      }
    },
    [events.length],
  );

  // Pop-out handler
  const handlePopOut = useCallback(() => {
    if (!isTauriRuntime) return;
    createPanelWindow({
      panel_id: 'session_timeline',
      panel_type: 'SessionTimelinePanel',
      title: 'Session Timeline',
      width: 800,
      height: 300,
    });
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────

  // Error state (MARA-HIGH-2: touch targets + role=alert)
  if (error) {
    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: CANVAS.bg,
          gap: 8,
        }}
      >
        <span style={{ color: STATUS.danger, fontSize: 13 }}>
          Timeline error: {error}
        </span>
        <button
          onClick={refresh}
          style={{
            background: CANVAS.bgElevated,
            color: CANVAS.text,
            border: `1px solid ${CANVAS.border}`,
            borderRadius: RADIUS.pill,
            padding: '4px 12px',
            fontSize: 12,
            cursor: 'pointer',
            minHeight: 32,
            minWidth: 32,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: CANVAS.bg,
        }}
      >
        <span style={{ color: CANVAS.muted, fontSize: 12, letterSpacing: '0.05em' }}>
          Loading timeline...
        </span>
      </div>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: CANVAS.bg,
        }}
      >
        <span style={{ color: CANVAS.muted, fontSize: 12 }}>
          No session events yet. Start a build to see the timeline.
        </span>
      </div>
    );
  }

  const focusedEvent = focusedIndex >= 0 && focusedIndex < events.length ? events[focusedIndex] : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: CANVAS.bg,
        overflow: 'hidden',
      }}
    >
      {/* Header — RIVEN-HIGH-3: match sibling padding/weight/spacing */}
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
        <span style={{ color: CANVAS.label, fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
          Session Timeline
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: CANVAS.muted, fontSize: 11 }}>
            {events.length} events
          </span>
          {isTauriRuntime && (
            <button
              onClick={handlePopOut}
              title="Pop out"
              aria-label="Pop out session timeline"
              style={{
                background: 'transparent',
                border: 'none',
                color: CANVAS.muted,
                cursor: 'pointer',
                fontSize: 13,
                padding: '2px 4px',
                borderRadius: RADIUS.pill,
                lineHeight: 1,
                minWidth: 32,
                minHeight: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              &#x2197;
            </button>
          )}
        </div>
      </div>

      {/* Canvas timeline */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          outline: isFocused ? `2px solid ${STATUS.accent}` : 'none',
          outlineOffset: -2,
        }}
        onWheel={handleWheel}
        role="list"
        aria-label="Session timeline events"
        aria-roledescription="horizontal timeline"
        tabIndex={0}
        onFocus={() => {
          setIsFocused(true);
          if (focusedIndex < 0 && events.length > 0) setFocusedIndex(0);
        }}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
      >
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />

        {/* MARA-CRIT-1: Visually-hidden list for screen readers */}
        <div style={SR_ONLY}>
          {events.map((evt, i) => (
            <div key={evt.id} role="listitem" aria-current={i === focusedIndex ? 'true' : undefined}>
              {KIND_LABELS[evt.kind]}: {evt.title}.
              {evt.severity ? ` Severity: ${evt.severity}.` : ''}
              {evt.persona ? ` Persona: ${evt.persona}.` : ''}
              {' '}Time: {formatTime(evt.timestamp)}.
            </div>
          ))}
        </div>

        {/* Live region for new events */}
        <div aria-live="polite" aria-atomic={false} style={SR_ONLY}>
          {focusedEvent && (
            <span>
              {KIND_LABELS[focusedEvent.kind]}: {focusedEvent.title}.
              {focusedEvent.severity ? ` ${focusedEvent.severity}.` : ''}
              {' '}{formatTime(focusedEvent.timestamp)}.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(SessionTimelinePanel);
