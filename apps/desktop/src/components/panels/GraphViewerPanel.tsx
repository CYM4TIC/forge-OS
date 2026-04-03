/**
 * GraphViewerPanel — Knowledge graph visualization.
 * Canvas-rendered force-directed graph with pan/zoom.
 * Persona nodes render PersonaGlyph components overlaid on canvas.
 * Concept/system/phase nodes drawn directly on canvas.
 * Click node for DOM detail overlay.
 *
 * Phase 5.3 (P5-O). Wire to LightRAG in Phase 8.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { CANVAS, STATUS, RADIUS, GLOW, FONT } from '@forge-os/canvas-components';
import { PersonaGlyph } from '@forge-os/canvas-components';
import { setupCanvasForHiDPI, fitToContainer } from '@forge-os/layout-engine';
import { useGraphData } from '../../hooks/useGraphData';
import {
  initLayout,
  tickLayout,
  nodeAtPoint,
  type GraphLayout,
  type LayoutNode,
} from './hud/graph-layout';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.1;
const LABEL_HIDE_ZOOM = 0.5;
const EDGE_LABEL_SHOW_ZOOM = 0.8;

// ─── Styles (canvas-tokens, no Tailwind — RIVEN-HIGH-1) ────────────────────

const PANEL_SHELL: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  background: CANVAS.bg,
  borderRadius: RADIUS.card,
  border: `1px solid ${CANVAS.border}`,
  overflow: 'hidden',
};

const SHADOW_BLACK = 'rgba(0, 0, 0, 0.5)';

const DETAIL_OVERLAY: React.CSSProperties = {
  position: 'absolute',
  background: CANVAS.bgElevated,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.card,
  padding: '12px 16px',
  minWidth: 160,
  maxWidth: 260,
  zIndex: 20,
  pointerEvents: 'auto',
  boxShadow: `0 4px 24px ${SHADOW_BLACK}, 0 0 12px ${GLOW.accentSubtle}`,
};

const ZOOM_BADGE: React.CSSProperties = {
  position: 'absolute',
  bottom: 8,
  right: 8,
  background: CANVAS.bgElevated,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.pill,
  padding: '2px 8px',
  fontSize: 11,
  color: CANVAS.label,
  zIndex: 10,
  userSelect: 'none',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Compute edge label font that stays readable at any zoom. Clamps 8-10px. */
function edgeLabelFont(scale: number): string {
  const size = Math.max(8, Math.min(10, 10 / scale));
  return `${size}px monospace`;
}

// ─── Drawing ────────────────────────────────────────────────────────────────

