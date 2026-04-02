import type { PersonaSlug } from '@forge-os/shared';
import type { BezierPath } from '@forge-os/canvas-components';
import type { FlowType } from '../../../lib/tauri';

/** A trail path is one or more chained bezier segments. */
export type TrailPath = BezierPath[];

// ── Particle Trail ──

/** A single animated trail between pipeline nodes, driven by dispatch events. */
export interface ParticleTrail {
  /** Unique trail ID (dispatch_id + target index). */
  id: string;
  /** Persona glyph at the source (e.g., 'nyx' for standard dispatch). */
  source_glyph: PersonaSlug;
  /** Persona glyphs at the target(s) — single agent or formation (triad). */
  target_glyphs: PersonaSlug[];
  /** Bezier path segments the particle follows. */
  path: TrailPath;
  /** Persona color from PERSONA_COLORS for trail glow. */
  color: string;
  /** Animation progress: 0 = start, 1 = arrived. */
  progress: number;
  /** What kind of flow this trail represents. */
  flow_type: FlowType;
  /** Optional severity coloring for findings return trails. */
  severity: string | null;
  /** Timestamp when trail was created (for decay calculation). */
  created_at: number;
}

// ── Trail Configuration ──

/** Tunable parameters for trail animation behavior. */
export interface TrailConfig {
  /** Trail travel speed: pixels per frame at 60fps. */
  speed: number;
  /** Decay duration in ms — trail fades after arriving. */
  decay: number;
  /** Glow intensity multiplier (0-1). Controls canvas shadowBlur. */
  glow_intensity: number;
  /** Particle size in px. Persona glyph is drawn at this size. */
  particle_size: number;
  /** Number of ghost particles trailing behind the lead. */
  trail_length: number;
  /** Opacity of the ghost trail (0-1). */
  trail_opacity: number;
}

/** Default trail configuration. */
export const DEFAULT_TRAIL_CONFIG: TrailConfig = {
  speed: 3,
  decay: 2000,
  glow_intensity: 0.6,
  particle_size: 16,
  trail_length: 8,
  trail_opacity: 0.3,
};

/** Per-flow-type config overrides. */
export const FLOW_TRAIL_CONFIGS: Record<FlowType, Partial<TrailConfig>> = {
  dispatch: {
    speed: 3,
    glow_intensity: 0.6,
  },
  findings_return: {
    speed: 2,
    glow_intensity: 0.8,
    trail_length: 12,
  },
  context_transfer: {
    speed: 4,
    glow_intensity: 0.4,
    trail_length: 5,
  },
};

// ── Trail State ──

/** Managed collection of active trails for the FlowOverlay renderer. */
export interface TrailState {
  /** Currently animating trails. */
  active: ParticleTrail[];
  /** Trails that arrived and are in decay phase. */
  decaying: ParticleTrail[];
  /** Whether the overlay is visible. */
  visible: boolean;
}

export const INITIAL_TRAIL_STATE: TrailState = {
  active: [],
  decaying: [],
  visible: true,
};
