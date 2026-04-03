use serde::Deserialize;
use std::sync::Arc;
use tauri::{Emitter, State};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::database::Database;
use crate::proposals::store::{
    self, FeedEntry, MissionState, Proposal, ProposalFilter,
    ProposalSource, ProposalStatus, ProposalType,
};

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

    let id = Uuid::new_v4().to_string();
    let proposal = Proposal {
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
        created_at: String::new(), // SQLite default
        resolved_at: None,
        decision_trace_id: None,
    };

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
