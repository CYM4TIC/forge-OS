use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FindingRow {
    pub id: String,
    pub session_id: Option<String>,
    pub agent_slug: String,
    pub severity: String,
    pub category: String,
    pub description: String,
    pub evidence: Option<String>,
    pub status: String,
    pub batch_ref: Option<String>,
    pub created_at: String,
}

pub fn list_findings(conn: &Connection, batch_ref: Option<&str>) -> Result<Vec<FindingRow>, rusqlite::Error> {
    let sql = if batch_ref.is_some() {
        "SELECT id, session_id, agent_slug, severity, category, description,
                evidence, status, batch_ref, created_at
         FROM findings WHERE batch_ref = ?1 ORDER BY created_at DESC"
    } else {
        "SELECT id, session_id, agent_slug, severity, category, description,
                evidence, status, batch_ref, created_at
         FROM findings ORDER BY created_at DESC"
    };

    let mut stmt = conn.prepare(sql)?;
    let rows = if let Some(ref_id) = batch_ref {
        stmt.query_map(params![ref_id], map_finding)?
    } else {
        stmt.query_map([], map_finding)?
    };
    rows.collect()
}

pub fn list_open_findings(conn: &Connection) -> Result<Vec<FindingRow>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, agent_slug, severity, category, description,
                evidence, status, batch_ref, created_at
         FROM findings WHERE status = 'open' ORDER BY
            CASE severity
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
                WHEN 'info' THEN 4
            END, created_at DESC",
    )?;
    let rows = stmt.query_map([], map_finding)?;
    rows.collect()
}

pub fn add_finding(
    conn: &Connection,
    id: &str,
    agent_slug: &str,
    severity: &str,
    category: &str,
    description: &str,
    evidence: Option<&str>,
    session_id: Option<&str>,
    batch_ref: Option<&str>,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO findings (id, agent_slug, severity, category, description, evidence, session_id, batch_ref)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, agent_slug, severity, category, description, evidence, session_id, batch_ref],
    )?;
    Ok(())
}

pub fn resolve_finding(conn: &Connection, id: &str, status: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE findings SET status = ?2 WHERE id = ?1",
        params![id, status],
    )?;
    Ok(())
}

pub fn count_by_severity(conn: &Connection, batch_ref: Option<&str>) -> Result<SeverityCounts, rusqlite::Error> {
    let (sql, has_param) = if batch_ref.is_some() {
        ("SELECT severity, COUNT(*) FROM findings WHERE batch_ref = ?1 GROUP BY severity", true)
    } else {
        ("SELECT severity, COUNT(*) FROM findings GROUP BY severity", false)
    };

    let mut stmt = conn.prepare(sql)?;
    let mut counts = SeverityCounts::default();

    let rows: Vec<(String, i64)> = if has_param {
        stmt.query_map(params![batch_ref.unwrap()], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?.collect::<Result<Vec<_>, _>>()?
    } else {
        stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?.collect::<Result<Vec<_>, _>>()?
    };

    for (severity, count) in rows {
        match severity.as_str() {
            "critical" => counts.critical = count,
            "high" => counts.high = count,
            "medium" => counts.medium = count,
            "low" => counts.low = count,
            "info" => counts.info = count,
            _ => {}
        }
    }
    Ok(counts)
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SeverityCounts {
    pub critical: i64,
    pub high: i64,
    pub medium: i64,
    pub low: i64,
    pub info: i64,
}

fn map_finding(row: &rusqlite::Row) -> rusqlite::Result<FindingRow> {
    Ok(FindingRow {
        id: row.get(0)?,
        session_id: row.get(1)?,
        agent_slug: row.get(2)?,
        severity: row.get(3)?,
        category: row.get(4)?,
        description: row.get(5)?,
        evidence: row.get(6)?,
        status: row.get(7)?,
        batch_ref: row.get(8)?,
        created_at: row.get(9)?,
    })
}
