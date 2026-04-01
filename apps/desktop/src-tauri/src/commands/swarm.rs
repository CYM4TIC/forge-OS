use serde::Deserialize;
use tauri::{Emitter, State};
use uuid::Uuid;

use crate::database::Database;
use crate::swarm::{mailbox, permissions, team_file, types::{SwarmMessage, SwarmMessageType, SwarmMessageEvent}};

// ── Send message ──

#[derive(Debug, Deserialize)]
pub struct SwarmSendRequest {
    pub from_agent: String,
    pub to_agent: String,
    pub msg_type: String,
    pub payload: Option<String>,
}

#[tauri::command]
pub fn swarm_send(
    app_handle: tauri::AppHandle,
    db: State<'_, Database>,
    request: SwarmSendRequest,
) -> Result<String, String> {
    let msg_type = SwarmMessageType::from_str(&request.msg_type)
        .ok_or_else(|| format!("Invalid msg_type: '{}'. Must be one of: permission_request, permission_response, idle_notification, shutdown_signal, direct_message", request.msg_type))?;

    // Validate agent identifiers against team roster
    let team = team_file::load_team_config(&db).map_err(|e| e.to_string())?;
    if team.get_member(&request.from_agent).is_none() {
        return Err(format!("Unknown agent: '{}'", request.from_agent));
    }
    if team.get_member(&request.to_agent).is_none() {
        return Err(format!("Unknown agent: '{}'", request.to_agent));
    }

    let payload = request.payload.unwrap_or_else(|| "{}".to_string());
    let id = Uuid::new_v4().to_string();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    mailbox::send_message(&conn, &id, &request.from_agent, &request.to_agent, &msg_type, &payload)
        .map_err(|e| e.to_string())?;

    // Emit Tauri event for real-time UI updates
    let message = SwarmMessage {
        id: id.clone(),
        from_agent: request.from_agent,
        to_agent: request.to_agent,
        msg_type: request.msg_type,
        payload,
        is_read: false,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    let _ = app_handle.emit("swarm-message", SwarmMessageEvent { message });

    Ok(id)
}

// ── Get messages ──

#[derive(Debug, Deserialize)]
pub struct SwarmGetMessagesRequest {
    pub to_agent: String,
    pub unread_only: Option<bool>,
    pub limit: Option<u32>,
}

#[tauri::command]
pub fn swarm_get_messages(
    db: State<'_, Database>,
    request: SwarmGetMessagesRequest,
) -> Result<Vec<SwarmMessage>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    mailbox::get_messages(
        &conn,
        &request.to_agent,
        request.unread_only.unwrap_or(false),
        request.limit,
    )
    .map_err(|e| e.to_string())
}

// ── Mark read ──

#[tauri::command]
pub fn swarm_mark_read(
    db: State<'_, Database>,
    message_id: String,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    mailbox::mark_read(&conn, &message_id).map_err(|e| e.to_string())
}

// ── Respond to permission request ──

#[derive(Debug, Deserialize)]
pub struct SwarmRespondPermissionRequest {
    pub request_id: String,
    pub responder_agent: String,
    pub approved: bool,
    pub reason: Option<String>,
}

#[tauri::command]
pub fn swarm_respond_permission(
    app_handle: tauri::AppHandle,
    db: State<'_, Database>,
    request: SwarmRespondPermissionRequest,
) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let response_id = permissions::respond_permission(
        &conn,
        &request.request_id,
        &request.responder_agent,
        request.approved,
        request.reason.as_deref(),
    )?;

    // Emit event for the response
    if let Ok(Some(msg)) = mailbox::get_message(&conn, &response_id) {
        let _ = app_handle.emit("swarm-message", SwarmMessageEvent { message: msg });
    }

    Ok(response_id)
}
