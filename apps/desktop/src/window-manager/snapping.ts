// ── Edge-Snap Engine ──
// 8px magnetic snap to app frame edges, other panel edges, and dock bar.

import type { PanelPosition, PanelSize, PanelInstance, SnapTarget } from './types';

const SNAP_DISTANCE = 8;
const DOCK_BAR_HEIGHT = 44;

interface SnapResult {
  position: PanelPosition;
  snappedX: boolean;
  snappedY: boolean;
}

/** Compute snap targets from frame bounds and other panels */
function getSnapTargets(
  panels: PanelInstance[],
  excludeId: string,
  frameWidth: number,
  frameHeight: number,
): SnapTarget[] {
  const targets: SnapTarget[] = [];

  // Frame edges
  targets.push({ edge: 'left', position: 0, source: 'frame' });
  targets.push({ edge: 'top', position: 0, source: 'frame' });
  targets.push({ edge: 'right', position: frameWidth, source: 'frame' });
  targets.push({ edge: 'bottom', position: frameHeight - DOCK_BAR_HEIGHT, source: 'dock' });

  // Other panel edges
  for (const panel of panels) {
    if (panel.id === excludeId) continue;
    if (panel.state === 'minimized' || panel.state === 'popped_out') continue;

    targets.push({ edge: 'left', position: panel.position.x, source: 'panel' });
    targets.push({ edge: 'right', position: panel.position.x + panel.size.width, source: 'panel' });
    targets.push({ edge: 'top', position: panel.position.y, source: 'panel' });
    targets.push({ edge: 'bottom', position: panel.position.y + panel.size.height, source: 'panel' });
  }

  return targets;
}

/** Apply magnetic snap to a panel position */
export function snapPosition(
  position: PanelPosition,
  size: PanelSize,
  panels: PanelInstance[],
  excludeId: string,
  frameWidth: number,
  frameHeight: number,
  enabled: boolean = true,
): SnapResult {
  if (!enabled) {
    return { position, snappedX: false, snappedY: false };
  }

  const targets = getSnapTargets(panels, excludeId, frameWidth, frameHeight);
  let x = position.x;
  let y = position.y;
  let snappedX = false;
  let snappedY = false;

  // Snap left edge of panel
  for (const target of targets) {
    if (target.edge === 'left' || target.edge === 'right') {
      // Snap panel left edge to target
      if (Math.abs(x - target.position) < SNAP_DISTANCE) {
        x = target.position;
        snappedX = true;
      }
      // Snap panel right edge to target
      if (Math.abs(x + size.width - target.position) < SNAP_DISTANCE) {
        x = target.position - size.width;
        snappedX = true;
      }
    }
    if (target.edge === 'top' || target.edge === 'bottom') {
      // Snap panel top edge to target
      if (Math.abs(y - target.position) < SNAP_DISTANCE) {
        y = target.position;
        snappedY = true;
      }
      // Snap panel bottom edge to target
      if (Math.abs(y + size.height - target.position) < SNAP_DISTANCE) {
        y = target.position - size.height;
        snappedY = true;
      }
    }
  }

  return { position: { x, y }, snappedX, snappedY };
}

/** Constrain a panel position to stay within frame bounds */
export function clampToFrame(
  position: PanelPosition,
  size: PanelSize,
  frameWidth: number,
  frameHeight: number,
): PanelPosition {
  return {
    x: Math.max(0, Math.min(position.x, frameWidth - Math.min(size.width, 100))),
    y: Math.max(0, Math.min(position.y, frameHeight - DOCK_BAR_HEIGHT - Math.min(size.height, 40))),
  };
}

export { DOCK_BAR_HEIGHT };
