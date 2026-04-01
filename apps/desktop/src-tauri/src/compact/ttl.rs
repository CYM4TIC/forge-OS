//! Cache-TTL context pruning — tool result expiry system.
//!
//! Different tool types get different lifetimes. Stale tool results are
//! replaced with one-line placeholders before LLM compaction runs,
//! reducing unnecessary LLM calls significantly.
//!
//! Two-phase compaction:
//! 1. TTL prune (free, no LLM call) — remove expired entries
//! 2. LLM summarize (expensive) — only if still over threshold after prune

use std::collections::HashMap;

/// TTL configuration for tool result types (in seconds).
#[derive(Debug, Clone)]
pub struct TtlConfig {
    /// Tool type → TTL in seconds
    ttls: HashMap<String, u64>,
    /// Default TTL for unknown tool types (5 minutes)
    default_ttl: u64,
}

/// Default TTL values per tool type.
const TTL_SCHEMA_QUERY: u64 = 600;       // 10 min — schema changes are rare within a session
const TTL_FILE_READ: u64 = 300;          // 5 min — files change during builds
const TTL_BROWSER_SNAPSHOT: u64 = 120;   // 2 min — UI state is volatile
const TTL_ADL_QUERY: u64 = 0;            // Session lifetime — decisions persist (0 = never expires)
const TTL_BUILD_LEARNINGS: u64 = 0;      // Session lifetime — reference data
const TTL_AGENT_RESULT: u64 = 1800;      // 30 min — findings stay relevant longer
const TTL_DEFAULT: u64 = 300;            // 5 min — conservative default

impl TtlConfig {
    pub fn new() -> Self {
        let mut ttls = HashMap::new();
        ttls.insert("schema_query".to_string(), TTL_SCHEMA_QUERY);
        ttls.insert("file_read".to_string(), TTL_FILE_READ);
        ttls.insert("browser_snapshot".to_string(), TTL_BROWSER_SNAPSHOT);
        ttls.insert("adl_query".to_string(), TTL_ADL_QUERY);
        ttls.insert("build_learnings".to_string(), TTL_BUILD_LEARNINGS);
        ttls.insert("agent_result".to_string(), TTL_AGENT_RESULT);

        Self {
            ttls,
            default_ttl: TTL_DEFAULT,
        }
    }

    /// Get TTL for a tool type in seconds. Returns 0 for session-lifetime entries.
    pub fn get_ttl(&self, tool_type: &str) -> u64 {
        *self.ttls.get(tool_type).unwrap_or(&self.default_ttl)
    }

    /// Check if a tool result has expired given its tool type and age in seconds.
    pub fn is_expired(&self, tool_type: &str, age_seconds: u64) -> bool {
        let ttl = self.get_ttl(tool_type);
        if ttl == 0 {
            return false; // Session-lifetime, never expires
        }
        age_seconds > ttl
    }
}

/// A tool result entry with TTL metadata.
#[derive(Debug, Clone)]
pub struct ToolResultEntry {
    /// Unique ID of the tool result
    pub id: String,
    /// Classification of the tool type
    pub tool_type: String,
    /// Brief description (for placeholder after pruning)
    pub description: String,
    /// The full content
    pub content: String,
    /// When this result was stored (ISO 8601)
    pub stored_at: String,
    /// Pre-computed token count
    pub token_count: usize,
}

/// Result of a TTL prune pass.
#[derive(Debug, Clone)]
pub struct PruneResult {
    /// Number of entries pruned
    pub entries_pruned: u32,
    /// Total tokens freed
    pub tokens_freed: usize,
    /// Placeholder lines inserted (for context continuity)
    pub placeholders: Vec<String>,
}

/// Classify a tool call into a tool type for TTL purposes.
/// Examines the tool name or content to determine the appropriate category.
pub fn classify_tool_type(tool_name: &str, content: &str) -> String {
    let name_lower = tool_name.to_lowercase();
    let content_lower = content.to_lowercase();

    if name_lower.contains("schema") || content_lower.contains("information_schema") {
        return "schema_query".to_string();
    }
    if name_lower.contains("read") || name_lower.contains("file") || name_lower.contains("glob") || name_lower.contains("grep") {
        return "file_read".to_string();
    }
    if name_lower.contains("browser") || name_lower.contains("screenshot") || name_lower.contains("snapshot") || name_lower.contains("preview") {
        return "browser_snapshot".to_string();
    }
    if content_lower.contains("adl") || content_lower.contains("architecture decision") {
        return "adl_query".to_string();
    }
    if content_lower.contains("build-learnings") || content_lower.contains("build_learnings") {
        return "build_learnings".to_string();
    }
    if name_lower.contains("dispatch") || name_lower.contains("agent") {
        return "agent_result".to_string();
    }

    "default".to_string()
}

/// Run TTL prune pass on a list of tool result entries.
/// Returns pruned entries replaced with placeholders.
pub fn prune_expired(
    entries: &[ToolResultEntry],
    config: &TtlConfig,
    now_timestamp: &str,
) -> PruneResult {
    let now = match chrono::DateTime::parse_from_rfc3339(now_timestamp) {
        Ok(dt) => dt,
        Err(_) => {
            return PruneResult {
                entries_pruned: 0,
                tokens_freed: 0,
                placeholders: vec![],
            };
        }
    };

    let mut entries_pruned = 0u32;
    let mut tokens_freed = 0usize;
    let mut placeholders = Vec::new();

    for entry in entries {
        let stored = match chrono::DateTime::parse_from_rfc3339(&entry.stored_at) {
            Ok(dt) => dt,
            Err(_) => continue,
        };

        let age_seconds = (now - stored).num_seconds().max(0) as u64;

        if config.is_expired(&entry.tool_type, age_seconds) {
            let age_minutes = age_seconds / 60;
            let placeholder = format!(
                "[Pruned: {} ({}), expired {}m ago]",
                entry.description, entry.tool_type, age_minutes
            );
            placeholders.push(placeholder);
            tokens_freed += entry.token_count;
            entries_pruned += 1;
        }
    }

    PruneResult {
        entries_pruned,
        tokens_freed,
        placeholders,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ttl_config_defaults() {
        let config = TtlConfig::new();
        assert_eq!(config.get_ttl("schema_query"), 600);
        assert_eq!(config.get_ttl("file_read"), 300);
        assert_eq!(config.get_ttl("browser_snapshot"), 120);
        assert_eq!(config.get_ttl("adl_query"), 0);
        assert_eq!(config.get_ttl("unknown_type"), 300);
    }

    #[test]
    fn test_session_lifetime_never_expires() {
        let config = TtlConfig::new();
        assert!(!config.is_expired("adl_query", 999999));
        assert!(!config.is_expired("build_learnings", 999999));
    }

    #[test]
    fn test_schema_query_expires() {
        let config = TtlConfig::new();
        assert!(!config.is_expired("schema_query", 500));
        assert!(config.is_expired("schema_query", 700));
    }

    #[test]
    fn test_classify_tool_type() {
        assert_eq!(classify_tool_type("execute_sql", "SELECT * FROM information_schema.columns"), "schema_query");
        assert_eq!(classify_tool_type("read_file", "src/main.rs"), "file_read");
        assert_eq!(classify_tool_type("preview_screenshot", ""), "browser_snapshot");
        assert_eq!(classify_tool_type("dispatch_agent", ""), "agent_result");
        assert_eq!(classify_tool_type("unknown_tool", "some content"), "default");
    }
}
