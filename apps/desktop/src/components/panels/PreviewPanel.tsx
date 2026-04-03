// ── Preview Panel — Dev Server Preview + Webview ──
// Displays a live preview of a running dev server via iframe.
// States: no-server → loading → healthy → error → stopped.
// P6-D: shell, picker, iframe, refresh, log tail.

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDevServer } from '../../hooks/useDevServer';
import {
  listDevServers,
  openDirectoryDialog,
  isTauriRuntime,
  onPreviewDomRequest,
  respondPreviewDom,
  type DevServerInfo,
  type DomRequestPayload,
} from '../../lib/tauri';
import { CANVAS, STATUS, RADIUS } from '@forge-os/canvas-components';

// ─── Styles (RIVEN-HIGH-1: canvas-tokens, no Tailwind) ──────────────

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const PANEL_SHELL: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: CANVAS.bg,
  borderRadius: RADIUS.card,
  border: `1px solid ${CANVAS.border}`,
  overflow: 'hidden',
};

const CENTER_STATE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  height: '100%',
  background: CANVAS.bg,
  borderRadius: RADIUS.card,
  border: `1px solid ${CANVAS.border}`,
  gap: 12,
};

const TOOLBAR: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  borderBottom: `1px solid ${CANVAS.border}`,
  background: CANVAS.bgElevated,
  minHeight: 36,
  flexShrink: 0,
};

const BTN: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.pill,
  color: CANVAS.text,
  fontSize: 12,
  fontWeight: 500,
  padding: '6px 12px',
  cursor: 'pointer',
  lineHeight: '18px',
  minHeight: 32,
};

const BTN_PRIMARY: React.CSSProperties = {
  ...BTN,
  background: STATUS.accent,
  borderColor: STATUS.accent,
  // RIVEN-NOTE: needs CANVAS.onAccent token (white text on accent bg)
  color: '#fff',
};

const INPUT: React.CSSProperties = {
  background: CANVAS.bg,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.pill,
  color: CANVAS.text,
  fontSize: 12,
  padding: '4px 8px',
  outline: 'none',
  lineHeight: '18px',
  flex: 1,
  minWidth: 0,
};

const SELECT: React.CSSProperties = {
  background: CANVAS.bg,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.pill,
  color: CANVAS.text,
  fontSize: 12,
  padding: '4px 8px',
  outline: 'none',
  lineHeight: '18px',
  cursor: 'pointer',
};

const URL_BAR: React.CSSProperties = {
  flex: 1,
  background: CANVAS.bg,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.pill,
  color: CANVAS.label,
  fontSize: 11,
  padding: '3px 8px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
};

const LOG_CONTAINER: React.CSSProperties = {
  background: CANVAS.bg,
  padding: '8px 10px',
  maxHeight: 180,
  overflowY: 'auto',
  fontFamily: 'monospace',
  fontSize: 11,
  lineHeight: '16px',
  borderTop: `1px solid ${CANVAS.border}`,
  flexShrink: 0,
};

// ─── Viewport Presets ───────────────────────────────────────────────

type ViewportPreset = 'desktop' | 'tablet' | 'mobile' | 'custom';

interface ViewportDimensions {
  width: number;
  height: number;
}

const VIEWPORT_PRESETS: Record<Exclude<ViewportPreset, 'custom'>, ViewportDimensions & { label: string }> = {
  desktop: { width: 1280, height: 800, label: 'Desktop' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  mobile: { width: 375, height: 812, label: 'Mobile' },
};

// Secondary toolbar: tighter vertical rhythm than primary TOOLBAR (4px vs 6px)
const VIEWPORT_TOOLBAR: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 10px',
  borderBottom: `1px solid ${CANVAS.border}`,
  background: CANVAS.bg,
  flexShrink: 0,
  flexWrap: 'wrap',
};

const PRESET_BTN: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.pill,
  color: CANVAS.label,
  fontSize: 11,
  padding: '4px 10px',
  cursor: 'pointer',
  lineHeight: '16px',
  minHeight: 28,
};

