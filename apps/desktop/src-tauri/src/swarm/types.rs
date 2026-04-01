use serde::{Deserialize, Serialize};

/// The 5 swarm message types.
/// Matches CHECK constraint on mailbox.msg_type.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SwarmMessageType {
    PermissionRequest,
    PermissionResponse,
    IdleNotification,
    ShutdownSignal,
    DirectMessage,
}

impl SwarmMessageType {
    pub fn as_str(&self) -> &'static str {
        match self {
            SwarmMessageType::PermissionRequest => "permission_request",
            SwarmMessageType::PermissionResponse => "permission_response",
            SwarmMessageType::IdleNotification => "idle_notification",
            SwarmMessageType::ShutdownSignal => "shutdown_signal",
            SwarmMessageType::DirectMessage => "direct_message",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "permission_request" => Some(SwarmMessageType::PermissionRequest),
            "permission_response" => Some(SwarmMessageType::PermissionResponse),
            "idle_notification" => Some(SwarmMessageType::IdleNotification),
            "shutdown_signal" => Some(SwarmMessageType::ShutdownSignal),
            "direct_message" => Some(SwarmMessageType::DirectMessage),
            _ => None,
        }
    }
}

/// A single mailbox message row from SQLite.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwarmMessage {
    pub id: String,
    pub from_agent: String,
    pub to_agent: String,
    pub msg_type: String,
    pub payload: String,
    pub is_read: bool,
    pub created_at: String,
}

/// Payload for permission_request messages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionRequestPayload {
    pub action: String,
    pub target: String,
    pub reason: String,
    pub is_destructive: bool,
}

/// Payload for permission_response messages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionResponsePayload {
    pub request_id: String,
    pub approved: bool,
    pub reason: Option<String>,
}

/// Tauri event payload emitted on new messages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwarmMessageEvent {
    pub message: SwarmMessage,
}
