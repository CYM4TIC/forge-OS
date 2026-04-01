use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskRow {
    pub id: String,
    pub description: String,
    pub severity: String,
    pub batch_id: Option<String>,
    pub resolved_at: Option<String>,
    pub created_at: String,
}

pub fn list_risks(conn: &Connection, include_resolved: bool) -> Result<Vec<RiskRow>, rusqlite::Error> {
    let sql = if include_resolved {
        "SELECT id, description, severity, batch_id, resolved_at, created_at
         FROM risks ORDER BY
            CASE severity
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
            END, created_at DESC"
    } else {
        "SELECT id, description, severity, batch_id, resolved_at, created_at
         FROM risks WHERE resolved_at IS NULL ORDER BY
            CASE severity
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
            END, created_at DESC"
    };

    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([], |row| {
        Ok(RiskRow {
            id: row.get(0)?,
            description: row.get(1)?,
            severity: row.get(2)?,
            batch_id: row.get(3)?,
            resolved_at: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;
    rows.collect()
}

pub fn add_risk(
    conn: &Connection,
    id: &str,
    description: &str,
    severity: &str,
    batch_id: Option<&str>,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO risks (id, description, severity, batch_id)
         VALUES (?1, ?2, ?3, ?4)",
        params![id, description, severity, batch_id],
    )?;
    Ok(())
}

pub fn resolve_risk(conn: &Connection, id: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE risks SET resolved_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}
