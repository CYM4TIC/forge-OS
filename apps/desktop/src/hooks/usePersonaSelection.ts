// ── usePersonaSelection — Session-scoped persona multi-select ──
// P7-F: clickable persona pills → orchestrator recognition.
// Not persisted — resets on app restart. Emits custom event for Action Palette debounce.

import { useState, useCallback, useMemo } from 'react';

export interface UsePersonaSelectionReturn {
  /** Currently selected persona slugs. */
  selected: Set<string>;
  /** Toggle a persona's selection state. */
  toggle: (slug: string) => void;
  /** Clear all selections. */
  clear: () => void;
  /** Check if a specific persona is selected. */
  isSelected: (slug: string) => boolean;
  /** Number of currently selected personas. */
  selectedCount: number;
  /** Selected slugs as an array (stable reference when contents unchanged). */
  selectedArray: string[];
}

/**
 * Session-scoped persona selection state.
 * Uses a Set<string> internally, emits a custom DOM event on every change
 * so the Action Palette (P7-G) can debounce its palette fetch.
 */
export function usePersonaSelection(): UsePersonaSelectionReturn {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      // Emit custom event for subscribers (Action Palette debounce)
      window.dispatchEvent(new CustomEvent('persona:selection-changed', {
        detail: { selected: Array.from(next) },
      }));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
    window.dispatchEvent(new CustomEvent('persona:selection-changed', {
      detail: { selected: [] },
    }));
  }, []);

  const isSelected = useCallback((slug: string) => selected.has(slug), [selected]);

  const selectedCount = selected.size;

  // Stable array reference — only changes when selection changes
  const selectedArray = useMemo(() => Array.from(selected), [selected]);

  return { selected, toggle, clear, isSelected, selectedCount, selectedArray };
}
