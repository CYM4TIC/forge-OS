use super::events::{DispatchFlowEvent, FlowType, HudEvent, emit_hud_event};

/// Emit a dispatch flow event to the HUD frontend.
/// Called when agents are dispatched, return findings, or transfer context.
///
/// The flow overlay (P5-M) will animate persona glyph particle trails
/// along bezier curves between pipeline nodes in response to these events.
pub fn emit_dispatch_flow<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    source_agent: &str,
    target_agents: &[&str],
    flow_type: FlowType,
    severity: Option<&str>,
) {
    let event = HudEvent::DispatchFlow(DispatchFlowEvent {
        source_agent: source_agent.to_string(),
        target_agents: target_agents.iter().map(|s| s.to_string()).collect(),
        flow_type,
        severity: severity.map(|s| s.to_string()),
        timestamp: chrono::Utc::now().to_rfc3339(),
    });
    emit_hud_event(app, &event);
}

/// Convenience: emit a standard agent dispatch flow (Nyx → target agent).
pub fn emit_agent_dispatched<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    agent_slug: &str,
) {
    emit_dispatch_flow(app, "nyx", &[agent_slug], FlowType::Dispatch, None);
}

/// Convenience: emit a Build Triad dispatch (Nyx → Pierce + Mara + Riven).
/// Called from Rust-side triad orchestrator (Phase 7+).
#[allow(dead_code)]
pub fn emit_triad_dispatched<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) {
    emit_dispatch_flow(
        app,
        "nyx",
        &["pierce", "mara", "riven"],
        FlowType::Dispatch,
        None,
    );
}

/// Convenience: emit a findings return flow (agent → Nyx).
/// Wired into dispatch completion path in P5-M.
#[allow(dead_code)]
pub fn emit_findings_returned<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    from_agent: &str,
    severity: Option<&str>,
) {
    emit_dispatch_flow(app, from_agent, &["nyx"], FlowType::FindingsReturn, severity);
}

/// Convenience: emit a context transfer flow between agents.
/// Used by Swarm inter-agent messaging (Phase 7+).
#[allow(dead_code)]
pub fn emit_context_transfer<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    source: &str,
    targets: &[&str],
) {
    emit_dispatch_flow(app, source, targets, FlowType::ContextTransfer, None);
}
