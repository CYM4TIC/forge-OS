use serde::Deserialize;
use tauri::{Emitter, State};
use uuid::Uuid;

use crate::database::Database;
use crate::memory::{logs, index, dream, types::{MemoryType, MemoryLogEntry}};

// ── Append memory ──

#[derive(Debug, Deserialize)]
pub struct AppendMemoryRequest {
    pub persona_id: String,
    pub memory_type: String,
    pub content: String,
    pub log_date: Option<String>,
}

#[tauri::command]
pub fn append_memory(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    request: AppendMemoryRequest,
) -> Result<String, String> {
    let memory_type = MemoryType::from_str(&request.memory_type)
        .ok_or_else(|| format!("Invalid memory_type: '{}'. Must be one of: user, feedback, project, reference", request.memory_type))?;

    let log_date = request.log_date.unwrap_or_else(|| {
        chrono::Utc::now().format("%Y-%m-%d").to_string()
    });

    let id = Uuid::new_v4().to_string();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    logs::append_log(&conn, &id, &request.persona_id, &memory_type, &request.content, &log_date)
        .map_err(|e| e.to_string())?;

    let _ = app.emit("memory-changed", "log-appended");
    Ok(id)
}

// ── Query memory ──

#[derive(Debug, Deserialize)]
pub struct QueryMemoryRequest {
    pub persona_id: Option<String>,
    pub memory_type: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub limit: Option<u32>,
}

#[tauri::command]
pub fn query_memory(
    db: State<'_, Database>,
    request: QueryMemoryRequest,
) -> Result<Vec<MemoryLogEntry>, String> {
    let memory_type = request
        .memory_type
        .as_ref()
        .and_then(|s| MemoryType::from_str(s));

    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    logs::query_logs(
        &conn,
        request.persona_id.as_deref(),
        memory_type.as_ref(),
        request.date_from.as_deref(),
        request.date_to.as_deref(),
        request.limit,
    )
    .map_err(|e| e.to_string())
}

// ── Get memory index ──

#[tauri::command]
pub fn get_memory_index(db: State<'_, Database>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    index::generate_memory_index(&conn).map_err(|e| e.to_string())
}

// ── Get daily log ──

#[tauri::command]
pub fn get_daily_log(
    db: State<'_, Database>,
    log_date: String,
) -> Result<Vec<MemoryLogEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    logs::get_daily_log(&conn, &log_date).map_err(|e| e.to_string())
}

// ── Trigger dream consolidation ──

#[tauri::command]
pub fn trigger_dream(db: State<'_, Database>) -> Result<dream::DreamResult, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    dream::run_dream(&conn)
}

// ── Get dream status ──

#[tauri::command]
pub fn get_dream_status(db: State<'_, Database>) -> Result<dream::DreamStatus, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    dream::get_status(&conn).map_err(|e| e.to_string())
}
