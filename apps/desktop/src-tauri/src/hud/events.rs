use serde::{Deserialize, Serialize};

use super::boot_parser::{BuildStateSnapshot, PipelineStage};

/// All HUD events emitted to the frontend via Tauri's event system.
/// The frontend subscribes with `listen("hud:*", callback)`.
///
/// Event naming convention: `hud:{variant}` (e.g., `hud:build-state-changed`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum HudEvent {
    /// BOOT.md was re-parsed and build state changed.
    #[serde(rename = "build_state_changed")]
    BuildStateChanged(BuildStateSnapshot),

    /// A pipeline stage changed status (idle → active → complete).
    #[serde(rename = "pipeline_stage_changed")]
    PipelineStageChanged(PipelineStage),

    /// An agent's status changed (dispatched, running, complete, error).
    #[serde(rename = "agent_status_changed")]
    AgentStatusChanged(AgentStatusEvent),

    /// A new finding was added to the HUD findings store.
    #[serde(rename = "finding_added")]
    FindingAdded(HudFinding),

    /// A finding was resolved.
    #[serde(rename = "finding_resolved")]
    FindingResolved(FindingResolvedEvent),

    /// An agent dispatch flow started — for particle trail animation.
    #[serde(rename = "dispatch_flow")]
    DispatchFlow(DispatchFlowEvent),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStatusEvent {
    pub agent_id: String,
    pub persona: String,
    pub status: AgentHudStatus,
    pub model_tier: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentHudStatus {
    Idle,
    Dispatched,
    Running,
    Complete,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HudFinding {
    pub id: String,
    pub session_id: Option<String>,
    pub batch_id: Option<String>,
    pub severity: String,
    pub persona: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub file_path: Option<String>,
    pub line_number: Option<i64>,
    pub created_at: String,
    pub resolved_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FindingResolvedEvent {
    pub finding_id: String,
    pub resolved_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DispatchFlowEvent {
    pub source_agent: String,
    pub target_agents: Vec<String>,
    pub flow_type: FlowType,
    pub severity: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FlowType {
    Dispatch,
    FindingsReturn,
    ContextTransfer,
}

/// Emit a HUD event to the frontend.
/// Uses Tauri's event system per OS-ADL-009.
pub fn emit_hud_event<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    event: &HudEvent,
) {
    use tauri::Emitter;
    let event_name = match event {
        HudEvent::BuildStateChanged(_) => "hud:build-state-changed",
        HudEvent::PipelineStageChanged(_) => "hud:pipeline-stage-changed",
        HudEvent::AgentStatusChanged(_) => "hud:agent-status-changed",
        HudEvent::FindingAdded(_) => "hud:finding-added",
        HudEvent::FindingResolved(_) => "hud:finding-resolved",
        HudEvent::DispatchFlow(_) => "hud:dispatch-flow",
    };
    if let Err(e) = app.emit(event_name, event) {
        eprintln!("[HUD] Failed to emit event {}: {}", event_name, e);
    }
}
