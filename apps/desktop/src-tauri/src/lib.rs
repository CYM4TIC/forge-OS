// Phase 3-4 infrastructure modules: core operations wired to Tauri commands,
// extended public API pre-built for Phase 6+ agent runtime consumption.
#[allow(dead_code)]
mod build_state;
mod commands;
#[allow(dead_code)]
mod compact;
mod database;
#[allow(dead_code)]
mod dispatch;
pub mod hud;
#[allow(dead_code)]
mod memory;
#[allow(dead_code)]
mod providers;
#[allow(dead_code)]
mod swarm;
// state.rs removed — AppState refactored away in K-HIGH-001 fix

use std::sync::Arc;

use commands::connectivity::HealthCheckManager;
use commands::devserver::DevServerManager;
use commands::registry::{AgentRegistry, RegistryState};
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

/// Retrieve an API key using the secure lookup chain:
/// 1. OS keychain (preferred — Windows Credential Manager / macOS Keychain / Linux SecretService)
/// 2. SQLite settings (legacy fallback — keys are migrated to keychain on first access)
/// 3. Returns None if not found in either.
///
/// TANAKA-HIGH-1 fix: API keys are no longer read from plaintext SQLite.
/// On first access, any key found in SQLite is migrated to the OS keychain
/// and removed from the database.
fn get_provider_api_key(
    conn: &rusqlite::Connection,
    provider_id: &str,
) -> Option<String> {
    // Try keychain first
    if let Ok(Some(key)) = providers::keychain::get_api_key(provider_id) {
        if !key.is_empty() {
            return Some(key);
        }
    }

    // Fallback to SQLite (legacy) — migrate to keychain if found
    let setting_key = format!("provider.{}.api_key", provider_id);
    if let Ok(Some(key)) = database::queries::get_setting(conn, &setting_key) {
        if !key.is_empty() {
            // Migrate: store in keychain, remove from SQLite
            if providers::keychain::store_api_key(provider_id, &key).is_ok() {
                let _ = database::queries::set_setting(conn, &setting_key, "");
            }
            return Some(key);
        }
    }

    None
}

/// Load provider configurations.
/// API keys are stored in the OS keychain (TANAKA-HIGH-1).
/// Keys: provider.{id}.base_url, provider.default in SQLite settings.
fn init_providers(db: &Database) -> ProviderRegistry {
    let mut registry = ProviderRegistry::new();
    let conn = db.conn.lock().unwrap_or_else(|e| e.into_inner());

    // Always register Claude Code CLI provider — no API key needed.
    // Uses the operator's existing Claude Max plan via the `claude` CLI.
    // This is the default provider; API-key providers override if configured.
    registry.add(
        "claude-code".to_string(),
        Arc::new(ClaudeCodeProvider::new()),
        true,
    );

    // Check for Claude API key (overrides claude-code as default if present)
    if let Some(api_key) = get_provider_api_key(&conn, "claude") {
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

    // Check for OpenAI API key
    if let Some(api_key) = get_provider_api_key(&conn, "openai") {
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
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

            let health_mgr = HealthCheckManager::new();
            let health_cache = health_mgr.cache.clone();
            let health_interval = health_mgr.check_interval.clone();

            // Agent registry — lazy-init on first query, Arc<Mutex> for async access
            let agent_registry: RegistryState = Arc::new(Mutex::new(AgentRegistry::default()));

            app.manage(db);
            app.manage(providers);
            app.manage(dispatcher);
            app.manage(DevServerManager::new());
            app.manage(health_mgr);
            app.manage(agent_registry);

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
            let health_db_path = db_path.clone();
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

            // Background health check poller for connectivity panel
            commands::connectivity::spawn_health_poller(
                app.handle().clone(),
                health_cache,
                health_interval,
                health_db_path,
            );

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
            commands::layout::save_panel_layout,
            commands::layout::load_panel_layout,
            commands::layout::save_workspace_preset,
            commands::layout::load_workspace_presets,
            commands::windows::create_panel_window,
            commands::windows::close_panel_window,
            commands::windows::list_panel_windows,
            commands::hud::get_build_state_snapshot,
            commands::hud::get_pipeline_stages,
            commands::hud::refresh_build_state,
            commands::hud::update_pipeline_stage,
            commands::hud::list_hud_findings,
            commands::hud::add_hud_finding,
            commands::hud::resolve_hud_finding,
            commands::hud::get_finding_counts,
            commands::vault::list_vault_tree,
            commands::vault::read_vault_file,
            commands::devserver::start_dev_server,
            commands::devserver::stop_dev_server,
            commands::devserver::restart_dev_server,
            commands::devserver::remove_dev_server,
            commands::devserver::list_dev_servers,
            commands::devserver::get_server_logs,
            commands::devserver::detect_server_port,
            commands::devserver::read_preview_dom,
            commands::devserver::preview_dom_response,
            commands::connectivity::check_service,
            commands::connectivity::check_all_services,
            commands::connectivity::get_service_status,
            commands::connectivity::set_check_interval,
            commands::registry::get_agent_registry,
            commands::registry::get_agent_content,
            commands::registry::refresh_registry,
            commands::registry::get_command_registry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
