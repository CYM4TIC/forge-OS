use serde::Deserialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::commands::capabilities::{CapabilityFamily, default_capabilities};
use crate::dispatch::types::{AgentRequest, AgentStatus};
use crate::dispatch::lifecycle::AgentSummary;
use crate::dispatch::AgentDispatcher;
use crate::providers::registry::ProviderRegistry;
use super::agents::lookup_agent_tier;

/// Request payload from frontend to dispatch an agent.
#[derive(Debug, Deserialize)]
pub struct DispatchRequest {
    pub agent_slug: String,
    pub system_prompt: String,
    pub dynamic_context: Option<String>,
    pub messages: Option<Vec<DispatchMessage>>,
    pub tier: Option<String>,
    pub provider_id: Option<String>,
    pub timeout_ms: Option<u64>,
    /// Dispatch context for capability resolution (e.g., "gate_review", "build").
    /// If not provided, defaults to ReadOnly.
    pub dispatch_context: Option<String>,
    /// Explicit capability overrides. If provided, these take precedence over dispatch_context.
    pub granted_capabilities: Option<Vec<CapabilityFamily>>,
}

#[derive(Debug, Deserialize)]
pub struct DispatchMessage {
    pub role: String,
    pub content: String,
}

/// Dispatch a new agent. Returns the dispatch_id for tracking.
#[tauri::command]
pub async fn dispatch_agent(
    app: tauri::AppHandle,
    dispatcher: State<'_, Arc<Mutex<AgentDispatcher>>>,
    providers: State<'_, Arc<Mutex<ProviderRegistry>>>,
    request: DispatchRequest,
) -> Result<String, String> {
    let dispatch_id = Uuid::new_v4().to_string();

    // OS-ADL-006: Auto-resolve tier from agent frontmatter when not explicitly provided.
    // This ensures high-tier agents (Pierce, Nyx, Tanaka) aren't silently downgraded to medium.
    let resolved_tier = request.tier.or_else(|| lookup_agent_tier(&request.agent_slug));

    // Resolve capabilities: explicit overrides > dispatch_context > ReadOnly default
    let capabilities = request.granted_capabilities.unwrap_or_else(|| {
        let ctx = request.dispatch_context.as_deref().unwrap_or("default");
        default_capabilities(ctx)
    });

    let agent_request = AgentRequest {
        dispatch_id: dispatch_id.clone(),
        agent_slug: request.agent_slug,
        system_prompt: request.system_prompt,
        dynamic_context: request.dynamic_context,
        messages: request
            .messages
            .unwrap_or_default()
            .into_iter()
            .map(|m| crate::dispatch::types::AgentMessage {
                role: m.role,
                content: m.content,
            })
            .collect(),
        tier: resolved_tier,
        provider_id: request.provider_id,
        timeout_ms: request.timeout_ms,
        granted_capabilities: capabilities,
    };

    let slug = agent_request.agent_slug.clone();

    let mut disp = dispatcher.lock().await;
    let dispatch_id = disp.dispatch(agent_request, providers.inner().clone(), app.clone()).await?;

    // Emit HUD dispatch flow event AFTER successful dispatch (K-LOW-3: no false-positive trails)
    crate::hud::dispatch_events::emit_agent_dispatched(&app, &slug);

    Ok(dispatch_id)
}

/// Get the status of a dispatched agent.
#[tauri::command]
pub async fn get_agent_status(
    dispatcher: State<'_, Arc<Mutex<AgentDispatcher>>>,
    dispatch_id: String,
) -> Result<Option<AgentStatus>, String> {
    let disp = dispatcher.lock().await;
    Ok(disp.get_status(&dispatch_id).await)
}

/// List all active agents.
#[tauri::command]
pub async fn list_active_agents(
    dispatcher: State<'_, Arc<Mutex<AgentDispatcher>>>,
) -> Result<Vec<AgentSummary>, String> {
    let disp = dispatcher.lock().await;
    Ok(disp.list_active().await)
}

/// Cancel a running agent.
#[tauri::command]
pub async fn cancel_agent(
    dispatcher: State<'_, Arc<Mutex<AgentDispatcher>>>,
    dispatch_id: String,
) -> Result<bool, String> {
    let disp = dispatcher.lock().await;
    Ok(disp.cancel(&dispatch_id).await)
}
