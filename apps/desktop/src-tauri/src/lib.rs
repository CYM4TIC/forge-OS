mod commands;
mod database;
mod providers;
pub mod state;

use std::sync::Arc;

use database::Database;
use providers::claude::ClaudeProvider;
use providers::config::ProviderConfig;
use providers::openai::OpenAIProvider;
use providers::registry::ProviderRegistry;
use providers::types::ModelMapping;
use state::AppState;
use tauri::Manager;

/// Load provider configurations from SQLite settings.
/// Keys: provider.{id}.api_key, provider.{id}.base_url, provider.default
fn init_providers(db: &Database) -> ProviderRegistry {
    let mut registry = ProviderRegistry::new();
    let conn = db.conn.lock().expect("db lock for provider init");

    // Check for Claude API key
    if let Ok(Some(api_key)) = database::queries::get_setting(&conn, "provider.claude.api_key") {
        if !api_key.is_empty() {
            let config = ProviderConfig {
                api_key,
                base_url: database::queries::get_setting(&conn, "provider.claude.base_url")
                    .ok()
                    .flatten(),
                model_mappings: ModelMapping {
                    high: "claude-opus-4-6".to_string(),
                    medium: "claude-sonnet-4-6".to_string(),
                    fast: "claude-haiku-4-5-20251001".to_string(),
                },
                is_default: true,
            };
            registry.add("claude".to_string(), Arc::new(ClaudeProvider::new(config)), true);
        }
    }

    // Check for OpenAI API key
    if let Ok(Some(api_key)) = database::queries::get_setting(&conn, "provider.openai.api_key") {
        if !api_key.is_empty() {
            let base_url = database::queries::get_setting(&conn, "provider.openai.base_url")
                .ok()
                .flatten();
            let config = ProviderConfig {
                api_key,
                base_url,
                model_mappings: ModelMapping {
                    high: "gpt-4o".to_string(),
                    medium: "gpt-4o-mini".to_string(),
                    fast: "gpt-4o-mini".to_string(),
                },
                is_default: false,
            };
            registry.add("openai".to_string(), Arc::new(OpenAIProvider::new(config, None)), false);
        }
    }

    // Also check environment variables as fallback
    if registry.list().is_empty() {
        if let Ok(api_key) = std::env::var("ANTHROPIC_API_KEY") {
            let config = ProviderConfig {
                api_key,
                base_url: None,
                model_mappings: ModelMapping {
                    high: "claude-opus-4-6".to_string(),
                    medium: "claude-sonnet-4-6".to_string(),
                    fast: "claude-haiku-4-5-20251001".to_string(),
                },
                is_default: true,
            };
            registry.add("claude".to_string(), Arc::new(ClaudeProvider::new(config)), true);
        }
        if let Ok(api_key) = std::env::var("OPENAI_API_KEY") {
            let config = ProviderConfig {
                api_key,
                base_url: std::env::var("OPENAI_BASE_URL").ok(),
                model_mappings: ModelMapping {
                    high: "gpt-4o".to_string(),
                    medium: "gpt-4o-mini".to_string(),
                    fast: "gpt-4o-mini".to_string(),
                },
                is_default: false,
            };
            let is_default = registry.list().is_empty();
            registry.add("openai".to_string(), Arc::new(OpenAIProvider::new(config, None)), is_default);
        }
    }

    // Restore default provider preference from settings
    if let Ok(Some(default_id)) = database::queries::get_setting(&conn, "provider.default") {
        registry.set_default(&default_id);
    }

    registry
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            let db = Database::new(app_data_dir)
                .expect("failed to initialize database");

            // Initialize providers from settings + env
            let registry = init_providers(&db);
            let app_state = AppState::new(registry);

            app.manage(db);
            app.manage(app_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::sessions::list_sessions,
            commands::sessions::get_session,
            commands::sessions::create_session,
            commands::sessions::delete_session,
            commands::chat::list_messages,
            commands::chat::send_message,
            commands::providers::list_providers,
            commands::providers::set_default_provider,
            commands::agents::list_agents,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
