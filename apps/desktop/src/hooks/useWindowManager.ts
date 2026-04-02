// ── useWindowManager Hook ──
// React hook wrapping ForgeWindowManager: panel CRUD, drag/resize handlers,
// z-order management, preset switching, layout persistence.

import { useState, useEffect, useCallback, useRef, type MouseEvent } from 'react';
import { ForgeWindowManager } from '../window-manager/manager';
import { LayoutPersistence } from '../window-manager/persistence';
import { snapPosition, clampToFrame } from '../window-manager/snapping';
import type {
  PanelType,
  PanelInstance,
  PanelPosition,
  ResizeHandle,
  TabGroup,
  WorkspacePreset,
  DragState,
  ResizeState,
} from '../window-manager/types';

interface UseWindowManagerReturn {
  panels: PanelInstance[];
  tabGroups: TabGroup[];
  presets: WorkspacePreset[];
  activePresetId: string | null;
  isReady: boolean;
  // Panel operations
  addPanel: (type: PanelType) => void;
  removePanel: (id: string) => void;
  minimizePanel: (id: string) => void;
  restorePanel: (id: string) => void;
  popOutPanel: (id: string) => void;
  focusPanel: (id: string) => void;
  // Drag/Resize event handlers (pass to PanelContainer)
  handleDragStart: (panelId: string, e: MouseEvent) => void;
  handleResizeStart: (panelId: string, handle: ResizeHandle, e: MouseEvent) => void;
  // Presets
  applyPreset: (presetId: string) => void;
  savePreset: (name: string, description: string) => void;
  // Snapping toggle
  snappingEnabled: boolean;
  setSnappingEnabled: (enabled: boolean) => void;
  // Frame dimensions (for snapping calculations)
  setFrameSize: (width: number, height: number) => void;
}

