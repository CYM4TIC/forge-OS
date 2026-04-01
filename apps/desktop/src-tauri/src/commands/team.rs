use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

use crate::database::Database;
use crate::database::checkpoints::{self, CheckpointRow, ResumeCandidate};
use crate::swarm::team_file::{self, TeamFile, TeamMemberUpdate};

// ── Team config commands ──

#[tauri::command]
pub fn get_team_config(db: State<'_, Database>) -> Result<TeamFile, String> {
    team_file::load_team_config(&db)
}

#[derive(Debug, Deserialize)]
pub struct UpdateTeamMemberRequest {
    pub agent_id: String,
    pub model: Option<String>,
    pub is_active: Option<bool>,
    pub color: Option<String>,
    pub subscriptions: Option<Vec<String>>,
    pub permission_mode: Option<team_file::PermissionMode>,
}

#[tauri::command]
pub fn update_team_member(
    db: State<'_, Database>,
    request: UpdateTeamMemberRequest,
) -> Result<TeamFile, String> {
    let updates = TeamMemberUpdate {
        model: request.model,
        is_active: request.is_active,
        color: request.color,
        subscriptions: request.subscriptions,
        permission_mode: request.permission_mode,
    };
    team_file::update_team_member(&db, &request.agent_id, updates)
}

// ── Session checkpoint commands ──

#[derive(Debug, Deserialize)]
pub struct SaveCheckpointRequest {
    pub session_id: String,
    pub message_count: i64,
    pub last_message_id: Option<String>,
    pub context_tokens: Option<i64>,
    pub checkpoint_data: String,
}

#[tauri::command]
pub fn save_checkpoint(
    db: State<'_, Database>,
    request: SaveCheckpointRequest,
) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    checkpoints::save_checkpoint(
        &conn,
        &id,
        &request.session_id,
        request.message_count,
        request.last_message_id.as_deref(),
        request.context_tokens,
        &request.checkpoint_data,
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn get_resume_candidate(db: State<'_, Database>) -> Result<Vec<ResumeCandidate>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    checkpoints::get_resume_candidates(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_checkpoint(
    db: State<'_, Database>,
    session_id: String,
) -> Result<Option<CheckpointRow>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    checkpoints::get_checkpoint(&conn, &session_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_checkpoint(db: State<'_, Database>, session_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    checkpoints::clear_checkpoint(&conn, &session_id).map_err(|e| e.to_string())
}
