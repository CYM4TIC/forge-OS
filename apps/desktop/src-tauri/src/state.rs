use std::sync::Mutex;
use crate::providers::registry::ProviderRegistry;

/// Shared application state managed by Tauri.
/// Database is managed separately as its own Tauri state.
pub struct AppState {
    pub providers: Mutex<ProviderRegistry>,
}

impl AppState {
    pub fn new(registry: ProviderRegistry) -> Self {
        Self {
            providers: Mutex::new(registry),
        }
    }
}
