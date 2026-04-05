use rusqlite::{params, Connection};

use super::types::{SwarmMessage, SwarmMessageType};
use crate::database::sanitize::SecretScrubber;

/// Send a message to an agent's mailbox.
/// P7.5-A: If a SecretScrubber is provided, payload is scrubbed before INSERT.
pub fn send_message(
    conn: &Connection,
    id: &str,
    from_agent: &str,
    to_agent: &str,
    msg_type: &SwarmMessageType,
    payload: &str,
) -> Result<(), rusqlite::Error> {
    send_message_scrubbed(conn, id, from_agent, to_agent, msg_type, payload, None)
}

/// Send a message with optional secret scrubbing.
pub fn send_message_scrubbed(
    conn: &Connection,
    id: &str,
    from_agent: &str,
    to_agent: &str,
    msg_type: &SwarmMessageType,
    payload: &str,
    scrubber: Option<&SecretScrubber>,
) -> Result<(), rusqlite::Error> {
    let scrubbed = match scrubber {
        Some(s) => s.scrub(payload),
        None => payload.to_string(),
    };
    conn.execute(
        "INSERT INTO mailbox (id, from_agent, to_agent, msg_type, payload)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, from_agent, to_agent, msg_type.as_str(), scrubbed],
    )?;
    Ok(())
}

/// Get all messages for an agent, optionally filtered by read status.
pub fn get_messages(
    conn: &Connection,
    to_agent: &str,
    unread_only: bool,
    limit: Option<u32>,
) -> Result<Vec<SwarmMessage>, rusqlite::Error> {
    let mut sql = String::from(
        "SELECT id, from_agent, to_agent, msg_type, payload, is_read, created_at
         FROM mailbox WHERE to_agent = ?1",
    );

    if unread_only {
        sql.push_str(" AND is_read = 0");
    }

    sql.push_str(" ORDER BY created_at DESC");

    if limit.is_some() {
        sql.push_str(" LIMIT ?2");
    }

    let mut stmt = conn.prepare(&sql)?;
    let rows = if let Some(lim) = limit {
        stmt.query_map(params![to_agent, lim], map_message_row)?
    } else {
        stmt.query_map(params![to_agent], map_message_row)?
    };
    rows.collect()
}

/// Mark a message as read.
pub fn mark_read(
    conn: &Connection,
    message_id: &str,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE mailbox SET is_read = 1 WHERE id = ?1",
        params![message_id],
    )?;
    Ok(())
}

/// Mark all messages for an agent as read.
pub fn mark_all_read(
    conn: &Connection,
    to_agent: &str,
) -> Result<u64, rusqlite::Error> {
    let count = conn.execute(
        "UPDATE mailbox SET is_read = 1 WHERE to_agent = ?1 AND is_read = 0",
        params![to_agent],
    )?;
    Ok(count as u64)
}

/// Count unread messages for an agent.
pub fn count_unread(
    conn: &Connection,
    to_agent: &str,
) -> Result<u64, rusqlite::Error> {
    conn.query_row(
        "SELECT COUNT(*) FROM mailbox WHERE to_agent = ?1 AND is_read = 0",
        params![to_agent],
        |row| row.get(0),
    )
}

/// Get a single message by ID.
pub fn get_message(
    conn: &Connection,
    id: &str,
) -> Result<Option<SwarmMessage>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, from_agent, to_agent, msg_type, payload, is_read, created_at
         FROM mailbox WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], map_message_row)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

/// Get pending permission requests for an agent (unread permission_request messages).
pub fn get_pending_permissions(
    conn: &Connection,
    to_agent: &str,
) -> Result<Vec<SwarmMessage>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, from_agent, to_agent, msg_type, payload, is_read, created_at
         FROM mailbox
         WHERE to_agent = ?1 AND msg_type = 'permission_request' AND is_read = 0
         ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map(params![to_agent], map_message_row)?;
    rows.collect()
}

/// Find a permission_response message whose payload contains the given request_id.
/// Directly queries the mailbox with targeted filtering — no O(n) scan.
pub fn get_permission_response_for_request(
    conn: &Connection,
    request_id: &str,
) -> Result<Option<SwarmMessage>, rusqlite::Error> {
    let pattern = format!("%\"request_id\":\"{}\"%" , request_id);
    let mut stmt = conn.prepare(
        "SELECT id, from_agent, to_agent, msg_type, payload, is_read, created_at
         FROM mailbox
         WHERE msg_type = 'permission_response' AND payload LIKE ?1
         ORDER BY created_at DESC
         LIMIT 1",
    )?;
    let mut rows = stmt.query_map(params![pattern], map_message_row)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

fn map_message_row(row: &rusqlite::Row) -> Result<SwarmMessage, rusqlite::Error> {
    Ok(SwarmMessage {
        id: row.get(0)?,
        from_agent: row.get(1)?,
        to_agent: row.get(2)?,
        msg_type: row.get(3)?,
        payload: row.get(4)?,
        is_read: row.get::<_, i32>(5)? != 0,
        created_at: row.get(6)?,
    })
}
