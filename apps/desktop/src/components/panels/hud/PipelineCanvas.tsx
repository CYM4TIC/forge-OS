/**
 * PipelineCanvas — Canvas-rendered pipeline with 4 stage nodes.
 * Scout → Build → Triad → Sentinel
 *
 * Each node: label (Pretext-measured, centered), status glow (idle=dim, active=pulse,
 * complete=glow), persona glyph rendered inside when agent is active.
 * Connection lines animate between nodes. Responds to container resize.
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  NodeCard,
  ConnectionLine,
  FlowParticle,
  PersonaGlyph,
  StatusBadge,
  PIPELINE,
  STATUS,
  CANVAS,
  getPipelineColor,
} from '@forge-os/canvas-components';
import type { NodeStatus, GlyphState } from '@forge-os/canvas-components';
import type { PersonaSlug } from '@forge-os/shared';
import type { PipelineStage, StageStatus } from '../../../lib/tauri';
import { computePipelineLayout } from './pipeline-layout';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

// ─── Ambient Animation Constants ───────────────────────────────────────────

/** Max vertical drift in px for idle sine wave */
const IDLE_DRIFT_PX = 3;
/** Cycle period in ms for idle drift */
const IDLE_DRIFT_PERIOD = 4000;
/** Ember glow intensity for idle persona glyphs (0-1) */
const EMBER_GLOW = 0.4;
/** Glow intensity when active — for pulse variation */
const ACTIVE_GLOW_BASE = 1.0;
/** Glow pulse amplitude on active nodes */
const ACTIVE_GLOW_PULSE = 0.3;
/** Pulse period in ms for active glow variation */
const ACTIVE_PULSE_PERIOD = 2000;

// ─── Types ──────────────────────────────────────────────────────────────────

interface PipelineCanvasProps {
  stages: PipelineStage[];
  width: number;
  height: number;
  onStageClick?: (stageId: string) => void;
}

// ─── Stage → Visual Mapping ─────────────────────────────────────────────────

/** Map pipeline stage status to NodeCard status */
function stageStatusToNodeStatus(status: StageStatus): NodeStatus {
  switch (status) {
    case 'active': return 'active';
    case 'complete': return 'complete';
    case 'error': return 'error';
    case 'idle':
    default: return 'idle';
  }
}

/** Map pipeline stage status to glyph animation state */
function stageStatusToGlyphState(status: StageStatus): GlyphState {
  switch (status) {
    case 'active': return 'thinking';
    case 'complete': return 'complete';
    case 'error': return 'error';
    case 'idle':
    default: return 'idle';
  }
}

/** Map stage agent ID to persona slug (if it's a known persona) */
function agentToPersona(agent: string | null | undefined): PersonaSlug | null {
  if (!agent) return null;
  const slug = agent.toLowerCase().replace(/^dr[._-]?\s*/, '');
  const known: PersonaSlug[] = [
    'nyx', 'pierce', 'mara', 'riven', 'kehinde',
    'tanaka', 'vane', 'voss', 'calloway', 'sable',
  ];
  // Check direct match or intelligence names
  if (known.includes(slug as PersonaSlug)) return slug as PersonaSlug;
  // Intelligence agents get a representative persona glyph.
  // "build" and "triad" stages are omitted — they derive their persona
  // from PipelineStage.agent field set at dispatch time (e.g., "nyx" for build,
  // "pierce" for triad lead). Only intelligence names that always map to
  // one persona are listed here.
  const intelligenceMap: Record<string, PersonaSlug> = {
    scout: 'nyx',
    sentinel: 'pierce',
    wraith: 'tanaka',
  };
  if (intelligenceMap[slug]) return intelligenceMap[slug];
  return null;
}

// ─── Colors (from PIPELINE tokens) ─────────────────────────────────────────

