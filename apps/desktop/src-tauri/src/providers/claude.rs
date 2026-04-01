use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

use super::config::ProviderConfig;
use super::traits::ModelProvider;
use super::types::{CapabilityTier, ChatMessage, ChatResponse, StreamChunk};

pub struct ClaudeProvider {
    client: Client,
    config: ProviderConfig,
}

#[derive(Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u64,
    messages: Vec<ClaudeMessage>,
    stream: bool,
}

#[derive(Serialize)]
struct ClaudeMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ClaudeResponse {
    content: Vec<ContentBlock>,
    model: String,
    usage: Option<Usage>,
    stop_reason: Option<String>,
}

#[derive(Deserialize)]
struct ContentBlock {
    text: Option<String>,
}

#[derive(Deserialize)]
struct Usage {
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
}

// SSE event types for streaming
#[derive(Deserialize)]
#[serde(tag = "type")]
enum StreamEvent {
    #[serde(rename = "message_start")]
    MessageStart { message: MessageStartData },
    #[serde(rename = "content_block_start")]
    ContentBlockStart {},
    #[serde(rename = "content_block_delta")]
    ContentBlockDelta { delta: DeltaData },
    #[serde(rename = "content_block_stop")]
    ContentBlockStop {},
    #[serde(rename = "message_delta")]
    MessageDelta { usage: Option<Usage> },
    #[serde(rename = "message_stop")]
    MessageStop {},
    #[serde(rename = "ping")]
    Ping {},
    #[serde(rename = "error")]
    Error { error: ErrorData },
}

#[derive(Deserialize)]
struct MessageStartData {
    model: Option<String>,
    usage: Option<Usage>,
}

#[derive(Deserialize)]
struct DeltaData {
    text: Option<String>,
}

#[derive(Deserialize)]
struct ErrorData {
    message: String,
}

impl ClaudeProvider {
    pub fn new(config: ProviderConfig) -> Self {
        Self {
            client: Client::new(),
            config,
        }
    }

    fn base_url(&self) -> &str {
        self.config
            .base_url
            .as_deref()
            .unwrap_or("https://api.anthropic.com")
    }

    fn build_messages(&self, messages: &[ChatMessage]) -> Vec<ClaudeMessage> {
        messages
            .iter()
            .filter(|m| m.role != "system")
            .map(|m| ClaudeMessage {
                role: m.role.clone(),
                content: m.content.clone(),
            })
            .collect()
    }

    fn get_system(&self, messages: &[ChatMessage]) -> Option<String> {
        messages
            .iter()
            .find(|m| m.role == "system")
            .map(|m| m.content.clone())
    }
}

#[async_trait]
impl ModelProvider for ClaudeProvider {
    fn name(&self) -> &str {
        "Claude"
    }

    fn supports_streaming(&self) -> bool {
        true
    }

    fn max_context(&self) -> u64 {
        200_000
    }

    async fn send_message(
        &self,
        messages: Vec<ChatMessage>,
        tier: CapabilityTier,
    ) -> Result<ChatResponse, Box<dyn std::error::Error + Send + Sync>> {
        let model = self.config.model_mappings.get(tier).to_string();
        let claude_messages = self.build_messages(&messages);

        let mut body = serde_json::json!({
            "model": model,
            "max_tokens": 4096,
            "messages": claude_messages,
        });

        if let Some(system) = self.get_system(&messages) {
            body["system"] = serde_json::Value::String(system);
        }

        let resp = self
            .client
            .post(format!("{}/v1/messages", self.base_url()))
            .header("x-api-key", &self.config.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Claude API error {}: {}", status, text).into());
        }

        let data: ClaudeResponse = resp.json().await?;
        let content = data
            .content
            .into_iter()
            .filter_map(|b| b.text)
            .collect::<Vec<_>>()
            .join("");

        Ok(ChatResponse {
            content,
            model: data.model,
            tokens_in: data.usage.as_ref().and_then(|u| u.input_tokens),
            tokens_out: data.usage.as_ref().and_then(|u| u.output_tokens),
            stop_reason: data.stop_reason,
        })
    }

    async fn stream_message(
        &self,
        messages: Vec<ChatMessage>,
        tier: CapabilityTier,
        tx: mpsc::Sender<StreamChunk>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let model = self.config.model_mappings.get(tier).to_string();
        let claude_messages = self.build_messages(&messages);

        let mut body = serde_json::json!({
            "model": model,
            "max_tokens": 4096,
            "messages": claude_messages,
            "stream": true,
        });

        if let Some(system) = self.get_system(&messages) {
            body["system"] = serde_json::Value::String(system);
        }

        let resp = self
            .client
            .post(format!("{}/v1/messages", self.base_url()))
            .header("x-api-key", &self.config.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Claude API error {}: {}", status, text).into());
        }

        let mut stream_model = String::new();
        let mut total_in: Option<u64> = None;
        let mut total_out: Option<u64> = None;

        // Stream SSE events incrementally via bytes_stream
        use futures::StreamExt;
        let mut stream = resp.bytes_stream();
        let mut buffer = String::new();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.into() })?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            // Process all complete SSE lines in the buffer
            while let Some(pos) = buffer.find('\n') {
                let line = buffer[..pos].trim().to_string();
                buffer = buffer[pos + 1..].to_string();

                if !line.starts_with("data: ") {
                    continue;
                }
                let json_str = &line[6..];
                if json_str == "[DONE]" {
                    break;
                }

                if let Ok(event) = serde_json::from_str::<StreamEvent>(json_str) {
                    match event {
                        StreamEvent::MessageStart { message } => {
                            if let Some(m) = message.model {
                                stream_model = m;
                            }
                            if let Some(u) = message.usage {
                                total_in = u.input_tokens;
                            }
                        }
                        StreamEvent::ContentBlockDelta { delta } => {
                            if let Some(text) = delta.text {
                                let _ = tx
                                    .send(StreamChunk {
                                        delta: text,
                                        model: Some(stream_model.clone()),
                                        tokens_in: None,
                                        tokens_out: None,
                                        done: false,
                                    })
                                    .await;
                            }
                        }
                        StreamEvent::MessageDelta { usage } => {
                            if let Some(u) = usage {
                                total_out = u.output_tokens;
                            }
                        }
                        StreamEvent::MessageStop {} => {
                            let _ = tx
                                .send(StreamChunk {
                                    delta: String::new(),
                                    model: Some(stream_model.clone()),
                                    tokens_in: total_in,
                                    tokens_out: total_out,
                                    done: true,
                                })
                                .await;
                        }
                        StreamEvent::Error { error } => {
                            return Err(format!("Claude stream error: {}", error.message).into());
                        }
                        _ => {}
                    }
                }
            }
        }

        Ok(())
    }
}
