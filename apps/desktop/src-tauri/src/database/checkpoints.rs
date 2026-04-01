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
    // Delete old checkpoints for this session
    conn.execute(
        "DELETE FROM session_checkpoints WHERE session_id = ?1",
        params![session_id],
    )?;

    // Insert new checkpoint
    conn.execute(
        "INSERT INTO session_checkpoints (id, session_id, message_count, last_message_id, context_tokens, checkpoint_data) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, session_id, message_count, last_message_id, context_tokens, checkpoint_data],
    )?;

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
