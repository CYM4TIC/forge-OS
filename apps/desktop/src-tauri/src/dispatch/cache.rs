use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;

/// Prompt cache for agent dispatch.
/// Caches the static portion of system prompts (above the dynamic boundary)
/// so multiple forked agents sharing the same base prompt get cache hits.
///
/// Keyed by content hash of the static prompt section.
pub struct PromptCache {
    entries: HashMap<u64, CacheEntry>,
}

#[derive(Debug, Clone)]
pub struct CacheEntry {
    /// The cached static prompt content.
    pub content: String,
    /// Number of cache hits.
    pub hits: u64,
    /// When this entry was last accessed (epoch ms).
    pub last_accessed_ms: u64,
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
    pub fn get(&mut self, static_prompt: &str) -> Option<&CacheEntry> {
        let key = Self::hash_key(static_prompt);
        if let Some(entry) = self.entries.get_mut(&key) {
            entry.hits += 1;
            entry.last_accessed_ms = now_ms();
            // Return immutable ref by re-borrowing
            self.entries.get(&key)
        } else {
            None
        }
    }

    /// Store a prompt in the cache.
    pub fn put(&mut self, static_prompt: &str) {
        let key = Self::hash_key(static_prompt);
        self.entries.insert(key, CacheEntry {
            content: static_prompt.to_string(),
            hits: 0,
            last_accessed_ms: now_ms(),
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
        self.entries.retain(|_, entry| entry.last_accessed_ms >= cutoff);
    }
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
