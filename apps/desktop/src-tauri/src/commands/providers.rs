use serde::Serialize;
use std::sync::Arc;
use tauri::{Emitter, State};
use tokio::sync::Mutex;

use crate::database::Database;
use crate::providers::registry::ProviderRegistry;

#[derive(Debug, Serialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub supports_streaming: bool,
    pub max_context: u64,
    pub is_default: bool,
}

#[tauri::command]
pub async fn list_providers(
    providers: State<'_, Arc<Mutex<ProviderRegistry>>>,
) -> Result<Vec<ProviderInfo>, String> {
    let registry = providers.lock().await;
    let default_id = registry.default_id().map(|s| s.to_string());
    let result = registry
        .list()
        .into_iter()
        .map(|(id, p)| ProviderInfo {
            id: id.to_string(),
            name: p.name().to_string(),
            supports_streaming: p.supports_streaming(),
            max_context: p.max_context(),
            is_default: default_id.as_deref() == Some(id),
        })
        .collect();
    Ok(result)
}

#[tauri::command]
pub async fn set_default_provider(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    providers: State<'_, Arc<Mutex<ProviderRegistry>>>,
    provider_id: String,
) -> Result<bool, String> {
    let mut registry = providers.lock().await;
    let changed = registry.set_default(&provider_id);

    // Persist to SQLite so the preference survives restart
    if changed {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        crate::database::queries::set_setting(&conn, "provider.default", &provider_id)
            .map_err(|e| e.to_string())?;
        let _ = app.emit("provider-changed", "default-updated");
    }

    Ok(changed)
}
