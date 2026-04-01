pub mod types;
pub mod cache;
pub mod context;
pub mod lifecycle;

use std::sync::Arc;
use tokio::sync::Mutex;

use self::cache::PromptCache;
use self::context::AgentContext;
use self::lifecycle::{AgentLifecycle, AgentSummary};
use self::types::{AgentRequest, AgentResult, AgentStatus, DispatchConfig};

use tauri::Manager;

use crate::database::Database;
use crate::providers::registry::ProviderRegistry;
use crate::providers::types::{CapabilityTier, ChatMessage};

/// The central agent dispatcher.
/// Manages forked agent lifecycle, prompt caching, and concurrent dispatch.
/// Lifecycle is wrapped in Arc<Mutex<>> so spawned tasks can record results.
pub struct AgentDispatcher {
    lifecycle: Arc<Mutex<AgentLifecycle>>,
    cache: PromptCache,
    config: DispatchConfig,
}

impl AgentDispatcher {
    pub fn new() -> Self {
        Self {
            lifecycle: Arc::new(Mutex::new(AgentLifecycle::new())),
            cache: PromptCache::new(),
            config: DispatchConfig::default(),
        }
    }

    /// Dispatch an agent. Returns the dispatch_id for tracking.
    /// The actual execution is spawned as a tokio task — this returns immediately.
    pub async fn dispatch(
        &mut self,
        request: AgentRequest,
        providers: Arc<Mutex<ProviderRegistry>>,
        app_handle: tauri::AppHandle,
    ) -> Result<String, String> {
        // Check concurrency limit
        {
            let lifecycle = self.lifecycle.lock().await;
            if lifecycle.active_count() >= self.config.max_concurrent {
                return Err(format!(
                    "Max concurrent agents reached ({}). Wait for an agent to complete.",
                    self.config.max_concurrent
                ));
            }
        }

        // Cache the static prompt portion
        if !self.cache.contains(&request.system_prompt) {
            self.cache.put(&request.system_prompt);
        }

        let dispatch_id = request.dispatch_id.clone();
        let is_writable = false; // Agents are read-only by default
        let context = AgentContext::new(is_writable, None, 0);

        let cancel_rx = {
            let mut lifecycle = self.lifecycle.lock().await;
            let rx = lifecycle.register(request.clone(), context);
            lifecycle.mark_running(&dispatch_id);
            rx
        };

        // Clone lifecycle handle so the spawned task can record the result
        let lifecycle_handle = Arc::clone(&self.lifecycle);

        // Log dispatch event for audit trail
        let slug_for_log = request.agent_slug.clone();
        let did_for_log = dispatch_id.clone();
        if let Some(db) = app_handle.try_state::<Database>() {
            if let Ok(conn) = db.conn.lock() {
                let _ = crate::database::queries::log_dispatch_event(
                    &conn, &did_for_log, &slug_for_log, "registered", "{}",
                );
            }
        }

        // Spawn the agent execution as a background task
        tokio::spawn(async move {
            let result = execute_agent(request, providers, cancel_rx).await;

            // Record result in lifecycle — backend state stays in sync
            {
                let mut lifecycle = lifecycle_handle.lock().await;
                lifecycle.complete(result.clone());
            }

            // Log completion event for audit trail
            if let Some(db) = app_handle.try_state::<Database>() {
                if let Ok(conn) = db.conn.lock() {
                    let event_type = match result.status {
                        AgentStatus::Complete => "complete",
                        AgentStatus::Error => "error",
                        AgentStatus::Timeout => "timeout",
                        AgentStatus::Cancelled => "cancelled",
                        _ => "complete",
                    };
                    let metadata = serde_json::json!({
                        "duration_ms": result.duration_ms,
                        "model": result.model,
                        "error": result.error,
                    }).to_string();
                    let _ = crate::database::queries::log_dispatch_event(
                        &conn, &result.dispatch_id, &result.agent_slug, event_type, &metadata,
                    );
                }
            }

            // Emit result event to frontend
            use tauri::Emitter;
            let _ = app_handle.emit("agent:result", &result);
        });

        Ok(dispatch_id)
    }

    /// Get the status of a dispatched agent.
    pub async fn get_status(&self, dispatch_id: &str) -> Option<AgentStatus> {
        let lifecycle = self.lifecycle.lock().await;
        lifecycle.get_status(dispatch_id)
    }

    /// Get the result of a completed agent (cloned, since lifecycle is behind a Mutex).
    pub async fn get_result(&self, dispatch_id: &str) -> Option<AgentResult> {
        let lifecycle = self.lifecycle.lock().await;
        lifecycle.get_result(dispatch_id).cloned()
    }

    /// Cancel a running agent.
    pub async fn cancel(&self, dispatch_id: &str) -> bool {
        let mut lifecycle = self.lifecycle.lock().await;
        lifecycle.cancel(dispatch_id)
    }

