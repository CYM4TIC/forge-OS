use rusqlite::{params, Connection};

use super::types::{MemoryLogEntry, MemoryType};

/// Append a new entry to the daily log.
/// Each persona appends during work — no merge conflicts.
/// Daily logs are append-only: never edited, only consolidated during dream.
pub fn append_log(
    conn: &Connection,
    id: &str,
    persona_id: &str,
    memory_type: &MemoryType,
    content: &str,
    log_date: &str,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO memory_logs (id, persona_id, memory_type, content, log_date)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, persona_id, memory_type.as_str(), content, log_date],
    )?;
    Ok(())
}

/// Get all log entries for a specific date, ordered by creation time.
pub fn get_daily_log(
    conn: &Connection,
    log_date: &str,
) -> Result<Vec<MemoryLogEntry>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, persona_id, memory_type, content, log_date, created_at
         FROM memory_logs
         WHERE log_date = ?1
         ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map(params![log_date], |row| {
        Ok(MemoryLogEntry {
            id: row.get(0)?,
            persona_id: row.get(1)?,
            memory_type: row.get(2)?,
            content: row.get(3)?,
            log_date: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;
    rows.collect()
}

/// Query log entries with optional filters.
/// Supports filtering by persona_id, memory_type, and date range.
pub fn query_logs(
    conn: &Connection,
    persona_id: Option<&str>,
    memory_type: Option<&MemoryType>,
    date_from: Option<&str>,
    date_to: Option<&str>,
    limit: Option<u32>,
) -> Result<Vec<MemoryLogEntry>, rusqlite::Error> {
    let mut sql = String::from(
        "SELECT id, persona_id, memory_type, content, log_date, created_at
         FROM memory_logs WHERE 1=1",
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut param_idx = 1u32;

    if let Some(pid) = persona_id {
        sql.push_str(&format!(" AND persona_id = ?{}", param_idx));
        param_values.push(Box::new(pid.to_string()));
        param_idx += 1;
    }

    if let Some(mt) = memory_type {
        sql.push_str(&format!(" AND memory_type = ?{}", param_idx));
        param_values.push(Box::new(mt.as_str().to_string()));
        param_idx += 1;
    }

    if let Some(df) = date_from {
        sql.push_str(&format!(" AND log_date >= ?{}", param_idx));
        param_values.push(Box::new(df.to_string()));
        param_idx += 1;
    }

    if let Some(dt) = date_to {
        sql.push_str(&format!(" AND log_date <= ?{}", param_idx));
        param_values.push(Box::new(dt.to_string()));
        param_idx += 1;
    }

    sql.push_str(" ORDER BY created_at DESC");

    if let Some(lim) = limit {
        sql.push_str(&format!(" LIMIT ?{}", param_idx));
        param_values.push(Box::new(lim));
    }

    let mut stmt = conn.prepare(&sql)?;
    let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(params_ref.as_slice(), |row| {
        Ok(MemoryLogEntry {
            id: row.get(0)?,
            persona_id: row.get(1)?,
            memory_type: row.get(2)?,
            content: row.get(3)?,
            log_date: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;
    rows.collect()
}

/// Count total log entries, optionally filtered by date.
pub fn count_logs(
    conn: &Connection,
    date_from: Option<&str>,
) -> Result<u64, rusqlite::Error> {
    let (sql, params_vec): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = if let Some(df) = date_from {
        (
            "SELECT COUNT(*) FROM memory_logs WHERE log_date >= ?1".to_string(),
            vec![Box::new(df.to_string())],
        )
    } else {
        ("SELECT COUNT(*) FROM memory_logs".to_string(), vec![])
    };

    let params_ref: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    conn.query_row(&sql, params_ref.as_slice(), |row| row.get(0))
}

/// Get distinct log dates, most recent first.
pub fn list_log_dates(
    conn: &Connection,
    limit: Option<u32>,
) -> Result<Vec<String>, rusqlite::Error> {
    let sql = if let Some(lim) = limit {
        format!(
            "SELECT DISTINCT log_date FROM memory_logs ORDER BY log_date DESC LIMIT {}",
            lim
        )
    } else {
        "SELECT DISTINCT log_date FROM memory_logs ORDER BY log_date DESC".to_string()
    };
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], |row| row.get(0))?;
    rows.collect()
}
