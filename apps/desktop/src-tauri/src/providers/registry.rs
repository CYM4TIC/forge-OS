use std::collections::HashMap;
use std::sync::Arc;
use super::traits::ModelProvider;
use super::types::CapabilityTier;

#[derive(Clone)]
pub struct ProviderRegistry {
    providers: HashMap<String, Arc<dyn ModelProvider>>,
    default_id: Option<String>,
}

impl ProviderRegistry {
    pub fn new() -> Self {
        Self {
            providers: HashMap::new(),
            default_id: None,
        }
    }

    pub fn add(&mut self, id: String, provider: Arc<dyn ModelProvider>, is_default: bool) {
        if is_default || self.default_id.is_none() {
            self.default_id = Some(id.clone());
        }
        self.providers.insert(id, provider);
    }

    pub fn remove(&mut self, id: &str) {
        self.providers.remove(id);
        if self.default_id.as_deref() == Some(id) {
            self.default_id = self.providers.keys().next().cloned();
        }
    }

    pub fn get(&self, id: &str) -> Option<&Arc<dyn ModelProvider>> {
        self.providers.get(id)
    }

    pub fn get_default(&self) -> Option<&Arc<dyn ModelProvider>> {
        self.default_id.as_ref().and_then(|id| self.providers.get(id))
    }

    pub fn set_default(&mut self, id: &str) -> bool {
        if self.providers.contains_key(id) {
            self.default_id = Some(id.to_string());
            true
        } else {
            false
        }
    }

    /// Get the best provider for a given capability tier.
    /// Falls back to default if no tier-specific preference.
    pub fn get_for_tier(&self, _tier: CapabilityTier) -> Option<&Arc<dyn ModelProvider>> {
        // For now, all tiers use the default provider.
        // Tier-specific routing (e.g., opus for high, haiku for fast) is handled
        // by the ModelMapping inside each provider, not by switching providers.
        self.get_default()
    }

    pub fn list(&self) -> Vec<(&str, &Arc<dyn ModelProvider>)> {
        self.providers
            .iter()
            .map(|(id, p)| (id.as_str(), p))
            .collect()
    }

    pub fn default_id(&self) -> Option<&str> {
        self.default_id.as_deref()
    }
}