const PRESET_BTN_ACTIVE: React.CSSProperties = {
  ...PRESET_BTN,
  background: STATUS.accent,
  borderColor: STATUS.accent,
  // RIVEN-NOTE: needs CANVAS.onAccent token (white text on accent bg)
  color: '#fff',
};

const DIM_INPUT: React.CSSProperties = {
  background: CANVAS.bg,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.pill,
  color: CANVAS.text,
  fontSize: 11,
  padding: '2px 6px',
  width: 52,
  textAlign: 'center' as const,
  lineHeight: '16px',
  outline: 'none',
};

/** Read saved viewport preset from localStorage for a given server. */
function loadViewportPreset(serverId: string): { preset: ViewportPreset; custom: ViewportDimensions } | null {
  try {
    const raw = localStorage.getItem(`forge:viewport:${serverId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Save viewport preset to localStorage keyed by serverId. */
function saveViewportPreset(serverId: string, preset: ViewportPreset, custom: ViewportDimensions): void {
  try {
    localStorage.setItem(`forge:viewport:${serverId}`, JSON.stringify({ preset, custom }));
  } catch {
    // storage full or unavailable
  }
}

// ─── Focus-visible global injection ─────────────────────────────────
// Injected once; styles all interactive elements within the preview panel.

const FOCUS_STYLES = `
.preview-panel button:focus-visible,
.preview-panel select:focus-visible,
.preview-panel input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px ${STATUS.accent};
}
`;

// ─── Types ──────────────────────────────────────────────────────────

type PanelState = 'no-server' | 'loading' | 'healthy' | 'error' | 'stopped';

interface PreviewPanelProps {
  serverId?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export default function PreviewPanel({ serverId: initialServerId }: PreviewPanelProps) {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(
    initialServerId ?? null,
  );
  const [servers, setServers] = useState<DevServerInfo[]>([]);
  const [showStartForm, setShowStartForm] = useState(false);

  // Start-new-server form: single command field (P-005: merged command+args)
  const [newCommandLine, setNewCommandLine] = useState('npm run dev');
  const [newCwd, setNewCwd] = useState('.');

  const panelRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframePath, setIframePath] = useState('/');
  const [urlInput, setUrlInput] = useState('/');

  // Viewport state
  const [viewportPreset, setViewportPreset] = useState<ViewportPreset>('desktop');
  const [customWidth, setCustomWidth] = useState(1280);
  const [customHeight, setCustomHeight] = useState(800);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // MARA-LOW-1: Screen reader announcement when agent reads DOM
  const [domReadAnnouncement, setDomReadAnnouncement] = useState('');

  const { server, logs, start, stop, restart, loading, error } = useDevServer(selectedServerId);

  // ── Load saved viewport preset when server changes ──

  useEffect(() => {
    if (!selectedServerId) return;
    const saved = loadViewportPreset(selectedServerId);
    if (saved) {
      setViewportPreset(saved.preset);
      setCustomWidth(saved.custom.width);
      setCustomHeight(saved.custom.height);
    }
  }, [selectedServerId]);

  // ── Measure viewport container for CSS transform scaling ──

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Fetch available servers periodically ──

  const refreshServers = useCallback(async () => {
    if (!isTauriRuntime) return;
    try {
      const list = await listDevServers();
      setServers(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshServers();
    const interval = setInterval(refreshServers, 5000);
    return () => clearInterval(interval);
  }, [refreshServers]);

  // ── Derive panel state ──

  const panelState: PanelState = (() => {
    if (!selectedServerId || !server) return 'no-server';
    if (loading || server.status === 'starting') return 'loading';
    if (
      server.status === 'healthy' ||
      server.status === 'running' ||
      server.status === 'degraded'
    )
      return 'healthy';
    if (server.status === 'error') return 'error';
    if (server.status === 'stopped') return 'stopped';
    return 'no-server';
  })();

  const previewUrl =
    server?.port ? `http://localhost:${server.port}` : null;

  // ── Focus management on state transitions (M-005) ──

  const prevState = useRef(panelState);
  useEffect(() => {
    if (prevState.current !== panelState) {
      prevState.current = panelState;
      panelRef.current?.focus();
    }
  }, [panelState]);

  // ── Auto-scroll log container to bottom (INFO-001) ──

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // ── DOM snapshot request handler (P6-F: agent DOM access) ──
  // Listens for backend requests to read the preview iframe's DOM.
  // Same-origin only (localhost); cross-origin returns an error.

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      const unsub = await onPreviewDomRequest(async (payload: DomRequestPayload) => {
        if (cancelled) return;

        // Only respond if this request targets our current server
        if (payload.serverId !== selectedServerId) return;

        try {
          const iframe = iframeRef.current;
          if (!iframe) {
            await respondPreviewDom({
              requestId: payload.requestId,
              html: null,
              error: 'No iframe element available',
            });
            return;
          }

          // Attempt same-origin DOM read
          const doc = iframe.contentDocument;
          if (!doc) {
            await respondPreviewDom({
              requestId: payload.requestId,
              html: null,
              error: 'Cross-origin iframe — cannot read DOM. Only localhost previews support DOM access.',
            });
            return;
          }

          const html = doc.documentElement.outerHTML;
          await respondPreviewDom({
            requestId: payload.requestId,
            html,
            error: null,
          });
          // MARA-LOW-1: Announce DOM read to screen readers
          setDomReadAnnouncement('Agent reading preview DOM');
          setTimeout(() => setDomReadAnnouncement(''), 2000);
        } catch {
          await respondPreviewDom({
            requestId: payload.requestId,
            html: null,
            error: 'Failed to read iframe DOM — may be cross-origin',
          });
        }
      });
      if (!cancelled) unlisten = unsub;
    };

    setup();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [selectedServerId]);

  // ── Actions ──

  const handleStartNew = useCallback(async () => {
    try {
      const parts = newCommandLine.trim().split(/\s+/).filter(Boolean);
      const cmd = parts[0] ?? '';
      const args = parts.slice(1);
      const info = await start(cmd, args, newCwd.trim());
      setSelectedServerId(info.id);
      setShowStartForm(false);
      refreshServers();
    } catch {
      // error is surfaced via useDevServer hook
    }
  }, [newCommandLine, newCwd, start, refreshServers]);

  const handleRefresh = useCallback(() => {
    setIframeKey((k) => k + 1);
    setIframePath('/');
    setUrlInput('/');
  }, []);

  const handleStop = useCallback(async () => {
    await stop();
    refreshServers();
  }, [stop, refreshServers]);

  const handleRestart = useCallback(async () => {
    try {
      const info = await restart();
      setSelectedServerId(info.id);
      setIframePath('/');
      refreshServers();
    } catch {
      // error surfaced via hook
    }
  }, [restart, refreshServers]);

  const handleSelectServer = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setSelectedServerId(val || null);
      setShowStartForm(false);
    },
    [],
  );

  const handleBrowseCwd = useCallback(async () => {
    const dir = await openDirectoryDialog();
    if (dir) setNewCwd(dir);
  }, []);

  // Track iframe navigation path (same-origin localhost) + sync URL input
  const handleIframeLoad = useCallback(() => {
    try {
      const loc = iframeRef.current?.contentWindow?.location;
      if (loc) {
        const path = loc.pathname + loc.search;
        setIframePath(path);
        setUrlInput(path);
      }
    } catch {
      // cross-origin — cannot read, keep last known path
    }
  }, []);

  // P6-E: Navigate iframe via URL bar input
  const handleUrlNavigate = useCallback(() => {
    if (!previewUrl || !iframeRef.current) return;
    const path = urlInput.startsWith('/') ? urlInput : `/${urlInput}`;
    iframeRef.current.src = `${previewUrl}${path}`;
    setIframePath(path);
  }, [previewUrl, urlInput]);

  // P6-E: Viewport preset change
  const handlePresetChange = useCallback(
    (preset: ViewportPreset) => {
      setViewportPreset(preset);
      let w = customWidth;
      let h = customHeight;
      if (preset !== 'custom') {
        const dims = VIEWPORT_PRESETS[preset];
        w = dims.width;
        h = dims.height;
        setCustomWidth(w);
        setCustomHeight(h);
      }
      if (selectedServerId) {
        saveViewportPreset(selectedServerId, preset, { width: w, height: h });
      }
    },
    [selectedServerId, customWidth, customHeight],
  );

  // P6-E: Custom dimension change — live preview on change, persist on blur
  const handleCustomDimChange = useCallback(
    (dim: 'width' | 'height', value: number) => {
      const v = isNaN(value) ? 0 : value;
      if (dim === 'width') setCustomWidth(v);
      else setCustomHeight(v);
      setViewportPreset('custom');
    },
    [],
  );

  const handleCustomDimBlur = useCallback(
    (dim: 'width' | 'height') => {
      const w = Math.max(120, Math.min(3840, customWidth || 120));
      const h = Math.max(120, Math.min(3840, customHeight || 120));
      setCustomWidth(w);
      setCustomHeight(h);
      if (selectedServerId) {
        saveViewportPreset(selectedServerId, 'custom', { width: w, height: h });
      }
    },
    [selectedServerId, customWidth, customHeight],
  );

  // P-003: Enter-to-refresh keyboard shortcut on panel
  const handlePanelKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (
        e.key === 'Enter' &&
        panelState === 'healthy' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLSelectElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        handleRefresh();
      }
    },
    [panelState, handleRefresh],
  );

  // ── Status label for screen reader ──

  const statusLabel = (() => {
    switch (panelState) {
      case 'no-server':
        return 'No server selected';
      case 'loading':
        return `Server starting: ${server?.command ?? 'unknown'}`;
      case 'healthy':
        return server?.status === 'degraded'
          ? `Server degraded on port ${server?.port ?? 'unknown'}`
          : `Server running on port ${server?.port ?? 'unknown'}`;
      case 'error':
        return 'Server error';
      case 'stopped':
        return 'Server stopped';
    }
  })();

  // ── Tail logs (last 20 lines for error/stopped states) ──

  const tailLogs = logs.slice(-20);

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: no-server state — server picker + optional start form
  // ═══════════════════════════════════════════════════════════════════

  if (panelState === 'no-server' && !showStartForm) {
    return (
      <div
        ref={panelRef}
        role="region"
        aria-label="Preview panel — no server"
        tabIndex={0}
        style={CENTER_STATE}
        className="preview-panel"
      >
        <style>{FOCUS_STYLES}</style>
        <div style={SR_ONLY} aria-live="polite">
          {statusLabel}
        </div>
        <span style={{ color: CANVAS.text, fontSize: 13, fontWeight: 500 }}>Dev Server Preview</span>
        <span style={{ color: CANVAS.muted, fontSize: 11 }}>
          Select a running server or start a new one to preview
        </span>

        {servers.length > 0 && (
          <select
            style={SELECT}
            value=""
            onChange={handleSelectServer}
            aria-label="Select a running server"
          >
            <option value="" disabled>
              Select server...
            </option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.command} {s.args.join(' ')} (:{s.port ?? '...'})
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          style={BTN_PRIMARY}
          onClick={() => setShowStartForm(true)}
          aria-label="Start a new dev server"
        >
          Start New Server
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: start-new-server form
  // ═══════════════════════════════════════════════════════════════════

  if (showStartForm && panelState === 'no-server') {
    return (
      <div
        ref={panelRef}
        role="region"
        aria-label="Start a new dev server"
        tabIndex={0}
        style={{
          ...CENTER_STATE,
          justifyContent: 'flex-start',
          padding: 20,
          gap: 10,
        }}
        className="preview-panel"
      >
        <style>{FOCUS_STYLES}</style>
        <span style={{ color: CANVAS.text, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          Start Dev Server
        </span>

        <label style={{ color: CANVAS.label, fontSize: 11, width: '100%' }}>
          Command
          <input
            type="text"
            style={{ ...INPUT, display: 'block', width: '100%', marginTop: 4 }}
            value={newCommandLine}
            onChange={(e) => setNewCommandLine(e.target.value)}
            placeholder="npm run dev"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCommandLine.trim()) handleStartNew();
            }}
          />
        </label>

        <label style={{ color: CANVAS.label, fontSize: 11, width: '100%' }}>
          Working Directory
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input
              type="text"
              style={{ ...INPUT, display: 'block', width: '100%' }}
              value={newCwd}
              onChange={(e) => setNewCwd(e.target.value)}
              placeholder="."
            />
            <button
              type="button"
              style={BTN}
              onClick={handleBrowseCwd}
              aria-label="Browse for working directory"
              title="Browse..."
            >
              ...
            </button>
          </div>
        </label>

        {error && (
          <span style={{ color: STATUS.danger, fontSize: 11 }}>{error}</span>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            style={BTN_PRIMARY}
            onClick={handleStartNew}
            disabled={loading || !newCommandLine.trim()}
            aria-label="Start server"
          >
            {loading ? 'Starting...' : 'Start'}
          </button>
          <button
            type="button"
            style={BTN}
            onClick={() => setShowStartForm(false)}
            aria-label="Cancel"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: loading state — skeleton
  // ═══════════════════════════════════════════════════════════════════

  if (panelState === 'loading') {
    return (
      <div
        ref={panelRef}
        role="region"
        aria-label="Preview panel — server starting"
        tabIndex={0}
        style={PANEL_SHELL}
        className="preview-panel"
      >
        <style>{FOCUS_STYLES}</style>
        <div style={SR_ONLY} aria-live="polite">
          {statusLabel}
        </div>
        {/* Skeleton toolbar */}
        <div style={TOOLBAR}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: CANVAS.border }} />
          <div style={{ flex: 1, height: 18, background: CANVAS.border, borderRadius: RADIUS.pill, animation: 'preview-shimmer 1.5s ease-in-out infinite' }} />
          <div style={{ width: 40, height: 18, background: CANVAS.border, borderRadius: RADIUS.pill }} />
        </div>
        {/* Skeleton iframe area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <div style={{ width: '60%', height: 12, background: CANVAS.border, borderRadius: RADIUS.pill, animation: 'preview-shimmer 1.5s ease-in-out infinite', animationDelay: '0.3s' }} />
          <span style={{ color: CANVAS.muted, fontSize: 12 }}>
            Starting {server?.command ?? '...'}
          </span>
        </div>
        <style>{`@keyframes preview-shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }`}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: error state — logs tail
  // ═══════════════════════════════════════════════════════════════════

  if (panelState === 'error') {
    return (
      <div
        ref={panelRef}
        role="region"
        aria-label="Preview panel — server error"
        tabIndex={0}
        style={PANEL_SHELL}
        className="preview-panel"
      >
        <style>{FOCUS_STYLES}</style>
        <div style={TOOLBAR}>
          <span style={{ color: STATUS.danger, fontSize: 12, fontWeight: 500 }}>
            Server Error
          </span>
          <span style={{ color: CANVAS.muted, fontSize: 11, marginLeft: 'auto' }}>
            {server?.command} {server?.args.join(' ')}
          </span>
        </div>
        <div style={SR_ONLY} aria-live="assertive">
          Server error. See logs below.
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 8,
              padding: 16,
            }}
          >
            <span style={{ color: STATUS.danger, fontSize: 13, fontWeight: 500 }}>
              Server crashed
            </span>
            {error && (
              <span style={{ color: CANVAS.muted, fontSize: 11, textAlign: 'center' }}>
                {error}
              </span>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" style={BTN_PRIMARY} onClick={handleRestart}>
                Restart
              </button>
              <button type="button" style={BTN} onClick={() => setSelectedServerId(null)}>
                Choose Another
              </button>
            </div>
          </div>
          {tailLogs.length > 0 && (
            <div ref={logContainerRef} style={LOG_CONTAINER} role="log" aria-label="Server logs">
              {tailLogs.map((line, i) => (
                <div
                  key={i}
                  style={{
                    color: line.stream === 'stderr' ? STATUS.danger : CANVAS.label,
                  }}
                >
                  {line.content}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: stopped state
  // ═══════════════════════════════════════════════════════════════════

  if (panelState === 'stopped') {
    return (
      <div
        ref={panelRef}
        role="region"
        aria-label="Preview panel — server stopped"
        tabIndex={0}
        style={PANEL_SHELL}
        className="preview-panel"
      >
        <style>{FOCUS_STYLES}</style>
        <div style={SR_ONLY} aria-live="polite">
          {statusLabel}
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span style={{ color: CANVAS.muted, fontSize: 13 }}>Server stopped</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={BTN_PRIMARY} onClick={handleRestart}>
              Restart
            </button>
            <button type="button" style={BTN} onClick={() => setSelectedServerId(null)}>
              Choose Another
            </button>
          </div>
        </div>
        {tailLogs.length > 0 && (
          <div ref={logContainerRef} style={LOG_CONTAINER} role="log" aria-label="Server logs">
            {tailLogs.map((line, i) => (
              <div
                key={i}
                style={{
                  color: line.stream === 'stderr' ? STATUS.danger : CANVAS.label,
                }}
              >
                {line.content}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: healthy state — toolbar + viewport controls + iframe
  // ═══════════════════════════════════════════════════════════════════

  const displayUrl = previewUrl
    ? `${previewUrl}${iframePath !== '/' ? iframePath : ''}`
    : '...';

  // Compute viewport dimensions and scale
  const vpWidth = viewportPreset === 'custom' ? customWidth : VIEWPORT_PRESETS[viewportPreset].width;
  const vpHeight = viewportPreset === 'custom' ? customHeight : VIEWPORT_PRESETS[viewportPreset].height;

  // Scale the iframe to fit within the container while preserving aspect ratio
  const scaleX = containerSize.width > 0 ? containerSize.width / vpWidth : 1;
  const scaleY = containerSize.height > 0 ? containerSize.height / vpHeight : 1;
  const scale = Math.min(scaleX, scaleY, 1); // never upscale

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label={`Preview panel — ${statusLabel}`}
      tabIndex={0}
      onKeyDown={handlePanelKeyDown}
      style={PANEL_SHELL}
      className="preview-panel"
    >
      <style>{FOCUS_STYLES}</style>
      <div style={SR_ONLY} aria-live="polite">
        {statusLabel}
      </div>
      {domReadAnnouncement && (
        <div style={SR_ONLY} aria-live="polite" role="status">
          {domReadAnnouncement}
        </div>
      )}

      {/* Main toolbar: status dot + URL input + refresh + stop */}
      <div style={TOOLBAR}>
        {/* Status indicator dot */}
        <div
          role="status"
          aria-label={`Server status: ${server?.status ?? 'unknown'}`}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background:
              server?.status === 'healthy'
                ? STATUS.success
                : server?.status === 'degraded'
                  ? STATUS.warning
                  : STATUS.accent,
            flexShrink: 0,
          }}
          title={`Status: ${server?.status ?? 'unknown'}`}
        />

        {/* URL bar — navigable input (P6-E) */}
        <input
          type="text"
          style={{ ...URL_BAR, color: CANVAS.text }}
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              handleUrlNavigate();
            }
          }}
          aria-label="URL path — press Enter to navigate"
          title={displayUrl}
          onFocus={(e) => e.target.select()}
        />

        {/* Refresh */}
        <button
          type="button"
          style={BTN}
          onClick={handleRefresh}
          aria-label="Refresh preview (Enter)"
          title="Refresh (Enter)"
        >
          ↻
        </button>

        {/* Stop */}
        <button
          type="button"
          style={{ ...BTN, color: STATUS.danger, borderColor: STATUS.danger }}
          onClick={handleStop}
          aria-label="Stop server"
          title="Stop server"
        >
          ■
        </button>
      </div>

      {/* Viewport presets toolbar */}
      <div style={VIEWPORT_TOOLBAR} role="group" aria-label="Viewport presets">
        {(Object.keys(VIEWPORT_PRESETS) as Array<Exclude<ViewportPreset, 'custom'>>).map(
          (key) => (
            <button
              key={key}
              type="button"
              style={viewportPreset === key ? PRESET_BTN_ACTIVE : PRESET_BTN}
              onClick={() => handlePresetChange(key)}
              aria-pressed={viewportPreset === key}
              aria-label={`${VIEWPORT_PRESETS[key].label} (${VIEWPORT_PRESETS[key].width}×${VIEWPORT_PRESETS[key].height})`}
            >
              {VIEWPORT_PRESETS[key].label}
            </button>
          ),
        )}
        <button
          type="button"
          style={viewportPreset === 'custom' ? PRESET_BTN_ACTIVE : PRESET_BTN}
          onClick={() => handlePresetChange('custom')}
          aria-pressed={viewportPreset === 'custom'}
          aria-label="Custom viewport dimensions"
        >
          Custom
        </button>

        {/* Dimension display / inputs */}
        <span role="status" aria-label={`Viewport dimensions: ${vpWidth} by ${vpHeight} pixels`} style={{ color: CANVAS.muted, fontSize: 11, marginLeft: 'auto' }}>
          {viewportPreset === 'custom' ? (
            <>
              <input
                type="number"
                style={DIM_INPUT}
                value={customWidth || ''}
                onChange={(e) => handleCustomDimChange('width', parseInt(e.target.value, 10))}
                onBlur={() => handleCustomDimBlur('width')}
                aria-label="Viewport width in pixels"
                min={120}
                max={3840}
              />
              <span aria-hidden="true" style={{ margin: '0 2px' }}>×</span>
              <input
                type="number"
                style={DIM_INPUT}
                value={customHeight || ''}
                onChange={(e) => handleCustomDimChange('height', parseInt(e.target.value, 10))}
                onBlur={() => handleCustomDimBlur('height')}
                aria-label="Viewport height in pixels"
                min={120}
                max={3840}
              />
            </>
          ) : (
            `${vpWidth}×${vpHeight}`
          )}
          {scale < 1 && ` (${Math.round(scale * 100)}%)`}
        </span>
      </div>

      {/* Viewport container — centered, scaled iframe */}
      {previewUrl ? (
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: CANVAS.bgElevated,
          }}
        >
          <div
            style={{
              width: vpWidth,
              height: vpHeight,
              transform: scale < 1 ? `scale(${scale.toFixed(4)})` : undefined,
              transformOrigin: 'center center',
              flexShrink: 0,
              overflow: 'hidden',
              border: scale < 1 ? `1px solid ${CANVAS.border}` : undefined,
              borderRadius: scale < 1 ? RADIUS.card : undefined,
            }}
          >
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={previewUrl}
              title="Dev server preview"
              aria-label={`Live preview of ${displayUrl} at ${vpWidth}×${vpHeight}`}
              onLoad={handleIframeLoad}
              style={{
                width: vpWidth,
                height: vpHeight,
                border: 'none',
                // RIVEN-EXEMPT: iframe content sets its own background; white is the
                // standard fallback for web content before the page paints.
                background: '#fff',
              }}
              // SECURITY NOTE (TANAKA-HIGH-1): allow-same-origin + allow-scripts means
              // localhost dev server code can access window.parent and Tauri invoke API.
              // This is the standard trust model for dev-server preview tools: localhost
              // dev servers are trusted code run by the developer. Required for P6-F agent
              // DOM access (parent reads iframe.contentDocument for same-origin localhost).
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            />
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: CANVAS.muted, fontSize: 12 }}>
            Waiting for port detection...
          </span>
        </div>
      )}
    </div>
  );
}
