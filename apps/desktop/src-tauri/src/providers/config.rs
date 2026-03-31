use serde::{Deserialize, Serialize};
use super::types::ModelMapping;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub api_key: String,
    pub base_url: Option<String>,
    pub model_mappings: ModelMapping,
    pub is_default: bool,
}
