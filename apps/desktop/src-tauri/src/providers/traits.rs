use async_trait::async_trait;
use super::types::{CapabilityTier, ChatMessage, ChatResponse, StreamChunk};
use tokio::sync::mpsc;

#[async_trait]
pub trait ModelProvider: Send + Sync {
    /// Provider display name (e.g., "Claude", "OpenAI")
    fn name(&self) -> &str;

    /// Whether this provider supports streaming responses
    fn supports_streaming(&self) -> bool;

    /// Maximum context window size in tokens
    fn max_context(&self) -> u64;

    /// Send a message and get a complete response
    async fn send_message(
        &self,
        messages: Vec<ChatMessage>,
        tier: CapabilityTier,
    ) -> Result<ChatResponse, Box<dyn std::error::Error + Send + Sync>>;

    /// Send a message and stream the response chunk by chunk
    async fn stream_message(
        &self,
        messages: Vec<ChatMessage>,
        tier: CapabilityTier,
        tx: mpsc::Sender<StreamChunk>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}
