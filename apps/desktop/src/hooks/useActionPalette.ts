// ── useActionPalette — Contextual action resolution from persona selection ──
// P7-G: fetches palette actions on selection change (150ms debounce),
// provides dispatch flow for orchestrators, commands, and sub-agents.

import { useState, useCallback, useEffect, useRef } from 'react';
import type { PaletteResponse, PaletteAction, SpecificationResult } from '../lib/tauri';
import { getPaletteActions, getAgentContent, dispatchAgent, checkSpecification } from '../lib/tauri';

export interface UseActionPaletteReturn {
  /** Resolved palette response (individual + orchestrator actions). */
  actions: PaletteResponse;
  /** True while fetching palette actions. */
  loading: boolean;
  /** Error message if fetch or dispatch failed. */
  error: string | null;
  /** Dispatch an action — loads agent content and fires dispatch_agent.
   *  Pass optional `context` for underspecification gating on orchestrators/commands. */
  dispatch: (action: PaletteAction, context?: string) => Promise<string>;
  /** True while a dispatch is in flight. */
  dispatching: boolean;
  /** Slug of the action currently being dispatched (null if idle). */
  dispatchingSlug: string | null;
  /** Non-null when the last dispatch was blocked by underspecification gating. */
  underspecified: string | null;
  /** Clear the underspecification suggestion. */
  clearUnderspecified: () => void;
  /** Re-trigger the palette fetch (e.g., after error). */
  refresh: () => void;
}

const EMPTY_RESPONSE: PaletteResponse = {
  individual_actions: [],
  orchestrator_actions: [],
};

const DEBOUNCE_MS = 150;

/**
 * Fetches palette actions when persona selection changes, with 150ms debounce.
 * Provides a dispatch function that loads agent markdown and invokes dispatch_agent.
 */
export function useActionPalette(selectedArray: string[]): UseActionPaletteReturn {
  const [actions, setActions] = useState<PaletteResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchingSlug, setDispatchingSlug] = useState<string | null>(null);
  const [underspecified, setUnderspecified] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  // K-MED-2: request counter to discard stale responses from out-of-order resolution
  const fetchIdRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // K-HIGH-1: stabilize dependency — JSON.stringify prevents infinite loop from
  // new array references on each render. Effect only fires when contents change.
  const selectionKey = JSON.stringify(selectedArray);

  // Core fetch logic — extracted for both debounce and manual refresh
  const doFetch = useCallback((slugs: string[]) => {
    const thisId = ++fetchIdRef.current;
    setLoading(true);
    getPaletteActions(slugs)
      .then((response) => {
        // K-MED-2: discard stale response
        if (mountedRef.current && fetchIdRef.current === thisId) {
          setActions(response);
          setError(null);
        }
      })
      .catch((err) => {
        if (mountedRef.current && fetchIdRef.current === thisId) {
          setError(typeof err === 'string' ? err : String(err));
        }
      })
      .finally(() => {
        if (mountedRef.current && fetchIdRef.current === thisId) setLoading(false);
      });
  }, []);

  // Debounced fetch on selection change
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (selectedArray.length === 0) {
      setActions(EMPTY_RESPONSE);
      setLoading(false);
      setError(null);
      return;
    }

    timerRef.current = setTimeout(() => doFetch(selectedArray), DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey, doFetch]);

  // M-HIGH-2: manual refresh for error retry
  const refresh = useCallback(() => {
    if (selectedArray.length > 0) doFetch(selectedArray);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey, doFetch]);

  const clearUnderspecified = useCallback(() => setUnderspecified(null), []);

  // Dispatch: underspecification gate → load agent content → construct DispatchRequest → fire
  // K-HIGH-2: dispatch errors surfaced via `error` state
  const dispatch = useCallback(async (action: PaletteAction, context?: string): Promise<string> => {
    setDispatching(true);
    setDispatchingSlug(action.slug);
    setUnderspecified(null);
    setError(null);
    try {
      // P7-G: underspecification gating for orchestrators and commands
      // Only gate when caller provides explicit context text (e.g., free-text input).
      // Direct palette clicks (no context) are pre-validated by persona selection.
      if (context && (action.action_type === 'orchestrator' || action.action_type === 'command')) {
        const specResult: SpecificationResult = await checkSpecification(context);
        if (specResult.status === 'underspecified') {
          setUnderspecified(specResult.suggestion);
          // K-MED-1: clear dispatching state immediately on underspecified
          setDispatching(false);
          setDispatchingSlug(null);
          return '';
        }
      }

      const systemPrompt = await getAgentContent(action.dispatch_target_slug);
      const dispatchId = await dispatchAgent({
        agent_slug: action.dispatch_target_slug,
        system_prompt: systemPrompt,
        dynamic_context: context
          ? `Dispatched from Action Palette. Action: ${action.name} (${action.action_type}). Context: ${context}`
          : `Dispatched from Action Palette. Action: ${action.name} (${action.action_type}).`,
      });
      return dispatchId;
    } catch (err) {
      // K-HIGH-2: surface dispatch errors to user
      if (mountedRef.current) {
        setError(typeof err === 'string' ? err : String(err));
      }
      return '';
    } finally {
      if (mountedRef.current) {
        setDispatching(false);
        setDispatchingSlug(null);
      }
    }
  }, []);

  return {
    actions, loading, error, dispatch, dispatching, dispatchingSlug,
    underspecified, clearUnderspecified, refresh,
  };
}
