use serde::{Deserialize, Serialize, Serializer};
use super::types::ModelMapping;

#[derive(Clone, Deserialize)]
pub struct ProviderConfig {
    pub api_key: String,
    pub base_url: Option<String>,
    pub model_mappings: ModelMapping,
    pub is_default: bool,
}

// Custom Debug: redact api_key to prevent accidental log exposure
impl std::fmt::Debug for ProviderConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let redacted = if self.api_key.len() > 4 {
            format!("...{}", &self.api_key[self.api_key.len() - 4..])
        } else {
            "****".to_string()
        };
        f.debug_struct("ProviderConfig")
            .field("api_key", &redacted)
            .field("base_url", &self.base_url)
            .field("model_mappings", &self.model_mappings)
            .field("is_default", &self.is_default)
            .finish()
    }
}

// Custom Serialize: redact api_key if this ever reaches the frontend
// TANAKA-HIGH-1: API keys now stored in OS keychain (keychain.rs). Redaction here is defense-in-depth.
impl Serialize for ProviderConfig {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let redacted = if self.api_key.len() > 4 {
            format!("...{}", &self.api_key[self.api_key.len() - 4..])
        } else {
            "****".to_string()
        };
        let mut s = serializer.serialize_struct("ProviderConfig", 4)?;
        s.serialize_field("api_key", &redacted)?;
        s.serialize_field("base_url", &self.base_url)?;
        s.serialize_field("model_mappings", &self.model_mappings)?;
        s.serialize_field("is_default", &self.is_default)?;
        s.end()
    }
}
