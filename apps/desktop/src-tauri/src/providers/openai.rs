use async_trait::async_trait;
use reqwest::Client;
use serde::Deserialize;
use tokio::sync::mpsc;

use super::config::ProviderConfig;
use super::traits::ModelProvider;
use super::types::{CapabilityTier, ChatMessage, ChatResponse, StreamChunk};

/// OpenAI-compatible provider. Works with OpenAI, Gemini, Mistral,
/// and any API that follows the OpenAI chat completions shape.
pub struct OpenAIProvider {
    client: Client,
    config: ProviderConfig,
    display_name: String,
}

#[derive(Deserialize)]
struct OAIResponse {
    choices: Vec<OAIChoice>,
    model: Option<String>,
    usage: Option<OAIUsage>,
}

#[derive(Deserialize)]
struct OAIChoice {
    message: Option<OAIMessage>,
    delta: Option<OAIDelta>,
    finish_reason: Option<String>,
}

#[derive(Deserialize)]
struct OAIMessage {
    content: Option<String>,
}

#[derive(Deserialize)]
struct OAIDelta {
    content: Option<String>,
}

#[derive(Deserialize)]
struct OAIUsage {
    prompt_tokens: Option<u64>,
    completion_tokens: Option<u64>,
}

impl OpenAIProvider {
    pub fn new(config: ProviderConfig, display_name: Option<String>) -> Self {
        Self {
            client: Client::new(),
            display_name: display_name.unwrap_or_else(|| "OpenAI".to_string()),
            config,
        }
    }

    fn base_url(&self) -> &str {
        self.config
            .base_url
            .as_deref()
            .unwrap_or("https://api.openai.com")
    }
}

#[async_trait]
impl ModelProvider for OpenAIProvider {
    fn name(&self) -> &str {
        &self.display_name
    }

    fn supports_streaming(&self) -> bool {
        true
    }

    fn max_context(&self) -> u64 {
        128_000
    }

    async fn send_message(
        &self,
        messages: Vec<ChatMessage>,
        tier: CapabilityTier,
    ) -> Result<ChatResponse, Box<dyn std::error::Error + Send + Sync>> {
        let model = self.config.model_mappings.get(tier).to_string();

        let oai_messages: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| {
                serde_json::json!({
                    "role": m.role,
                    "content": m.content,
                })
            })
            .collect();

        let body = serde_json::json!({
            "model": model,
            "messages": oai_messages,
        });

        let resp = self
            .client
            .post(format!("{}/v1/chat/completions", self.base_url()))
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("{} API error {}: {}", self.display_name, status, text).into());
        }

        let data: OAIResponse = resp.json().await?;
        let choice = data.choices.first();
        let content = choice
            .and_then(|c| c.message.as_ref())
            .and_then(|m| m.content.clone())
            .unwrap_or_default();

        Ok(ChatResponse {
            content,
            model: data.model.unwrap_or(model),
            tokens_in: data.usage.as_ref().and_then(|u| u.prompt_tokens),
            tokens_out: data.usage.as_ref().and_then(|u| u.completion_tokens),
            stop_reason: choice.and_then(|c| c.finish_reason.clone()),
        })
    }

    async fn stream_message(
        &self,
        messages: Vec<ChatMessage>,
        tier: CapabilityTier,
        tx: mpsc::Sender<StreamChunk>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let model = self.config.model_mappings.get(tier).to_string();

        let oai_messages: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| {
                serde_json::json!({
                    "role": m.role,
                    "content": m.content,
                })
            })
            .collect();

        let body = serde_json::json!({
            "model": model,
            "messages": oai_messages,
            "stream": true,
        });

        let resp = self
            .client
            .post(format!("{}/v1/chat/completions", self.base_url()))
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("{} API error {}: {}", self.display_name, status, text).into());
        }

        // Stream SSE events incrementally via bytes_stream
        use futures::StreamExt;
        let mut stream = resp.bytes_stream();
        let mut buffer = String::new();
        let mut stream_model = model;

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.into() })?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(pos) = buffer.find('\n') {
                let line = buffer[..pos].trim().to_string();
                buffer = buffer[pos + 1..].to_string();

                if !line.starts_with("data: ") {
                    continue;
                }
                let json_str = &line[6..];
                if json_str == "[DONE]" {
                    let _ = tx
                        .send(StreamChunk {
                            delta: String::new(),
                            model: Some(stream_model.clone()),
                            tokens_in: None,
                            tokens_out: None,
                            done: true,
                        })
                        .await;
                    return Ok(());
                }

                if let Ok(data) = serde_json::from_str::<OAIResponse>(json_str) {
                    if let Some(m) = &data.model {
                        stream_model = m.clone();
                    }
                    if let Some(choice) = data.choices.first() {
                        if let Some(delta) = &choice.delta {
                            if let Some(text) = &delta.content {
                                let _ = tx
                                    .send(StreamChunk {
                                        delta: text.clone(),
                                        model: Some(stream_model.clone()),
                                        tokens_in: None,
                                        tokens_out: None,
                                        done: false,
                                    })
                                    .await;
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }
}
