use rusqlite::{params, Connection};

use crate::proposals::store::{
    self, Decision, DismissalRecord, DismissalType,
    ProposalOutcome, ProposalStatus,
};

// ── Decision creation ──

/// Create a decision record when a proposal is Accepted or Rejected.
/// Transitions proposal status, creates decision entry, links via decision_trace_id.
pub fn resolve_proposal(
    conn: &Connection,
    proposal_id: &str,
    status: &ProposalStatus,
    rationale: &str,
    outcome: Option<&ProposalOutcome>,
    implementing_batch: Option<&str>,
    decision_id: &str,
) -> Result<Decision, String> {
    // Only Accepted or Rejected are valid resolution statuses
    if *status != ProposalStatus::Accepted && *status != ProposalStatus::Rejected {
        return Err(format!(
            "resolve_proposal requires Accepted or Rejected, got: {}",
            status.as_str()
        ));
    }

    // Validate state before transaction
    let proposal = store::get_proposal(conn, proposal_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Proposal not found: {}", proposal_id))?;

    if proposal.status != ProposalStatus::Evaluating {
        return Err(format!(
            "Cannot resolve proposal in status '{}' — must be 'evaluating'",
            proposal.status.as_str()
        ));
    }

    let now = chrono_now();
    let resolution = match status {
        ProposalStatus::Accepted => "accepted",
        ProposalStatus::Rejected => "rejected",
        _ => unreachable!(),
    };
    let outcome_str = outcome.map(|o| o.as_str().to_string());

    // Atomic: status update + decision insert in a single transaction
    conn.execute_batch("BEGIN IMMEDIATE;").map_err(|e| e.to_string())?;

    let tx_result = (|| -> Result<(), String> {
        store::update_proposal_status(
            conn,
            proposal_id,
            status,
            Some(&now),
            Some(decision_id),
        )?;

        conn.execute(
            "INSERT INTO decisions (id, proposal_id, resolution, rationale, implementing_batch, outcome_tracking, outcome, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                decision_id,
                proposal_id,
                resolution,
                rationale,
                implementing_batch,
                Option::<String>::None,
                outcome_str,
                now,
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    })();

    match tx_result {
        Ok(()) => {
            conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;
        }
        Err(e) => {
            let _ = conn.execute_batch("ROLLBACK;");
            return Err(e);
        }
    }

    // Read back the created decision
    store::get_decision_by_proposal(conn, proposal_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Decision created but not found".to_string())
}

// ── Dismissal creation ──

/// Dismiss a proposal with explicit justification.
/// Creates a dismissal record in SQLite. Only Open or Evaluating proposals can be dismissed.
/// Accepted/Rejected proposals have completed the lifecycle. One dismissal per proposal.
pub fn dismiss_proposal(
    conn: &Connection,
    dismissal_id: &str,
    proposal_id: &str,
    dismissal_type: &DismissalType,
    summary: &str,
    justification: &str,
) -> Result<DismissalRecord, String> {
    // Verify proposal exists and is in a dismissable state
    let proposal = store::get_proposal(conn, proposal_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Proposal not found: {}", proposal_id))?;

    if proposal.status == ProposalStatus::Accepted || proposal.status == ProposalStatus::Rejected {
        return Err(format!(
            "Cannot dismiss resolved proposal (status: {})",
            proposal.status.as_str()
        ));
    }

    // One dismissal per proposal — check for existing
    let existing = list_dismissals_for_proposal(conn, proposal_id)
        .map_err(|e| e.to_string())?;
    if !existing.is_empty() {
        return Err(format!(
            "Proposal {} already has a dismissal record",
            proposal_id
        ));
    }

    let now = chrono_now();

    conn.execute(
        "INSERT INTO dismissals (id, proposal_id, dismissal_type, summary, justification, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            dismissal_id,
            proposal_id,
            dismissal_type.as_str(),
            summary,
            justification,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Read back
    get_dismissal(conn, dismissal_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Dismissal created but not found".to_string())
}

/// Get a single dismissal by ID.
pub fn get_dismissal(
    conn: &Connection,
    id: &str,
) -> Result<Option<DismissalRecord>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, proposal_id, dismissal_type, summary, justification, created_at
         FROM dismissals WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], store::row_to_dismissal)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

/// List dismissals for a proposal.
pub fn list_dismissals_for_proposal(
    conn: &Connection,
    proposal_id: &str,
) -> Result<Vec<DismissalRecord>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, proposal_id, dismissal_type, summary, justification, created_at
         FROM dismissals WHERE proposal_id = ?1 ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map(params![proposal_id], store::row_to_dismissal)?;
    rows.collect()
}

/// Get decision history — paginated list of all decisions.
pub fn get_decision_history(
    conn: &Connection,
    page: i64,
    per_page: i64,
) -> Result<Vec<Decision>, rusqlite::Error> {
    let offset = page * per_page;
    let mut stmt = conn.prepare(
        "SELECT id, proposal_id, resolution, rationale, implementing_batch, outcome_tracking, outcome, created_at
         FROM decisions ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
    )?;
    let rows = stmt.query_map(params![per_page, offset], store::row_to_decision)?;
    rows.collect()
}

/// UTC ISO 8601 timestamp (matches SQLite default format and hud/findings.rs pattern).
fn chrono_now() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}
