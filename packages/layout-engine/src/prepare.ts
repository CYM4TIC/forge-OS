/**
 * Batch text preparation with font caching and memoization.
 * Wraps @chenglou/pretext prepare() with Forge OS conventions.
 *
 * Two-phase design: prepare() is the expensive step (~19ms/500 texts).
 * Cache PreparedText results aggressively — layout() is <0.1ms with cached input.
 */

import {
  prepare as pretextPrepare,
  prepareWithSegments as pretextPrepareWithSegments,
  clearCache as pretextClearCache,
  setLocale as pretextSetLocale,
} from '@chenglou/pretext';
import type { PreparedText, PreparedTextWithSegments } from '@chenglou/pretext';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PrepareOptions {
  /** CSS font shorthand — e.g. "16px Inter", "bold 14px Arial" */
  font: string;
  /** White-space handling. Defaults to 'normal'. */
  whiteSpace?: 'normal' | 'pre-wrap';
}

export interface BatchPrepareItem {
  /** Unique key for cache lookup */
  key: string;
  /** Text content to prepare */
  text: string;
}

export interface BatchPrepareResult {
  /** Map of key → PreparedText for use with measure/layout */
  prepared: Map<string, PreparedText>;
  /** Map of key → PreparedTextWithSegments for use with advanced layout */
  segments: Map<string, PreparedTextWithSegments>;
  /** Number of cache hits (skipped re-preparation) */
  cacheHits: number;
  /** Total items processed */
  total: number;
}

// ─── Font Cache ──────────────────────────────────────────────────────────────

/**
 * LRU-style cache for prepared text. Keyed by `${font}::${text}::${whiteSpace}`.
 * Prevents redundant canvas.measureText() calls across re-renders.
 */
const preparedCache = new Map<string, PreparedText>();
const segmentsCache = new Map<string, PreparedTextWithSegments>();

const MAX_CACHE_SIZE = 2000;

function cacheKey(text: string, font: string, whiteSpace: string): string {
  return `${font}::${whiteSpace}::${text}`;
}

function evictIfNeeded(cache: Map<string, unknown>): void {
  if (cache.size > MAX_CACHE_SIZE) {
    // Drop oldest 25% (simple eviction — not true LRU, but sufficient)
    const dropCount = Math.floor(MAX_CACHE_SIZE * 0.25);
    const keys = cache.keys();
    for (let i = 0; i < dropCount; i++) {
      const next = keys.next();
      if (next.done) break;
      cache.delete(next.value);
    }
  }
}

// ─── Single Prepare ──────────────────────────────────────────────────────────

/**
 * Prepare a single text block. Returns cached result if available.
 */
export function prepareSingle(
  text: string,
  options: PrepareOptions,
): PreparedText {
  const ws = options.whiteSpace ?? 'normal';
  const key = cacheKey(text, options.font, ws);

  const cached = preparedCache.get(key);
  if (cached) return cached;

  const result = pretextPrepare(text, options.font, { whiteSpace: ws });
  evictIfNeeded(preparedCache);
  preparedCache.set(key, result);
  return result;
}

/**
 * Prepare a single text block with segment data (for advanced layout).
 */
export function prepareSingleWithSegments(
  text: string,
  options: PrepareOptions,
): PreparedTextWithSegments {
  const ws = options.whiteSpace ?? 'normal';
  const key = cacheKey(text, options.font, ws);

  const cached = segmentsCache.get(key);
  if (cached) return cached;

  const result = pretextPrepareWithSegments(text, options.font, { whiteSpace: ws });
  evictIfNeeded(segmentsCache);
  segmentsCache.set(key, result);
  return result;
}

// ─── Batch Prepare ───────────────────────────────────────────────────────────

/**
 * Prepare multiple text blocks in one pass. Deduplicates and caches.
 * Use for list rendering — prepare all visible items, then measure on resize.
 */
export function batchPrepare(
  items: BatchPrepareItem[],
  options: PrepareOptions,
): BatchPrepareResult {
  const prepared = new Map<string, PreparedText>();
  const segments = new Map<string, PreparedTextWithSegments>();
  let cacheHits = 0;

  for (const item of items) {
    const ws = options.whiteSpace ?? 'normal';
    const ck = cacheKey(item.text, options.font, ws);

    // PreparedText (always)
    let pt = preparedCache.get(ck);
    if (pt) {
      cacheHits++;
    } else {
      pt = pretextPrepare(item.text, options.font, { whiteSpace: ws });
      evictIfNeeded(preparedCache);
      preparedCache.set(ck, pt);
    }
    prepared.set(item.key, pt);

    // PreparedTextWithSegments (always — needed for fit/canvas render)
    let seg = segmentsCache.get(ck);
    if (!seg) {
      seg = pretextPrepareWithSegments(item.text, options.font, { whiteSpace: ws });
      evictIfNeeded(segmentsCache);
      segmentsCache.set(ck, seg);
    }
    segments.set(item.key, seg);
  }

  return { prepared, segments, cacheHits, total: items.length };
}

// ─── Cache Management ────────────────────────────────────────────────────────

/** Clear all cached prepared text. Call when fonts change. */
export function clearPrepareCache(): void {
  preparedCache.clear();
  segmentsCache.clear();
  pretextClearCache();
}

/** Set locale for Intl.Segmenter used by pretext. Also clears cache. */
export function setTextLocale(locale?: string): void {
  pretextSetLocale(locale);
  preparedCache.clear();
  segmentsCache.clear();
}

/** Current cache size (for diagnostics). */
export function getCacheStats(): { prepared: number; segments: number; maxSize: number } {
  return {
    prepared: preparedCache.size,
    segments: segmentsCache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}
