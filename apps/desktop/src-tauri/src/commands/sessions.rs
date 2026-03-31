use tauri::State;
use uuid::Uuid;

use crate::database::Database;
use crate::database::queries::{self, SessionRow};

#[tauri::command]
pub fn list_sessions(db: State<'_, Database>) -> Result<Vec<SessionRow>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    queries::list_sessions(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_session(db: State<'_, Database>, id: String) -> Result<Option<SessionRow>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    queries::get_session(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_session(db: State<'_, Database>, title: Option<String>) -> Result<SessionRow, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let title = title.unwrap_or_else(|| "New Session".to_string());
    queries::create_session(&conn, &id, &title).map_err(|e| e.to_string())?;
    queries::get_session(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Session created but not found".to_string())
}

#[tauri::command]
pub fn delete_session(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    queries::delete_session(&conn, &id).map_err(|e| e.to_string())
}
