use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchRow {
    pub id: String,
    pub session_id: Option<String>,
    pub batch_id: String,
    pub status: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub findings_count: i64,
    pub files_modified: String,
    pub handoff: Option<String>,
    pub created_at: String,
}

pub fn list_batches(conn: &Connection) -> Result<Vec<BatchRow>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, batch_id, status, started_at, completed_at,
                findings_count, files_modified, handoff, created_at
         FROM batches ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(BatchRow {
            id: row.get(0)?,
            session_id: row.get(1)?,
            batch_id: row.get(2)?,
            status: row.get(3)?,
            started_at: row.get(4)?,
            completed_at: row.get(5)?,
            findings_count: row.get(6)?,
            files_modified: row.get(7)?,
            handoff: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;
    rows.collect()
}

pub fn get_batch(conn: &Connection, id: &str) -> Result<Option<BatchRow>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, batch_id, status, started_at, completed_at,
                findings_count, files_modified, handoff, created_at
         FROM batches WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], |row| {
        Ok(BatchRow {
            id: row.get(0)?,
            session_id: row.get(1)?,
            batch_id: row.get(2)?,
            status: row.get(3)?,
            started_at: row.get(4)?,
            completed_at: row.get(5)?,
            findings_count: row.get(6)?,
            files_modified: row.get(7)?,
            handoff: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn create_batch(
    conn: &Connection,
    id: &str,
    batch_id: &str,
    session_id: Option<&str>,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO batches (id, batch_id, session_id, status, started_at)
         VALUES (?1, ?2, ?3, 'in_progress', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
        params![id, batch_id, session_id],
    )?;
    Ok(())
}

pub fn complete_batch(
    conn: &Connection,
    id: &str,
    files_modified: &str,
    handoff: Option<&str>,
) -> Result<(), rusqlite::Error> {
    // Count findings for this batch
    let findings_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM findings WHERE batch_ref = ?1",
        params![id],
        |row| row.get(0),
    )?;

    conn.execute(
        "UPDATE batches SET status = 'complete',
                completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                findings_count = ?2,
                files_modified = ?3,
                handoff = ?4
         WHERE id = ?1",
        params![id, findings_count, files_modified, handoff],
    )?;
    Ok(())
}

pub fn block_batch(conn: &Connection, id: &str, reason: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE batches SET status = 'blocked', handoff = ?2 WHERE id = ?1",
        params![id, reason],
    )?;
    Ok(())
}