function drawGraph(
  ctx: CanvasRenderingContext2D,
  layout: GraphLayout,
  view: ViewTransform,
  width: number,
  height: number,
  selectedId: string | null,
  hoveredId: string | null,
): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, width * dpr, height * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  // Apply pan/zoom transform
  ctx.save();
  ctx.translate(view.offsetX, view.offsetY);
  ctx.scale(view.scale, view.scale);

  // Draw edges
  for (const edge of layout.edges) {
    const isHighlighted =
      selectedId === edge.source.id || selectedId === edge.target.id;

    ctx.beginPath();
    ctx.moveTo(edge.source.x, edge.source.y);
    ctx.lineTo(edge.target.x, edge.target.y);
    ctx.strokeStyle = isHighlighted
      ? STATUS.accent
      : CANVAS.border;
    ctx.lineWidth = isHighlighted ? 2 : 1;
    ctx.globalAlpha = isHighlighted ? 0.9 : 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Edge labels at sufficient zoom
    if (view.scale >= EDGE_LABEL_SHOW_ZOOM) {
      const mx = (edge.source.x + edge.target.x) / 2;
      const my = (edge.source.y + edge.target.y) / 2;
      ctx.font = edgeLabelFont(view.scale);
      ctx.fillStyle = isHighlighted ? CANVAS.text : CANVAS.muted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(edge.data.label, mx, my - 6);
    }
  }

  // Draw non-persona nodes (personas rendered as React overlays)
  for (const node of layout.nodes) {
    if (node.data.type === 'persona') continue;

    const isSelected = selectedId === node.id;
    const isHovered = hoveredId === node.id;
    const r = node.radius;

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

    if (isSelected) {
      ctx.fillStyle = node.data.color;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = node.data.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Glow
      ctx.shadowColor = node.data.color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (isHovered) {
      ctx.fillStyle = node.data.color;
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = node.data.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = CANVAS.bgElevated;
      ctx.fill();
      ctx.strokeStyle = node.data.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Node label (below node) — Pretext-measured via fitToContainer
    if (view.scale >= LABEL_HIDE_ZOOM) {
      const labelWidth = r * 2.5;
      const fit = fitToContainer(node.data.label, labelWidth, {
        minFont: 8,
        maxFont: 13,
        maxLines: 1,
        fontFamily: FONT.mono,
      });
      ctx.font = fit.font;
      ctx.fillStyle = isSelected ? CANVAS.text : CANVAS.label;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(node.data.label, node.x, node.y + r + 4);
    }
  }

  // Draw persona node rings (glyph rendered as React overlay)
  for (const node of layout.nodes) {
    if (node.data.type !== 'persona') continue;

    const isSelected = selectedId === node.id;
    const isHovered = hoveredId === node.id;
    const r = node.radius;

    // Ring around glyph area
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = node.data.color;
    ctx.lineWidth = isSelected ? 2.5 : isHovered ? 1.5 : 1;
    ctx.globalAlpha = isSelected ? 1 : isHovered ? 0.8 : 0.5;

    if (isSelected) {
      ctx.shadowColor = node.data.color;
      ctx.shadowBlur = 14;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Persona label below — Pretext-measured via fitToContainer
    if (view.scale >= LABEL_HIDE_ZOOM) {
      const labelWidth = r * 2.5;
      const fit = fitToContainer(node.data.label, labelWidth, {
        minFont: 8,
        maxFont: 13,
        maxLines: 1,
        fontFamily: FONT.mono,
      });
      ctx.font = fit.font;
      ctx.fillStyle = isSelected ? CANVAS.text : CANVAS.label;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(node.data.label, node.x, node.y + r + 8);
    }
  }

  ctx.restore(); // pop pan/zoom
  ctx.restore(); // pop dpr scale
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function GraphViewerPanel() {
  const { data: graphData, isLoading, error } = useGraphData();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<GraphLayout | null>(null);
  const rafRef = useRef<number>(0);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<ViewTransform>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const prefersReducedMotion = useRef(false);
  // Force React re-render when layout node positions change (persona glyph overlays are DOM)
  const [layoutTick, setLayoutTick] = useState(0);

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => { prefersReducedMotion.current = e.matches; };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Init layout when dimensions or data change
  useEffect(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return;
    layoutRef.current = initLayout(
      graphData.nodes,
      graphData.edges,
      dimensions.width,
      dimensions.height,
    );
    // Reset view on re-init
    setView({ offsetX: 0, offsetY: 0, scale: 1 });
    setSelectedNode(null);
  }, [graphData, dimensions.width, dimensions.height]);

  // Setup canvas HiDPI on dimension change only (PIERCE-05)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width <= 0 || dimensions.height <= 0) return;
    ctxRef.current = setupCanvasForHiDPI(canvas, dimensions.width, dimensions.height);
  }, [dimensions.width, dimensions.height]);

  // Animation loop — runs force simulation + draws
  useEffect(() => {
    const ctxVal = ctxRef.current;
    if (!ctxVal || dimensions.width <= 0 || dimensions.height <= 0) return;
    const ctx: CanvasRenderingContext2D = ctxVal;

    let frameCount = 0;

    function animate() {
      const layout = layoutRef.current;
      if (!layout) return; // Don't spin rAF with no data (PIERCE-01)

      // Tick simulation (skip if reduced motion + already past initial stabilization)
      if (!layout.stabilized) {
        if (prefersReducedMotion.current) {
          // Fast-forward to stable
          for (let i = 0; i < 150; i++) {
            tickLayout(layout, dimensions.width, dimensions.height);
            if (layout.stabilized) break;
          }
          // Force re-render so persona glyph overlays sync to final positions
          setLayoutTick((t) => t + 1);
        } else {
          tickLayout(layout, dimensions.width, dimensions.height);
          frameCount++;
          // Update React overlay positions every 4 frames during simulation
          if (frameCount % 4 === 0 || layout.stabilized) {
            setLayoutTick((t) => t + 1);
          }
        }
      }

      drawGraph(
        ctx,
        layout,
        view,
        dimensions.width,
        dimensions.height,
        selectedNode?.id ?? null,
        hoveredNodeId,
      );

      // Keep animating during simulation; after stabilization, only redraw on state changes
      if (!layout.stabilized) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- layoutTick intentionally excluded to avoid restart loops
  }, [dimensions, view, selectedNode, hoveredNodeId]);

  // ─── Interaction handlers ───────────────────────────────────────────────

  const screenToGraph = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - view.offsetX) / view.scale,
        y: (sy - view.offsetY) / view.scale,
      };
    },
    [view],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const layout = layoutRef.current;
      if (!layout) return;

      const gp = screenToGraph(e.clientX, e.clientY);
      const hit = nodeAtPoint(layout, gp.x, gp.y);

      if (hit) {
        setSelectedNode(hit);
      } else {
        // Start panning
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY, ox: view.offsetX, oy: view.offsetY };
        setSelectedNode(null);
      }
    },
    [screenToGraph, view],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setView((v) => ({ ...v, offsetX: panStartRef.current.ox + dx, offsetY: panStartRef.current.oy + dy }));
        return;
      }

      // Hover detection
      const layout = layoutRef.current;
      if (!layout) return;
      const gp = screenToGraph(e.clientX, e.clientY);
      const hit = nodeAtPoint(layout, gp.x, gp.y);
      setHoveredNodeId(hit?.id ?? null);
    },
    [isPanning, screenToGraph],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    setView((v) => {
      const direction = e.deltaY < 0 ? 1 : -1;
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.scale + direction * ZOOM_STEP));
      const factor = newScale / v.scale;

      // Zoom toward mouse position
      return {
        scale: newScale,
        offsetX: mx - (mx - v.offsetX) * factor,
        offsetY: my - (my - v.offsetY) * factor,
      };
    });
  }, []);

  // ─── Keyboard navigation (MARA-01) ──────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const layout = layoutRef.current;
    if (!layout || layout.nodes.length === 0) return;

    const nodes = layout.nodes;

    if (e.key === 'Escape') {
      setSelectedNode(null);
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIdx = selectedNode ? nodes.findIndex((n) => n.id === selectedNode.id) : -1;
      const nextIdx = (currentIdx + 1) % nodes.length;
      setSelectedNode(nodes[nextIdx]);
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIdx = selectedNode ? nodes.findIndex((n) => n.id === selectedNode.id) : 0;
      const prevIdx = (currentIdx - 1 + nodes.length) % nodes.length;
      setSelectedNode(nodes[prevIdx]);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!selectedNode && nodes.length > 0) {
        setSelectedNode(nodes[0]);
      }
    }
  }, [selectedNode]);

  // ─── Persona glyph overlays ─────────────────────────────────────────────

  // layoutTick triggers re-render so persona overlays read fresh node positions from layoutRef
  void layoutTick;
  const personaOverlays = layoutRef.current?.nodes
    .filter((n) => n.data.type === 'persona' && n.data.persona)
    .map((node) => {
      const screenX = node.x * view.scale + view.offsetX;
      const screenY = node.y * view.scale + view.offsetY;
      const glyphSize = node.radius * 2 * view.scale;

      // Skip if off-screen or too small
      if (
        screenX < -glyphSize || screenX > dimensions.width + glyphSize ||
        screenY < -glyphSize || screenY > dimensions.height + glyphSize ||
        glyphSize < 8
      ) {
        return null;
      }

      return (
        <div
          key={node.id}
          style={{
            position: 'absolute',
            left: screenX - glyphSize / 2,
            top: screenY - glyphSize / 2,
            width: glyphSize,
            height: glyphSize,
            pointerEvents: 'none',
          }}
        >
          <PersonaGlyph
            size={Math.round(glyphSize)}
            persona={node.data.persona!}
            state={selectedNode?.id === node.id ? 'speaking' : 'idle'}
            glowIntensity={selectedNode?.id === node.id ? 1.5 : hoveredNodeId === node.id ? 1.2 : 0.8}
          />
        </div>
      );
    });

  // ─── Detail overlay ─────────────────────────────────────────────────────

  const detailOverlay = selectedNode ? (() => {
    const screenX = selectedNode.x * view.scale + view.offsetX;
    const screenY = selectedNode.y * view.scale + view.offsetY;

    // Position overlay to the right of node, or left if near right edge
    const overlayLeft = screenX + 40 > dimensions.width - 200
      ? screenX - 200
      : screenX + 40;
    const overlayTop = Math.max(8, Math.min(dimensions.height - 120, screenY - 20));

    // Connected nodes
    const layout = layoutRef.current;
    const connections = layout?.edges
      .filter((e) => e.source.id === selectedNode.id || e.target.id === selectedNode.id)
      .map((e) => {
        const other = e.source.id === selectedNode.id ? e.target : e.source;
        return { label: other.data.label, relation: e.data.label, color: other.data.color };
      }) ?? [];

    return (
      <div
        style={{ ...DETAIL_OVERLAY, left: overlayLeft, top: overlayTop }}
        role="dialog"
        aria-label={`Details for ${selectedNode.data.label}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: selectedNode.data.color,
              boxShadow: `0 0 6px ${selectedNode.data.color}`,
            }}
          />
          <span style={{ color: CANVAS.text, fontSize: 14, fontWeight: 600, fontFamily: FONT.mono }}>
            {selectedNode.data.label}
          </span>
        </div>

        <div style={{ color: CANVAS.label, fontSize: 11, fontFamily: FONT.mono, marginBottom: 4 }}>
          {selectedNode.data.type.toUpperCase()}
          {selectedNode.data.domain ? ` \u2014 ${selectedNode.data.domain}` : ''}
        </div>

        {connections.length > 0 && (
          <div style={{ marginTop: 8, borderTop: `1px solid ${CANVAS.border}`, paddingTop: 8 }}>
            <div style={{ color: CANVAS.muted, fontSize: 10, fontFamily: FONT.mono, marginBottom: 4 }}>
              CONNECTIONS ({connections.length})
            </div>
            {connections.slice(0, 6).map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ color: CANVAS.label, fontSize: 11, fontFamily: FONT.mono }}>
                  {c.label}
                </span>
                <span style={{ color: CANVAS.muted, fontSize: 10, fontFamily: FONT.mono }}>
                  {c.relation}
                </span>
              </div>
            ))}
            {connections.length > 6 && (
              <div style={{ color: CANVAS.muted, fontSize: 10, fontFamily: FONT.mono }}>
                +{connections.length - 6} more
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setSelectedNode(null)}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            background: 'none',
            border: 'none',
            color: CANVAS.muted,
            fontSize: 14,
            cursor: 'pointer',
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
          aria-label="Close detail overlay"
        >
          \u00d7
        </button>
      </div>
    );
  })() : null;

  // ─── Render ─────────────────────────────────────────────────────────────

  // Connection count for selected node (MARA-03)
  const selectedConnections = selectedNode && layoutRef.current
    ? layoutRef.current.edges.filter(
        (e) => e.source.id === selectedNode.id || e.target.id === selectedNode.id,
      ).length
    : 0;

  // Loading/error states (MARA-04)
  if (isLoading) {
    return (
      <div ref={containerRef} style={PANEL_SHELL} role="region" aria-label="Ley Line map">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%',
          color: CANVAS.label, fontSize: 12, fontFamily: FONT.mono,
        }}>
          Tracing ley lines...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div ref={containerRef} style={PANEL_SHELL} role="region" aria-label="Ley Line map">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%',
          color: STATUS.danger, fontSize: 12, fontFamily: FONT.mono,
        }}>
          {error}
        </div>
      </div>
    );
  }

  // Empty state (PIERCE-04)
  if (graphData.nodes.length === 0) {
    return (
      <div ref={containerRef} style={PANEL_SHELL} role="region" aria-label="Ley Line map">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%',
          color: CANVAS.muted, fontSize: 12, fontFamily: FONT.mono,
        }}>
          No ley lines charted
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={PANEL_SHELL}
      role="region"
      aria-label="Ley Line map. Use arrow keys to navigate nodes, Enter to select, Escape to deselect."
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, cursor: isPanning ? 'grabbing' : hoveredNodeId ? 'pointer' : 'grab' }}
        role="presentation"
        aria-hidden="true"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Persona glyph overlays */}
      {personaOverlays}

      {/* Detail overlay */}
      {detailOverlay}

      {/* Zoom badge */}
      <div style={ZOOM_BADGE} aria-live="polite">
        {Math.round(view.scale * 100)}%
      </div>

      {/* Screen reader summary (MARA-03 enhanced) */}
      <div
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
        role="status"
        aria-live="polite"
      >
        Ley Lines: {graphData.nodes.length} nodes, {graphData.edges.length} edges.
        {selectedNode
          ? ` Selected: ${selectedNode.data.label}, ${selectedNode.data.type}. ${selectedConnections} connections.`
          : ' No node selected. Use arrow keys to navigate.'}
      </div>
    </div>
  );
}
