/**
 * FlowOverlay — Semi-transparent layer on top of PipelineCanvas.
 * Renders animated persona glyph trails along bezier curves when agents dispatch.
 *
 * Listens to `hud:dispatch-flow` events. On dispatch:
 * - Source persona glyph animates along bezier path to target node(s).
 * - Build Triad dispatch = 3 glyphs (crosshair + eye + grid) in formation.
 * - Findings return = severity-colored trail back to Nyx.
 * - Trails decay over ~2s after arrival.
 *
 * Uses requestAnimationFrame for 60fps. Toggleable visibility.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { PersonaGlyph } from '@forge-os/canvas-components';
import type { PersonaSlug } from '@forge-os/shared';
import { isPersonaSlug, PERSONA_COLORS } from '@forge-os/shared';
import { onDispatchFlow } from '../../../lib/tauri';
import type { DispatchFlowEvent } from '../../../lib/tauri';
import type { NodeRect } from './pipeline-layout';
import type { ParticleTrail, TrailConfig } from './trail-types';
import { DEFAULT_TRAIL_CONFIG, FLOW_TRAIL_CONFIGS, INITIAL_TRAIL_STATE } from './trail-types';
import { computeDispatchPath, resolveStageIndex, evalBezier } from './bezier-paths';
import { STATUS, CANVAS, RADIUS } from '@forge-os/canvas-components';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

// RIVEN-MED-1: Named glow constants instead of inline magic numbers
const GLOW_BLUR_GHOST = 4;  // px base blur for ghost trail particles
const GLOW_BLUR_LEAD = 8;   // px base blur for lead particle

// ─── Types ──────────────────────────────────────────────────────────────────

/** Max stored events for replay history */
const MAX_REPLAY_HISTORY = 100;

interface FlowOverlayProps {
  /** Pipeline node rects from computePipelineLayout. */
  nodes: NodeRect[];
  /** Container dimensions. */
  width: number;
  height: number;
  /** Whether the overlay is visible. */
  visible?: boolean;
  /** Toggle visibility callback. */
  onToggle?: () => void;
}

/** Stored dispatch event with timestamp for replay */
interface ReplayEntry {
  event: DispatchFlowEvent;
  timestamp: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** MARA-MED-2: Cap concurrent trails to prevent DOM explosion under rapid dispatch. */
const MAX_ACTIVE_TRAILS = 20;
// trailCounter moved to useRef inside component (RIVEN-MED-3)

function resolveConfig(flowType: string): TrailConfig {
  const overrides = FLOW_TRAIL_CONFIGS[flowType as keyof typeof FLOW_TRAIL_CONFIGS];
  if (!overrides) return DEFAULT_TRAIL_CONFIG;
  return { ...DEFAULT_TRAIL_CONFIG, ...overrides };
}

function severityToColor(severity: string | null): string | undefined {
  if (!severity) return undefined;
  switch (severity.toLowerCase()) {
    case 'critical': return STATUS.danger;
    case 'high': return STATUS.critical;
    case 'medium': return STATUS.warning;
    case 'low': return STATUS.neutral;
    default: return undefined;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FlowOverlay({ nodes, width, height, visible = true, onToggle }: FlowOverlayProps) {
  const [trails, setTrails] = useState(INITIAL_TRAIL_STATE);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Track active trail count for offset calculation
  const activeCountRef = useRef(0);
  // RIVEN-MED-3: component-scoped counter for unique trail IDs
  const trailCounterRef = useRef(0);

  // ── Replay System ──────────────────────────────────────────────────────
  const [replayHistory, setReplayHistory] = useState<ReplayEntry[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const replayIndexRef = useRef(0);
  const replayTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // MARA-MED-1: Respect prefers-reduced-motion (reactive via hook)
  const prefersReducedMotion = useReducedMotion();

  // ── Trail Creation (shared by live events + replay) ─────────────────────

  const injectEvent = useCallback((event: DispatchFlowEvent) => {
    if (!nodesRef.current.length) return;

    const sourceSlug = event.source_agent.toLowerCase();
    const sourceIndex = resolveStageIndex(sourceSlug);
    const sourcePersona: PersonaSlug | null = isPersonaSlug(sourceSlug) ? sourceSlug : null;

    const newTrails: ParticleTrail[] = [];
    event.target_agents.forEach((target, i) => {
      const targetSlug = target.toLowerCase();
      const targetIndex = resolveStageIndex(targetSlug);
      const targetPersona: PersonaSlug | null = isPersonaSlug(targetSlug) ? targetSlug : null;

      const path = computeDispatchPath(
        nodesRef.current,
        sourceIndex,
        targetIndex,
        activeCountRef.current + i,
      );
      if (!path) return;

      const trailId = `trail-${++trailCounterRef.current}`;
      const color = severityToColor(event.severity)
        ?? (targetPersona ? PERSONA_COLORS[targetPersona] : PERSONA_COLORS.nyx);

      newTrails.push({
        id: trailId,
        source_glyph: sourcePersona ?? 'nyx',
        target_glyphs: targetPersona ? [targetPersona] : ['nyx'],
        path: [path],
        color,
        progress: 0,
        flow_type: event.flow_type,
        severity: event.severity,
        created_at: performance.now(),
      });
    });

    if (newTrails.length > 0) {
      activeCountRef.current += newTrails.length;
      setTrails((prev) => {
        // MARA-MED-2: cap active trails — expire oldest if over limit
        const combined = [...prev.active, ...newTrails];
        const capped = combined.length > MAX_ACTIVE_TRAILS
          ? combined.slice(combined.length - MAX_ACTIVE_TRAILS)
          : combined;
        return { ...prev, active: capped };
      });
    }
  }, []);

  // ── Event Listener ──────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onDispatchFlow((event: DispatchFlowEvent) => {
      // Record to history
      setReplayHistory((prev) => {
        const entry: ReplayEntry = { event, timestamp: Date.now() };
        const updated = [...prev, entry];
        return updated.length > MAX_REPLAY_HISTORY
          ? updated.slice(updated.length - MAX_REPLAY_HISTORY)
          : updated;
      });

      // Inject live trail (unless replaying — avoid mixing live + replay)
      if (!isReplaying) {
        injectEvent(event);
      }
    });

    return () => { unsub.then((fn) => fn()); };
  }, [injectEvent, isReplaying]);

