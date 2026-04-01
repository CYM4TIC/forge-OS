//! Dream Consolidation Engine — Nightly 4-phase memory consolidation.
//!
//! Phases:
//! 1. Orient — Read MEMORY.md index, list existing topics
//! 2. Gather — Scan daily logs since last consolidation
//! 3. Consolidate — Create/update topic files from gathered entries
//! 4. Prune — Remove stale topics, enforce MEMORY.md limits
//!
//! Trigger conditions (all must be true):
//! - 24h+ since last consolidation
//! - 5+ sessions since last consolidation
//! - No concurrent dream running (SQLite row lock)

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use super::logs;
use super::topics;
use super::index;
use super::types::{MemoryType, MEMORY_TYPES};

/// Minimum hours between dream runs.
const DREAM_COOLDOWN_HOURS: i64 = 24;
/// Minimum sessions accumulated before a dream is triggered.
const DREAM_MIN_SESSIONS: u64 = 5;

/// Status of the dream engine.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DreamStatus {
    pub is_running: bool,
    pub last_run_at: Option<String>,
    pub last_run_status: Option<String>,
    pub sessions_since_last: u64,
    pub can_trigger: bool,
    pub cooldown_remaining_hours: Option<f64>,
}

/// Result of a dream consolidation run.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DreamResult {
    pub run_id: String,
    pub topics_created: u32,
    pub topics_updated: u32,
    pub topics_pruned: u32,
    pub logs_processed: u32,
    pub memory_index: String,
}

/// Check if a dream is currently running (application-level lock via dream_runs table).
pub fn is_dream_running(conn: &Connection) -> Result<bool, rusqlite::Error> {
    let count: u64 = conn.query_row(
        "SELECT COUNT(*) FROM dream_runs WHERE status = 'running'",
        [],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

/// Get the last completed dream run timestamp.
fn get_last_run_at(conn: &Connection) -> Result<Option<String>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT started_at FROM dream_runs WHERE status = 'complete' ORDER BY started_at DESC LIMIT 1",
    )?;
    let mut rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

/// Count sessions since the last dream run.
fn count_sessions_since(conn: &Connection, since: Option<&str>) -> Result<u64, rusqlite::Error> {
    match since {
        Some(ts) => conn.query_row(
            "SELECT COUNT(*) FROM sessions WHERE created_at > ?1 AND status != 'deleted'",
            params![ts],
            |row| row.get(0),
        ),
        None => conn.query_row(
            "SELECT COUNT(*) FROM sessions WHERE status != 'deleted'",
            [],
            |row| row.get(0),
        ),
    }
}

/// Calculate hours since a timestamp.
fn hours_since(timestamp: &str) -> f64 {
    let now = chrono::Utc::now();
    if let Ok(ts) = chrono::DateTime::parse_from_rfc3339(timestamp) {
        let duration = now.signed_duration_since(ts);
        duration.num_minutes() as f64 / 60.0
    } else {
        // If we can't parse, assume enough time has passed
        f64::MAX
    }
}

/// Get the current dream status — whether it can trigger, cooldown, etc.
pub fn get_status(conn: &Connection) -> Result<DreamStatus, rusqlite::Error> {
    let is_running = is_dream_running(conn)?;
    let last_run_at = get_last_run_at(conn)?;
    let sessions_since = count_sessions_since(conn, last_run_at.as_deref())?;

    let last_run_status: Option<String> = {
        let mut stmt = conn.prepare(
            "SELECT status FROM dream_runs ORDER BY started_at DESC LIMIT 1",
        )?;
        let mut rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        rows.next().transpose()?
    };

    let (can_trigger, cooldown_remaining) = if is_running {
        (false, None)
    } else {
        match &last_run_at {
            Some(ts) => {
                let hours = hours_since(ts);
                let cooldown_met = hours >= DREAM_COOLDOWN_HOURS as f64;
                let sessions_met = sessions_since >= DREAM_MIN_SESSIONS;
                let remaining = if cooldown_met {
                    None
                } else {
                    Some(DREAM_COOLDOWN_HOURS as f64 - hours)
                };
                (cooldown_met && sessions_met, remaining)
            }
            None => (sessions_since >= DREAM_MIN_SESSIONS, None),
        }
    };

    Ok(DreamStatus {
        is_running,
        last_run_at,
        last_run_status,
        sessions_since_last: sessions_since,
        can_trigger,
        cooldown_remaining_hours: cooldown_remaining,
    })
}

/// Execute the 4-phase dream consolidation pipeline.
/// Returns DreamResult on success, or an error message.
pub fn run_dream(conn: &Connection) -> Result<DreamResult, String> {
    // Lock check
    if is_dream_running(conn).map_err(|e| e.to_string())? {
        return Err("Dream already running".to_string());
    }

    // Create run record (acts as lock)
    let run_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO dream_runs (id, status) VALUES (?1, 'running')",
        params![&run_id],
    )
    .map_err(|e| e.to_string())?;

    // Run pipeline, catching errors to mark the run as failed
    match run_pipeline(conn, &run_id) {
        Ok(result) => {
            conn.execute(
                "UPDATE dream_runs SET status = 'complete', topics_created = ?1, topics_updated = ?2, topics_pruned = ?3, logs_processed = ?4, completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?5",
                params![result.topics_created, result.topics_updated, result.topics_pruned, result.logs_processed, &run_id],
            ).map_err(|e| e.to_string())?;
            Ok(result)
        }
        Err(e) => {
            let _ = conn.execute(
                "UPDATE dream_runs SET status = 'failed', error_message = ?1, completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?2",
                params![&e, &run_id],
            );
            Err(e)
        }
    }
}

