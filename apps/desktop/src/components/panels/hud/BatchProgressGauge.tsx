/**
 * BatchProgressGauge — Wraps ProgressArc to show batch completion.
 * Displays batches_done as a circular arc with centered count text.
 * Responds to BuildStateChanged events via useBuildState.
 */

import { ProgressArc } from '@forge-os/canvas-components';
import type { BuildStateSnapshot } from '../../../lib/tauri';

interface BatchProgressGaugeProps {
  snapshot: BuildStateSnapshot | null;
  width: number;
  height: number;
}

/** Estimated total batches — until batches_total is surfaced from BOOT.md */
const ESTIMATED_TOTAL_BATCHES = 145;

export function BatchProgressGauge({ snapshot, width, height }: BatchProgressGaugeProps) {
  const done = snapshot?.batches_done ?? 0;
  const fraction = ESTIMATED_TOTAL_BATCHES > 0
    ? Math.min(done / ESTIMATED_TOTAL_BATCHES, 1)
    : 0;

  const phase = snapshot?.phase ?? '';
  // Extract phase number for sub-label (e.g., "5_IN_PROGRESS" → "Phase 5")
  const phaseMatch = phase.match(/^(\d+)/);
  const phaseLabel = phaseMatch ? `Phase ${phaseMatch[1]}` : 'Batch';

  return (
    <ProgressArc
      width={width}
      height={height}
      value={fraction}
      centerText={`${done}`}
      subLabel={phaseLabel}
      colorMode="accent"
      animated
      aria-label={`Batch progress: ${done} batches done (${phaseLabel})`}
    />
  );
}