function stageColor(stageId: string): string {
  return getPipelineColor(stageId.toLowerCase());
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PipelineCanvas({ stages, width, height, onStageClick }: PipelineCanvasProps) {
  // Compute layout from dimensions and stage count
  const layout = useMemo(
    () => computePipelineLayout(width, height, stages.length),
    [width, height, stages.length],
  );

  // ── Ambient animation phase (0-1 cycling, throttled to ~15fps) ──────────
  const [animPhase, setAnimPhase] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const prefersReducedMotion = useReducedMotion();

  /** Throttle interval — 15fps is smooth enough for 3px drift */
  const THROTTLE_MS = 66; // ~15fps

  const animate = useCallback((timestamp: number) => {
    if (!startRef.current) startRef.current = timestamp;
    // Throttle state updates to ~15fps to reduce GC pressure
    if (timestamp - lastUpdateRef.current >= THROTTLE_MS) {
      const elapsed = timestamp - startRef.current;
      const phase = (elapsed % IDLE_DRIFT_PERIOD) / IDLE_DRIFT_PERIOD;
      setAnimPhase(phase);
      lastUpdateRef.current = timestamp;
    }
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate, prefersReducedMotion]);

  if (!stages.length || width === 0 || height === 0) {
    return (
      <div
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span style={{ color: CANVAS.muted, fontSize: 13 }}>No pipeline data</span>
      </div>
    );
  }

  return (
    <div
      style={{ width, height, position: 'relative' }}
      role="img"
      aria-label={`Pipeline: ${stages.map((s) => `${s.label} (${s.status})`).join(' → ')}`}
    >
      {/* Connection lines — rendered behind nodes */}
      {layout.connections.map((conn, i) => {
        const fromStage = stages[i];
        const isActive = fromStage?.status === 'complete' || fromStage?.status === 'active';
        const color = isActive ? stageColor(fromStage.id) : PIPELINE.inactive;

        return (
          <div
            key={`conn-${i}`}
            style={{ position: 'absolute', top: 0, left: 0, width, height, pointerEvents: 'none' }}
          >
            <ConnectionLine
              width={width}
              height={height}
              from={conn.from}
              to={conn.to}
              color={color}
              lineWidth={isActive ? 2 : 1.5}
              animated={isActive}
              speed={isActive ? 40 : 20}
              curvature={0.3}
              showArrow
              arrowSize={6}
            />
          </div>
        );
      })}

      {/* Flow particles on active connections */}
      {layout.connections.map((conn, i) => {
        const fromStage = stages[i];
        if (fromStage?.status !== 'active' && fromStage?.status !== 'complete') return null;

        return (
          <div
            key={`particle-${i}`}
            style={{ position: 'absolute', top: 0, left: 0, width, height, pointerEvents: 'none' }}
          >
            <FlowParticle
              width={width}
              height={height}
              path={conn.bezier}
              color={stageColor(fromStage.id)}
              radius={3}
              trailLength={0.2}
              duration={1800}
              loop
              showPath={false}
            />
          </div>
        );
      })}

      {/* Stage nodes */}
      {stages.map((stage, i) => {
        const rect = layout.nodes[i];
        if (!rect) return null;

        const persona = agentToPersona(stage.agent);
        const isActive = stage.status === 'active';
        const isIdle = stage.status === 'idle';
        const isClickable = onStageClick && (isActive || stage.status === 'complete' || stage.status === 'error');

        // Ambient idle drift — each node offset by index to create wave effect
        const nodePhase = (animPhase + i * 0.25) % 1;
        const driftY = isIdle && !prefersReducedMotion
          ? Math.sin(nodePhase * Math.PI * 2) * IDLE_DRIFT_PX
          : 0;

        // Pulse-varying glow for active nodes
        const activePulsePhase = (animPhase * IDLE_DRIFT_PERIOD / ACTIVE_PULSE_PERIOD + i * 0.15) % 1;
        const activeGlow = isActive && !prefersReducedMotion
          ? ACTIVE_GLOW_BASE + Math.sin(activePulsePhase * Math.PI * 2) * ACTIVE_GLOW_PULSE
          : isActive ? ACTIVE_GLOW_BASE : EMBER_GLOW;

        return (
          <div
            key={stage.id}
            style={{
              position: 'absolute',
              left: rect.x,
              top: rect.y + driftY,
              width: rect.width,
              height: rect.height,
              cursor: isClickable ? 'pointer' : undefined,
              outline: 'none',
              borderRadius: 10,
              transition: prefersReducedMotion ? undefined : 'top 0.3s ease-out',
            }}
            // Focus-visible ring via CSS custom property — neon accent glow
            onFocus={isClickable ? (e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${STATUS.accent}, 0 0 8px ${STATUS.accent}40`; } : undefined}
            onBlur={isClickable ? (e) => { e.currentTarget.style.boxShadow = ''; } : undefined}
            onClick={isClickable ? () => onStageClick(stage.id) : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-label={isClickable ? `Open ${stage.label} panels` : undefined}
            onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStageClick(stage.id); } } : undefined}
          >
            {/* Node card background */}
            <NodeCard
              width={rect.width}
              height={rect.height}
              label={stage.label}
              subLabel={stage.status !== 'idle' ? stage.status : undefined}
              status={stageStatusToNodeStatus(stage.status)}
              bgColor={isActive ? `${stageColor(stage.id)}10` : undefined}
              borderRadius={10}
            />

            {/* Status badge — top right */}
            {stage.status !== 'idle' && (
              <div
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  pointerEvents: 'none',
                }}
              >
                <StatusBadge
                  width={14}
                  height={14}
                  status={
                    stage.status === 'active' ? 'active'
                    : stage.status === 'complete' ? 'success'
                    : stage.status === 'error' ? 'danger'
                    : 'neutral'
                  }
                  pulse={isActive}
                />
              </div>
            )}

            {/* Persona glyph — ember state when idle (soft glow), full state when active */}
            {persona && (isActive || isIdle) && (
              <div
                style={{
                  position: 'absolute',
                  left: (rect.width - layout.glyphSize) / 2,
                  bottom: 4,
                  pointerEvents: 'none',
                  opacity: isIdle ? 0.5 : 1,
                }}
              >
                <PersonaGlyph
                  size={layout.glyphSize}
                  persona={persona}
                  state={isIdle ? 'idle' : stageStatusToGlyphState(stage.status)}
                  glowIntensity={activeGlow}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
