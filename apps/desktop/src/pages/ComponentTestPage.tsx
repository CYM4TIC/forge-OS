/**
 * ComponentTestPage — Visual regression reference for all canvas components.
 * Renders every @forge-os/canvas-components component at multiple sizes.
 * Access via dev tools or a temporary route during development.
 */

import {
  StatCard,
  ProgressArc,
  StatusBadge,
  FlowParticle,
  ConnectionLine,
  NodeCard,
  TokenGauge,
  ContextMeterCanvas,
  DockPill,
  PersonaGlyph,
} from '@forge-os/canvas-components';
import type { GlyphState } from '@forge-os/canvas-components';
import type { PersonaSlug } from '@forge-os/shared';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-text-secondary text-xs font-semibold tracking-widest uppercase mb-3">
        {title}
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        {children}
      </div>
    </div>
  );
}

export default function ComponentTestPage() {
  return (
    <div className="p-6 bg-bg-primary min-h-screen overflow-auto">
      <h1 className="text-text-primary text-lg font-bold mb-6">
        Canvas Components Test Page
      </h1>

      {/* StatCard */}
      <Section title="StatCard">
        <StatCard width={160} height={120} value="57" label="Batches Done" trend="up" trendText="+3" />
        <StatCard width={160} height={120} value="$4.23" label="Token Cost" trend="neutral" trendText="$4.23" />
        <StatCard width={200} height={140} value="89%" label="Phase Completion" trend="up" trendText="+12%" valueColor="#22c55e" />
        <StatCard width={120} height={90} value="12" label="Findings" trend="down" trendText="-5" />
      </Section>

      {/* ProgressArc */}
      <Section title="ProgressArc">
        <ProgressArc width={100} height={100} value={0.47} centerText="47%" subLabel="Phase 4" />
        <ProgressArc width={120} height={120} value={0.85} centerText="85%" subLabel="Context" colorMode="zone" />
        <ProgressArc width={80} height={80} value={0.25} centerText="25%" />
        <ProgressArc width={140} height={140} value={0.95} centerText="95%" subLabel="Critical" colorMode="zone" />
      </Section>

      {/* StatusBadge */}
      <Section title="StatusBadge">
        <StatusBadge width={80} height={24} status="success" label="Online" />
        <StatusBadge width={80} height={24} status="warning" label="Slow" />
        <StatusBadge width={80} height={24} status="danger" label="Down" />
        <StatusBadge width={80} height={24} status="active" label="Building" />
        <StatusBadge width={24} height={24} status="neutral" />
        <StatusBadge width={24} height={24} status="success" />
        <StatusBadge width={24} height={24} status="danger" />
      </Section>

      {/* FlowParticle */}
      <Section title="FlowParticle">
        <FlowParticle
          width={300}
          height={100}
          path={{
            start: { x: 20, y: 50 },
            cp1: { x: 100, y: 10 },
            cp2: { x: 200, y: 90 },
            end: { x: 280, y: 50 },
          }}
        />
        <FlowParticle
          width={200}
          height={80}
          path={{
            start: { x: 10, y: 40 },
            cp1: { x: 60, y: 10 },
            cp2: { x: 140, y: 70 },
            end: { x: 190, y: 40 },
          }}
          color="#22c55e"
          radius={4}
          duration={1500}
        />
      </Section>

      {/* ConnectionLine */}
      <Section title="ConnectionLine">
        <ConnectionLine
          width={250}
          height={80}
          from={{ x: 20, y: 40 }}
          to={{ x: 230, y: 40 }}
          color="#6366f1"
        />
        <ConnectionLine
          width={200}
          height={100}
          from={{ x: 20, y: 20 }}
          to={{ x: 180, y: 80 }}
          color="#22c55e"
          curvature={0.5}
        />
      </Section>

      {/* NodeCard */}
      <Section title="NodeCard">
        <NodeCard width={180} height={60} label="Scout" subLabel="Pre-build Intel" icon="🔍" status="active" />
        <NodeCard width={180} height={60} label="Build Triad" subLabel="Gate Review" icon="🛡️" status="complete" />
        <NodeCard width={180} height={60} label="Sentinel" subLabel="Regression Check" icon="👁️" status="error" />
        <NodeCard width={160} height={50} label="Wraith" icon="👻" status="warning" />
        <NodeCard width={200} height={60} label="Nyx" subLabel="Build Orchestrator" icon="⚡" status="active" selected />
      </Section>

      {/* TokenGauge */}
      <Section title="TokenGauge">
        <TokenGauge width={100} height={50} value="$4.23" maxValue="$99.99" label="Cost" />
        <TokenGauge width={80} height={50} value="57" maxValue="999" label="Batches" />
        <TokenGauge width={120} height={50} value="0.09ms" maxValue="99.99ms" label="Layout" />
        <TokenGauge width={100} height={50} value="$10.00" maxValue="$99.99" label="Budget" valueColor="#22c55e" />
      </Section>

      {/* ContextMeterCanvas */}
      <Section title="ContextMeterCanvas">
        <ContextMeterCanvas width={250} height={50} value={0.35} tokensUsed={70000} tokensTotal={200000} />
        <ContextMeterCanvas width={250} height={50} value={0.72} tokensUsed={144000} tokensTotal={200000} />
        <ContextMeterCanvas width={250} height={50} value={0.88} tokensUsed={176000} tokensTotal={200000} isCompacting />
      </Section>

      {/* DockPill */}
      <Section title="DockPill">
        <DockPill width={110} height={28} icon="💬" label="Chat" variant="active" pulse />
        <DockPill width={110} height={28} icon="🎨" label="Canvas" variant="active" badgeCount={3} />
        <DockPill width={110} height={28} icon="👥" label="Team" variant="minimized" />
        <DockPill width={110} height={28} icon="🖥️" label="Preview" variant="closed" />
        <DockPill width={110} height={28} icon="🔗" label="Services" variant="minimized" badgeCount={12} />
      </Section>

      {/* PersonaGlyph — All 10 personas at idle */}
      <Section title="Persona Glyphs — Idle">
        {(['nyx', 'pierce', 'mara', 'riven', 'kehinde', 'tanaka', 'vane', 'voss', 'calloway', 'sable'] as PersonaSlug[]).map((slug) => (
          <div key={slug} className="flex flex-col items-center gap-1">
            <PersonaGlyph size={48} persona={slug} state="idle" />
            <span className="text-text-muted text-[9px] uppercase">{slug}</span>
          </div>
        ))}
      </Section>

      {/* PersonaGlyph — Size variants (Nyx) */}
      <Section title="Glyph Sizes — Nyx">
        <PersonaGlyph size={16} persona="nyx" state="idle" />
        <PersonaGlyph size={24} persona="nyx" state="idle" />
        <PersonaGlyph size={36} persona="nyx" state="thinking" />
        <PersonaGlyph size={48} persona="nyx" state="speaking" />
        <PersonaGlyph size={64} persona="nyx" state="speaking" />
        <PersonaGlyph size={96} persona="nyx" state="speaking" />
      </Section>

      {/* PersonaGlyph — State variants (all states on Pierce) */}
      <Section title="Glyph States — Pierce">
        {(['idle', 'thinking', 'speaking', 'finding', 'complete', 'error'] as GlyphState[]).map((s) => (
          <div key={s} className="flex flex-col items-center gap-1">
            <PersonaGlyph size={48} persona="pierce" state={s} />
            <span className="text-text-muted text-[9px] uppercase">{s}</span>
          </div>
        ))}
      </Section>

      {/* PersonaGlyph — All 10 in 'speaking' state */}
      <Section title="Persona Glyphs — Speaking">
        {(['nyx', 'pierce', 'mara', 'riven', 'kehinde', 'tanaka', 'vane', 'voss', 'calloway', 'sable'] as PersonaSlug[]).map((slug) => (
          <div key={slug} className="flex flex-col items-center gap-1">
            <PersonaGlyph size={64} persona={slug} state="speaking" />
            <span className="text-text-muted text-[9px] uppercase">{slug}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}
