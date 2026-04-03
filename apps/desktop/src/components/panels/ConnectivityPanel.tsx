// ── Connectivity Panel — Service Health Dashboard ──
// Displays service health cards with expand-to-detail. Real-time status via events.
// States: loading → empty → cards → error. Keyboard + screen reader accessible.
// P6-I: summary header, service cards grid, expand/collapse, manual re-check.

import { useState, useCallback, useRef, useEffect } from 'react';
import { useConnectivity } from '../../hooks/useConnectivity';
import { checkService, type ServiceHealth, type ServiceStatus } from '../../lib/tauri';
import { StatusBadge, type BadgeStatus } from '@forge-os/canvas-components';
import { CANVAS, STATUS, RADIUS, TINT, FONT } from '@forge-os/canvas-components';

// ─── Helpers ───────────────────────────────────────────────────────

function friendlyError(raw: string): string {
  if (raw.includes('network') || raw.includes('fetch')) return 'Network error — check your connection.';
  if (raw.includes('timeout')) return 'Request timed out — services may be slow.';
  if (raw.includes('unauthorized') || raw.includes('401')) return 'Authentication failed — check credentials.';
  if (raw.includes('forbidden') || raw.includes('403')) return 'Access denied — check permissions.';
  return 'Something went wrong. Try again.';
}

// ─── Status Mapping ────────────────────────────────────────────────

function statusToBadge(status: ServiceStatus): BadgeStatus {
  switch (status) {
    case 'healthy': return 'success';
    case 'degraded': return 'warning';
    case 'unreachable': return 'danger';
    case 'unconfigured': return 'neutral';
  }
}

function statusLabel(status: ServiceStatus): string {
  switch (status) {
    case 'healthy': return 'Healthy';
    case 'degraded': return 'Degraded';
    case 'unreachable': return 'Unreachable';
    case 'unconfigured': return 'Not Configured';
  }
}

const SERVICE_ICONS: Record<string, string> = {
  github: '\u2B24',    // ⬤
  supabase: '\u26A1',  // ⚡
  cloudflare: '\u2601', // ☁
  stripe: '\uD83D\uDCB3', // 💳
  typesense: '\uD83D\uDD0D', // 🔍
  custom: '\u2699',    // ⚙
};

function serviceIcon(serviceType: string): string {
  return SERVICE_ICONS[serviceType] ?? SERVICE_ICONS.custom;
}

// ─── Aggregate Status ──────────────────────────────────────────────

function aggregateStatus(services: ServiceHealth[]): {
  label: string;
  color: string;
  badgeStatus: BadgeStatus;
} {
  const configured = services.filter((s) => s.status !== 'unconfigured');
  if (configured.length === 0) {
    return { label: 'No Services Configured', color: CANVAS.muted, badgeStatus: 'neutral' };
  }
  const hasUnreachable = configured.some((s) => s.status === 'unreachable');
  const hasDegraded = configured.some((s) => s.status === 'degraded');
  if (hasUnreachable) {
    return { label: 'Service Disruption', color: STATUS.danger, badgeStatus: 'danger' };
  }
  if (hasDegraded) {
    return { label: 'Degraded', color: STATUS.warning, badgeStatus: 'warning' };
  }
  return { label: 'All Systems Operational', color: STATUS.success, badgeStatus: 'success' };
}

// ─── Styles (canvas-tokens, no Tailwind — matches PreviewPanel sibling) ───

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

const HEADER: React.CSSProperties = {
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

const CARDS_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
  gap: '8px',
  padding: '10px',
  overflowY: 'auto',
  flex: 1,
};

const CARD: React.CSSProperties = {
  background: CANVAS.bgElevated,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.card,
  padding: '10px 12px',
  cursor: 'pointer',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
};

const CARD_HEADER: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const CARD_ICON: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1,
  width: 24,
  textAlign: 'center' as const,
};

const CARD_NAME: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: CANVAS.text,
  flex: 1,
};

const CARD_LATENCY: React.CSSProperties = {
  fontSize: 11,
  color: CANVAS.label,
  fontFamily: FONT.mono,
};

const DETAIL_SECTION: React.CSSProperties = {
  marginTop: 10,
  paddingTop: 8,
  borderTop: `1px solid ${CANVAS.border}`,
  overflow: 'hidden',
  animation: 'detail-expand 0.2s ease-out',
};

const UNCONFIGURED_CARD: React.CSSProperties = {
  ...CARD,
  opacity: 0.6,
  cursor: 'default',
};

