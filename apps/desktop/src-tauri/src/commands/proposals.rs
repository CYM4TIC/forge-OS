use serde::Deserialize;
use std::sync::Arc;
use tauri::{Emitter, State};
use tokio::sync::Mutex;
use ulid::Ulid;

use crate::database::Database;
use crate::proposals::decisions;
use crate::proposals::store::{
    self, Decision, DismissalRecord, DismissalType, FeedEntry,
    MissionState, Proposal, ProposalFilter, ProposalOutcome,
    ProposalSource, ProposalStatus, ProposalType,
};
use crate::proposals::triage;

// ── MissionState in-memory store ──

pub struct MissionStateHolder {
    pub state: MissionState,
}

impl Default for MissionStateHolder {
    fn default() -> Self {
        Self {
            state: MissionState::default(),
        }
    }
}

pub type MissionStateState = Arc<Mutex<MissionStateHolder>>;

// ── Request types ──

#[derive(Debug, Deserialize)]
pub struct FileProposalRequest {
    pub author: String,
    pub source: ProposalSource,
    pub proposal_type: ProposalType,
    pub scope: String,
    pub target: String,
    pub severity: String,
    pub title: String,
    pub body: String,
    pub evidence: Option<Vec<String>>,
    pub preconditions: Option<Vec<String>>,
    pub verification_steps: Option<Vec<String>>,
    pub fulfills: Option<Vec<String>>,
    pub session_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListProposalsRequest {
    pub author: Option<String>,
    pub proposal_type: Option<String>,
    pub status: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GetProposalFeedRequest {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub author: Option<String>,
    pub proposal_type: Option<String>,
    pub status: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMissionStateRequest {
    pub state: MissionState,
}

#[derive(Debug, Deserialize)]
pub struct EvaluateProposalRequest {
    pub id: String,
    pub response_body: String,
    pub author: String,
}

#[derive(Debug, Deserialize)]
pub struct ResolveProposalRequest {
    pub id: String,
    pub status: ProposalStatus,
    pub rationale: String,
    pub outcome: Option<ProposalOutcome>,
    pub implementing_batch: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DismissProposalRequest {
    pub id: String,
    pub dismissal_type: DismissalType,
    pub summary: String,
    pub justification: String,
}

#[derive(Debug, Deserialize)]
pub struct GetDecisionHistoryRequest {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct SearchProposalsRequest {
    pub query: String,
}

// ── Tauri commands ──

#[tauri::command]
pub fn file_proposal(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    request: FileProposalRequest,
) -> Result<Proposal, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Rate limit: max 3 per persona per session (automated exempt)
    // P-CRIT-2 fix: always enforce, even without session_id (falls back to 1-hour window)
    if request.source != ProposalSource::Automated {
        let count = store::count_proposals_by_author(
            &conn,
            &request.author,
            request.session_id.as_deref(),
        )
        .map_err(|e| e.to_string())?;
        if count >= 3 {
            return Err(format!(
                "Rate limit: {} has already filed 3 proposals this session",
                request.author
            ));
        }
    }

    let id = Ulid::new().to_string();
    let mut proposal = Proposal {
        id: id.clone(),
        author: request.author,
        source: request.source,
        proposal_type: request.proposal_type,
        scope: request.scope,
        target: request.target,
        severity: request.severity,
        title: request.title,
        body: request.body,
        evidence: request.evidence.unwrap_or_default(),
        status: ProposalStatus::Open,
        evaluators: Vec::new(),
        preconditions: request.preconditions.unwrap_or_default(),
        verification_steps: request.verification_steps.unwrap_or_default(),
        fulfills: request.fulfills,
        created_at: String::new(), // Not inserted — column omitted from INSERT, SQLite DEFAULT applies
        resolved_at: None,
        decision_trace_id: None,
    };

    // Auto-assign evaluators based on proposal scope
    proposal.evaluators = triage::auto_assign_evaluators(&proposal);

    store::create_proposal(&conn, &proposal).map_err(|e| e.to_string())?;

    // Re-read from DB to get SQLite-generated created_at
    let stored = store::get_proposal(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Proposal created but not found".to_string())?;

    let _ = app.emit("proposals:filed", &stored);
    Ok(stored)
}

#[tauri::command]
pub fn list_proposals(
    db: State<'_, Database>,
    request: ListProposalsRequest,
) -> Result<Vec<Proposal>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let filter = ProposalFilter {
        author: request.author,
        proposal_type: request.proposal_type,
        status: request.status,
        source: request.source,
    };
    store::list_proposals(&conn, &filter).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_proposal_feed(
    db: State<'_, Database>,
    request: GetProposalFeedRequest,
) -> Result<Vec<FeedEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let page = request.page.unwrap_or(0);
    let per_page = request.per_page.unwrap_or(20);
    let filter = ProposalFilter {
        author: request.author,
        proposal_type: request.proposal_type,
        status: request.status,
        source: request.source,
    };
    store::get_proposal_feed(&conn, page, per_page, &filter).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_mission_state(
    mission: State<'_, MissionStateState>,
) -> Result<MissionState, String> {
    let holder = mission.lock().await;
    Ok(holder.state)
}

#[tauri::command]
pub async fn update_mission_state(
    app: tauri::AppHandle,
    mission: State<'_, MissionStateState>,
    request: UpdateMissionStateRequest,
) -> Result<MissionState, String> {
    let mut holder = mission.lock().await;
    // P-MED-2 fix: validate state transitions
    if !holder.state.valid_transition(&request.state) {
        return Err(format!(
            "Invalid mission state transition: {} -> {}",
            holder.state.as_str(),
            request.state.as_str()
        ));
    }
    holder.state = request.state;
    let _ = app.emit("mission:state-changed", &holder.state);
    Ok(holder.state)
}

// ── P7-J: Triage + Decisions + Dismissals + Search ──

#[tauri::command]
pub fn evaluate_proposal(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    request: EvaluateProposalRequest,
) -> Result<store::ProposalResponse, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Verify proposal exists and transition to Evaluating if still Open
    let proposal = store::get_proposal(&conn, &request.id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Proposal not found: {}", request.id))?;

    if proposal.status == ProposalStatus::Open {
        store::update_proposal_status(
            &conn,
            &request.id,
            &ProposalStatus::Evaluating,
            None,
            None,
        )?;
    }

    let response_id = Ulid::new().to_string();
    let response = store::ProposalResponse {
        id: response_id,
        proposal_id: request.id,
        author: request.author,
        body: request.response_body,
        created_at: String::new(), // SQLite DEFAULT
    };

    store::add_response(&conn, &response).map_err(|e| e.to_string())?;

    // Re-read for SQLite-generated timestamp
    let stored = store::get_response(&conn, &response.id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Response created but not found".to_string())?;

    let _ = app.emit("proposals:feed-updated", &stored);
    Ok(stored)
}

#[tauri::command]
pub fn resolve_proposal(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    request: ResolveProposalRequest,
) -> Result<Decision, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let decision_id = Ulid::new().to_string();

    let decision = decisions::resolve_proposal(
        &conn,
        &request.id,
        &request.status,
        &request.rationale,
        request.outcome.as_ref(),
        request.implementing_batch.as_deref(),
        &decision_id,
    )?;

    let _ = app.emit("proposals:decision-made", &decision);
    let _ = app.emit("proposals:feed-updated", &decision);
    Ok(decision)
}

#[tauri::command]
pub fn dismiss_proposal(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    request: DismissProposalRequest,
) -> Result<DismissalRecord, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let dismissal_id = Ulid::new().to_string();

    let dismissal = decisions::dismiss_proposal(
        &conn,
        &dismissal_id,
        &request.id,
        &request.dismissal_type,
        &request.summary,
        &request.justification,
    )?;

    let _ = app.emit("proposals:feed-updated", &dismissal);
    Ok(dismissal)
}

#[tauri::command]
pub fn get_decision_history(
    db: State<'_, Database>,
    request: GetDecisionHistoryRequest,
) -> Result<Vec<Decision>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let page = request.page.unwrap_or(0);
    let per_page = request.per_page.unwrap_or(20);
    decisions::get_decision_history(&conn, page, per_page).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_proposals(
    db: State<'_, Database>,
    request: SearchProposalsRequest,
) -> Result<Vec<Proposal>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    store::search_proposals(&conn, &request.query).map_err(|e| e.to_string())
}