/// The actual 4-phase pipeline.
fn run_pipeline(conn: &Connection, run_id: &str) -> Result<DreamResult, String> {
    let mut topics_created: u32 = 0;
    let mut topics_updated: u32 = 0;
    let mut topics_pruned: u32 = 0;

    // ── Phase 1: Orient ──
    // Read existing topics to understand current memory state
    let existing_topics = topics::list_topics(conn, None, false)
        .map_err(|e| format!("Orient: {}", e))?;

    let mut topic_map: HashMap<String, String> = HashMap::new();
    for topic in &existing_topics {
        // Key: "type:name" → id
        let key = format!("{}:{}", topic.memory_type, topic.name.to_lowercase());
        topic_map.insert(key, topic.id.clone());
    }

    // ── Phase 2: Gather ──
    // Scan daily logs since last consolidation
    let last_run = get_last_run_at(conn).map_err(|e| format!("Gather: {}", e))?;

    let log_entries = logs::query_logs(
        conn,
        None, // all personas
        None, // all types
        last_run.as_deref().map(|ts| &ts[..10]), // date portion only
        None,
        None,
    )
    .map_err(|e| format!("Gather: {}", e))?;

    let logs_processed = log_entries.len() as u32;

    if logs_processed == 0 {
        // Nothing to consolidate
        return Ok(DreamResult {
            run_id: run_id.to_string(),
            topics_created: 0,
            topics_updated: 0,
            topics_pruned: 0,
            logs_processed: 0,
            memory_index: index::generate_memory_index(conn)
                .map_err(|e| format!("Index: {}", e))?,
        });
    }

    // ── Phase 3: Consolidate ──
    // Group log entries by memory_type, then extract topic signals
    let mut entries_by_type: HashMap<String, Vec<String>> = HashMap::new();
    for entry in &log_entries {
        entries_by_type
            .entry(entry.memory_type.clone())
            .or_default()
            .push(entry.content.clone());
    }

    for memory_type_str in MEMORY_TYPES {
        let entries = match entries_by_type.get(memory_type_str) {
            Some(e) => e,
            None => continue,
        };

        let memory_type = MemoryType::from_str(memory_type_str).unwrap();

        // Simple consolidation: merge entries into a single topic per type
        // In production, an LLM agent would do smart merging.
        // For now: append new entries to existing topic or create one.
        let topic_key = format!("{}:consolidated", memory_type_str);
        let consolidated_content = entries.join("\n- ");
        let content_block = format!("- {}", consolidated_content);

        if let Some(existing_id) = topic_map.get(&topic_key) {
            // Update existing topic — append new content
            let existing = topics::get_topic(conn, existing_id)
                .map_err(|e| format!("Consolidate: {}", e))?;

            if let Some(existing_topic) = existing {
                let updated = format!("{}\n{}", existing_topic.content, content_block);
                topics::update_topic(conn, existing_id, None, Some(&updated))
                    .map_err(|e| format!("Consolidate update: {}", e))?;
                topics_updated += 1;
            }
        } else {
            // Create new topic
            let topic_id = Uuid::new_v4().to_string();
            topics::create_topic(
                conn,
                &topic_id,
                &memory_type,
                "consolidated",
                &format!("Consolidated {} entries from daily logs", memory_type_str),
                &content_block,
            )
            .map_err(|e| format!("Consolidate create: {}", e))?;
            topics_created += 1;
        }
    }

    // ── Phase 4: Prune ──
    // Deactivate topics that are empty or stale
    let all_topics = topics::list_topics(conn, None, false)
        .map_err(|e| format!("Prune: {}", e))?;

    for topic in &all_topics {
        if topic.content.trim().is_empty() {
            topics::deactivate_topic(conn, &topic.id)
                .map_err(|e| format!("Prune deactivate: {}", e))?;
            topics_pruned += 1;
        }
    }

    // Regenerate MEMORY.md index
    let memory_index = index::generate_memory_index(conn)
        .map_err(|e| format!("Index generation: {}", e))?;

    Ok(DreamResult {
        run_id: run_id.to_string(),
        topics_created,
        topics_updated,
        topics_pruned,
        logs_processed,
        memory_index,
    })
}

/// Background check — called periodically (e.g., every hour) to see if dream should auto-trigger.
/// Returns Some(DreamResult) if a dream was triggered, None if conditions not met.
pub fn check_and_run(conn: &Connection) -> Result<Option<DreamResult>, String> {
    let status = get_status(conn).map_err(|e| e.to_string())?;
    if status.can_trigger {
        Ok(Some(run_dream(conn)?))
    } else {
        Ok(None)
    }
}
