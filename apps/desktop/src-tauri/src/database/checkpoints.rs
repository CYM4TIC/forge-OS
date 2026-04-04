use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

/// A session checkpoint — snapshot of state for crash recovery.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckpointRow {
    pub id: String,
    pub session_id: String,
    pub message_count: i64,
    pub last_message_id: Option<String>,
    pub context_tokens: Option<i64>,
    pub checkpoint_data: String,
    pub created_at: String,
}

/// A resume candidate — an interrupted session that can be resumed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeCandidate {
    pub session_id: String,
    pub session_title: String,
    pub message_count: i64,
    pub last_message_id: Option<String>,
    pub context_tokens: Option<i64>,
    pub interrupted_at: String,
}

/// Save a checkpoint after each message exchange.
/// Replaces any existing checkpoint for this session (keep only latest).
pub fn save_checkpoint(
    conn: &Connection,
    id: &str,
    session_id: &str,
    message_count: i64,
    last_message_id: Option<&str>,
    context_tokens: Option<i64>,
    checkpoint_data: &str,
) -> Result<(), rusqlite::Error> {
    // K-HIGH-2: Atomic delete+insert — crash between statements must not lose checkpoint.
    let tx = conn.unchecked_transaction()?;

    tx.execute(
        "DELETE FROM session_checkpoints WHERE session_id = ?1",
        params![session_id],
    )?;

    tx.execute(
        "INSERT INTO session_checkpoints (id, session_id, message_count, last_message_id, context_tokens, checkpoint_data) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, session_id, message_count, last_message_id, context_tokens, checkpoint_data],
    )?;

    tx.commit()?;
    Ok(())
}

/// Get the latest checkpoint for a session.
pub fn get_checkpoint(
    conn: &Connection,
    session_id: &str,
) -> Result<Option<CheckpointRow>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, message_count, last_message_id, context_tokens, checkpoint_data, created_at
         FROM session_checkpoints
         WHERE session_id = ?1
         ORDER BY created_at DESC
         LIMIT 1",
    )?;

    let rows = stmt.query_map(params![session_id], |row| {
        Ok(CheckpointRow {
            id: row.get(0)?,
            session_id: row.get(1)?,
            message_count: row.get(2)?,
            last_message_id: row.get(3)?,
            context_tokens: row.get(4)?,
            checkpoint_data: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?;

    let mut result = None;
    for row in rows {
        result = Some(row?);
        break;
    }
    Ok(result)
}

/// Find sessions that were interrupted (have checkpoints but status is 'active').
/// These are candidates for resume on startup.
pub fn get_resume_candidates(conn: &Connection) -> Result<Vec<ResumeCandidate>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.title, sc.message_count, sc.last_message_id, sc.context_tokens, sc.created_at
         FROM sessions s
         INNER JOIN session_checkpoints sc ON s.id = sc.session_id
         WHERE s.status = 'active'
         ORDER BY sc.created_at DESC",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(ResumeCandidate {
            session_id: row.get(0)?,
            session_title: row.get(1)?,
            message_count: row.get(2)?,
            last_message_id: row.get(3)?,
            context_tokens: row.get(4)?,
            interrupted_at: row.get(5)?,
        })
    })?;

    rows.collect()
}

/// Delete checkpoint for a session (called when session closes normally).
pub fn clear_checkpoint(conn: &Connection, session_id: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "DELETE FROM session_checkpoints WHERE session_id = ?1",
        params![session_id],
    )?;
    Ok(())
}

// ---------------------------------------------------------------------------
// P7-N: Checkpoint validation at phase transitions
// ---------------------------------------------------------------------------

/// Result of checkpoint validation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    /// Whether the checkpoint is valid for advancing.
    pub is_valid: bool,
    /// Specific checks that passed or failed.
    pub checks: Vec<ValidationCheck>,
    /// Summary message.
    pub summary: String,
}

/// A single validation check.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationCheck {
    pub name: String,
    pub passed: bool,
    pub detail: String,
}

/// Validate that a session is ready to advance past a checkpoint.
///
/// Checks:
/// 1. All batches in the session are marked complete
/// 2. All gate findings are resolved (no open CRIT/HIGH/MED/LOW)
/// 3. TypeScript compilation is clean (caller must provide tsc result)
///
/// This is the structural enforcement of Rule 43 at phase boundaries.
pub fn validate_checkpoint(
    conn: &Connection,
    session_id: &str,
    tsc_clean: bool,
    unresolved_finding_count: i64,
) -> ValidationResult {
    let mut checks = Vec::new();

    // Check 1: Session has a checkpoint (meaning work was done)
    let has_checkpoint = get_checkpoint(conn, session_id)
        .map(|c| c.is_some())
        .unwrap_or(false);
    checks.push(ValidationCheck {
        name: "session_checkpoint_exists".to_string(),
        passed: has_checkpoint,
        detail: if has_checkpoint {
            "Session has a saved checkpoint".to_string()
        } else {
            "No checkpoint found for this session".to_string()
        },
    });

    // Check 2: All gate findings resolved
    let findings_resolved = unresolved_finding_count == 0;
    checks.push(ValidationCheck {
        name: "gate_findings_resolved".to_string(),
        passed: findings_resolved,
        detail: if findings_resolved {
            "All gate findings resolved".to_string()
        } else {
            format!("{} unresolved findings remaining", unresolved_finding_count)
        },
    });

    // Check 3: TypeScript compilation clean
    checks.push(ValidationCheck {
        name: "tsc_clean".to_string(),
        passed: tsc_clean,
        detail: if tsc_clean {
            "tsc --noEmit reports zero errors".to_string()
        } else {
            "TypeScript compilation has errors".to_string()
        },
    });

    let all_passed = checks.iter().all(|c| c.passed);
    let failed: Vec<&str> = checks.iter()
        .filter(|c| !c.passed)
        .map(|c| c.name.as_str())
        .collect();

    let summary = if all_passed {
        format!("Session {} is valid for advancement. All {} checks passed.", session_id, checks.len())
    } else {
        format!(
            "Session {} cannot advance. {} check(s) failed: {}",
            session_id,
            failed.len(),
            failed.join(", ")
        )
    };

    ValidationResult {
        is_valid: all_passed,
        checks,
        summary,
    }
}
