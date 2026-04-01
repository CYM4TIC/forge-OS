use rusqlite::Connection;

use super::topics;
use super::types::{MEMORY_MAX_LINES, MEMORY_MAX_SIZE_KB};

/// Generate MEMORY.md index content from SQLite state.
/// MEMORY.md is a generated VIEW — not the source of truth.
/// Max 200 lines / 25KB as per KAIROS constants.
pub fn generate_memory_index(conn: &Connection) -> Result<String, rusqlite::Error> {
    let all_topics = topics::list_topics(conn, None, false)?;
    let topic_counts = topics::count_topics_by_type(conn)?;

    let mut lines: Vec<String> = Vec::new();

    lines.push("# Memory Index".to_string());
    lines.push(String::new());

    // Summary line
    let total: u64 = topic_counts.iter().map(|(_, c)| c).sum();
    lines.push(format!("**{} active topics** across {} types.", total, topic_counts.len()));
    lines.push(String::new());

    // Group topics by type
    for memory_type in &["user", "feedback", "project", "reference"] {
        let type_topics: Vec<_> = all_topics
            .iter()
            .filter(|t| t.memory_type == *memory_type)
            .collect();

        if type_topics.is_empty() {
            continue;
        }

        lines.push(format!("## {}", capitalize(memory_type)));

        for topic in &type_topics {
            // Each entry: one line, under ~150 chars
            let desc = if topic.description.len() > 120 {
                format!("{}...", &topic.description[..117])
            } else {
                topic.description.clone()
            };
            lines.push(format!("- **{}** — {}", topic.name, desc));
        }

        lines.push(String::new());
    }

    // Enforce limits
    if lines.len() > MEMORY_MAX_LINES {
        lines.truncate(MEMORY_MAX_LINES);
        lines.push("<!-- Truncated: exceeds MEMORY_MAX_LINES -->".to_string());
    }

    let content = lines.join("\n");

    // Check size limit
    let size_kb = content.len() / 1024;
    if size_kb > MEMORY_MAX_SIZE_KB {
        // Truncate to fit
        let max_bytes = MEMORY_MAX_SIZE_KB * 1024;
        let truncated = &content[..max_bytes];
        // Find last newline to avoid cutting mid-line
        if let Some(last_nl) = truncated.rfind('\n') {
            return Ok(format!(
                "{}\n<!-- Truncated: exceeds {}KB limit -->",
                &truncated[..last_nl],
                MEMORY_MAX_SIZE_KB
            ));
        }
    }

    Ok(content)
}

fn capitalize(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
    }
}