export function useWindowManager(): UseWindowManagerReturn {
  const managerRef = useRef<ForgeWindowManager>(new ForgeWindowManager());
  const persistenceRef = useRef<LayoutPersistence>(new LayoutPersistence());
  const [panels, setPanels] = useState<PanelInstance[]>([]);
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([]);
  const [presets, setPresets] = useState<WorkspacePreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const frameSize = useRef({ width: 1280, height: 800 });

  // Drag/resize state refs (not in React state — too frequent for re-renders)
  const dragState = useRef<DragState | null>(null);
  const resizeState = useRef<ResizeState | null>(null);

  const syncState = useCallback(() => {
    const mgr = managerRef.current;
    setPanels([...mgr.getAllPanels()]);
    setTabGroups([...mgr.getAllTabGroups()]);
    setPresets([...mgr.getPresets()]);
    setActivePresetId(mgr.getActivePresetId());
    persistenceRef.current.scheduleSave(mgr);
  }, []);

  // Initialize: restore from SQLite or apply default layout
  useEffect(() => {
    const mgr = managerRef.current;
    const persistence = persistenceRef.current;

    const unsubscribe = mgr.subscribe(() => syncState());

    (async () => {
      const restored = await persistence.restore(mgr);
      if (!restored) {
        mgr.applyDefaultLayout(frameSize.current.width, frameSize.current.height);
      }
      syncState();
      setIsReady(true);
    })();

    return () => {
      unsubscribe();
      persistence.dispose();
    };
  }, [syncState]);

  // ── Mouse move/up handlers for drag and resize (attached to window) ──

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const drag = dragState.current;
      if (drag?.isDragging) {
        const dx = e.clientX - drag.startMousePosition.x;
        const dy = e.clientY - drag.startMousePosition.y;
        const rawPosition: PanelPosition = {
          x: drag.startPosition.x + dx,
          y: drag.startPosition.y + dy,
        };

        const panel = managerRef.current.getPanel(drag.panelId);
        if (!panel) return;

        // Apply snapping
        const { position: snappedPos } = snapPosition(
          rawPosition,
          panel.size,
          managerRef.current.getAllPanels(),
          drag.panelId,
          frameSize.current.width,
          frameSize.current.height,
          snappingEnabled,
        );

        // Clamp to frame
        const clamped = clampToFrame(
          snappedPos,
          panel.size,
          frameSize.current.width,
          frameSize.current.height,
        );

        managerRef.current.movePanel(drag.panelId, clamped);
      }

      const resize = resizeState.current;
      if (resize?.isResizing) {
        const dx = e.clientX - resize.startMousePosition.x;
        const dy = e.clientY - resize.startMousePosition.y;
        const handle = resize.handle;

        let newX = resize.startPosition.x;
        let newY = resize.startPosition.y;
        let newW = resize.startSize.width;
        let newH = resize.startSize.height;

        // Compute new position/size based on which handle is being dragged
        if (handle.includes('e')) newW = resize.startSize.width + dx;
        if (handle.includes('w')) { newW = resize.startSize.width - dx; newX = resize.startPosition.x + dx; }
        if (handle.includes('s')) newH = resize.startSize.height + dy;
        if (handle.includes('n')) { newH = resize.startSize.height - dy; newY = resize.startPosition.y + dy; }

        const panel = managerRef.current.getPanel(resize.panelId);
        if (!panel) return;

        // Prevent shrinking below minimum
        if (newW < panel.constraints.minWidth) {
          if (handle.includes('w')) newX = resize.startPosition.x + resize.startSize.width - panel.constraints.minWidth;
          newW = panel.constraints.minWidth;
        }
        if (newH < panel.constraints.minHeight) {
          if (handle.includes('n')) newY = resize.startPosition.y + resize.startSize.height - panel.constraints.minHeight;
          newH = panel.constraints.minHeight;
        }

        managerRef.current.movePanel(resize.panelId, { x: newX, y: newY });
        managerRef.current.resizePanel(resize.panelId, { width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      dragState.current = null;
      resizeState.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [snappingEnabled]);

  // ── Public API ──

  const addPanel = useCallback((type: PanelType) => {
    managerRef.current.addPanel(type);
  }, []);

  const removePanel = useCallback((id: string) => {
    managerRef.current.removePanel(id);
  }, []);

  const minimizePanel = useCallback((id: string) => {
    managerRef.current.minimizePanel(id);
  }, []);

  const restorePanel = useCallback((id: string) => {
    managerRef.current.restorePanel(id);
  }, []);

  const popOutPanel = useCallback((id: string) => {
    managerRef.current.popOutPanel(id);
  }, []);

  const focusPanel = useCallback((id: string) => {
    managerRef.current.focusPanel(id);
  }, []);

  const handleDragStart = useCallback((panelId: string, e: MouseEvent) => {
    const panel = managerRef.current.getPanel(panelId);
    if (!panel) return;

    managerRef.current.focusPanel(panelId);
    dragState.current = {
      panelId,
      startPosition: { ...panel.position },
      startMousePosition: { x: e.clientX, y: e.clientY },
      isDragging: true,
    };
  }, []);

  const handleResizeStart = useCallback((panelId: string, handle: ResizeHandle, e: MouseEvent) => {
    const panel = managerRef.current.getPanel(panelId);
    if (!panel) return;

    managerRef.current.focusPanel(panelId);
    resizeState.current = {
      panelId,
      handle,
      startPosition: { ...panel.position },
      startSize: { ...panel.size },
      startMousePosition: { x: e.clientX, y: e.clientY },
      isResizing: true,
    };
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    managerRef.current.applyPreset(presetId);
  }, []);

  const savePreset = useCallback((name: string, description: string) => {
    managerRef.current.savePreset(name, description);
    syncState();
  }, [syncState]);

  const setFrameSize = useCallback((width: number, height: number) => {
    frameSize.current = { width, height };
  }, []);

  return {
    panels,
    tabGroups,
    presets,
    activePresetId,
    isReady,
    addPanel,
    removePanel,
    minimizePanel,
    restorePanel,
    popOutPanel,
    focusPanel,
    handleDragStart,
    handleResizeStart,
    applyPreset,
    savePreset,
    snappingEnabled,
    setSnappingEnabled,
    setFrameSize,
  };
}
