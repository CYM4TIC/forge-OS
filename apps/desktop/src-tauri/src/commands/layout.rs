use serde::{Deserialize, Serialize};
use tauri::State;

use crate::database::Database;

// ── Request/Response types ──

#[derive(Debug, Deserialize)]
pub struct SaveLayoutRequest {
    pub panels_json: String,
    pub tab_groups_json: String,
    pub active_preset_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LoadLayoutResponse {
    pub panels_json: String,
    pub tab_groups_json: String,
    pub active_preset_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SavePresetRequest {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_built_in: bool,
    pub panels_json: String,
}

#[derive(Debug, Serialize)]
pub struct PresetRow {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_built_in: i32,
    pub panels_json: String,
    pub created_at: String,
}

// ── Tauri Commands ──

#[tauri::command]
pub fn save_panel_layout(
    request: SaveLayoutRequest,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO layout_state (id, panels_json, tab_groups_json, active_preset_id, updated_at)
         VALUES ('current', ?1, ?2, ?3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT(id) DO UPDATE SET
            panels_json = excluded.panels_json,
            tab_groups_json = excluded.tab_groups_json,
            active_preset_id = excluded.active_preset_id,
            updated_at = excluded.updated_at",
        rusqlite::params![
            request.panels_json,
            request.tab_groups_json,
            request.active_preset_id,
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_panel_layout(
    db: State<'_, Database>,
) -> Result<Option<LoadLayoutResponse>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT panels_json, tab_groups_json, active_preset_id FROM layout_state WHERE id = 'current'")
        .map_err(|e| e.to_string())?;

    let result = stmt.query_row([], |row| {
        Ok(LoadLayoutResponse {
            panels_json: row.get(0)?,
            tab_groups_json: row.get(1)?,
            active_preset_id: row.get(2)?,
        })
    });

    match result {
        Ok(response) => Ok(Some(response)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn save_workspace_preset(
    request: SavePresetRequest,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO workspace_presets (id, name, description, is_built_in, panels_json)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            panels_json = excluded.panels_json",
        rusqlite::params![
            request.id,
            request.name,
            request.description,
            request.is_built_in as i32,
            request.panels_json,
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_workspace_presets(
    db: State<'_, Database>,
) -> Result<Vec<PresetRow>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, description, is_built_in, panels_json, created_at FROM workspace_presets ORDER BY name")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(PresetRow {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_built_in: row.get(3)?,
                panels_json: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}
