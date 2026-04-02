use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::events::{self, HudEvent, HudFinding, FindingResolvedEvent};

/// Filter options for listing findings.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct FindingsFilter {
    pub session_id: Option<String>,
    pub batch_id: Option<String>,
    pub severity: Option<String>,
    pub persona: Option<String>,
    pub status: Option<String>,
}

/// Severity counts for badge display.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct HudSeverityCounts {
    pub critical: i64,
    pub high: i64,
    pub medium: i64,
    pub low: i64,
    pub info: i64,
    pub total: i64,
}

/// Insert a new finding into hud_findings and emit FindingAdded event.
pub fn insert_finding<R: tauri::Runtime>(
    conn: &Connection,
    app: &tauri::AppHandle<R>,
    finding: &HudFinding,
) -> Result<HudFinding, String> {
    let id = if finding.id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        finding.id.clone()
    };

    conn.execute(
        "INSERT INTO hud_findings (id, session_id, batch_id, severity, persona, title, description, status, file_path, line_number)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            id,
            finding.session_id,
            finding.batch_id,
            finding.severity,
            finding.persona,
            finding.title,
            finding.description,
            finding.status,
            finding.file_path,
            finding.line_number,
        ],
    ).map_err(|e| format!("Failed to insert finding: {e}"))?;

    // Read back the full row to get defaults (created_at, etc.)
    let inserted = get_finding(conn, &id)?;

    events::emit_hud_event(app, &HudEvent::FindingAdded(inserted.clone()));

    Ok(inserted)
}

/// Resolve a finding by ID. Sets status = 'resolved' and resolved_at = now.
pub fn resolve_finding<R: tauri::Runtime>(
    conn: &Connection,
    app: &tauri::AppHandle<R>,
    finding_id: &str,
) -> Result<(), String> {
    let now = chrono_now();
    let rows = conn.execute(
        "UPDATE hud_findings SET status = 'resolved', resolved_at = ?1 WHERE id = ?2",
        params![now, finding_id],
    ).map_err(|e| format!("Failed to resolve finding: {e}"))?;

    if rows == 0 {
        return Err(format!("Finding not found: {finding_id}"));
    }

    events::emit_hud_event(app, &HudEvent::FindingResolved(FindingResolvedEvent {
        finding_id: finding_id.to_string(),
        resolved_at: now,
    }));

    Ok(())
}

/// List findings with optional filters.
pub fn list_findings(conn: &Connection, filter: &FindingsFilter) -> Result<Vec<HudFinding>, String> {
    let mut sql = String::from(
        "SELECT id, session_id, batch_id, severity, persona, title, description, status, file_path, line_number, created_at, resolved_at
         FROM hud_findings WHERE 1=1"
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(ref v) = filter.session_id {
        sql.push_str(&format!(" AND session_id = ?{idx}"));
        param_values.push(Box::new(v.clone()));
        idx += 1;
    }
    if let Some(ref v) = filter.batch_id {
        sql.push_str(&format!(" AND batch_id = ?{idx}"));
        param_values.push(Box::new(v.clone()));
        idx += 1;
    }
    if let Some(ref v) = filter.severity {
        sql.push_str(&format!(" AND severity = ?{idx}"));
        param_values.push(Box::new(v.clone()));
        idx += 1;
    }
    if let Some(ref v) = filter.persona {
        sql.push_str(&format!(" AND persona = ?{idx}"));
        param_values.push(Box::new(v.clone()));
        idx += 1;
    }
    if let Some(ref v) = filter.status {
        sql.push_str(&format!(" AND status = ?{idx}"));
        param_values.push(Box::new(v.clone()));
        idx += 1;
    }
    let _ = idx; // suppress unused warning

    sql.push_str(" ORDER BY created_at DESC");

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&sql)
        .map_err(|e| format!("Failed to prepare findings query: {e}"))?;

    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(HudFinding {
            id: row.get(0)?,
            session_id: row.get(1)?,
            batch_id: row.get(2)?,
            severity: row.get(3)?,
            persona: row.get(4)?,
            title: row.get(5)?,
            description: row.get(6)?,
            status: row.get(7)?,
            file_path: row.get(8)?,
            line_number: row.get(9)?,
            created_at: row.get(10)?,
            resolved_at: row.get(11)?,
        })
    }).map_err(|e| format!("Failed to query findings: {e}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect findings: {e}"))
}

/// Get finding counts by severity (for badge display).
pub fn get_finding_counts(conn: &Connection, session_id: Option<&str>) -> Result<HudSeverityCounts, String> {
    let mut counts = HudSeverityCounts::default();

    let collect_counts = |row: &rusqlite::Row| -> rusqlite::Result<(String, i64)> {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    };

    let pairs: Vec<(String, i64)> = match session_id {
        Some(sid) => {
            let mut stmt = conn.prepare(
                "SELECT severity, COUNT(*) FROM hud_findings WHERE session_id = ?1 AND status = 'open' GROUP BY severity"
            ).map_err(|e| format!("Failed to prepare counts query: {e}"))?;
            let rows = stmt.query_map(params![sid], collect_counts)
                .map_err(|e| format!("Failed to query counts: {e}"))?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|e| format!("Row error: {e}"))?
        }
        None => {
            let mut stmt = conn.prepare(
                "SELECT severity, COUNT(*) FROM hud_findings WHERE status = 'open' GROUP BY severity"
            ).map_err(|e| format!("Failed to prepare counts query: {e}"))?;
            let rows = stmt.query_map([], collect_counts)
                .map_err(|e| format!("Failed to query counts: {e}"))?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|e| format!("Row error: {e}"))?
        }
    };

    for (severity, count) in pairs {
        match severity.as_str() {
            "critical" => counts.critical = count,
            "high" => counts.high = count,
            "medium" => counts.medium = count,
            "low" => counts.low = count,
            "info" => counts.info = count,
            _ => {}
        }
        counts.total += count;
    }

    Ok(counts)
}

/// Get a single finding by ID.
fn get_finding(conn: &Connection, id: &str) -> Result<HudFinding, String> {
    conn.query_row(
        "SELECT id, session_id, batch_id, severity, persona, title, description, status, file_path, line_number, created_at, resolved_at
         FROM hud_findings WHERE id = ?1",
        params![id],
        |row| {
            Ok(HudFinding {
                id: row.get(0)?,
                session_id: row.get(1)?,
                batch_id: row.get(2)?,
                severity: row.get(3)?,
                persona: row.get(4)?,
                title: row.get(5)?,
                description: row.get(6)?,
                status: row.get(7)?,
                file_path: row.get(8)?,
                line_number: row.get(9)?,
                created_at: row.get(10)?,
                resolved_at: row.get(11)?,
            })
        },
    ).map_err(|e| format!("Finding not found: {e}"))
}

fn chrono_now() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}