  // ── Replay Control ──────────────────────────────────────────────────────

  const startReplay = useCallback(() => {
    if (replayHistory.length === 0) return;
    // Clear any in-progress replay timers before starting fresh
    for (const t of replayTimersRef.current) clearTimeout(t);
    replayTimersRef.current = [];
    setIsReplaying(true);
    replayIndexRef.current = 0;
    setTrails(INITIAL_TRAIL_STATE);
    activeCountRef.current = 0;

    // Schedule events using relative timing from the recorded history
    const baseTime = replayHistory[0].timestamp;
    const timers: ReturnType<typeof setTimeout>[] = [];
    replayHistory.forEach((entry, i) => {
      const delay = Math.min(entry.timestamp - baseTime, 30000); // Cap at 30s to avoid extremely long replays
      timers.push(setTimeout(() => {
        injectEvent(entry.event);
        replayIndexRef.current = i + 1;
        // End replay when last event fires
        if (i === replayHistory.length - 1) {
          timers.push(setTimeout(() => setIsReplaying(false), 2000));
        }
      }, delay));
    });
    replayTimersRef.current = timers;
  }, [replayHistory, injectEvent]);

  const stopReplay = useCallback(() => {
    setIsReplaying(false);
    for (const t of replayTimersRef.current) clearTimeout(t);
    replayTimersRef.current = [];
    setTrails(INITIAL_TRAIL_STATE);
    activeCountRef.current = 0;
  }, []);

  // Cleanup replay timers on unmount
  useEffect(() => {
    return () => {
      for (const t of replayTimersRef.current) clearTimeout(t);
    };
  }, []);

  // ── Animation Loop ────────────────────────────────────────────────────────

