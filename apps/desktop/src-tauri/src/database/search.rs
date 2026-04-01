//! FTS5 full-text search on session messages.
//!
//! Enables cross-session recall: "What did Pierce flag last time we built
//! a settings page?" Scout can query past sessions during pre-build recon.
//! Chronicle can search build history without reading every BOOT.md.

use rusqlite::{params, Connection};
use serde::Serialize;

/// A search result from the FTS5 index.
#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    /// The message content (with FTS5 highlight markup)
    pub content: String,
    /// Message role (user/assistant/system)
    pub role: String,
    /// Session ID the message belongs to
    pub session_id: String,
    /// Session title for context
    pub session_title: Option<String>,
    /// When the message was created
    pub created_at: String,
    /// FTS5 relevance rank (lower = more relevant)
    pub rank: f64,
}

/// Search across all session messages using FTS5.
///
/// The query supports FTS5 syntax:
/// - Simple words: "Pierce flagged"
/// - Phrase: "\"settings page\""
/// - Boolean: "Pierce AND flagged"
/// - Prefix: "set*"
/// - Column filter: "role:assistant"
pub fn search_sessions(
    conn: &Connection,
    query: &str,
    limit: Option<u32>,
) -> Result<Vec<SearchResult>, rusqlite::Error> {
    let limit = limit.unwrap_or(20).min(100);

    let mut stmt = conn.prepare(
        "SELECT
            highlight(messages_fts, 0, '<mark>', '</mark>') as content,
            messages_fts.role,
            messages_fts.session_id,
            s.title as session_title,
            m.created_at,
            rank
         FROM messages_fts
         JOIN messages m ON m.rowid = messages_fts.rowid
         LEFT JOIN sessions s ON s.id = messages_fts.session_id
         WHERE messages_fts MATCH ?1
         ORDER BY rank
         LIMIT ?2",
    )?;

    let rows = stmt.query_map(params![query, limit], |row| {
        Ok(SearchResult {
            content: row.get(0)?,
            role: row.get(1)?,
            session_id: row.get(2)?,
            session_title: row.get(3)?,
            created_at: row.get(4)?,
            rank: row.get(5)?,
        })
    })?;

    rows.collect()
}
