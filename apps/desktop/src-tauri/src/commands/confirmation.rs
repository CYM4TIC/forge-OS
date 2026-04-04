// ── Tool Confirmation Router ────────────────────────────────────────────────
// P7-H: Destructive tool calls require operator confirmation before execution.
// Implements Factory-AI ToolConfirmation taxonomy (9 action types, 7 outcomes)
// with oneshot channel pattern from Goose for async confirmation resolution.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{Mutex, oneshot};
use uuid::Uuid;

use crate::commands::capabilities::CapabilityFamily;
use crate::commands::policy::{PolicyAction, PolicyEngineState};

/// Confirmation timeout — stale requests older than this are auto-cancelled.
pub const CONFIRMATION_TIMEOUT: Duration = Duration::from_secs(60);

// ---------------------------------------------------------------------------
// Confirmation taxonomy (Factory-AI 9-action types)
// ---------------------------------------------------------------------------

/// The type of tool action requiring confirmation.
/// Each variant carries action-specific detail for the operator to review.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ConfirmationType {
    /// Edit an existing file (path + diff preview).
    FileEdit { path: String, diff: String },
    /// Create a new file.
    FileCreate { path: String },
    /// Execute a shell command.
    ShellExec { command: String },
    /// Apply a multi-file patch.
    ApplyPatch { file_count: usize, summary: String },
    /// Invoke an MCP tool (external service).
    McpTool { server: String, tool_name: String },
    /// Ask the operator a question (informational, low risk).
    AskUser { question: String },
    /// Exit specification mode (switches interaction mode).
    ExitSpecMode,
    /// Propose a new mission (multi-step orchestration).
    ProposeMission { title: String },
    /// Start executing a mission run.
    StartMissionRun { mission_id: String },
}

/// Canonical key for auto-approve matching (strips detail fields).
impl ConfirmationType {
    pub fn canonical_key(&self) -> &'static str {
        match self {
            ConfirmationType::FileEdit { .. } => "file_edit",
            ConfirmationType::FileCreate { .. } => "file_create",
            ConfirmationType::ShellExec { .. } => "shell_exec",
            ConfirmationType::ApplyPatch { .. } => "apply_patch",
            ConfirmationType::McpTool { .. } => "mcp_tool",
            ConfirmationType::AskUser { .. } => "ask_user",
            ConfirmationType::ExitSpecMode => "exit_spec_mode",
            ConfirmationType::ProposeMission { .. } => "propose_mission",
            ConfirmationType::StartMissionRun { .. } => "start_mission_run",
        }
    }

    /// Whether this type should always auto-approve (no operator friction).
    pub fn is_low_risk(&self) -> bool {
        matches!(self, ConfirmationType::AskUser { .. })
    }
}

// ---------------------------------------------------------------------------
// Confirmation outcomes (Factory-AI 7-response resolution)
// ---------------------------------------------------------------------------

/// Operator's decision on a confirmation request.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConfirmationOutcome {
    /// Approve this single instance.
    ProceedOnce,
    /// Approve and whitelist this confirmation type for the session.
    ProceedAlways,
    /// Auto-approve all future calls at low autonomy level.
    ProceedAutoLow,
    /// Auto-approve all future calls at medium autonomy level.
    ProceedAutoMedium,
    /// Auto-approve all future calls at high autonomy level.
    ProceedAutoHigh,
    /// Approve with operator edits (action modified before execution).
    ProceedEdit,
    /// Deny — do not execute.
    Cancel,
}

impl ConfirmationOutcome {
    /// Whether this outcome grants permission to proceed.
    pub fn is_approved(&self) -> bool {
        !matches!(self, ConfirmationOutcome::Cancel)
    }

    /// Whether this outcome should whitelist the type for the session.
    pub fn should_whitelist(&self) -> bool {
        matches!(
            self,
            ConfirmationOutcome::ProceedAlways
                | ConfirmationOutcome::ProceedAutoMedium
                | ConfirmationOutcome::ProceedAutoHigh
        )
    }
}

// ---------------------------------------------------------------------------
// Confirmation request (sent to frontend)
// ---------------------------------------------------------------------------

/// A pending confirmation request displayed to the operator.
#[derive(Debug, Clone, Serialize)]
pub struct ConfirmationRequest {
    pub id: String,
    pub confirmation_type: ConfirmationType,
    /// Human-readable summary of what the action will do.
    pub arguments_summary: String,
    /// Which capability family this action requires.
    pub capability_required: CapabilityFamily,
    /// Which persona is requesting this action.
    pub requesting_persona: Option<String>,
}

// ---------------------------------------------------------------------------
// Confirmation Router
// ---------------------------------------------------------------------------

/// Pending entry: oneshot sender + creation time + canonical key for whitelist resolution.
struct PendingEntry {
    sender: oneshot::Sender<ConfirmationOutcome>,
    created_at: Instant,
    canonical_key: String,
}

