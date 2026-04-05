use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

// ── Session queries ──

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionRow {
    pub id: String,
    pub title: String,
    pub agent_id: Option<String>,
    pub provider_id: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

pub fn list_sessions(conn: &Connection) -> Result<Vec<SessionRow>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, title, agent_id, provider_id, status, created_at, updated_at
         FROM sessions WHERE status != 'deleted' ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(SessionRow {
            id: row.get(0)?,
            title: row.get(1)?,
            agent_id: row.get(2)?,
            provider_id: row.get(3)?,
            status: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn create_session(conn: &Connection, id: &str, title: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO sessions (id, title) VALUES (?1, ?2)",
        params![id, title],
    )?;
    Ok(())
}

pub fn get_session(conn: &Connection, id: &str) -> Result<Option<SessionRow>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, title, agent_id, provider_id, status, created_at, updated_at
         FROM sessions WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], |row| {
        Ok(SessionRow {
            id: row.get(0)?,
            title: row.get(1)?,
            agent_id: row.get(2)?,
            provider_id: row.get(3)?,
            status: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn delete_session(conn: &Connection, id: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE sessions SET status = 'deleted' WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

// ── Message queries ──

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageRow {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub tokens_in: Option<i64>,
    pub tokens_out: Option<i64>,
    pub status: String,
    pub created_at: String,
}

pub fn list_messages(conn: &Connection, session_id: &str) -> Result<Vec<MessageRow>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, role, content, model, provider, tokens_in, tokens_out, status, created_at
         FROM messages WHERE session_id = ?1 ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map(params![session_id], |row| {
        Ok(MessageRow {
            id: row.get(0)?,
            session_id: row.get(1)?,
            role: row.get(2)?,
            content: row.get(3)?,
            model: row.get(4)?,
            provider: row.get(5)?,
            tokens_in: row.get(6)?,
            tokens_out: row.get(7)?,
            status: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;
    rows.collect()
}

pub fn insert_message(
    conn: &Connection,
    id: &str,
    session_id: &str,
    role: &str,
    content: &str,
    model: Option<&str>,
    provider: Option<&str>,
    tokens_in: Option<i64>,
    tokens_out: Option<i64>,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO messages (id, session_id, role, content, model, provider, tokens_in, tokens_out)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, session_id, role, content, model, provider, tokens_in, tokens_out],
    )?;
    // Update session's updated_at
    conn.execute(
        "UPDATE sessions SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1",
        params![session_id],
    )?;
    Ok(())
}

// ── Settings queries ──

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, rusqlite::Error> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query_map(params![key], |row| row.get::<_, String>(0))?;
    match rows.next() {
        Some(val) => Ok(Some(val?)),
        None => Ok(None),
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
        params![key, value],
    )?;
    Ok(())
}

// ── Dispatch event audit trail ──

/// Log an agent dispatch lifecycle event for audit purposes.
/// P7.5-A: If a SecretScrubber is provided, metadata_json is scrubbed before INSERT.
pub fn log_dispatch_event(
    conn: &Connection,
    dispatch_id: &str,
    agent_slug: &str,
    event_type: &str,
    metadata_json: &str,
) -> Result<(), rusqlite::Error> {
    log_dispatch_event_scrubbed(conn, dispatch_id, agent_slug, event_type, metadata_json, None)
}

/// Log a dispatch event with optional secret scrubbing.
pub fn log_dispatch_event_scrubbed(
    conn: &Connection,
    dispatch_id: &str,
    agent_slug: &str,
    event_type: &str,
    metadata_json: &str,
    scrubber: Option<&super::sanitize::SecretScrubber>,
) -> Result<(), rusqlite::Error> {
    let id = uuid::Uuid::new_v4().to_string();
    let scrubbed = match scrubber {
        Some(s) => s.scrub(metadata_json),
        None => metadata_json.to_string(),
    };
    conn.execute(
        "INSERT INTO dispatch_events (id, dispatch_id, agent_slug, event_type, metadata_json)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, dispatch_id, agent_slug, event_type, scrubbed],
    )?;
    Ok(())
}
