// ── useProposalFeed — Paginated proposal feed with real-time updates ──
// P7-K: follows useConnectivity/useAgentRegistry pattern (cached-then-fresh, event subscription).
// Provides paginated feed entries, filtering, and real-time prepend on new activity.
// K-HIGH-1: entries capped at MAX_ENTRIES to prevent unbounded growth.
// K-HIGH-2: fetchingRef guards concurrent loadMore vs real-time handler.
// K-MED-2: real-time handler debounced (500ms) per useAgentRegistry pattern.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getProposalFeed,
  onProposalFeedUpdated,
  type FeedEntry,
  type ProposalFilter,
} from '../lib/tauri';

export interface UseProposalFeedReturn {
  /** Current page of feed entries (newest first). */
  entries: FeedEntry[];
  /** Whether the initial load is in progress. */
  loading: boolean;
  /** Last error message. */
  error: string | null;
  /** Whether more entries are available beyond the current page. */
  hasMore: boolean;
  /** Load the next page of entries (appends to existing). */
  loadMore: () => Promise<void>;
  /** Reload from page 0 (replaces all entries). */
  refresh: () => Promise<void>;
}

const PAGE_SIZE = 20;
const MAX_ENTRIES = 500;

/**
 * Hook for the proposal feed panel.
 * On mount: loads first page. Subscribes to `proposals:feed-updated` for real-time prepend.
 * Filter changes trigger a full reload from page 0.
 */
export function useProposalFeed(filter?: ProposalFilter): UseProposalFeedReturn {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  // Stable filter reference for use in callbacks (K-MED-1 fix)
  const filterRef = useRef(filter);
  filterRef.current = filter;
  // Snapshot filter for stable comparison — avoids re-fetching when object identity changes
  const filterKey = JSON.stringify(filter ?? {});

  // ── Initial load + filter change reload ──

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      pageRef.current = 0;
      fetchingRef.current = true;

      try {
        const page = await getProposalFeed(0, PAGE_SIZE, filterRef.current);
        if (!cancelled) {
          setEntries(page);
          setHasMore(page.length >= PAGE_SIZE);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      } finally {
        fetchingRef.current = false;
      }
    };

    load();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // ── Subscribe to real-time feed updates ──
  // K-MED-2: 500ms debounce per useAgentRegistry pattern to coalesce burst events.

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const setup = async () => {
      const unsub = await onProposalFeedUpdated(() => {
        if (cancelled || fetchingRef.current) return;
        // Debounce: coalesce rapid feed events into one fetch
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          if (cancelled || !mountedRef.current) return;
          try {
            const fresh = await getProposalFeed(0, PAGE_SIZE, filterRef.current);
            if (!cancelled && mountedRef.current) {
              // K-HIGH-2: reset page to 0 after real-time reload
              pageRef.current = 0;
              setEntries((prev) => {
                const freshIds = new Set(fresh.map(feedEntryId));
                const remaining = prev.filter((e) => !freshIds.has(feedEntryId(e)));
                // K-HIGH-1: cap at MAX_ENTRIES
                return [...fresh, ...remaining].slice(0, MAX_ENTRIES);
              });
              setHasMore(true);
            }
          } catch {
            // Non-fatal: keep existing data
          }
        }, 500);
      });
      unlisten = unsub;
      if (cancelled) unsub();
    };

    setup();
    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // ── Load more (pagination) ──

  const loadMore = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    const nextPage = pageRef.current + 1;
    try {
      const page = await getProposalFeed(nextPage, PAGE_SIZE, filterRef.current);
      if (mountedRef.current) {
        pageRef.current = nextPage;
        setEntries((prev) => {
          const existingIds = new Set(prev.map(feedEntryId));
          const newEntries = page.filter((e) => !existingIds.has(feedEntryId(e)));
          // K-HIGH-1: cap at MAX_ENTRIES
          return [...prev, ...newEntries].slice(0, MAX_ENTRIES);
        });
        setHasMore(page.length >= PAGE_SIZE);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(String(e));
      }
    } finally {
      fetchingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // ── Manual refresh ──

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    pageRef.current = 0;
    fetchingRef.current = true;
    try {
      const page = await getProposalFeed(0, PAGE_SIZE, filterRef.current);
      if (mountedRef.current) {
        setEntries(page);
        setHasMore(page.length >= PAGE_SIZE);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(String(e));
      }
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  return { entries, loading, error, hasMore, loadMore, refresh };
}

// ── Helpers ──

/** Extract a stable ID from a feed entry for deduplication. */
function feedEntryId(entry: FeedEntry): string {
  switch (entry.entry_type) {
    case 'proposal_filed':
      return `p:${entry.proposal.id}`;
    case 'response_added':
      return `r:${entry.response.id}`;
    case 'decision_made':
      return `d:${entry.decision.id}`;
    case 'proposal_dismissed':
      return `dm:${entry.dismissal.id}`;
  }
}