/// Routes confirmation requests to the frontend and resolves them via oneshot channels.
/// Session-scoped: auto-approved types persist for the app session.
pub struct ConfirmationRouter {
    /// Pending oneshot senders keyed by request ID.
    pending: HashMap<String, PendingEntry>,
    /// Confirmation types that have been whitelisted (ProceedAlways).
    /// Note: Destructive-mapped types are excluded — they always require confirmation.
    auto_approved: HashSet<String>,
}

/// Canonical keys that map to Destructive capability — never auto-approved.
const DESTRUCTIVE_KEYS: &[&str] = &["shell_exec"];

impl Default for ConfirmationRouter {
    fn default() -> Self {
        Self::new()
    }
}

impl ConfirmationRouter {
    pub fn new() -> Self {
        Self {
            pending: HashMap::new(),
            auto_approved: HashSet::new(),
        }
    }

    /// Check if a confirmation type is auto-approved for this session.
    /// K-MED-4: Destructive-mapped types are never auto-approved.
    pub fn is_auto_approved(&self, confirmation_type: &ConfirmationType) -> bool {
        if DESTRUCTIVE_KEYS.contains(&confirmation_type.canonical_key()) {
            return false;
        }
        confirmation_type.is_low_risk()
            || self.auto_approved.contains(confirmation_type.canonical_key())
    }

    /// K-HIGH-1: Reap stale pending entries older than CONFIRMATION_TIMEOUT.
    /// Called from the maintenance loop or before new requests.
    pub fn reap_stale(&mut self) {
        let now = Instant::now();
        let stale_ids: Vec<String> = self
            .pending
            .iter()
            .filter(|(_, entry)| now.duration_since(entry.created_at) > CONFIRMATION_TIMEOUT)
            .map(|(id, _)| id.clone())
            .collect();

        for id in stale_ids {
            if let Some(entry) = self.pending.remove(&id) {
                // Send Cancel to unblock any waiting task
                let _ = entry.sender.send(ConfirmationOutcome::Cancel);
            }
        }
    }

    /// Request confirmation from the operator.
    /// Returns a receiver that resolves when the operator responds.
    /// If the type is auto-approved, returns ProceedOnce immediately.
    pub fn request_confirmation(
        &mut self,
        confirmation_type: ConfirmationType,
        arguments_summary: String,
        capability_required: CapabilityFamily,
        requesting_persona: Option<String>,
        app: &AppHandle,
    ) -> (String, Option<oneshot::Receiver<ConfirmationOutcome>>) {
        // K-HIGH-1: Reap stale entries before adding new ones
        self.reap_stale();

        let request_id = Uuid::new_v4().to_string();

        // Fast path: auto-approved types skip the modal
        if self.is_auto_approved(&confirmation_type) {
            return (request_id, None);
        }

        let canonical_key = confirmation_type.canonical_key().to_string();

        let request = ConfirmationRequest {
            id: request_id.clone(),
            confirmation_type,
            arguments_summary,
            capability_required,
            requesting_persona,
        };

        let (tx, rx) = oneshot::channel();
        self.pending.insert(request_id.clone(), PendingEntry {
            sender: tx,
            created_at: Instant::now(),
            canonical_key,
        });

        // K-HIGH-3: Log emission failure instead of silently discarding
        if let Err(e) = app.emit("dispatch:confirmation-requested", &request) {
            eprintln!("[confirmation] Failed to emit confirmation request: {}", e);
        }

        (request_id, Some(rx))
    }

    /// Resolve a pending confirmation with the operator's decision.
    /// P-HIGH-4: Whitelisting handled directly using stored canonical_key.
    /// K-MED-4: Destructive-mapped types excluded from whitelist.
    pub fn resolve(&mut self, request_id: &str, outcome: ConfirmationOutcome) -> Result<(), String> {
        let entry = self
            .pending
            .remove(request_id)
            .ok_or_else(|| format!("No pending confirmation with id: {}", request_id))?;

        // Whitelist if outcome says so, unless the type maps to Destructive
        if outcome.should_whitelist() && !DESTRUCTIVE_KEYS.contains(&entry.canonical_key.as_str()) {
            self.auto_approved.insert(entry.canonical_key);
        }

        entry.sender.send(outcome).map_err(|_| "Confirmation receiver dropped".to_string())
    }

    /// Add a confirmation type to the auto-approved set.
    pub fn whitelist(&mut self, canonical_key: &str) {
        self.auto_approved.insert(canonical_key.to_string());
    }

    /// Get the number of pending confirmations.
    pub fn pending_count(&self) -> usize {
        self.pending.len()
    }

    /// Clear all pending confirmations (e.g., on session reset).
    /// K-INFO-1: Send Cancel before dropping to unblock waiting tasks.
    pub fn clear(&mut self) {
        for (_, entry) in self.pending.drain() {
            let _ = entry.sender.send(ConfirmationOutcome::Cancel);
        }
    }
}

/// Managed Tauri state for the confirmation router.
pub type ConfirmationRouterState = Arc<Mutex<ConfirmationRouter>>;

// ---------------------------------------------------------------------------
// Tauri Commands
// ---------------------------------------------------------------------------

