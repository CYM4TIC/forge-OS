use serde::Serialize;
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub supports_streaming: bool,
    pub max_context: u64,
    pub is_default: bool,
}

#[tauri::command]
pub fn list_providers(state: State<'_, AppState>) -> Result<Vec<ProviderInfo>, String> {
    let registry = state.providers.lock().map_err(|e| e.to_string())?;
    let default_id = registry.default_id().map(|s| s.to_string());
    let providers = registry
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
    Ok(providers)
}

#[tauri::command]
pub fn set_default_provider(state: State<'_, AppState>, provider_id: String) -> Result<bool, String> {
    let mut registry = state.providers.lock().map_err(|e| e.to_string())?;
    Ok(registry.set_default(&provider_id))
}