const SKELETON_CARD: React.CSSProperties = {
  background: CANVAS.bgElevated,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.card,
  height: 60,
  animation: 'pulse 1.5s ease-in-out infinite',
};

const ERROR_BANNER: React.CSSProperties = {
  padding: '6px 12px',
  background: TINT.danger,
  borderBottom: `1px solid ${CANVAS.border}`,
  fontSize: 11,
  color: STATUS.danger,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexShrink: 0,
};

const FOCUS_VISIBLE_SHADOW = `0 0 0 2px ${STATUS.accent}`;

// ─── Service Card Component ────────────────────────────────────────

interface ServiceCardProps {
  service: ServiceHealth;
  expanded: boolean;
  onToggle: () => void;
}

function ServiceCard({ service, expanded, onToggle }: ServiceCardProps) {
  const [rechecking, setRechecking] = useState(false);
  const isUnconfigured = service.status === 'unconfigured';

  const handleRecheck = useCallback(async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setRechecking(true);
    try {
      await checkService(service.serviceType);
    } finally {
      setRechecking(false);
    }
  }, [service.serviceType]);

  const handleCardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isUnconfigured) onToggle();
    }
    if (e.key === 'Escape' && expanded) {
      e.preventDefault();
      onToggle();
    }
  }, [isUnconfigured, expanded, onToggle]);

  const handleRecheckKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onToggle();
    }
  }, [onToggle]);

  if (isUnconfigured) {
    return (
      <div
        style={UNCONFIGURED_CARD}
        role="region"
        tabIndex={0}
        aria-label={`${service.serviceName} — not configured`}
        onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = FOCUS_VISIBLE_SHADOW; }}
        onBlur={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
      >
        <div style={CARD_HEADER}>
          <span style={CARD_ICON} aria-hidden="true">{serviceIcon(service.serviceType)}</span>
          <span style={{ ...CARD_NAME, color: CANVAS.muted }}>{service.serviceName}</span>
          <StatusBadge width={20} height={20} status="neutral" />
        </div>
        <div style={{ fontSize: 11, color: CANVAS.muted, marginTop: 6 }}>
          Not configured
        </div>
      </div>
    );
  }

  const hasDetails = Object.keys(service.details).length > 0;
  const lastCheckedStr = service.lastChecked
    ? new Date(service.lastChecked).toLocaleTimeString()
    : '\u2014';

  return (
    <div
      style={CARD}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={`${service.serviceName}: ${statusLabel(service.status)}`}
      onClick={onToggle}
      onKeyDown={handleCardKeyDown}
      onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = FOCUS_VISIBLE_SHADOW; }}
      onBlur={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={CARD_HEADER}>
        <span style={CARD_ICON} aria-hidden="true">{serviceIcon(service.serviceType)}</span>
        <span style={CARD_NAME}>{service.serviceName}</span>
        <span style={CARD_LATENCY}>{service.latencyMs != null ? `${service.latencyMs}ms` : '\u2014'}</span>
        <StatusBadge
          width={20}
          height={20}
          status={statusToBadge(service.status)}
          pulse={service.status === 'unreachable'}
        />
      </div>

      {expanded && (
        <div style={DETAIL_SECTION}>
          <dl style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: 11 }}>
              <dt style={{ color: CANVAS.label, fontWeight: 500 }}>Status</dt>
              <dd style={{ color: CANVAS.text, fontFamily: FONT.mono, margin: 0 }}>{statusLabel(service.status)}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: 11 }}>
              <dt style={{ color: CANVAS.label, fontWeight: 500 }}>Last Checked</dt>
              <dd style={{ color: CANVAS.text, fontFamily: FONT.mono, margin: 0 }}>{lastCheckedStr}</dd>
            </div>
            {service.latencyMs != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: 11 }}>
                <dt style={{ color: CANVAS.label, fontWeight: 500 }}>Latency</dt>
                <dd style={{ color: CANVAS.text, fontFamily: FONT.mono, margin: 0 }}>{service.latencyMs}ms</dd>
              </div>
            )}
            {hasDetails && Object.entries(service.details).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: 11 }}>
                <dt style={{ color: CANVAS.label, fontWeight: 500 }}>{key}</dt>
                <dd style={{ color: CANVAS.text, fontFamily: FONT.mono, margin: 0, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value}>{value}</dd>
              </div>
            ))}
          </dl>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              style={BTN}
              disabled={rechecking}
              onClick={handleRecheck as React.MouseEventHandler}
              onKeyDown={handleRecheckKeyDown}
              aria-label={`Re-check ${service.serviceName}`}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = FOCUS_VISIBLE_SHADOW; }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              {rechecking ? 'Checking\u2026' : 'Re-check'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────

export default function ConnectivityPanel() {
  const { services, loading, error, refresh } = useConnectivity();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const prevAggRef = useRef('');
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);

  const toggleCard = useCallback((serviceType: string) => {
    setExpandedId((prev) => (prev === serviceType ? null : serviceType));
  }, []);

  const agg = aggregateStatus(services);

  // Update live region only on aggregate status change (MARA-P6I-010)
  useEffect(() => {
    if (agg.label !== prevAggRef.current && liveRegionRef.current) {
      liveRegionRef.current.textContent = agg.label;
      prevAggRef.current = agg.label;
    }
  }, [agg.label]);

  // ── Loading skeleton ──
  if (loading && services.length === 0) {
    return (
      <div style={PANEL_SHELL} aria-busy="true">
        <div style={HEADER}>
          <span role="status" style={{ fontSize: 13, fontWeight: 600, color: CANVAS.label }}>
            Checking services\u2026
          </span>
        </div>
        <div style={CARDS_GRID}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={SKELETON_CARD} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }`}</style>
      </div>
    );
  }

  // ── Error state ──
  if (error && services.length === 0) {
    return (
      <div style={CENTER_STATE}>
        <span style={{ fontSize: 24 }} aria-hidden="true">{'\u26A0'}</span>
        <span style={{ color: STATUS.danger, fontSize: 13, fontWeight: 600 }}>
          Failed to load services
        </span>
        <span style={{ color: CANVAS.label, fontSize: 11, maxWidth: 260, textAlign: 'center' }}>
          {friendlyError(error)}
        </span>
        <button
          ref={retryRef}
          type="button"
          style={BTN_PRIMARY}
          onClick={refresh}
          autoFocus
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = FOCUS_VISIBLE_SHADOW; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state (no services at all) ──
  if (services.length === 0) {
    return (
      <div style={CENTER_STATE}>
        <span style={{ fontSize: 28 }} aria-hidden="true">{'\u2699'}</span>
        <span style={{ color: CANVAS.text, fontSize: 13, fontWeight: 600 }}>
          No services configured
        </span>
        <span style={{ color: CANVAS.label, fontSize: 11, maxWidth: 280, textAlign: 'center', lineHeight: '16px' }}>
          Add service credentials in Settings to monitor GitHub, Supabase, Cloudflare, and more.
        </span>
      </div>
    );
  }

  // ── Normal state: summary header + cards ──
  const lastCheckedGlobal = services.reduce<string | null>((latest, s) => {
    if (!s.lastChecked) return latest;
    if (!latest) return s.lastChecked;
    return s.lastChecked > latest ? s.lastChecked : latest;
  }, null);

  const lastCheckedDisplay = lastCheckedGlobal
    ? new Date(lastCheckedGlobal).toLocaleTimeString()
    : '\u2014';

  return (
    <div style={PANEL_SHELL}>
      <style>{`@keyframes detail-expand { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 300px; } }`}</style>
      {/* Live region — updated only on aggregate status transitions */}
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" style={SR_ONLY} />

      {/* Summary header */}
      <div style={HEADER}>
        <StatusBadge width={18} height={18} status={agg.badgeStatus} pulse={agg.badgeStatus === 'danger'} />
        <span style={{ fontSize: 13, fontWeight: 600, color: agg.color, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {agg.label}
        </span>
        <span style={{ fontSize: 11, color: CANVAS.muted, fontFamily: FONT.mono }} aria-label={`Last checked at ${lastCheckedDisplay}`}>
          {lastCheckedDisplay}
        </span>
        <button
          type="button"
          style={BTN}
          onClick={refresh}
          disabled={loading}
          aria-label="Refresh all services"
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = FOCUS_VISIBLE_SHADOW; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
        >
          {loading ? '\u231B' : '\u21BB'}
        </button>
      </div>

      {/* Error banner (non-fatal — between header and grid for visibility) */}
      {error && services.length > 0 && (
        <div style={ERROR_BANNER} role="alert">
          <span aria-hidden="true">{'\u26A0'}</span>
          <span style={{ flex: 1 }}>Refresh failed. Showing cached data.</span>
          <button type="button" style={{ ...BTN, padding: '4px 8px', fontSize: 11 }} onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      {/* Service cards grid */}
      <div style={CARDS_GRID}>
        {services.map((service) => (
          <ServiceCard
            key={service.serviceType}
            service={service}
            expanded={expandedId === service.serviceType}
            onToggle={() => toggleCard(service.serviceType)}
          />
        ))}
      </div>
    </div>
  );
}
