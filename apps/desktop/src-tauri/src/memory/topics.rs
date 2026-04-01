use rusqlite::{params, Connection};

use super::types::{MemoryTopicEntry, MemoryType};

/// Create a new consolidated topic entry.
/// Topics are created during dream consolidation from daily log entries.
pub fn create_topic(
    conn: &Connection,
    id: &str,
    memory_type: &MemoryType,
    name: &str,
    description: &str,
    content: &str,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO memory_topics (id, memory_type, name, description, content)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, memory_type.as_str(), name, description, content],
    )?;
    Ok(())
}

/// Update an existing topic's content and description.
pub fn update_topic(
    conn: &Connection,
    id: &str,
    description: Option<&str>,
    content: Option<&str>,
) -> Result<(), rusqlite::Error> {
    if let Some(desc) = description {
        conn.execute(
            "UPDATE memory_topics SET description = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?2",
            params![desc, id],
        )?;
    }
    if let Some(cont) = content {
        conn.execute(
            "UPDATE memory_topics SET content = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?2",
            params![cont, id],
        )?;
    }
    Ok(())
}

/// Get a single topic by ID.
pub fn get_topic(
    conn: &Connection,
    id: &str,
) -> Result<Option<MemoryTopicEntry>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, memory_type, name, description, content, is_active, created_at, updated_at
         FROM memory_topics WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], map_topic_row)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

/// List all active topics, optionally filtered by memory type.
pub fn list_topics(
    conn: &Connection,
    memory_type: Option<&MemoryType>,
    include_inactive: bool,
) -> Result<Vec<MemoryTopicEntry>, rusqlite::Error> {
    let mut sql = String::from(
        "SELECT id, memory_type, name, description, content, is_active, created_at, updated_at
         FROM memory_topics WHERE 1=1",
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut param_idx = 1u32;

    if !include_inactive {
        sql.push_str(" AND is_active = 1");
    }

    if let Some(mt) = memory_type {
        sql.push_str(&format!(" AND memory_type = ?{}", param_idx));
        param_values.push(Box::new(mt.as_str().to_string()));
        param_idx += 1;
    }

    let _ = param_idx; // suppress unused warning

    sql.push_str(" ORDER BY memory_type ASC, name ASC");

    let mut stmt = conn.prepare(&sql)?;
    let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(params_ref.as_slice(), map_topic_row)?;
    rows.collect()
}

/// Deactivate a topic (soft delete — preserved for history).
pub fn deactivate_topic(
    conn: &Connection,
    id: &str,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE memory_topics SET is_active = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

/// Count active topics by type.
pub fn count_topics_by_type(
    conn: &Connection,
) -> Result<Vec<(String, u64)>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT memory_type, COUNT(*) FROM memory_topics WHERE is_active = 1 GROUP BY memory_type ORDER BY memory_type",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, u64>(1)?))
    })?;
    rows.collect()
}

fn map_topic_row(row: &rusqlite::Row) -> Result<MemoryTopicEntry, rusqlite::Error> {
    Ok(MemoryTopicEntry {
        id: row.get(0)?,
        memory_type: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        content: row.get(4)?,
        is_active: row.get::<_, i32>(5)? != 0,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}
