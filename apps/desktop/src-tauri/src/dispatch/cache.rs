use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;
use std::sync::atomic::{AtomicU64, Ordering};

/// Prompt cache for agent dispatch.
/// Caches the static portion of system prompts (above the dynamic boundary)
/// so multiple forked agents sharing the same base prompt get cache hits.
///
/// Keyed by content hash of the static prompt section.
/// Cache currently used for dedup detection only (contains check).
/// Content storage preserved for future prompt reuse optimization.
pub struct PromptCache {
    entries: HashMap<u64, CacheEntry>,
}

#[derive(Debug)]
pub struct CacheEntry {
    /// The cached static prompt content.
    pub content: String,
    /// Number of cache hits (atomic for lock-free increment).
    pub hits: AtomicU64,
    /// When this entry was last accessed (epoch ms, atomic for lock-free update).
    pub last_accessed_ms: AtomicU64,
}

impl PromptCache {
    pub fn new() -> Self {
        Self {
            entries: HashMap::new(),
        }
    }

    /// Compute a hash key for a prompt string.
    fn hash_key(content: &str) -> u64 {
        let mut hasher = DefaultHasher::new();
        content.hash(&mut hasher);
        hasher.finish()
    }

    /// Get a cached prompt by its static content hash, or None if not cached.
    /// Takes &self (not &mut self) — hit counting uses atomics.
    pub fn get(&self, static_prompt: &str) -> Option<&CacheEntry> {
        let key = Self::hash_key(static_prompt);
        if let Some(entry) = self.entries.get(&key) {
            entry.hits.fetch_add(1, Ordering::Relaxed);
            entry.last_accessed_ms.store(now_ms(), Ordering::Relaxed);
            Some(entry)
        } else {
            None
        }
    }

    /// Store a prompt in the cache.
    pub fn put(&mut self, static_prompt: &str) {
        let key = Self::hash_key(static_prompt);
        self.entries.insert(key, CacheEntry {
            content: static_prompt.to_string(),
            hits: AtomicU64::new(0),
            last_accessed_ms: AtomicU64::new(now_ms()),
        });
    }

    /// Check if a prompt is already cached.
    pub fn contains(&self, static_prompt: &str) -> bool {
        let key = Self::hash_key(static_prompt);
        self.entries.contains_key(&key)
    }

    /// Number of cached prompts.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Remove entries not accessed in the last `max_age_ms` milliseconds.
    pub fn evict_stale(&mut self, max_age_ms: u64) {
        let cutoff = now_ms().saturating_sub(max_age_ms);
        self.entries.retain(|_, entry| entry.last_accessed_ms.load(Ordering::Relaxed) >= cutoff);
    }
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
