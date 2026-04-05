// ── Secret Scrubbing for Persisted Payloads ─────────────────────────────────
// P7.5-A: Scans string payloads for known secrets before SQLite persistence.
// Source: OpenHands secret scrubbing pattern.
//
// Loads API keys from OS keychain (providers/keychain.rs) and replaces each
// occurrence with `<secret:provider_id>`. Wired into dispatch_events INSERT
// and mailbox INSERT — every persisted payload is scrubbed.
//
// Gate fixes applied:
// - T-MED-2/K-MED-4: Pre-sorted secret cache rebuilt at registration time.
// - T-MED-3: Provider ID validated (alphanumeric + underscore + hyphen).
// - T-LOW-2: load_from_keychain returns count of loaded secrets.

use std::collections::HashMap;

/// Validates that a secret name contains only safe characters:
/// alphanumeric, underscore, hyphen, period.
fn is_valid_secret_name(name: &str) -> bool {
    !name.is_empty()
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.')
}

/// Holds known secrets and replaces them in string payloads.
pub struct SecretScrubber {
    /// Map of (name → secret_value). Loaded from keychain.
    secrets: HashMap<String, String>,
    /// T-MED-2/K-MED-4: Pre-sorted cache — longest secret first.
    /// Rebuilt on register/load/clear to avoid O(n log n) per scrub().
    sorted_cache: Vec<(String, String)>,
}

impl SecretScrubber {
    /// Create a new scrubber with no secrets loaded.
    pub fn new() -> Self {
        Self {
            secrets: HashMap::new(),
            sorted_cache: Vec::new(),
        }
    }

    /// Rebuild the pre-sorted cache from the secrets HashMap.
    /// Called after any mutation to the secret set.
    fn rebuild_cache(&mut self) {
        let mut sorted: Vec<(String, String)> = self
            .secrets
            .iter()
            .map(|(name, val)| (name.clone(), val.clone()))
            .collect();
        // Sort by value length descending; break ties alphabetically by name
        // for deterministic ordering (T-MED-2).
        sorted.sort_by(|a, b| b.1.len().cmp(&a.1.len()).then_with(|| a.0.cmp(&b.0)));
        self.sorted_cache = sorted;
    }

    /// Load secrets from the OS keychain for the given provider IDs.
    /// T-MED-3: Skips provider IDs that contain invalid characters.
    /// T-LOW-2: Returns the number of secrets successfully loaded.
    pub fn load_from_keychain(&mut self, provider_ids: &[&str]) -> usize {
        let mut loaded = 0;
        for provider_id in provider_ids {
            if !is_valid_secret_name(provider_id) {
                continue; // T-MED-3: reject unsafe names
            }
            match crate::providers::keychain::get_api_key(provider_id) {
                Ok(Some(key)) if !key.is_empty() => {
                    self.secrets.insert(provider_id.to_string(), key);
                    loaded += 1;
                }
                _ => {} // No key stored or keychain error — skip
            }
        }
        self.rebuild_cache();
        loaded
    }

    /// Register a secret manually (e.g., for testing or non-keychain secrets).
    /// T-MED-3: Returns false and does nothing if name contains invalid characters.
    pub fn register(&mut self, name: String, value: String) -> bool {
        if !is_valid_secret_name(&name) || value.is_empty() {
            return false;
        }
        self.secrets.insert(name, value);
        self.rebuild_cache();
        true
    }

    /// Scrub a string payload, replacing all known secret values with
    /// `<secret:name>` placeholders.
    ///
    /// Uses pre-sorted cache (longest-first) to avoid partial replacements.
    pub fn scrub(&self, payload: &str) -> String {
        if self.sorted_cache.is_empty() || payload.is_empty() {
            return payload.to_string();
        }

        let mut result = payload.to_string();
        for (name, secret) in &self.sorted_cache {
            if result.contains(secret.as_str()) {
                result = result.replace(secret.as_str(), &format!("<secret:{}>", name));
            }
        }
        result
    }

    /// Returns the number of secrets currently loaded.
    pub fn secret_count(&self) -> usize {
        self.secrets.len()
    }

    /// Check if the scrubber has any secrets loaded.
    pub fn is_empty(&self) -> bool {
        self.secrets.is_empty()
    }

    /// Clear all loaded secrets (e.g., on keychain rotation).
    pub fn clear(&mut self) {
        self.secrets.clear();
        self.sorted_cache.clear();
    }
}
