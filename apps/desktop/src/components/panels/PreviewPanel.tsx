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
  type DevServerInfo,
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
  const [iframeKey, setIframeKey] = useState(0);
  const [iframePath, setIframePath] = useState('/');

  const { server, logs, start, stop, restart, loading, error } = useDevServer(selectedServerId);

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

  // P-002: Track iframe navigation path (same-origin localhost)
  const handleIframeLoad = useCallback(() => {
    try {
      const loc = iframeRef.current?.contentWindow?.location;
      if (loc) setIframePath(loc.pathname + loc.search);
    } catch {
      // cross-origin — cannot read, keep last known path
    }
  }, []);

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
      >
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
      >
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
      >
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
      >
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
      >
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
  // RENDER: healthy state — toolbar + iframe
  // ═══════════════════════════════════════════════════════════════════

  const displayUrl = previewUrl
    ? `${previewUrl}${iframePath !== '/' ? iframePath : ''}`
    : '...';

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label={`Preview panel — ${statusLabel}`}
      tabIndex={0}
      onKeyDown={handlePanelKeyDown}
      style={PANEL_SHELL}
    >
      <div style={SR_ONLY} aria-live="polite">
        {statusLabel}
      </div>

      {/* Toolbar: status dot + URL bar + refresh + stop */}
      <div style={TOOLBAR}>
        {/* Status indicator dot (M-006: role + aria-label for assistive tech) */}
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

        {/* URL bar — displays current iframe path (P-002); P6-E upgrades to navigable input */}
        <div style={URL_BAR} title={displayUrl}>
          {displayUrl}
        </div>

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

      {/* Iframe preview */}
      {previewUrl ? (
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={previewUrl}
          title="Dev server preview"
          aria-label={`Live preview of ${displayUrl}`}
          onLoad={handleIframeLoad}
          style={{
            flex: 1,
            width: '100%',
            border: 'none',
            // RIVEN-EXEMPT: iframe content sets its own background; white is the
            // standard fallback for web content before the page paints.
            background: '#fff',
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        />
      ) : (
        <div
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
