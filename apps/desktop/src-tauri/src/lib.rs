mod build_state;
mod commands;
mod compact;
mod database;
mod dispatch;
mod memory;
mod providers;
mod swarm;
pub mod state;

use std::sync::Arc;

use database::Database;
use dispatch::AgentDispatcher;
use providers::claude::ClaudeProvider;
use providers::claude_code::ClaudeCodeProvider;
use providers::config::ProviderConfig;
use providers::openai::OpenAIProvider;
use providers::registry::ProviderRegistry;
use providers::types::{ModelMapping, CLAUDE_OPUS, CLAUDE_SONNET, CLAUDE_HAIKU, GPT4O, GPT4O_MINI};
use tauri::Manager;
use tokio::sync::Mutex;

/// Load provider configurations from SQLite settings.
/// Keys: provider.{id}.api_key, provider.{id}.base_url, provider.default
fn init_providers(db: &Database) -> ProviderRegistry {
    let mut registry = ProviderRegistry::new();
    let conn = db.conn.lock().expect("db lock for provider init");

    // Always register Claude Code CLI provider — no API key needed.
    // Uses the operator's existing Claude Max plan via the `claude` CLI.
    // This is the default provider; API-key providers override if configured.
    registry.add(
        "claude-code".to_string(),
        Arc::new(ClaudeCodeProvider::new()),
        true,
    );

    // Check for Claude API key (overrides claude-code as default if present)
    if let Ok(Some(api_key)) = database::queries::get_setting(&conn, "provider.claude.api_key") {
        if !api_key.is_empty() {
            let config = ProviderConfig {
                api_key,
                base_url: database::queries::get_setting(&conn, "provider.claude.base_url")
                    .ok()
                    .flatten(),
                model_mappings: ModelMapping {
                    high: CLAUDE_OPUS.to_string(),
                    medium: CLAUDE_SONNET.to_string(),
                    fast: CLAUDE_HAIKU.to_string(),
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
                    high: GPT4O.to_string(),
                    medium: GPT4O_MINI.to_string(),
                    fast: GPT4O_MINI.to_string(),
                },
                is_default: false,
            };
            registry.add("openai".to_string(), Arc::new(OpenAIProvider::new(config, None)), false);
        }
    }

    // Environment variable fallback for development.
    // In production, prefer the provider settings UI or ClaudeCodeProvider (no key needed).
    if let Ok(api_key) = std::env::var("ANTHROPIC_API_KEY") {
        if registry.get("claude").is_none() {
            let config = ProviderConfig {
                api_key,
                base_url: None,
                model_mappings: ModelMapping {
                    high: CLAUDE_OPUS.to_string(),
                    medium: CLAUDE_SONNET.to_string(),
                    fast: CLAUDE_HAIKU.to_string(),
                },
                is_default: true,
            };
            registry.add("claude".to_string(), Arc::new(ClaudeProvider::new(config)), true);
        }
    }
    if let Ok(api_key) = std::env::var("OPENAI_API_KEY") {
        if registry.get("openai").is_none() {
            let config = ProviderConfig {
                api_key,
                base_url: std::env::var("OPENAI_BASE_URL").ok(),
                model_mappings: ModelMapping {
                    high: GPT4O.to_string(),
                    medium: GPT4O_MINI.to_string(),
                    fast: GPT4O_MINI.to_string(),
                },
                is_default: false,
            };
            registry.add("openai".to_string(), Arc::new(OpenAIProvider::new(config, None)), false);
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

            // Single provider registry — Arc<tokio::sync::Mutex> for async + sync access
            let providers: Arc<Mutex<ProviderRegistry>> = Arc::new(Mutex::new(registry));

            // Agent dispatcher
            let dispatcher: Arc<Mutex<AgentDispatcher>> = Arc::new(Mutex::new(AgentDispatcher::new()));

            // Clone dispatcher before manage() moves it
            let maint_dispatcher = dispatcher.clone();

            app.manage(db);
            app.manage(providers);
            app.manage(dispatcher);

            // Background agent dispatcher maintenance (every 30 seconds)
            // Handles timeout detection, stale cache eviction, completed agent cleanup.
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(30)).await;
                    let mut disp = maint_dispatcher.lock().await;
                    disp.maintenance().await;
                }
            });

            // Background dream consolidation check (hourly)
            let db_path = app
                .path()
                .app_data_dir()
                .expect("app data dir for dream bg")
                .join("forge.db");
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
                    // Open a separate read-write connection for the background task
                    if let Ok(conn) = rusqlite::Connection::open(&db_path) {
                        let _ = conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
                        let _ = memory::dream::check_and_run(&conn);
                    }
                }
            });

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
            commands::dispatch::dispatch_agent,
            commands::dispatch::get_agent_status,
            commands::dispatch::list_active_agents,
            commands::dispatch::cancel_agent,
            commands::build_state::get_build_state,
            commands::build_state::create_batch,
            commands::build_state::complete_batch,
            commands::build_state::add_finding,
            commands::build_state::resolve_finding,
            commands::build_state::generate_boot_md,
            commands::memory::append_memory,
            commands::memory::query_memory,
            commands::memory::get_memory_index,
            commands::memory::get_daily_log,
            commands::memory::trigger_dream,
            commands::memory::get_dream_status,
            commands::swarm::swarm_send,
            commands::swarm::swarm_get_messages,
            commands::swarm::swarm_mark_read,
            commands::swarm::swarm_respond_permission,
            commands::compact::get_context_usage,
            commands::compact::trigger_compact,
            commands::compact::store_compact_result,
            commands::compact::get_last_summary,
            commands::team::get_team_config,
            commands::team::update_team_member,
            commands::team::save_checkpoint,
            commands::team::get_resume_candidate,
            commands::team::get_checkpoint,
            commands::team::clear_checkpoint,
            commands::search::search_sessions,
            commands::build_state::checkout_finding,
            commands::build_state::release_finding,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
