use serde::{Deserialize, Serialize};
use crate::commands::capabilities::CapabilityFamily;

/// Request to dispatch a forked agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRequest {
    /// Unique dispatch ID (UUID).
    pub dispatch_id: String,
    /// Agent slug (e.g., "pierce", "scout", "triad").
    pub agent_slug: String,
    /// System prompt for the agent (static portion — cacheable).
    pub system_prompt: String,
    /// Dynamic context appended after the cache boundary.
    pub dynamic_context: Option<String>,
    /// Messages to seed the agent conversation.
    pub messages: Vec<AgentMessage>,
    /// Model tier override (defaults to agent's configured tier).
    pub tier: Option<String>,
    /// Provider ID override (defaults to system default).
    pub provider_id: Option<String>,
    /// Timeout in milliseconds (defaults to AGENT_BACKGROUND_TIMEOUT_MS).
    pub timeout_ms: Option<u64>,
    /// Capability families granted for this dispatch.
    /// Defaults to ReadOnly if not specified.
    #[serde(default)]
    pub granted_capabilities: Vec<CapabilityFamily>,
}

/// A message in an agent conversation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    pub role: String,
    pub content: String,
}

/// Result returned when an agent completes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResult {
    pub dispatch_id: String,
    pub agent_slug: String,
    pub content: String,
    pub model: Option<String>,
    pub tokens_in: Option<u64>,
    pub tokens_out: Option<u64>,
    pub duration_ms: u64,
    pub status: AgentStatus,
    pub error: Option<String>,
}

/// Agent lifecycle status.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentStatus {
    Queued,
    Running,
    Complete,
    Error,
    Timeout,
    Cancelled,
}

impl std::fmt::Display for AgentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Queued => write!(f, "queued"),
            Self::Running => write!(f, "running"),
            Self::Complete => write!(f, "complete"),
            Self::Error => write!(f, "error"),
            Self::Timeout => write!(f, "timeout"),
            Self::Cancelled => write!(f, "cancelled"),
        }
    }
}

/// Configuration constants for agent dispatch.
pub const AGENT_BACKGROUND_TIMEOUT_MS: u64 = 120_000;
pub const MAX_CONCURRENT_AGENTS: usize = 10;

/// Dispatch configuration (per-request overrides).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DispatchConfig {
    pub max_concurrent: usize,
    pub default_timeout_ms: u64,
}

impl Default for DispatchConfig {
    fn default() -> Self {
        Self {
            max_concurrent: MAX_CONCURRENT_AGENTS,
            default_timeout_ms: AGENT_BACKGROUND_TIMEOUT_MS,
        }
    }
}
