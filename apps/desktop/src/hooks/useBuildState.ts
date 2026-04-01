import { useState, useEffect, useCallback } from 'react';
import {
  getBuildStateSnapshot,
  getPipelineStages,
  refreshBuildState,
  onBuildStateChanged,
  onPipelineStageChanged,
  type BuildStateSnapshot,
  type PipelineStage,
} from '../lib/tauri';

interface UseBuildStateReturn {
  snapshot: BuildStateSnapshot | null;
  pipeline: PipelineStage[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Reactive build state from BOOT.md + pipeline stages.
 * Subscribes to HUD events for live updates.
 *
 * @param bootPath - Absolute path to BOOT.md on disk
 */
export function useBuildState(bootPath: string | null): UseBuildStateReturn {
  const [snapshot, setSnapshot] = useState<BuildStateSnapshot | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    if (!bootPath) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [snap, stages] = await Promise.all([
          getBuildStateSnapshot(bootPath!),
          getPipelineStages(),
        ]);
        if (!cancelled) {
          setSnapshot(snap);
          setPipeline(stages);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [bootPath]);

  // Subscribe to live events
  useEffect(() => {
    const unlisteners: Promise<() => void>[] = [];

    unlisteners.push(
      onBuildStateChanged((snap) => {
        setSnapshot(snap);
        setError(null);
      }),
    );

    unlisteners.push(
      onPipelineStageChanged((stage) => {
        setPipeline((prev) =>
          prev.map((s) => (s.id === stage.id ? stage : s)),
        );
      }),
    );

    return () => {
      unlisteners.forEach((p) => p.then((unlisten) => unlisten()).catch(() => {}));
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!bootPath) return;
    try {
      const snap = await refreshBuildState(bootPath);
      setSnapshot(snap);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [bootPath]);

  return { snapshot, pipeline, loading, error, refresh };
}