/// Respond to a pending confirmation request.
/// Whitelisting is handled internally by resolve() using the stored canonical_key.
#[tauri::command]
pub async fn respond_to_confirmation(
    router: State<'_, ConfirmationRouterState>,
    request_id: String,
    outcome: ConfirmationOutcome,
) -> Result<bool, String> {
    let mut r = router.lock().await;
    let approved = outcome.is_approved();
    r.resolve(&request_id, outcome)?;
    Ok(approved)
}

/// Check whether a given action requires confirmation based on policy + capabilities.
/// P-HIGH-5: Policy evaluation runs FIRST — DENY short-circuits without confirmation modal.
/// Returns the requirement details if confirmation is needed, or null if auto-approved/allowed.
#[tauri::command]
pub async fn check_confirmation_required(
    router: State<'_, ConfirmationRouterState>,
    policy_engine: State<'_, PolicyEngineState>,
    confirmation_type: ConfirmationType,
    granted_capabilities: Vec<CapabilityFamily>,
    persona: Option<String>,
) -> Result<Option<ConfirmationRequirement>, String> {
    // Step 1: Policy evaluation (structural rules — DENY blocks everything)
    {
        let engine = policy_engine.lock().await;
        let required = required_capability(&confirmation_type);
        let tool_name = confirmation_type.canonical_key();
        let decision = engine.evaluate(tool_name, persona.as_deref(), required);

        match decision.action {
            PolicyAction::Deny => {
                return Ok(Some(ConfirmationRequirement {
                    capability_required: required,
                    reason: format!("Denied by policy: {}", confirmation_reason(&confirmation_type)),
                    canonical_key: confirmation_type.canonical_key().to_string(),
                }));
            }
            PolicyAction::Allow => {
                return Ok(None); // Policy explicitly allows — no confirmation needed
            }
            PolicyAction::Confirm => {
                // Fall through to existing confirmation logic
            }
        }
    }

    // Step 2: Auto-approve check (session whitelist)
    let r = router.lock().await;
    if r.is_auto_approved(&confirmation_type) {
        return Ok(None);
    }

    // Step 3: Capability-based check
    let required = required_capability(&confirmation_type);
    if granted_capabilities.contains(&required) && required != CapabilityFamily::Destructive {
        return Ok(None);
    }

    // Step 4: Requires confirmation
    Ok(Some(ConfirmationRequirement {
        capability_required: required,
        reason: confirmation_reason(&confirmation_type),
        canonical_key: confirmation_type.canonical_key().to_string(),
    }))
}

/// Get the count of pending confirmations.
#[tauri::command]
pub async fn get_pending_confirmation_count(
    router: State<'_, ConfirmationRouterState>,
) -> Result<usize, String> {
    let r = router.lock().await;
    Ok(r.pending_count())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Result from check_confirmation_required when confirmation IS needed.
#[derive(Debug, Clone, Serialize)]
pub struct ConfirmationRequirement {
    pub capability_required: CapabilityFamily,
    pub reason: String,
    pub canonical_key: String,
}

/// Map a ConfirmationType to the CapabilityFamily it requires.
fn required_capability(ct: &ConfirmationType) -> CapabilityFamily {
    match ct {
        ConfirmationType::FileEdit { .. } => CapabilityFamily::WriteCode,
        ConfirmationType::FileCreate { .. } => CapabilityFamily::WriteCode,
        ConfirmationType::ShellExec { .. } => CapabilityFamily::Destructive,
        ConfirmationType::ApplyPatch { .. } => CapabilityFamily::WriteCode,
        ConfirmationType::McpTool { .. } => CapabilityFamily::External,
        ConfirmationType::AskUser { .. } => CapabilityFamily::ReadOnly,
        ConfirmationType::ExitSpecMode => CapabilityFamily::ReadOnly,
        ConfirmationType::ProposeMission { .. } => CapabilityFamily::WriteVault,
        ConfirmationType::StartMissionRun { .. } => CapabilityFamily::WriteCode,
    }
}

/// Generate a human-readable reason for why confirmation is needed.
fn confirmation_reason(ct: &ConfirmationType) -> String {
    match ct {
        ConfirmationType::FileEdit { path, .. } => {
            format!("Editing file: {}", path)
        }
        ConfirmationType::FileCreate { path } => {
            format!("Creating new file: {}", path)
        }
        ConfirmationType::ShellExec { command } => {
            format!("Executing shell command: {}", command)
        }
        ConfirmationType::ApplyPatch { file_count, .. } => {
            format!("Applying patch across {} files", file_count)
        }
        ConfirmationType::McpTool { server, tool_name } => {
            format!("Calling external tool: {}::{}", server, tool_name)
        }
        ConfirmationType::AskUser { .. } => "Asking a question (low risk)".to_string(),
        ConfirmationType::ExitSpecMode => "Switching interaction mode".to_string(),
        ConfirmationType::ProposeMission { title } => {
            format!("Proposing mission: {}", title)
        }
        ConfirmationType::StartMissionRun { mission_id } => {
            format!("Starting mission run: {}", mission_id)
        }
    }
}
