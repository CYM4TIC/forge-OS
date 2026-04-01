use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

use crate::build_state::{batches, findings, risks, generator};
use crate::database::Database;

// ── Build state overview ──

#[derive(serde::Serialize)]
pub struct BuildStateOverview {
    pub batches: Vec<batches::BatchRow>,
    pub open_findings: Vec<findings::FindingRow>,
    pub open_risks: Vec<risks::RiskRow>,
    pub severity_counts: findings::SeverityCounts,
}

#[tauri::command]
pub fn get_build_state(db: State<'_, Database>) -> Result<BuildStateOverview, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    Ok(BuildStateOverview {
        batches: batches::list_batches(&conn).map_err(|e| e.to_string())?,
        open_findings: findings::list_open_findings(&conn).map_err(|e| e.to_string())?,
        open_risks: risks::list_risks(&conn, false).map_err(|e| e.to_string())?,
        severity_counts: findings::count_by_severity(&conn, None).map_err(|e| e.to_string())?,
    })
}

// ── Batch commands ──

#[derive(Debug, Deserialize)]
pub struct CreateBatchRequest {
    pub batch_id: String,
    pub session_id: Option<String>,
}

#[tauri::command]
pub fn create_batch(db: State<'_, Database>, request: CreateBatchRequest) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    batches::create_batch(&conn, &id, &request.batch_id, request.session_id.as_deref())
        .map_err(|e| e.to_string())?;
    Ok(id)
}

#[derive(Debug, Deserialize)]
pub struct CompleteBatchRequest {
    pub id: String,
    pub files_modified: String,
    pub handoff: Option<String>,
}

#[tauri::command]
pub fn complete_batch(db: State<'_, Database>, request: CompleteBatchRequest) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    batches::complete_batch(&conn, &request.id, &request.files_modified, request.handoff.as_deref())
        .map_err(|e| e.to_string())
}

// ── Finding commands ──

#[derive(Debug, Deserialize)]
pub struct AddFindingRequest {
    pub agent_slug: String,
    pub severity: findings::FindingSeverity,
    pub category: String,
    pub description: String,
    pub evidence: Option<String>,
    pub session_id: Option<String>,
    pub batch_ref: Option<String>,
}

#[tauri::command]
pub fn add_finding(db: State<'_, Database>, request: AddFindingRequest) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    findings::add_finding(
        &conn,
        &id,
        &request.agent_slug,
        request.severity.as_str(),
        &request.category,
        &request.description,
        request.evidence.as_deref(),
        request.session_id.as_deref(),
        request.batch_ref.as_deref(),
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn resolve_finding(db: State<'_, Database>, id: String, status: findings::FindingStatus) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    findings::resolve_finding(&conn, &id, status.as_str()).map_err(|e| e.to_string())
}

// ── BOOT.md generator ──

#[tauri::command]
pub fn generate_boot_md(db: State<'_, Database>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    generator::generate_boot_md(&conn).map_err(|e| e.to_string())
}
