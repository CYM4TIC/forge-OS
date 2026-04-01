use tauri::State;

use crate::database::Database;
use crate::database::search::{self, SearchResult};

#[tauri::command]
pub fn search_sessions(
    db: State<'_, Database>,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<SearchResult>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    search::search_sessions(&conn, &query, limit).map_err(|e| e.to_string())
}
