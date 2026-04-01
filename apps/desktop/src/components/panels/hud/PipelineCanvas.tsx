/**
 * PipelineCanvas — Canvas-rendered pipeline with 4 stage nodes.
 * Scout → Build → Triad → Sentinel
 *
 * Each node: label (Pretext-measured, centered), status glow (idle=dim, active=pulse,
 * complete=glow), persona glyph rendered inside when agent is active.
 * Connection lines animate between nodes. Responds to container resize.
 */

import { useMemo } from 'react';
import {
  NodeCard,
  ConnectionLine,
  FlowParticle,
  PersonaGlyph,
  StatusBadge,
} from '@forge-os/canvas-components';
import type { NodeStatus } from '@forge-os/canvas-components';
import type { PersonaSlug, GlyphState } from '@forge-os/canvas-components';
import type { PipelineStage, StageStatus } from '../../../lib/tauri';
import { computePipelineLayout } from './pipeline-layout';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PipelineCanvasProps {
  stages: PipelineStage[];
  width: number;
  height: number;
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

// ─── Colors ─────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  scout: '#6366f1',    // indigo — Nyx dispatches
  build: '#22c55e',    // green — active construction
  triad: '#ec4899',    // pink — review
  sentinel: '#f59e0b', // amber — regression watch
};

function stageColor(stageId: string): string {
  const key = stageId.toLowerCase();
  return STAGE_COLORS[key] ?? '#6366f1';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PipelineCanvas({ stages, width, height }: PipelineCanvasProps) {
  // Compute layout from dimensions and stage count
  const layout = useMemo(
    () => computePipelineLayout(width, height, stages.length),
    [width, height, stages.length],
  );

  if (!stages.length || width === 0 || height === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height }}
      >
        <span className="text-text-muted text-sm">No pipeline data</span>
      </div>
    );
  }

  return (
    <div
      className="relative"
      style={{ width, height }}
      role="img"
      aria-label={`Pipeline: ${stages.map((s) => `${s.label} (${s.status})`).join(' → ')}`}
    >
      {/* Connection lines — rendered behind nodes */}
      {layout.connections.map((conn, i) => {
        const fromStage = stages[i];
        const toStage = stages[i + 1];
        const isActive = fromStage?.status === 'complete' || fromStage?.status === 'active';
        const color = isActive ? stageColor(fromStage.id) : '#2a2a3a';

        return (
          <div
            key={`conn-${i}`}
            className="absolute"
            style={{ top: 0, left: 0, width, height, pointerEvents: 'none' }}
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
            className="absolute"
            style={{ top: 0, left: 0, width, height, pointerEvents: 'none' }}
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

        return (
          <div
            key={stage.id}
            className="absolute"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
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
                className="absolute"
                style={{
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

            {/* Persona glyph — centered inside node when agent is active */}
            {persona && isActive && (
              <div
                className="absolute"
                style={{
                  left: (rect.width - layout.glyphSize) / 2,
                  bottom: 4,
                  pointerEvents: 'none',
                }}
              >
                <PersonaGlyph
                  size={layout.glyphSize}
                  persona={persona}
                  state={stageStatusToGlyphState(stage.status)}
                  glowIntensity={1.2}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