    /// List all active agents.
    pub async fn list_active(&self) -> Vec<AgentSummary> {
        let lifecycle = self.lifecycle.lock().await;
        lifecycle.list_active()
    }

    /// List all agents (active + completed).
    pub async fn list_all(&self) -> Vec<AgentSummary> {
        let lifecycle = self.lifecycle.lock().await;
        lifecycle.list_all()
    }

    /// Record a completed agent result.
    pub async fn record_result(&self, result: AgentResult) {
        let mut lifecycle = self.lifecycle.lock().await;
        lifecycle.complete(result);
    }

    /// Run periodic maintenance: check timeouts, evict stale cache entries.
    pub async fn maintenance(&mut self) {
        {
            let mut lifecycle = self.lifecycle.lock().await;
            lifecycle.check_timeouts();
            lifecycle.cleanup(60 * 60 * 1000);
        }
        // Evict cache entries not accessed in 30 minutes
        self.cache.evict_stale(30 * 60 * 1000);
    }

    /// Get cache stats for diagnostics.
    pub fn cache_size(&self) -> usize {
        self.cache.len()
    }
}

/// Execute a single agent against a provider.
/// Runs in a spawned tokio task.
async fn execute_agent(
    request: AgentRequest,
    providers: Arc<Mutex<ProviderRegistry>>,
    cancel_rx: tokio::sync::oneshot::Receiver<()>,
) -> AgentResult {
    let start = std::time::Instant::now();

    // Build the full system prompt: static + dynamic boundary + dynamic context
    let full_system = if let Some(ref dynamic) = request.dynamic_context {
        format!(
            "{}\n\n__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__\n\n{}",
            request.system_prompt, dynamic
        )
    } else {
        request.system_prompt.clone()
    };

    // Build messages with system prompt prepended
    let mut messages: Vec<ChatMessage> = vec![ChatMessage {
        role: "system".to_string(),
        content: full_system,
    }];
    messages.extend(request.messages.iter().map(|m| ChatMessage {
        role: m.role.clone(),
        content: m.content.clone(),
    }));

    // Resolve tier
    let tier = match request.tier.as_deref() {
        Some("high") => CapabilityTier::High,
        Some("fast") => CapabilityTier::Fast,
        _ => CapabilityTier::Medium,
    };

    // Get provider
    let provider = {
        let registry = providers.lock().await;
        if let Some(pid) = &request.provider_id {
            registry.get(pid).cloned()
        } else {
            registry.get_default().cloned()
        }
    };

    let provider = match provider {
        Some(p) => p,
        None => {
            return AgentResult {
                dispatch_id: request.dispatch_id,
                agent_slug: request.agent_slug,
                content: String::new(),
                model: None,
                tokens_in: None,
                tokens_out: None,
                duration_ms: start.elapsed().as_millis() as u64,
                status: AgentStatus::Error,
                error: Some("No provider configured".to_string()),
            };
        }
    };

    // Execute with timeout and cancellation
    let timeout_ms = request.timeout_ms.unwrap_or(types::AGENT_BACKGROUND_TIMEOUT_MS);
    let timeout_duration = std::time::Duration::from_millis(timeout_ms);

    tokio::select! {
        result = provider.send_message(messages, tier) => {
            match result {
                Ok(response) => AgentResult {
                    dispatch_id: request.dispatch_id,
                    agent_slug: request.agent_slug,
                    content: response.content,
                    model: Some(response.model),
                    tokens_in: response.tokens_in,
                    tokens_out: response.tokens_out,
                    duration_ms: start.elapsed().as_millis() as u64,
                    status: AgentStatus::Complete,
                    error: None,
                },
                Err(e) => AgentResult {
                    dispatch_id: request.dispatch_id,
                    agent_slug: request.agent_slug,
                    content: String::new(),
                    model: None,
                    tokens_in: None,
                    tokens_out: None,
                    duration_ms: start.elapsed().as_millis() as u64,
                    status: AgentStatus::Error,
                    error: Some(e.to_string()),
                },
            }
        }
        _ = cancel_rx => {
            AgentResult {
                dispatch_id: request.dispatch_id,
                agent_slug: request.agent_slug,
                content: String::new(),
                model: None,
                tokens_in: None,
                tokens_out: None,
                duration_ms: start.elapsed().as_millis() as u64,
                status: AgentStatus::Cancelled,
                error: Some("Agent cancelled by operator".to_string()),
            }
        }
        _ = tokio::time::sleep(timeout_duration) => {
            AgentResult {
                dispatch_id: request.dispatch_id,
                agent_slug: request.agent_slug,
                content: String::new(),
                model: None,
                tokens_in: None,
                tokens_out: None,
                duration_ms: start.elapsed().as_millis() as u64,
                status: AgentStatus::Timeout,
                error: Some(format!("Agent timed out after {}ms", timeout_ms)),
            }
        }
    }
}
