use async_trait::async_trait;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;

use super::traits::ModelProvider;
use super::types::{CapabilityTier, ChatMessage, ChatResponse, StreamChunk, CLAUDE_OPUS, CLAUDE_SONNET};

/// Provider that shells to the locally installed `claude` CLI.
/// Uses the operator's existing Claude Max plan — no API key required.
/// Falls back gracefully if the CLI is not installed.
pub struct ClaudeCodeProvider {
    claude_path: String,
}

impl ClaudeCodeProvider {
    pub fn new() -> Self {
        Self {
            claude_path: "claude".to_string(),
        }
    }

    pub fn with_path(path: String) -> Self {
        Self { claude_path: path }
    }

    /// Check if the claude CLI is available on this system.
    pub async fn is_available(&self) -> bool {
        Command::new(&self.claude_path)
            .arg("--version")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .await
            .map(|s| s.success())
            .unwrap_or(false)
    }

    /// Build a single prompt string from conversation history.
    /// claude -p takes a single prompt, so we format multi-turn as context.
    fn build_prompt(messages: &[ChatMessage]) -> String {
        let mut parts: Vec<String> = Vec::new();

        for msg in messages {
            match msg.role.as_str() {
                "system" => {
                    parts.push(format!("<system>\n{}\n</system>", msg.content));
                }
                "user" => {
                    parts.push(msg.content.clone());
                }
                "assistant" => {
                    parts.push(format!(
                        "<previous-response>\n{}\n</previous-response>",
                        msg.content
                    ));
                }
                _ => {}
            }
        }

        parts.join("\n\n")
    }

    /// Map capability tier to a claude CLI model flag.
    fn tier_to_model(tier: CapabilityTier) -> &'static str {
        match tier {
            CapabilityTier::High => CLAUDE_OPUS,
            CapabilityTier::Medium => CLAUDE_SONNET,
            // CLI uses shorter haiku model name (no date suffix)
            CapabilityTier::Fast => "claude-haiku-4-5",
        }
    }
}

#[async_trait]
impl ModelProvider for ClaudeCodeProvider {
    fn name(&self) -> &str {
        "Claude Code"
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
        let prompt = Self::build_prompt(&messages);
        let model = Self::tier_to_model(tier);

        let output = Command::new(&self.claude_path)
            .arg("-p")
            .arg(&prompt)
            .arg("--model")
            .arg(model)
            .arg("--output-format")
            .arg("text")
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .output()
            .await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Claude Code CLI error: {}", stderr).into());
        }

        let content = String::from_utf8_lossy(&output.stdout).trim().to_string();

        Ok(ChatResponse {
            content,
            model: model.to_string(),
            tokens_in: None,
            tokens_out: None,
            stop_reason: Some("end_turn".to_string()),
        })
    }

    async fn stream_message(
        &self,
        messages: Vec<ChatMessage>,
        tier: CapabilityTier,
        tx: mpsc::Sender<StreamChunk>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let prompt = Self::build_prompt(&messages);
        let model = Self::tier_to_model(tier);

        let mut child = Command::new(&self.claude_path)
            .arg("-p")
            .arg(&prompt)
            .arg("--model")
            .arg(model)
            .arg("--output-format")
            .arg("text")
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()?;

        let stdout = child.stdout.take().ok_or("Failed to capture claude stdout")?;
        let mut reader = BufReader::new(stdout).lines();

        while let Some(line) = reader.next_line().await? {
            let _ = tx
                .send(StreamChunk {
                    delta: format!("{}\n", line),
                    model: Some(model.to_string()),
                    tokens_in: None,
                    tokens_out: None,
                    done: false,
                })
                .await;
        }

        // Wait for process to complete
        let status = child.wait().await?;
        if !status.success() {
            // Read stderr for error context
            let mut stderr_output = String::new();
            if let Some(mut stderr) = child.stderr.take() {
                use tokio::io::AsyncReadExt;
                let _ = stderr.read_to_string(&mut stderr_output).await;
            }
            return Err(format!("Claude Code CLI failed: {}", stderr_output).into());
        }

        // Send done signal
        let _ = tx
            .send(StreamChunk {
                delta: String::new(),
                model: Some(model.to_string()),
                tokens_in: None,
                tokens_out: None,
                done: true,
            })
            .await;

        Ok(())
    }
}
