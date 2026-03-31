use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CapabilityTier {
    High,
    Medium,
    Fast,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    pub model: String,
    pub tokens_in: Option<u64>,
    pub tokens_out: Option<u64>,
    pub stop_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    pub delta: String,
    pub model: Option<String>,
    pub tokens_in: Option<u64>,
    pub tokens_out: Option<u64>,
    pub done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelMapping {
    pub high: String,
    pub medium: String,
    pub fast: String,
}

impl ModelMapping {
    pub fn get(&self, tier: CapabilityTier) -> &str {
        match tier {
            CapabilityTier::High => &self.high,
            CapabilityTier::Medium => &self.medium,
            CapabilityTier::Fast => &self.fast,
        }
    }
}
