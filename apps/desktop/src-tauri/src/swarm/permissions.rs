use rusqlite::Connection;
use uuid::Uuid;

use super::mailbox;
use super::types::{SwarmMessageType, PermissionRequestPayload, PermissionResponsePayload, SwarmMessage};

/// Send a permission request from a worker to a leader agent.
/// Returns the request message ID (needed for matching the response).
pub fn request_permission(
    conn: &Connection,
    from_agent: &str,
    to_agent: &str,
    action: &str,
    target: &str,
    reason: &str,
    is_destructive: bool,
) -> Result<String, String> {
    let payload = PermissionRequestPayload {
        action: action.to_string(),
        target: target.to_string(),
        reason: reason.to_string(),
        is_destructive,
    };
    let payload_json = serde_json::to_string(&payload)
        .map_err(|e| format!("Failed to serialize permission request: {}", e))?;

    let id = Uuid::new_v4().to_string();
    mailbox::send_message(conn, &id, from_agent, to_agent, &SwarmMessageType::PermissionRequest, &payload_json)
        .map_err(|e| format!("Failed to send permission request: {}", e))?;

    Ok(id)
}

/// Respond to a permission request (approve or deny).
/// Marks the original request as read and sends a response message.
pub fn respond_permission(
    conn: &Connection,
    request_id: &str,
    responder_agent: &str,
    approved: bool,
    reason: Option<&str>,
) -> Result<String, String> {
    // Get the original request to find who sent it
    let request = mailbox::get_message(conn, request_id)
        .map_err(|e| format!("Failed to get request: {}", e))?
        .ok_or_else(|| format!("Permission request '{}' not found", request_id))?;

    if request.msg_type != SwarmMessageType::PermissionRequest.as_str() {
        return Err(format!("Message '{}' is not a permission_request", request_id));
    }

    // Mark request as read
    mailbox::mark_read(conn, request_id)
        .map_err(|e| format!("Failed to mark request read: {}", e))?;

    // Send response back to the requester
    let payload = PermissionResponsePayload {
        request_id: request_id.to_string(),
        approved,
        reason: reason.map(|s| s.to_string()),
    };
    let payload_json = serde_json::to_string(&payload)
        .map_err(|e| format!("Failed to serialize permission response: {}", e))?;

    let response_id = Uuid::new_v4().to_string();
    mailbox::send_message(
        conn,
        &response_id,
        responder_agent,
        &request.from_agent,
        &SwarmMessageType::PermissionResponse,
        &payload_json,
    )
    .map_err(|e| format!("Failed to send permission response: {}", e))?;

    Ok(response_id)
}

/// Check if a permission request has been responded to.
/// Returns the response message if found.
pub fn get_permission_response(
    conn: &Connection,
    request_id: &str,
) -> Result<Option<SwarmMessage>, String> {
    // Look for a permission_response with matching request_id in payload
    let messages = mailbox::get_messages(conn, "", false, None)
        .map_err(|e| format!("Failed to query messages: {}", e))?;

    // Search through responses for one matching this request_id
    for msg in messages {
        if msg.msg_type == SwarmMessageType::PermissionResponse.as_str() {
            if let Ok(payload) = serde_json::from_str::<PermissionResponsePayload>(&msg.payload) {
                if payload.request_id == request_id {
                    return Ok(Some(msg));
                }
            }
        }
    }

    Ok(None)
}