  const animate = useCallback((timestamp: number) => {
    if (!lastFrameRef.current) lastFrameRef.current = timestamp;
    const delta = timestamp - lastFrameRef.current;
    lastFrameRef.current = timestamp;

    setTrails((prev) => {
      const now = performance.now();
      const stillActive: ParticleTrail[] = [];
      const newDecaying: ParticleTrail[] = [...prev.decaying];

      for (const trail of prev.active) {
        const config = resolveConfig(trail.flow_type);
        // Progress based on time — normalize speed to ~1s travel
        const progressDelta = (delta / 1000) * (config.speed / 3);
        const newProgress = Math.min(1, trail.progress + progressDelta);

        if (newProgress >= 1) {
          // Trail arrived — move to decaying
          newDecaying.push({ ...trail, progress: 1, created_at: now });
          activeCountRef.current = Math.max(0, activeCountRef.current - 1);
        } else {
          stillActive.push({ ...trail, progress: newProgress });
        }
      }

      // Prune decayed trails
      const aliveDecaying = newDecaying.filter((trail) => {
        const config = resolveConfig(trail.flow_type);
        return now - trail.created_at < config.decay;
      });

      return { ...prev, active: stillActive, decaying: aliveDecaying };
    });

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (!visible || prefersReducedMotion) return;
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, animate, prefersReducedMotion]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (width === 0 || height === 0) return null;

  const allTrails = visible ? [...trails.active, ...trails.decaying] : [];

  return (
    <>
      {/* Toggle buttons — outside aria-hidden for screen reader access (MARA-HIGH-1) */}
      <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4, zIndex: 20, pointerEvents: 'auto' }}>
        {/* Replay button */}
        {replayHistory.length > 0 && (
          <button
            onClick={isReplaying ? stopReplay : startReplay}
            style={{
              background: `${CANVAS.bg}cc`,
              border: `1px solid ${CANVAS.border}`,
              borderRadius: RADIUS.pill,
              color: isReplaying ? STATUS.warning : CANVAS.muted,
              fontSize: 10,
              padding: '2px 6px',
              cursor: 'pointer',
            }}
            aria-label={isReplaying ? `Stop replay (${replayIndexRef.current}/${replayHistory.length})` : `Replay ${replayHistory.length} dispatch events`}
          >
            {isReplaying ? '⏹' : '⏵'} {replayHistory.length}
          </button>
        )}

        {/* Flow visibility toggle */}
        {onToggle && (
          <button
            onClick={onToggle}
            style={{
              background: `${CANVAS.bg}cc`,
              border: `1px solid ${CANVAS.border}`,
              borderRadius: RADIUS.pill,
              color: visible ? STATUS.accent : CANVAS.muted,
              fontSize: 10,
              padding: '2px 6px',
              cursor: 'pointer',
            }}
            aria-label={visible ? 'Hide flow overlay' : 'Show flow overlay'}
            aria-pressed={visible}
          >
            Flow
          </button>
        )}
      </div>

      {/* Decorative particle layer — hidden from screen readers */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          pointerEvents: 'none',
          zIndex: 10,
        }}
        role="presentation"
        aria-hidden="true"
      >
      {/* Animated trails */}
      {allTrails.map((trail) => {
        const segment = trail.path[0];
        if (!segment) return null;

        const pos = evalBezier(segment, trail.progress);
        const config = resolveConfig(trail.flow_type);
        const isDecaying = trail.progress >= 1;

        // Decay opacity
        const decayElapsed = isDecaying ? performance.now() - trail.created_at : 0;
        const decayFraction = isDecaying ? Math.min(1, decayElapsed / config.decay) : 0;
        const opacity = isDecaying ? 1 - decayFraction : 1;

        if (opacity <= 0) return null;

        // The lead glyph — positioned at the current bezier point
        const glyphPersona = trail.source_glyph;
        const glyphSize = config.particle_size;

        return (
          <div key={trail.id} style={{ opacity }}>
            {/* Ghost trail — fading copies behind the lead */}
            {!isDecaying && config.trail_length > 0 && Array.from({ length: config.trail_length }, (_, i) => {
              const ghostT = Math.max(0, trail.progress - (i + 1) * 0.03);
              const ghostPos = evalBezier(segment, ghostT);
              const ghostOpacity = config.trail_opacity * (1 - i / config.trail_length);
              const ghostSize = glyphSize * (1 - i * 0.05);

              return (
                <div
                  key={`${trail.id}-ghost-${i}`}
                  style={{
                    position: 'absolute',
                    left: ghostPos.x - ghostSize / 2,
                    top: ghostPos.y - ghostSize / 2,
                    opacity: ghostOpacity,
                    filter: `drop-shadow(0 0 ${GLOW_BLUR_GHOST * config.glow_intensity}px ${trail.color})`,
                  }}
                >
                  <PersonaGlyph
                    size={ghostSize}
                    persona={glyphPersona}
                    state="idle"
                    color={trail.color}
                    glowIntensity={config.glow_intensity * 0.5}
                  />
                </div>
              );
            })}

            {/* Lead particle */}
            <div
              style={{
                position: 'absolute',
                left: pos.x - glyphSize / 2,
                top: pos.y - glyphSize / 2,
                filter: `drop-shadow(0 0 ${GLOW_BLUR_LEAD * config.glow_intensity}px ${trail.color})`,
                transition: isDecaying ? `opacity ${config.decay}ms ease-out` : undefined,
              }}
            >
              <PersonaGlyph
                size={glyphSize}
                persona={glyphPersona}
                state={isDecaying ? 'complete' : 'thinking'}
                color={trail.color}
                glowIntensity={config.glow_intensity}
              />
            </div>
          </div>
        );
      })}
      </div>
    </>
  );
}
