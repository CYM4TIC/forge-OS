/**
 * useGraphData — placeholder data source for the Graph Viewer Panel.
 *
 * Returns hardcoded node/edge data for Phase 5 demo.
 * Wire to LightRAG knowledge graph in Phase 8.
 */

import { useMemo } from 'react';
import type { PersonaSlug } from '@forge-os/shared';
import { PERSONA_COLORS, PERSONA_DOMAINS, PERSONA_SHORT } from '@forge-os/shared';

/* ── Types ─────────────────────────────────────────────────────── */

export interface GraphNode {
  id: string;
  label: string;
  type: 'persona' | 'concept' | 'system' | 'phase';
  /** Only present when type === 'persona' */
  persona?: PersonaSlug;
  /** Hex color for rendering */
  color: string;
  /** Short descriptor shown in detail overlay */
  domain?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/* ── Placeholder Data ──────────────────────────────────────────── */

function buildPlaceholderData(): GraphData {
  const personaSlugs: PersonaSlug[] = [
    'nyx', 'pierce', 'mara', 'riven', 'kehinde',
    'tanaka', 'vane', 'voss', 'calloway', 'sable',
  ];

  const personaNodes: GraphNode[] = personaSlugs.map((slug) => ({
    id: `persona-${slug}`,
    label: PERSONA_SHORT[slug],
    type: 'persona' as const,
    persona: slug,
    color: PERSONA_COLORS[slug],
    domain: PERSONA_DOMAINS[slug],
  }));

  const conceptNodes: GraphNode[] = [
    { id: 'sys-kairos', label: 'KAIROS Memory', type: 'system', color: '#6366F1', domain: 'Long-term memory' },
    { id: 'sys-swarm', label: 'Swarm Dispatch', type: 'system', color: '#22C55E', domain: 'Parallel execution' },
    { id: 'sys-context', label: 'Context Engine', type: 'system', color: '#3B82F6', domain: 'Token management' },
    { id: 'concept-build-triad', label: 'Build Triad', type: 'concept', color: '#EC4899', domain: 'Gate review' },
    { id: 'concept-hud', label: 'Living Canvas', type: 'concept', color: '#8B5CF6', domain: 'Build visualization' },
    { id: 'phase-5', label: 'Phase 5', type: 'phase', color: '#F59E0B', domain: 'HUD & Canvas' },
  ];

  const edges: GraphEdge[] = [
    // Nyx → systems
    { id: 'e-nyx-kairos', source: 'persona-nyx', target: 'sys-kairos', label: 'writes to', weight: 0.9 },
    { id: 'e-nyx-swarm', source: 'persona-nyx', target: 'sys-swarm', label: 'dispatches', weight: 0.95 },
    { id: 'e-nyx-context', source: 'persona-nyx', target: 'sys-context', label: 'manages', weight: 0.8 },
    { id: 'e-nyx-phase5', source: 'persona-nyx', target: 'phase-5', label: 'builds', weight: 1.0 },

    // Build Triad
    { id: 'e-pierce-triad', source: 'persona-pierce', target: 'concept-build-triad', label: 'leads', weight: 0.9 },
    { id: 'e-mara-triad', source: 'persona-mara', target: 'concept-build-triad', label: 'reviews UX', weight: 0.8 },
    { id: 'e-riven-triad', source: 'persona-riven', target: 'concept-build-triad', label: 'reviews design', weight: 0.8 },

    // Systems
    { id: 'e-kehinde-context', source: 'persona-kehinde', target: 'sys-context', label: 'architects', weight: 0.85 },
    { id: 'e-tanaka-kairos', source: 'persona-tanaka', target: 'sys-kairos', label: 'audits', weight: 0.7 },

    // HUD
    { id: 'e-hud-phase5', source: 'concept-hud', target: 'phase-5', label: 'delivered in', weight: 0.9 },
    { id: 'e-riven-hud', source: 'persona-riven', target: 'concept-hud', label: 'designs', weight: 0.85 },
    { id: 'e-mara-hud', source: 'persona-mara', target: 'concept-hud', label: 'evaluates', weight: 0.75 },

    // Cross-links
    { id: 'e-vane-tanaka', source: 'persona-vane', target: 'persona-tanaka', label: 'co-audits', weight: 0.6 },
    { id: 'e-voss-calloway', source: 'persona-voss', target: 'persona-calloway', label: 'constrains', weight: 0.5 },
    { id: 'e-sable-mara', source: 'persona-sable', target: 'persona-mara', label: 'aligns copy', weight: 0.65 },
    { id: 'e-swarm-triad', source: 'sys-swarm', target: 'concept-build-triad', label: 'dispatches', weight: 0.8 },
  ];

  return { nodes: [...personaNodes, ...conceptNodes], edges };
}

/* ── Hook ───────────────────────────────────────────────────────── */

export function useGraphData(): GraphData {
  return useMemo(() => buildPlaceholderData(), []);
}
